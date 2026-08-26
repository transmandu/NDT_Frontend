import { C } from "@/lib/colors";
import type { AcStatus, NcStatus } from "@/types/quality";

const NC_LABELS: Record<NcStatus, string> = {
  abierta: "Abierta",
  en_investigacion: "En Investigación",
  plan_accion: "Plan de Acción",
  en_implementacion: "En Implementación",
  en_seguimiento: "En Seguimiento",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
};

const AC_LABELS: Record<AcStatus, string> = {
  plan_accion: "Plan de Acción",
  en_implementacion: "En Implementación",
  en_verificacion: "En Verificación",
  eficaz: "Eficaz",
  no_eficaz: "No Eficaz",
  cancelada: "Cancelada",
};

const NC_COLORS: Record<NcStatus, string> = {
  abierta: C.warning,
  en_investigacion: C.info,
  plan_accion: C.accent,
  en_implementacion: C.primary,
  en_seguimiento: C.info,
  cerrada: C.success,
  cancelada: "#6B7280",
};

const AC_COLORS: Record<AcStatus, string> = {
  plan_accion: C.accent,
  en_implementacion: C.primary,
  en_verificacion: C.info,
  eficaz: C.success,
  no_eficaz: C.danger,
  cancelada: "#6B7280",
};

export default function QualityStatusBadge({
  kind,
  status,
}: {
  kind: "nc" | "ac";
  status: string;
}) {
  const label =
    (kind === "nc" ? NC_LABELS[status as NcStatus] : AC_LABELS[status as AcStatus]) ??
    status;
  const color =
    (kind === "nc" ? NC_COLORS[status as NcStatus] : AC_COLORS[status as AcStatus]) ??
    C.accent;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap"
      style={{
        backgroundColor: `${color}15`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      {label}
    </span>
  );
}
