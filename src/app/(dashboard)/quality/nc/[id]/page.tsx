"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Plus, RefreshCw, X } from "lucide-react";
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
import QualityIssuedResultsBanner from "@/components/quality/QualityIssuedResultsBanner";

export default function NonconformityDetailPage() {
  const { id } = useParams();
  const ncId = Number(id);
  const router = useRouter();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const [acModalOpen, setAcModalOpen] = useState(false);

  const { data: nc, isLoading } = useQuery({
    queryKey: ["quality", "nc", ncId],
    queryFn: () => qualityApi.getNonconformity(ncId),
  });

  const transitionMut = useMutation({
    mutationFn: ({ to, extra }: { to: string; extra?: Record<string, unknown> }) =>
      qualityApi.transitionNonconformity(ncId, to, extra),
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["quality", "nc"] });
      qc.invalidateQueries({ queryKey: ["quality", "ac"] });
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const resumeMut = useMutation({
    mutationFn: () => qualityApi.resumeNonconformity(ncId),
    onSuccess: () => {
      toast.success("Trabajo reanudado — la sesión ya no está bloqueada");
      qc.invalidateQueries({ queryKey: ["quality", "nc"] });
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  if (isLoading || !nc) {
    return (
      <div className="panel rounded-md shadow-sm p-8 text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
        <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: C.primary }} />
        Cargando No Conformidad…
      </div>
    );
  }

  const canResume =
    (role === "supervisor" || role === "auditor" || role === "admin") &&
    nc.source_type === "calibration_session" &&
    !nc.resumed_at &&
    !["cerrada", "cancelada"].includes(nc.status);

  return (
    <div className="space-y-4 w-full animate-fadeIn max-w-5xl mx-auto">
      <button
        onClick={() => router.push("/quality/nc")}
        className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 cursor-pointer"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={16} /> Volver a No Conformidades
      </button>

      {/* ── Header ── */}
      <div className="panel rounded-lg shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-bold text-sm" style={{ color: C.primary }}>
                {nc.code}
              </span>
              <QualityStatusBadge kind="nc" status={nc.status} />
              {nc.risk_level && (
                <span className="text-sm capitalize px-2 py-0.5 rounded" style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}>
                  Riesgo {nc.risk_level}
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>
              {nc.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {canResume && (
              <button
                onClick={() => resumeMut.mutate()}
                disabled={resumeMut.isPending}
                className="h-8 px-3 rounded text-md font-semibold flex items-center gap-1.5 disabled:opacity-60"
                style={{ border: `1px solid ${C.info}`, color: C.info }}
              >
                {resumeMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Reanudar Trabajo
              </button>
            )}
            <QualityTransitionButtons
              kind="nc"
              status={nc.status}
              loading={transitionMut.isPending}
              onTransition={(to, extra) => transitionMut.mutate({ to, extra })}
              correctiveActions={nc.corrective_actions ?? []}
              affectsIssuedResults={nc.affects_issued_results}
              certificateDisposition={nc.certificate_disposition}
            />
          </div>
        </div>

        <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--text-main)" }}>
          {nc.description}
        </p>

        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <Info label="Detectada por" value={nc.detector?.name} />
          <Info label="Fecha de detección" value={nc.detected_at ? new Date(nc.detected_at).toLocaleDateString("es-ES") : null} />
          {nc.due_date_verification && (
            <Info label="Verificación de eficacia" value={new Date(nc.due_date_verification + "T00:00:00").toLocaleDateString("es-ES")} />
          )}
          {nc.status === "cancelada" && (
            <>
              <Info label="Cancelada por" value={nc.canceller?.name} />
              <Info label="Razón de cancelación" value={nc.cancellation_reason} />
            </>
          )}
          {nc.status === "cerrada" && (
            <>
              <Info label="Cerrada por" value={nc.closer?.name} />
              <Info label="Resultado" value={nc.closure_result === "eficaz" ? "Eficaz" : "No Eficaz"} />
            </>
          )}
        </div>

        {(nc.impact_assessment || nc.immediate_actions) && (
          <div className="grid grid-cols-2 gap-4 mt-3 pt-3" style={{ borderTop: "1px solid var(--border-color)" }}>
            {nc.impact_assessment && (
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                  Evaluación de impacto
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-main)" }}>{nc.impact_assessment}</p>
              </div>
            )}
            {nc.immediate_actions && (
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                  Acciones inmediatas
                </p>
                <p className="text-sm" style={{ color: "var(--text-main)" }}>{nc.immediate_actions}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <QualityIssuedResultsBanner nonconformity={nc} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Acciones Correctivas ── */}
        <div className="panel rounded-lg shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              Acciones Correctivas
            </h2>
            {(role === "supervisor" || role === "auditor" || role === "admin") && ["plan_accion", "en_implementacion", "en_seguimiento"].includes(nc.status) && (
              <button
                onClick={() => setAcModalOpen(true)}
                className="h-6 px-2 rounded text-sm font-semibold flex items-center gap-1 cursor-pointer"
                style={{ border: `1px dashed ${C.primary}`, color: C.primary }}
              >
                <Plus size={13} /> Nueva AC
              </button>
            )}
          </div>

          {(nc.corrective_actions?.length ?? 0) === 0 ? (
            <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
              Sin acciones correctivas vinculadas.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {nc.corrective_actions!.map((ac) => (
                <Link
                  key={ac.id}
                  href={`/quality/ac/${ac.id}`}
                  className="flex items-center justify-between px-3 py-2 rounded hover-bg transition-colors"
                  style={{ border: "1px solid var(--border-color)" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-bold" style={{ color: C.primary }}>{ac.code}</p>
                    <p className="text-sm truncate" style={{ color: "var(--text-main)" }}>{ac.title}</p>
                  </div>
                  <QualityStatusBadge kind="ac" status={ac.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Adjuntos ── */}
        <div className="panel rounded-lg shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-md font-bold" style={{ color: "var(--text-main)" }}>
              Evidencias
            </h2>
            {!["cerrada", "cancelada"].includes(nc.status) && (
              <QualityAttachmentUploader kind="nc" id={ncId} />
            )}
          </div>
          <QualityAttachmentList attachments={nc.attachments ?? []} />
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="panel rounded-lg shadow-sm p-5">
        <h2 className="text-md font-bold mb-4" style={{ color: "var(--text-main)" }}>
          Línea de Tiempo
        </h2>
        <QualityTimeline kind="nc" id={ncId} />
      </div>

      {acModalOpen && <CreateAcModal nonconformityId={ncId} onClose={() => setAcModalOpen(false)} />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p style={{ color: "var(--text-main)" }}>{value ?? "—"}</p>
    </div>
  );
}

/* ─── Modal: Nueva Acción Correctiva ─────────────────────────── */
function CreateAcModal({ nonconformityId, onClose }: { nonconformityId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const { data: schemas = [] } = useQuery({
    queryKey: ["quality", "method-schemas"],
    queryFn: () => qualityApi.listMethodSchemas(),
  });
  const { data: assignableUsers = [] } = useQuery({
    queryKey: ["quality", "assignable-users"],
    queryFn: () => qualityApi.listAssignableUsers(),
  });
  const [methodSchemaId, setMethodSchemaId] = useState<string>("");

  const mut = useMutation({
    mutationFn: () =>
      qualityApi.createCorrectiveAction({
        nonconformity_id: nonconformityId,
        title,
        description,
        method_schema_id: methodSchemaId ? Number(methodSchemaId) : undefined,
        assigned_to: assignedTo ? Number(assignedTo) : undefined,
        target_date: targetDate || undefined,
      }),
    onSuccess: (ac) => {
      toast.success(`AC ${ac.code} creada`);
      qc.invalidateQueries({ queryKey: ["quality", "nc"] });
      qc.invalidateQueries({ queryKey: ["quality", "ac"] });
      onClose();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)" }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>Nueva Acción Correctiva</h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Título *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="field-input w-full text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Descripción *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="field-input w-full resize-none text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Método de causa raíz</label>
              <select value={methodSchemaId} onChange={(e) => setMethodSchemaId(e.target.value)} className="field-input w-full text-xs">
                <option value="">— Elegir después —</option>
                {schemas.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Fecha objetivo</label>
              <input type="date" value={targetDate} min={todayStr} onChange={(e) => setTargetDate(e.target.value)} className="field-input w-full text-xs" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Responsable</label>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="field-input w-full text-xs">
                <option value="">— Sin asignar —</option>
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}{u.role ? ` (${u.role})` : ""}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 flex items-center justify-end gap-3" style={{ borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-app)" }}>
          <button onClick={onClose} className="h-8 px-4 rounded text-[11px] font-medium hover-bg" style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>Cancelar</button>
          <button
            disabled={!title.trim() || !description.trim() || mut.isPending}
            onClick={() => {
              if (targetDate && targetDate < todayStr) {
                toast.error("La fecha objetivo no puede ser en el pasado");
                return;
              }
              mut.mutate();
            }}
            className="h-8 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: C.accent }}
          >
            {mut.isPending && <Loader2 size={13} className="animate-spin" />}
            Crear AC
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
