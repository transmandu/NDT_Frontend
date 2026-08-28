"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import { C } from "@/lib/colors";
import type { AcStatus, CorrectiveAction, NcStatus, QualityUiSchema } from "@/types/quality";
import QualityVerificationForm from "@/components/quality/QualityVerificationForm";

/**
 * Mismo mapa de transiciones y reglas de rol que
 * App\Services\Quality\QualityWorkflowService (backend) — la autoridad final
 * es el servidor; esto solo evita mostrar botones que van a fallar con 403/422.
 */
const NC_TRANSITIONS: Record<NcStatus, NcStatus[]> = {
  abierta: ["en_investigacion", "plan_accion", "cancelada"],
  en_investigacion: ["plan_accion", "cancelada"],
  plan_accion: ["en_implementacion", "cancelada"],
  en_implementacion: ["en_seguimiento", "cancelada"],
  en_seguimiento: ["cerrada", "cancelada"],
  cerrada: [],
  cancelada: [],
};

const AC_TRANSITIONS: Record<AcStatus, AcStatus[]> = {
  plan_accion: ["en_implementacion", "cancelada"],
  en_implementacion: ["en_verificacion", "cancelada"],
  en_verificacion: [],
  eficaz: [],
  no_eficaz: [],
  cancelada: [],
};

const NC_LABELS: Record<string, string> = {
  en_investigacion: "Iniciar Investigación",
  plan_accion: "Pasar a Plan de Acción",
  en_implementacion: "Iniciar Implementación",
  en_seguimiento: "Pasar a Seguimiento",
  cerrada: "Cerrar NC",
  cancelada: "Cancelar",
};

const AC_LABELS: Record<string, string> = {
  en_implementacion: "Iniciar Implementación",
  en_verificacion: "Enviar a Verificación",
  cancelada: "Cancelar",
};

function canMove(kind: "nc" | "ac", to: string, role: string | undefined): boolean {
  if (role === "admin") return true;
  if (kind === "nc" && to === "cerrada") return role === "auditor";
  return role === "supervisor" || role === "auditor";
}

interface QualityTransitionButtonsProps {
  kind: "nc" | "ac";
  status: string;
  onTransition: (to: string, extra?: Record<string, unknown>) => void;
  loading?: boolean;
  correctiveActions?: CorrectiveAction[];
  affectsIssuedResults?: boolean;
  certificateDisposition?: string | null;
  rootCauseAnalysis?: QualityUiSchema | null;
  actionPlan?: { steps: string[] } | null;
}

