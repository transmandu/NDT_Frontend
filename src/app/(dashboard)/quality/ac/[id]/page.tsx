"use client";

import { useCallback, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import qualityApi from "@/lib/qualityApi";
import { getApiError } from "@/lib/apiErrors";
import { useAuthStore } from "@/stores/authStore";
import { C } from "@/lib/colors";
import QualityStatusBadge from "@/components/quality/QualityStatusBadge";
import QualityTransitionButtons from "@/components/quality/QualityTransitionButtons";
import QualityAttachmentList from "@/components/quality/QualityAttachmentList";
import QualityAttachmentUploader from "@/components/quality/QualityAttachmentUploader";
import QualityTimeline from "@/components/quality/QualityTimeline";
import QualityRootCauseForm from "@/components/quality/QualityRootCauseForm";
import type { QualityUiSchema } from "@/types/quality";

export default function CorrectiveActionDetailPage() {
  const { id } = useParams();
  const acId = Number(id);
  const router = useRouter();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);

  const { data: ac, isLoading } = useQuery({
    queryKey: ["quality", "ac", acId],
    queryFn: () => qualityApi.getCorrectiveAction(acId),
  });

  const { data: schemas = [] } = useQuery({
    queryKey: ["quality", "method-schemas"],
    queryFn: () => qualityApi.listMethodSchemas(),
  });

  const { data: assignableUsers = [] } = useQuery({
    queryKey: ["quality", "assignable-users"],
    queryFn: () => qualityApi.listAssignableUsers(),
  });

  // Estado local solo para la selección manual (cuando la AC aún no tiene
  // método asignado); una vez que `ac.method_schema` llega del servidor, se usa
  // directamente — sin useEffect, para no disparar un set-state en cascada.
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>("");
  const methodSchemaId = ac?.method_schema ? String(ac.method_schema.id) : selectedSchemaId;

  const updateMut = useMutation({
    mutationFn: (payload: Parameters<typeof qualityApi.updateCorrectiveAction>[1]) =>
      qualityApi.updateCorrectiveAction(acId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality", "ac"] });
      qc.invalidateQueries({ queryKey: ["quality", "nc"] });
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  // Override local: una vez que el usuario edita el análisis de causa raíz,
  // esta es la fuente de verdad para lo que se muestra. Sin esto, el textarea
  // queda controlado por `ac.root_cause_analysis` (caché de React Query), que
  // solo se actualiza ~600ms + un round-trip DESPUÉS de que el usuario deja de
  // teclear — cada re-render intermedio (p.ej. cuando el debounce dispara el
  // guardado) pisaba lo recién escrito con el valor viejo del servidor,
  // sintiéndose como que "no da espacio" (la pausa natural tras una palabra
  // caía justo en la ventana de reversión).
  const [rcaOverride, setRcaOverride] = useState<QualityUiSchema | null>(null);
  // Ajuste de estado durante el render (no en un efecto) para descartar el
  // override al navegar a otra AC — mismo patrón que evita cascadas de
  // set-state que ya sigue `selectedSchemaId` arriba.
  const [rcaOverrideAcId, setRcaOverrideAcId] = useState(acId);
  if (rcaOverrideAcId !== acId) {
    setRcaOverrideAcId(acId);
    setRcaOverride(null);
  }
  const rcaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedRootCauseUpdate = useCallback(
    (rootCauseAnalysis: QualityUiSchema) => {
      setRcaOverride(rootCauseAnalysis);
      if (rcaTimerRef.current) clearTimeout(rcaTimerRef.current);
      rcaTimerRef.current = setTimeout(() => {
        updateMut.mutate({ root_cause_analysis: rootCauseAnalysis });
      }, 600);
    },
    [updateMut],
  );

  const transitionMut = useMutation({
    mutationFn: ({ to, extra }: { to: string; extra?: Record<string, unknown> }) =>
      qualityApi.transitionCorrectiveAction(acId, to, extra),
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["quality", "ac"] });
      qc.invalidateQueries({ queryKey: ["quality", "nc"] });
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const verifyMut = useMutation({
    mutationFn: ({ result, note }: { result: "eficaz" | "no_eficaz"; note: string }) =>
      qualityApi.verifyEffectiveness(acId, result, note || undefined),
    onSuccess: () => {
      toast.success("Verificación registrada");
      qc.invalidateQueries({ queryKey: ["quality", "ac"] });
      qc.invalidateQueries({ queryKey: ["quality", "nc"] });
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  if (isLoading || !ac) {
    return (
      <div className="panel rounded-md shadow-sm p-8 text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
        <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: C.primary }} />
        Cargando Acción Correctiva…
      </div>
    );
  }

  const selectedSchema = schemas.find((s) => s.id === Number(methodSchemaId));
  const canEdit =
    (role === "supervisor" || role === "auditor" || role === "admin") &&
    !["eficaz", "no_eficaz", "cancelada"].includes(ac.status);

  return (
    <div className="space-y-4 w-full animate-fadeIn max-w-5xl mx-auto">
      <button
        onClick={() => router.push("/quality/ac")}
        className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 cursor-pointer"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={16} /> Volver a Acciones Correctivas
      </button>

      {/* ── Header ── */}
      <div className="panel rounded-lg shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-bold text-[13px]" style={{ color: C.primary }}>{ac.code}</span>
              <QualityStatusBadge kind="ac" status={ac.status} />
              <Link
                href={`/quality/nc/${ac.nonconformity_id}`}
                className="text-sm font-mono font-semibold"
                title={`Ver No Conformidad #${ac.nonconformity_id}`}
                style={{ color: C.accent }}
              >
                NC-{ac.nonconformity_id} →
              </Link>
            </div>
            <h1 className="text-md font-bold" style={{ color: "var(--text-main)" }}>{ac.title}</h1>
          </div>
          <QualityTransitionButtons
            kind="ac"
            status={ac.status}
            loading={transitionMut.isPending}
            onTransition={(to, extra) => transitionMut.mutate({ to, extra })}
            rootCauseAnalysis={ac.root_cause_analysis}
            actionPlan={ac.action_plan as { steps: string[] } | null}
          />
        </div>

        <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--text-main)" }}>{ac.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
          {canEdit ? (
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Responsable</span>
              <select
                value={ac.assignee?.id ?? ""}
                onChange={(e) => updateMut.mutate({ assigned_to: e.target.value ? Number(e.target.value) : null })}
                className="field-input w-full max-w-xs text-xs"
              >
                <option value=""  className="text-xs">— Sin asignar —</option>
                {assignableUsers.map((u) => (
                  <option className="text-xs" key={u.id} value={u.id}>{u.name}{u.role ? ` (${u.role})` : ""}</option>
                ))}
              </select>
            </div>
          ) : (
            <Info label="Responsable" value={ac.assignee?.name} />
          )}
          <Info label="Fecha objetivo" value={ac.target_date ? new Date(ac.target_date + "T00:00:00").toLocaleDateString("es-ES") : null} />
          {ac.verified_at && <Info label="Verificado por" value={ac.verifier?.name} />}
          {ac.effectiveness_verification && <Info label="Nota de verificación" value={ac.effectiveness_verification} />}
        </div>
      </div>

      {/* ── Verificación de eficacia (solo Auditor/Admin, estado en_verificacion) ── */}
      {ac.status === "en_verificacion" && (role === "auditor" || role === "admin") && (
        <VerifyEffectivenessPanel
          loading={verifyMut.isPending}
          onVerify={(result, note) => verifyMut.mutate({ result, note })}
        />
      )}

      {/* ── Causa Raíz ── */}
      <div className="panel rounded-lg shadow-sm p-5">
        <h2 className="text-md font-bold mb-3" style={{ color: "var(--text-main)" }}>Análisis de Causa Raíz</h2>

        {!ac.method_schema && !methodSchemaId ? (
          <div className="space-y-1.5">
            <label className="text-sm font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
              Elegir método
            </label>
            <select
              disabled={!canEdit}
              value={methodSchemaId}
              onChange={(e) => {
                setSelectedSchemaId(e.target.value);
                if (e.target.value) updateMut.mutate({ method_schema_id: Number(e.target.value) });
              }}
              className="field-input w-full max-w-xs"
            >
              <option value="">— Seleccionar —</option>
              {schemas.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        ) : selectedSchema ? (
          <QualityRootCauseForm
            schema={selectedSchema}
            value={rcaOverride ?? ac.root_cause_analysis}
            readOnly={!canEdit}
            onChange={debouncedRootCauseUpdate}
          />
        ) : (
          <Loader2 size={16} className="animate-spin" style={{ color: C.primary }} />
        )}
      </div>

      {/* ── Plan de Acción ── */}
      <div className="panel rounded-lg shadow-sm p-5">
        <h2 className="text-md font-bold mb-3" style={{ color: "var(--text-main)" }}>Plan de Acción</h2>
        <ActionPlanEditor
          steps={(ac.action_plan?.steps as string[] | undefined) ?? []}
          readOnly={!canEdit}
          onChange={(steps) => updateMut.mutate({ action_plan: { steps } })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Adjuntos ── */}
        <div className="panel rounded-lg shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-md font-bold" style={{ color: "var(--text-main)" }}>Evidencias</h2>
            {!["eficaz", "no_eficaz", "cancelada"].includes(ac.status) && (
              <QualityAttachmentUploader kind="ac" id={acId} />
            )}
          </div>
          <QualityAttachmentList attachments={ac.attachments ?? []} />
        </div>

        {/* ── Timeline ── */}
        <div className="panel rounded-lg shadow-sm p-5">
          <h2 className="text-md font-bold mb-4" style={{ color: "var(--text-main)" }}>Línea de Tiempo</h2>
          <QualityTimeline kind="ac" id={acId} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p style={{ color: "var(--text-main)" }}>{value ?? "—"}</p>
    </div>
  );
}

/* ─── Verificación de eficacia ───────────────────────────────── */
function VerifyEffectivenessPanel({
  loading,
  onVerify,
}: {
  loading: boolean;
  onVerify: (result: "eficaz" | "no_eficaz", note: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: `${C.info}10`, border: `1px solid ${C.info}40` }}
    >
      <p className="text-smfont-bold mb-2" style={{ color: C.info }}>
        Verificación de Eficacia
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota de verificación (opcional)…"
        rows={2}
        className="field-input w-full resize-none mb-3 text-xs"
      />
      <div className="flex gap-2">
        <button
          disabled={loading}
          onClick={() => onVerify("eficaz", note)}
          className="h-8 px-4 rounded text-[11px] font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: C.success }}
        >
          Eficaz
        </button>
        <button
          disabled={loading}
          onClick={() => onVerify("no_eficaz", note)}
          className="h-8 px-4 rounded text-[11px] font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: C.danger }}
        >
          No Eficaz
        </button>
      </div>
    </div>
  );
}

/* ─── Plan de Acción — lista simple de pasos ─────────────────── */
function ActionPlanEditor({
  steps,
  readOnly,
  onChange,
}: {
  steps: string[];
  readOnly: boolean;
  onChange: (steps: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const addStep = () => {
    if (!draft.trim()) return;
    onChange([...steps, draft.trim()]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      {steps.length === 0 && (
        <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>Sin pasos definidos.</p>
      )}
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center gap-2 rounded px-3 py-1.5" style={{ backgroundColor: "var(--bg-app)", border: "1px solid var(--border-color)" }}>
          <span className="text-sm font-bold shrink-0" style={{ color: C.primary }}>{idx + 1}.</span>
          <span className="text-sm flex-1" style={{ color: "var(--text-main)" }}>{step}</span>
          {!readOnly && (
            <button className="cursor-pointer" onClick={() => onChange(steps.filter((_, i) => i !== idx))} style={{ color: "#ef4444" }}>
              <X size={16} />
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStep())}
            placeholder="Agregar paso…"
            className="field-input flex-1 text-sm"
          />
          <button onClick={addStep} className="h-8 px-3 rounded text-sm font-semibold flex items-center gap-1 cursor-pointer" style={{ border: `1px dashed ${C.primary}`, color: C.primary }}>
            <Plus size={14} /> Agregar
          </button>
        </div>
      )}
    </div>
  );
}
