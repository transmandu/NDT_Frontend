import Link from "next/link";
import { VerificationResponse } from "@/schemas/certificate";
import { fmt, fmtDate } from "@/utils/formatters";
import {
  Section,
  Grid2,
  Field,
  Table,
  Th,
  Td,
  Empty,
  HashRow,
  NotFound,
  ServerError,
} from "@/components/verify/VerifyComponents";

// Fetch directo en el servidor
async function getCertificate(
  certNumber: string,
): Promise<VerificationResponse | null> {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
  try {
    // next: { revalidate: 60 } permite guardar en caché el request por 60 segundos si quisieras (opcional)
    const res = await fetch(
      `${apiBase}/verify/${encodeURIComponent(certNumber)}`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      if (res.status === 404) return { found: false };
      return null;
    }
    return res.json();
  } catch (e) {
    console.error("Fetch error:", e);
    return null;
  }
}

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ certNumber: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const certNumber = decodeURIComponent(resolvedParams.certNumber);
  const hashParam = (resolvedSearchParams.h as string) ?? "";

  // Esperamos la respuesta del servidor de datos antes de renderizar
  const data = await getCertificate(certNumber);

  // Manejo de errores inmediato (sin skeletons innecesarios en el cliente)
  if (!data) return <ServerError />;
  if (data.found === false) return <NotFound certNumber={certNumber} />;

  // Destructuración segura
  const {
    cert,
    instrument,
    procedure,
    environment,
    results,
    standards,
    technician,
    auditor,
    observation,
    hash,
    laboratory,
  } = data;
  const urlHashMatches = hashParam ? hashParam === hash?.computed : null;
  const storedMatches = hash?.matches ?? null;
  const overallVerified =
    (urlHashMatches === true || urlHashMatches === null) &&
    storedMatches === true;
  const isRevoked = cert?.status === "revoked" || cert?.status === "cancelled";

  return (
    <div className="min-h-screen bg-(--bg-app)">
      {/* ── Header ── */}
      <header className="bg-(--bg-panel) border border-(--border-color) py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle
              cx="18"
              cy="18"
              r="17"
              stroke="var(--brand-primary)"
              strokeWidth="2"
            />
            <path
              d="M10 18l5 5 11-11"
              stroke="var(--brand-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <div className="text-sm font-bold text-(--text-main)">
              Orinoco Quality & Control
            </div>
            <div className="text-[10px] text-(--text-muted) tracking-wide uppercase">
              Verificación de Certificado · ISO/IEC 17025
            </div>
          </div>
        </div>
        <Link
          href="/login"
          className="text-[11px] font-medium text-(--brand-primary) no-underline tracking-wide uppercase"
        >
          Iniciar Sesión
        </Link>
      </header>

      <main className="max-w-[860px] mx-auto my-6 px-4">
        {/* ── Verification Banner ── */}
        {isRevoked ? (
          <div className="bg-(--bg-panel) border-l-4 rounded-md py-3.5 px-4 mb-5 flex items-center gap-3 border-(--brand-danger)">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-(--brand-danger)/20 text-(--brand-danger)">
              🛑
            </div>
            <div>
              <div className="text-[13px] font-bold uppercase tracking-wide text-(--brand-danger)">
                CERTIFICADO ANULADO / SIN VALIDEZ
              </div>
              <div className="text-[10px] text-(--text-muted) mt-0.5 font-semibold">
                Este documento ha sido revocado por el laboratorio y carece de
                validez técnica o legal.
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`bg-(--bg-panel) border-l-4 rounded-md py-3.5 px-4 mb-5 flex items-center gap-3
            ${overallVerified ? "border-(--brand-success)" : "border-(--brand-danger)"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg
              ${overallVerified ? "bg-(--brand-success)/20 text-(--brand-success)" : "bg-(--brand-danger)/20 text-(--brand-danger)"}`}
            >
              {overallVerified ? "✓" : "✗"}
            </div>
            <div>
              <div
                className={`text-[13px] font-semibold uppercase tracking-wide
                ${overallVerified ? "text-(--brand-success)" : "text-(--brand-danger)"}`}
              >
                {overallVerified
                  ? "Hash VERIFICADO — Certificado auténtico"
                  : "Hash NO COINCIDE — Posible alteración"}
              </div>
              <div className="text-[10px] text-(--text-muted) mt-0.5">
                {overallVerified
                  ? "Los datos coinciden con el certificado original emitido por el laboratorio."
                  : "Los datos no coinciden con los registros. Contacte a Orinoco Quality & Control."}
              </div>
            </div>
          </div>
        )}

        {/* ── Secciones (El layout queda limpio y legible) ── */}
        <Section title="1. Identificación del Instrumento">
          <Grid2>
            <Field label="Certificado" value={cert?.certificate_number} mono />
            <Field label="Estado" value={cert?.status} badge />
            <Field
              label="Instrumento"
              value={[instrument?.name, instrument?.brand, instrument?.model]
                .filter(Boolean)
                .join(" — ")}
            />
            <Field label="No. de Serie" value={instrument?.serial_number} />
            <Field label="Código Interno" value={instrument?.internal_code} />
            <Field label="Rango" value={instrument?.range} />
            <Field label="Resolución" value={instrument?.resolution} />
            <Field
              label="EMP"
              value={
                instrument?.emp != null
                  ? `${instrument?.emp} ${instrument?.unit}`
                  : "No especificado"
              }
            />
          </Grid2>
        </Section>

        <Section title="2. Información del Ensayo">
          <Grid2>
            <Field
              label="Procedimiento"
              value={procedure ? `${procedure.name} — ${procedure.code}` : "—"}
            />
            <Field label="Técnico" value={technician} />
            <Field label="Auditor / Revisor" value={auditor} />
            <Field
              label="Fecha Calibración"
              value={fmtDate(cert?.calibration_date)}
            />
            <Field
              label="Próx. Calibración"
              value={fmtDate(cert?.next_calibration_date)}
              bold
              valueColor="#b45309"
            />
            <Field label="Fecha Emisión" value={fmtDate(cert?.generated_at)} />
          </Grid2>
        </Section>

        <Section title="3. Condiciones Ambientales">
          <Grid2>
            <Field
              label="Temperatura"
              value={
                environment
                  ? `${fmt(environment.temperature, 2)} ± ${fmt(environment.temperature_unc, 2)} °C`
                  : "—"
              }
            />
            <Field
              label="Humedad Relativa"
              value={environment ? `${fmt(environment.humidity, 2)} %` : "—"}
            />
            <Field
              label="Presión Atm."
              value={
                environment?.pressure
                  ? `${fmt(environment.pressure, 2)} hPa`
                  : "—"
              }
            />
            <Field label="País" value="Venezuela" />
          </Grid2>
        </Section>

        {/* ── Conformity Banner ── */}
        {cert && (
          <div
            className={`bg-(--bg-panel) border border-(--border-color) rounded-md py-2.5 px-3.5 mb-5 text-[11px] font-semibold text-center
            ${
              cert.conforms === true
                ? "border-(--brand-success)/40 text-(--brand-success)"
                : cert.conforms === false
                  ? "border-(--brand-danger)/40 text-(--brand-danger)"
                  : "border-(--border-color) text-(--text-muted)"
            }`}
          >
            {cert.conforms === true
              ? "✅ INSTRUMENTO CONFORME"
              : cert.conforms === false
                ? "❌ INSTRUMENTO NO CONFORME"
                : "— Conformidad no evaluada"}
            {cert.conforms !== null && (
              <span className="font-normal block text-[10px] mt-0.5 text-(--text-muted)">
                Regla de decisión: |E| + U ≤ EMP
              </span>
            )}
          </div>
        )}

        <Section title="4. Resultados de la Calibración">
          {results && results.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <Th>Punto</Th>
                  <Th>LP</Th>
                  <Th>LI</Th>
                  <Th>Error</Th>
                  <Th>Corrección</Th>
                  <Th>U (k=2)</Th>
                  <Th>EMP</Th>
                  <Th>Unid</Th>
                  <Th>Conf</Th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr
                    key={i}
                    className={
                      r.conforms === true
                        ? "bg-(--brand-success)/10"
                        : r.conforms === false
                          ? "bg-(--brand-danger)/10"
                          : ""
                    }
                  >
                    <Td left>{r.label}</Td>
                    <Td>{fmt(r.nominal)}</Td>
                    <Td>{fmt(r.reading)}</Td>
                    <Td>{fmt(r.error, 5)}</Td>
                    <Td>{fmt(r.correction, 5)}</Td>
                    <Td bold>±{fmt(r.expanded_u, 5)}</Td>
                    <Td>{r.emp != null ? fmt(r.emp) : "—"}</Td>
                    <Td>{r.unit}</Td>
                    <Td bold mono>
                      {r.conforms === true
                        ? "✓"
                        : r.conforms === false
                          ? "✗"
                          : "—"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>Sin resultados disponibles</Empty>
          )}
        </Section>

        {standards && standards.length > 0 && (
          <Section title="5. Patrones Utilizados">
            <Table>
              <thead>
                <tr>
                  <Th>Patrón</Th>
                  <Th>Marca</Th>
                  <Th>No. Serie</Th>
                  <Th>No. Certificado</Th>
                  <Th>Válido Hasta</Th>
                  <Th>U (k=2)</Th>
                  <Th>Unid</Th>
                </tr>
              </thead>
              <tbody>
                {standards.map((s, i) => (
                  <tr key={i}>
                    <Td left>{s.name}</Td>
                    <Td>{s.brand || "—"}</Td>
                    <Td small>{s.serial_number}</Td>
                    <Td small>{s.certificate_number}</Td>
                    <Td>{s.valid_until ? fmtDate(s.valid_until) : "—"}</Td>
                    <Td bold>± {s.uncertainty_u}</Td>
                    <Td>{s.unit || "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Section>
        )}

        {observation && (
          <Section title="6. Observaciones">
            <div className="bg-(--bg-panel) border border-(--border-color) rounded-md py-2.5 px-3.5 text-[11px] text-(--text-main) leading-relaxed">
              {observation}
            </div>
          </Section>
        )}

        {hash && (
          <Section title="7. Integridad de Datos">
            <div className="text-[10px] font-mono text-(--text-muted) leading-[1.8]">
              <HashRow
                label="Hash esperado (URL)"
                value={hashParam || "(no provisto)"}
                match={urlHashMatches}
              />
              <HashRow
                label="Hash calculado"
                value={hash.computed}
                match={true}
              />
              <HashRow
                label="Hash almacenado (BD)"
                value={hash.stored}
                match={storedMatches}
              />
            </div>
            <div className="mt-2 text-[9px] text-(--text-muted) italic">
              SHA-256 calculado sobre los datos canónicos del certificado.
            </div>
          </Section>
        )}

        {/* ── Footer ── */}
        <footer className="mt-8 py-4 border-t border-(--border-color) text-center text-[10px] text-(--text-muted) leading-relaxed">
          {laboratory?.name} • {laboratory?.address}, {laboratory?.city}
          <br />
          {laboratory?.iso_accreditation} • Acreditación N°{" "}
          {laboratory?.accreditation_no}
        </footer>
      </main>
    </div>
  );
}
