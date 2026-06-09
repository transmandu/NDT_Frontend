"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Search } from "lucide-react";

interface AuditLogEntry {
  id?: number;
  created_at: string;
  event: string;
  auditable_type?: string;
  auditable_id?: number;
  user?: { id?: number; name?: string };
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
}

// ── Etiquetas de eventos ─────────────────────────────────────────────────────
const EVENT_LABELS: Record<string, string> = {
  created: "Creado",
  updated: "Actualizado",
  deleted: "Eliminado",
  submitted: "Enviado a revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  login: "Inicio de sesión",
  logout: "Cierre de sesión",
  regenerated: "Certificado regenerado",
};

// ── Colores por evento ───────────────────────────────────────────────────────
const EVENT_COLORS: Record<string, { bg: string; color: string }> = {
  created: { bg: "rgba(59,130,246,0.1)", color: "#3b82f6" },
  updated: { bg: "rgba(255,165,38,0.1)", color: "#FFA526" },
  deleted: { bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
  approved: { bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
  rejected: { bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
  submitted: { bg: "rgba(139,92,246,0.1)", color: "#8b5cf6" },
  regenerated: { bg: "rgba(20,184,166,0.1)", color: "#14b8a6" },
};

// ── Nombres legibles por tipo de entidad ─────────────────────────────────────
const ENTITY_LABELS: Record<string, string> = {
  CalibrationSession: "Sesión de calibración",
  Instrument: "Instrumento",
  Standard: "Patrón de referencia",
  User: "Usuario",
  Certificate: "Certificado",
  ProcedureSchema: "Esquema de calibración",
};

// ── Nombres legibles por campo técnico ───────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  status: "Estado",
  ambient_temperature: "Temperatura ambiente",
  ambient_humidity: "Humedad relativa",
  ambient_pressure: "Presión atmosférica",
  ambient_temperature_uncertainty: "Incertidumbre de temperatura",
  observation: "Observación",
  certificate_code: "Código de certificado",
  calibration_date: "Fecha de calibración",
  next_calibration_date: "Próxima calibración",
  frozen_at: "Fecha de envío",
  approved_at: "Fecha de aprobación",
  name: "Nombre",
  email: "Correo electrónico",
  role: "Rol",
  is_active: "Estado de cuenta",
  category: "Categoría",
  serial_number: "Número de serie",
  brand: "Marca",
  model: "Modelo",
  location: "Ubicación",
  certificate_number: "N° de certificado del patrón",
  traceability: "Trazabilidad",
};

// Campos técnicos que no aportan información al usuario final
const SKIP_FIELDS = new Set([
  "raw_payload",
  "updated_at",
  "created_at",
  "deleted_at",
  "user_agent",
  "url",
  "remember_token",
  "password",
  "instrument_id",
  "user_id",
  "approved_by",
  "procedure_schema_id",
  "id",
  "pdf_hash",
  "pdf_path",
  "pdf_size",
]);

// ── Valores legibles para campos con opciones fijas ──────────────────────────
const FIELD_VALUES: Record<string, Record<string, string>> = {
  status: {
    draft: "Borrador",
    pending_review: "En revisión",
    approved: "Aprobada",
    rejected: "Rechazada",
  },
  role: {
    admin: "Administrador",
    technician: "Técnico",
    supervisor: "Supervisor",
    auditor: "Auditor",
  },
  is_active: {
    "1": "Activo",
    "0": "Inactivo",
    true: "Activo",
    false: "Inactivo",
  },
};

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";

  // Valores con mapeo conocido
  if (FIELD_VALUES[field]) {
    const mapped = FIELD_VALUES[field][String(value)];
    if (mapped) return mapped;
  }

  // Fechas
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      return new Date(value).toLocaleDateString("es", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      /* continue */
    }
  }

  // Números con unidades según el campo
  if (
    typeof value === "number" ||
    (typeof value === "string" && !isNaN(Number(value)))
  ) {
    const num = Number(value);
    if (field.includes("temperature")) return `${num} °C`;
    if (field.includes("humidity")) return `${num} %`;
    if (field.includes("pressure")) return `${num} hPa`;
  }

  return String(value);
}