export default function QualityTransitionButtons({
  kind,
  status,
  onTransition,
  loading = false,
  correctiveActions = [],
  affectsIssuedResults = false,
  certificateDisposition = null,
  rootCauseAnalysis = null,
  actionPlan = null,
}: QualityTransitionButtonsProps) {
  const role = useAuthStore((s) => s.user?.role);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [closureTarget, setClosureTarget] = useState(false);
  const [seguimientoTarget, setSeguimientoTarget] = useState(false);

  const transitions =
    kind === "nc"
      ? (NC_TRANSITIONS[status as NcStatus] ?? [])
      : (AC_TRANSITIONS[status as AcStatus] ?? []);
  const labels = kind === "nc" ? NC_LABELS : AC_LABELS;

  const allowed = transitions.filter((to) => canMove(kind, to, role));
  if (allowed.length === 0) return null;

  const validateSeguimiento = (): boolean => {
    if (correctiveActions.length === 0) {
      toast.error('No hay Acciones Correctivas vinculadas.');
      return false;
    }

    const acSinCausa = correctiveActions.filter(
      (ac) => !ac.root_cause_analysis || Object.keys(ac.root_cause_analysis).length === 0
    );
    if (acSinCausa.length > 0) {
      toast.error('Todas las Acciones Correctivas deben tener análisis de causa raíz completado.');
      return false;
    }

    const acNoAvanzadas = correctiveActions.filter(
      (ac) => ac.status === 'plan_accion' || ac.status === 'en_implementacion'
    );
    if (acNoAvanzadas.length > 0) {
      toast.error('Todas las Acciones Correctivas deben estar en estado de Verificación o posteriores.');
      return false;
    }

    return true;
  };

  const validateImplementacion = (): boolean => {
    if (correctiveActions.length === 0) {
      toast.error('No se puede implementar: vincule al menos una Acción Correctiva.');
      return false;
    }
    return true;
  };

  const validateAcImplementacion = (): boolean => {
    if (!rootCauseAnalysis || Object.keys(rootCauseAnalysis).length === 0) {
      toast.error('Debe completar el análisis de causa raíz antes de pasar a Implementación.');
      return false;
    }

    const hasContent = (() => {
      if (rootCauseAnalysis.type === "sequential_steps") {
        return rootCauseAnalysis.steps?.some((s: { question: string; answer: string }) => s.question?.trim() || s.answer?.trim());
      }
      if (rootCauseAnalysis.type === "categorized_causes") {
        return rootCauseAnalysis.categories?.some((cat: { causes: { cause: string }[] }) =>
          cat.causes?.some((c) => c.cause?.trim())
        );
      }
      return false;
    })();

    if (!hasContent) {
      toast.error('El análisis de causa raíz debe tener al menos una respuesta completada.');
      return false;
    }

    if (!actionPlan || actionPlan.steps?.length === 0) {
      toast.error('Debe agregar al menos un paso al Plan de Acción antes de implementar.');
      return false;
    }

    return true;
  };

  const validateCierre = (): boolean => {
    if (correctiveActions.length === 0) {
      toast.error('No se puede cerrar: no hay Acciones Correctivas vinculadas.');
      return false;
    }

    const acNoVerificadas = correctiveActions.filter(
      (ac) => ac.status === 'plan_accion' || ac.status === 'en_implementacion' || ac.status === 'en_verificacion'
    );
    if (acNoVerificadas.length > 0) {
      toast.error('Todas las Acciones Correctivas deben estar verificadas como eficaces o no eficaces antes de cerrar.');
      return false;
    }

    if (affectsIssuedResults && !certificateDisposition) {
      toast.error('Debe registrarse la disposición del certificado antes de cerrar esta NC (§7.10.1.d).');
      return false;
    }

    return true;
  };

  return (
    <div className="flex flex-wrap gap-2">
      {allowed.map((to) => {
        const isDanger = to === "cancelada";
        const isClosure = kind === "nc" && to === "cerrada";
        const isSeguimiento = kind === "nc" && to === "en_seguimiento";
        return (
          <button
            key={to}
            disabled={loading}
            onClick={() => {
              if (to === "cancelada") setCancelTarget(to);
              else if (isClosure) {
                if (validateCierre()) setClosureTarget(true);
              }
              else if (isSeguimiento) {
                if (validateSeguimiento()) setSeguimientoTarget(true);
              }
              else if (to === "en_implementacion" && kind === "ac") {
                if (validateAcImplementacion()) onTransition(to);
              }
              else if (to === "en_implementacion" && kind === "nc") {
                if (validateImplementacion()) onTransition(to);
              }
              else onTransition(to);
            }}
            className="h-8 px-3.5 rounded text-sm font-semibold flex items-center gap-1.5 transition-opacity disabled:opacity-60 cursor-pointer"
            style={{
              backgroundColor: isDanger ? "transparent" : C.primary,
              color: isDanger ? C.danger : "#fff",
              border: isDanger ? `1px solid ${C.danger}` : "none",
            }}
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            {labels[to] ?? to}
          </button>
        );
      })}

      {cancelTarget && (
        <ReasonModal
          title="Cancelar"
          onCancel={() => setCancelTarget(null)}
          onConfirm={(reason) => {
            setCancelTarget(null);
            onTransition(cancelTarget, { cancellation_reason: reason });
          }}
        />
      )}

      {closureTarget && (
        <ClosureModal
          onCancel={() => setClosureTarget(false)}
          onConfirm={(closure_result) => {
            setClosureTarget(false);
            onTransition("cerrada", { closure_result });
          }}
        />
      )}

      {seguimientoTarget && (
        <QualityVerificationForm
          onCancel={() => setSeguimientoTarget(false)}
          onConfirm={(dueDate) => {
            setSeguimientoTarget(false);
            onTransition("en_seguimiento", { due_date_verification: dueDate });
          }}
        />
      )}
    </div>
  );
}

/* ─── Modal: razón de cancelación (compartido NC/AC) ────────── */
function ReasonModal({
  title,
  onCancel,
  onConfirm,
}: {
  title: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-xl p-5 shadow-2xl"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-md font-bold" style={{ color: "var(--text-main)" }}>
            {title}
          </h3>
          <button onClick={onCancel} style={{ color: "var(--text-muted)" }} className="cursor-pointer font-bold">
            <X size={18} />
          </button>
        </div>
        <label
          className="text-xs font-semibold uppercase tracking-wider block mb-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          Razón *
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="field-input w-full resize-none text-[12px]"
          placeholder="Explica el motivo de la cancelación…"
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="h-8 px-4 rounded text-sm font-bold cursor-pointer hover-bg"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}
          >
            Volver
          </button>
          <button
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="h-8 px-4 rounded text-xs font-bold cursor-pointer text-white disabled:opacity-50"
            style={{ backgroundColor: C.danger }}
          >
            Confirmar Cancelación
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/* ─── Modal: resultado de cierre (solo NC) ──────────────────── */
function ClosureModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (result: "eficaz" | "no_eficaz") => void;
}) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-xl p-5 shadow-2xl"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-md font-bold" style={{ color: "var(--text-main)" }}>
            Cerrar No Conformidad
          </h3>
          <button onClick={onCancel} style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>
        <p className="text-xs font-bold mb-4" style={{ color: "var(--text-muted)" }}>
          ¿Las acciones correctivas resultaron eficaces?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm("eficaz")}
            className="flex-1 h-9 rounded text-[11px] font-semibold text-white"
            style={{ backgroundColor: C.success }}
          >
            Eficaz
          </button>
          <button
            onClick={() => onConfirm("no_eficaz")}
            className="flex-1 h-9 rounded text-[11px] font-semibold text-white"
            style={{ backgroundColor: C.danger }}
          >
            No Eficaz
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
