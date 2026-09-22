import Link from "next/link";
import { QuoteVerificationResponse } from "@/schemas/quote";
import { fmt, fmtDate } from "@/utils/formatters";
import { C } from "@/lib/colors";
import {
  Section,
  Grid2,
  Field,
  Table,
  Th,
  Td,
  Empty,
  HashRow,
  ServerError,
} from "@/components/verify/VerifyComponents";

// Colores propios en vez del prop `badge` de Field: ese está calibrado para
// los tres estados de un certificado (issued/superseded/revoked), no para
// los cuatro de una cotización (draft/issued/won/lost) — reutilizarlo tal
// cual pintaría "ganada" en rojo.
const STATUS_INFO: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: C.statusDraft },
  issued: { label: "Emitida", color: C.info },
  won: { label: "Ganada", color: C.success },
  lost: { label: "Perdida", color: C.danger },
};

// Fetch directo en el servidor — mismo patrón que /verify/[certNumber]
async function getQuote(code: string): Promise<QuoteVerificationResponse | null> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
  try {
    const res = await fetch(`${apiBase}/verify-quote/${encodeURIComponent(code)}`, {
      cache: "no-store",
    });

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

export default async function VerifyQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const code = decodeURIComponent(resolvedParams.code);
  const hashParam = (resolvedSearchParams.h as string) ?? "";

  const data = await getQuote(code);

  if (!data) return <ServerError />;
  if (data.found === false) return <NotFoundQuote code={code} />;

  const { quote, client, items, totals, prepared_by, hash, laboratory } = data;

  const urlHashMatches = hashParam ? hashParam === hash?.computed : null;
  const storedMatches = hash?.matches ?? null;
  const overallVerified = (urlHashMatches === true || urlHashMatches === null) && storedMatches === true;

  return (
    <div className="min-h-screen bg-(--bg-app)">
      {/* ── Header ── */}
      <header className="bg-(--bg-panel) border border-(--border-color) py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="17" stroke="var(--brand-primary)" strokeWidth="2" />
            <path
              d="M10 18l5 5 11-11"
              stroke="var(--brand-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <div className="text-sm font-bold text-(--text-main)">Orinoco Quality & Control</div>
            <div className="text-[10px] text-(--text-muted) tracking-wide uppercase">
              Verificación de Cotización
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

      <main className="max-w-215 mx-auto my-6 px-4">
        {/* ── Banner de verificación ── */}
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
              {overallVerified ? "Hash VERIFICADO — Documento auténtico" : "Hash NO COINCIDE — Posible alteración"}
            </div>
            <div className="text-[10px] text-(--text-muted) mt-0.5">
              {overallVerified
                ? "Los datos coinciden con la cotización original emitida por el laboratorio."
                : "Los datos no coinciden con los registros, o esta cotización todavía no ha sido emitida. Contacte a Orinoco Quality & Control."}
            </div>
          </div>
        </div>

        <Section title="1. Datos de la Cotización">
          <Grid2>
            <Field label="Código" value={quote?.code} mono />
            <div>
              <div className="text-[9px] text-(--text-muted) uppercase tracking-wide font-semibold">Estado</div>
              {quote?.status && (
                <span
                  className="inline-block mt-0.5 px-1.5 py-px rounded-[3px] text-[9px] font-bold uppercase tracking-wide"
                  style={{
                    color: (STATUS_INFO[quote.status] ?? STATUS_INFO.draft).color,
                    backgroundColor: `${(STATUS_INFO[quote.status] ?? STATUS_INFO.draft).color}1A`,
                  }}
                >
                  {(STATUS_INFO[quote.status] ?? STATUS_INFO.draft).label}
                </span>
              )}
            </div>
            <Field label="Cliente" value={client?.company_name} />
            <Field label="Proyecto" value={quote?.project_name ?? undefined} />
            <Field label="Moneda" value={quote?.currency_display?.toUpperCase()} />
            <Field label="Fecha de Emisión" value={quote?.issued_at ? fmtDate(quote.issued_at) : "—"} />
            <Field label="Preparado por" value={prepared_by} />
          </Grid2>
        </Section>

        <Section title="2. Partidas">
          {items && items.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <Th className="text-left">Descripción</Th>
                  <Th>Unidad</Th>
                  <Th>Cantidad</Th>
                  <Th>Precio Unit.</Th>
                  <Th>Total</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <Td left>{item.description}</Td>
                    <Td>{item.unit}</Td>
                    <Td>{fmt(item.quantity, 2)}</Td>
                    <Td mono>${fmt(item.unit_price_assumed_usd, 2)}</Td>
                    <Td bold mono>
                      ${fmt(item.total_price_usd, 2)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>Sin partidas disponibles</Empty>
          )}
        </Section>

        {totals && (
          <div className="bg-(--bg-panel) border border-(--border-color) rounded-md py-2.5 px-3.5 mb-5 text-[11px]">
            <div className="flex justify-between py-0.5 text-(--text-muted)">
              <span>Subtotal</span>
              <span className="font-mono">${fmt(totals.subtotal_usd, 2)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-(--text-muted)">
              <span>IVA</span>
              <span className="font-mono">${fmt(totals.tax_amount_usd, 2)}</span>
            </div>
            <div className="flex justify-between py-1 mt-1 border-t border-(--border-color) font-bold text-(--text-main) text-[13px]">
              <span>Total</span>
              <span className="font-mono">${fmt(totals.total_usd, 2)}</span>
            </div>
          </div>
        )}

        {hash && (
          <Section title="3. Integridad de Datos">
            <div className="text-[10px] font-mono text-(--text-muted) leading-[1.8]">
              <HashRow label="Hash esperado (URL)" value={hashParam || "(no provisto)"} match={urlHashMatches} />
              <HashRow label="Hash calculado" value={hash.computed} match={true} />
              <HashRow label="Hash almacenado (BD)" value={hash.stored || "(sin emitir)"} match={storedMatches} />
            </div>
            <div className="mt-2 text-[9px] text-(--text-muted) italic">
              SHA-256 calculado sobre los datos canónicos de la cotización. Los datos internos del laboratorio
              (comisión, canal de venta) nunca se incluyen en esta verificación pública.
            </div>
          </Section>
        )}

        <footer className="mt-8 py-4 border-t border-(--border-color) text-center text-[10px] text-(--text-muted) leading-relaxed">
          {laboratory?.name} • {laboratory?.address}, {laboratory?.city}
        </footer>
      </main>
    </div>
  );
}

function NotFoundQuote({ code }: { code: string }) {
  return (
    <div className="min-h-screen bg-(--bg-app) flex items-center justify-center p-4">
      <div className="bg-(--bg-panel) border border-(--border-color) rounded-lg py-8 px-10 max-w-md text-center">
        <div className="text-5xl mb-3">🔍</div>
        <div className="text-base font-semibold text-(--text-main) mb-2">Cotización no encontrada</div>
        <div className="text-[11px] text-(--text-muted) mb-5 leading-relaxed">
          La cotización <span className="font-semibold font-mono text-(--text-main)">{code}</span> no existe en
          los registros.
        </div>
        <Link
          href="/"
          className="text-[11px] font-semibold text-white bg-(--brand-primary) py-2 px-5 rounded no-underline uppercase tracking-wide"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