function formatDetails(log: AuditLogEntry): string {
  const entity = log.auditable_type?.split("\\").pop() ?? "";

  // Para evento "created" mostrar un resumen contextual
  if (log.event === "created" && log.new_values) {
    if (entity === "CalibrationSession") {
      const v = log.new_values;
      const parts: string[] = ["Nueva sesión registrada"];
      if (v.category) parts.push(`Categoría: ${v.category}`);
      if (v.ambient_temperature)
        parts.push(`Temperatura: ${v.ambient_temperature} °C`);
      if (v.ambient_humidity) parts.push(`Humedad: ${v.ambient_humidity} %`);
      if (v.calibration_date)
        parts.push(
          `Fecha: ${formatValue("calibration_date", v.calibration_date)}`,
        );
      return parts.join(" · ");
    }
    if (entity === "User") {
      const v = log.new_values;
      const parts: string[] = ["Usuario creado"];
      if (v.name) parts.push(`Nombre: ${v.name}`);
      if (v.email) parts.push(`Correo: ${v.email}`);
      if (v.role) parts.push(`Rol: ${formatValue("role", v.role)}`);
      return parts.join(" · ");
    }
    if (entity === "Instrument") {
      const v = log.new_values;
      const parts: string[] = ["Instrumento registrado"];
      if (v.name) parts.push(String(v.name));
      if (v.serial_number) parts.push(`S/N: ${v.serial_number}`);
      if (v.brand) parts.push(String(v.brand));
      return parts.join(" · ");
    }
  }

  // Para evento "updated" mostrar qué campos cambiaron
  if (log.event === "updated" && log.new_values) {
    const changed = Object.entries(log.new_values)
      .filter(([k]) => !SKIP_FIELDS.has(k))
      .map(([k, v]) => {
        const label = FIELD_LABELS[k] ?? k;
        const oldVal = log.old_values?.[k];
        const newVal = formatValue(k, v);
        if (
          oldVal !== undefined &&
          oldVal !== null &&
          String(oldVal) !== String(v)
        ) {
          return `${label}: ${formatValue(k, oldVal)} → ${newVal}`;
        }
        return `${label}: ${newVal}`;
      });

    return changed.length > 0 ? changed.join(" · ") : "Sin cambios visibles";
  }

  // Para evento "deleted"
  if (log.event === "deleted" && log.old_values) {
    if (entity === "CalibrationSession") {
      const v = log.old_values;
      return `Sesión eliminada · Estado anterior: ${formatValue("status", v.status)}`;
    }
    if (entity === "User") {
      return `Usuario eliminado: ${log.old_values.name ?? ""}`;
    }
  }

  // Para eventos puntuales sin valores
  const eventMessages: Record<string, string> = {
    approved: "Sesión aprobada y certificado generado",
    rejected: "Sesión rechazada por el auditor",
    submitted: "Sesión enviada a revisión por el técnico",
    regenerated: "Certificado regenerado por el auditor",
    login: "Acceso al sistema",
    logout: "Cierre de sesión",
  };
  if (eventMessages[log.event]) return eventMessages[log.event];

  return "—";
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/audit-logs")
      .then((r) => {
        if (!cancelled) {
          setLogs(r.data.data || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = logs.filter(
    (l) =>
      (l.event || "").toLowerCase().includes(search.toLowerCase()) ||
      (EVENT_LABELS[l.event] || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (l.user?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.auditable_type || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-3 w-full animate-fadeIn">
      <div
        id="tour-audit-filters"
        className="flex items-center input-theme rounded px-2 py-1 w-full sm:w-64 shadow-sm"
        style={{ border: "1px solid var(--border-color)" }}
      >
        <Search
          size={12}
          className="mr-1.5 shrink-0"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          placeholder="Buscar en bitácora..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-[11px] w-full"
          style={{ color: "var(--text-main)" }}
        />
      </div>

      <div
        id="tour-audit-table"
        className="panel rounded-md shadow-sm overflow-x-auto w-full"
      >
        <table className="w-full text-left text-xs min-w-[600px]">
          <thead>
            <tr>
              <th className="px-4 py-2 th-theme text-[11px]">Fecha/Hora</th>
              <th className="px-4 py-2 th-theme text-[11px]">Usuario</th>
              <th className="px-4 py-2 th-theme text-[11px]">Acción</th>
              <th className="px-4 py-2 th-theme text-[11px]">Entidad</th>
              <th className="px-4 py-2 th-theme text-[11px] hidden sm:table-cell">
                Detalles
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="td-theme">
                  <td colSpan={5} className="px-4 py-3">
                    <div
                      className="h-4 rounded animate-pulse"
                      style={{ backgroundColor: "var(--bg-hover)" }}
                    />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Sin registros
                </td>
              </tr>
            ) : (
              filtered.map((log, i) => {
                const eventLabel = EVENT_LABELS[log.event] ?? log.event;
                const eventStyle = EVENT_COLORS[log.event] ?? {
                  bg: "rgba(255,165,38,0.1)",
                  color: "#FFA526",
                };
                const rawEntity = log.auditable_type?.split("\\").pop() ?? "";
                const entityLabel = ENTITY_LABELS[rawEntity] ?? rawEntity;
                const details = formatDetails(log);

                return (
                  <tr
                    key={log.id ?? `log-${i}`}
                    className="td-theme hover-bg transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("es")}
                    </td>
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                      {log.user?.name || "—"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-semibold"
                        style={{
                          backgroundColor: eventStyle.bg,
                          color: eventStyle.color,
                        }}
                      >
                        {eventLabel}
                      </span>
                    </td>
                    <td
                      className="px-4 py-2.5 whitespace-nowrap"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {entityLabel}{" "}
                      {log.auditable_id ? `#${log.auditable_id}` : ""}
                    </td>
                    <td
                      className="px-4 py-2.5 hidden sm:table-cell text-[10px] max-w-[280px] truncate"
                      style={{ color: "var(--text-muted)" }}
                      title={details}
                    >
                      {details}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
