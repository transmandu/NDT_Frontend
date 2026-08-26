"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { C } from "@/lib/colors";
import type { Nonconformity } from "@/types/quality";
import QualityDispositionForm from "@/components/quality/QualityDispositionForm";

/**
 * ISO/IEC 17025 §7.10.1 c/d/e — se muestra cuando la NC nace sobre una sesión
 * con certificado ya emitido. Advierte y da acceso a decidir la disposición
 * del certificado, requisito obligatorio antes de poder cerrar la NC.
 */
export default function QualityIssuedResultsBanner({
  nonconformity,
}: {
  nonconformity: Nonconformity;
}) {
  const role = useAuthStore((s) => s.user?.role);
  const [formOpen, setFormOpen] = useState(false);

  if (!nonconformity.affects_issued_results) return null;

  const resolved = !!nonconformity.certificate_disposition;
  const canDecide = role === "auditor" || role === "admin";

  return (
    <div
      className="rounded-lg p-4 flex items-start gap-3"
      style={{
        backgroundColor: `${C.danger}10`,
        border: `1px solid ${C.danger}40`,
      }}
    >
      <AlertTriangle size={18} style={{ color: C.danger }} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold" style={{ color: C.danger }}>
          Esta NC afecta resultados ya entregados (§7.10.1.c)
        </p>
        <p className="text-[11px] mt-1" style={{ color: "var(--text-main)" }}>
          El certificado asociado ya fue emitido al cliente. Se requiere evaluar
          el impacto y decidir la disposición del certificado antes de poder
          cerrar esta No Conformidad.
        </p>

        {resolved ? (
          <div className="mt-2 text-[11px]" style={{ color: "var(--text-main)" }}>
            <strong>Disposición:</strong> {DISPOSITION_LABELS[nonconformity.certificate_disposition!]}
            {" · "}
            <strong>Notificación al cliente:</strong>{" "}
            {nonconformity.client_notification_required ? "Sí" : "No requerida"}
          </div>
        ) : canDecide ? (
          <button
            onClick={() => setFormOpen(true)}
            className="mt-2.5 h-7 px-3 rounded text-[10px] font-semibold text-white"
            style={{ backgroundColor: C.danger }}
          >
            Decidir disposición del certificado
          </button>
        ) : (
          <p className="mt-2 text-[10px] italic" style={{ color: "var(--text-muted)" }}>
            Pendiente de decisión por un Auditor.
          </p>
        )}
      </div>

      {formOpen && (
        <QualityDispositionForm
          nonconformityId={nonconformity.id}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}

const DISPOSITION_LABELS: Record<string, string> = {
  mantener: "Mantener certificado",
  reemitir: "Reemitir certificado",
  retirar: "Retirar certificado",
};
