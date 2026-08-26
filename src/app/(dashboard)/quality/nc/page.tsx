"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Loader2, X, AlertTriangle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import qualityApi from "@/lib/qualityApi";
import { getApiError } from "@/lib/apiErrors";
import { C } from "@/lib/colors";
import { DataTable } from "@/components/ui/data-table";
import QualityStatusBadge from "@/components/quality/QualityStatusBadge";
import type { Nonconformity } from "@/types/quality";
import type { CalibrationSession } from "@/types/calibration";

/* ─── Zod Schema ─────────────────────────────────────────── */
const ncSchema = z.object({
  title: z.string().min(3, "Mínimo 3 caracteres"),
  description: z.string().min(10, "Describe la no conformidad con más detalle"),
  // El <select> sin elegir envía "" — z.enum(...).optional() solo acepta
  // undefined, así que "" lo rechaza y el submit falla en silencio. Mismo
  // patrón de preprocess que ya usa instruments/page.tsx (factory_standard_id).
  risk_level: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(["bajo", "medio", "alto"]).optional(),
  ),
  impact_assessment: z.string().optional(),
  immediate_actions: z.string().optional(),
});
type NcForm = z.infer<typeof ncSchema>;

/* ─── Columns ─────────────────────────────────────────────── */
function buildColumns(): ColumnDef<Nonconformity>[] {
  return [
    {
      accessorKey: "code",
      header: "Código",
      cell: ({ getValue }) => (
        <span className="font-mono font-bold text-sm text-center" style={{ color: C.primary }}>
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "Título",
      cell: ({ row }) => (
        <div className="text-left">
          <p className="font-medium text-sm" style={{ color: "var(--text-main)" }}>
            {row.original.title}
          </p>
          {row.original.affects_issued_results && (
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold mt-0.5"
              style={{ color: C.danger }}
            >
              <AlertTriangle size={12} /> Afecta certificado emitido
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      meta: { tourId: "tour-nc-col-status" },
      enableColumnFilter: true,
      accessorFn: (row) => row.status,
      cell: ({ row }) => <div className="text-center"><QualityStatusBadge kind="nc" status={row.original.status} /></div>,
    },
    {
      accessorKey: "risk_level",
      header: "Riesgo",
      enableColumnFilter: true,
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        if (!v) return <span className="text-center block" style={{ color: "var(--text-muted)" }}>—</span>;
        return <span className="capitalize text-sm text-center block" style={{ color: "var(--text-main)" }}>{v}</span>;
      },
    },
    {
      id: "detector",
      header: "Detectada por",
      accessorFn: (row) => row.detector?.name ?? "",
      cell: ({ row }) => (
        <span className="text-sm text-center block" style={{ color: "var(--text-muted)" }}>
          {row.original.detector?.name ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "detected_at",
      header: "Detectada",
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return (
          <span className="text-sm font-mono text-center block" style={{ color: "var(--text-muted)" }}>
            {v ? new Date(v).toLocaleDateString("es-ES") : "—"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableColumnFilter: false,
      size: 60,
      cell: ({ row }) => (
        <Link 
          href={`/quality/nc/${row.original.id}`}
          className="text-sm font-semibold text-center block"
          style={{ color: C.primary }}
        >
          Ver →
        </Link>
      ),
    },
  ];
}

/* ══════════════════════════════════════════════════════════ */
export default function NonconformityListPage() {
  const [modalOpen, setModalOpen] = useState(false);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["quality", "nc"],
    queryFn: () => qualityApi.listNonconformities(),
  });

  const columns = useMemo(() => buildColumns(), []);

  return (
    <div className="space-y-3 w-full animate-fadeIn">
      {isLoading ? (
        <div className="panel rounded-md shadow-sm p-8 text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: C.primary }} />
          Cargando No Conformidades…
        </div>
      ) : (
        <div id="tour-nc-table">
          <DataTable
            columns={columns}
            data={list}
            searchPlaceholder="Buscar por código o título…"
            searchId="tour-nc-search"
            toolbarRight={
              <button
                id="tour-nc-add-btn"
                onClick={() => setModalOpen(true)}
                className="h-7 px-3 text-sm rounded font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 hover:opacity-90 whitespace-nowrap"
                style={{ backgroundColor: C.accent, color: "#fff" }}
              >
                <Plus size={16} /> Reportar NC
              </button>
            }
          />
        </div>
      )}

      <AnimatePresence>
        {modalOpen && <ReportNcModal onClose={() => setModalOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ─── Modal: Reportar NC ─────────────────────────────────────── */
function ReportNcModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NcForm>({ resolver: zodResolver(ncSchema) as Resolver<NcForm> });

  // Origen (opcional): vincular la NC a una sesión de calibración existente.
  // Fuera de react-hook-form porque es un campo condicional secundario.
  const [linkSession, setLinkSession] = useState(false);
  const [sourceSessionId, setSourceSessionId] = useState("");

  const { data: sessions = [] } = useQuery<CalibrationSession[]>({
    queryKey: ["calibrationSessions"],
    queryFn: () => api.get("/calibration/sessions").then((r) => r.data.data || []),
    enabled: linkSession,
  });

  const onSubmit = async (data: NcForm) => {
    try {
      const nc = await qualityApi.createNonconformity({
        ...data,
        ...(linkSession && sourceSessionId
          ? { source_type: "calibration_session", source_id: Number(sourceSessionId) }
          : {}),
      });
      qc.invalidateQueries({ queryKey: ["quality", "nc"] });
      toast.success(`NC ${nc.code} reportada correctamente`);
      onClose();
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)", maxHeight: "90vh" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <h2 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>
            Reportar No Conformidad
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-5 space-y-4 overflow-y-auto" style={{ maxHeight: "60vh" }}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Título *
              </label>
              <input {...register("title")} className="field-input w-full text-sm" placeholder="Resumen breve de la no conformidad" />
              {errors.title && <p className="text-sm text-red-400">{errors.title.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Descripción *
              </label>
              <textarea {...register("description")} rows={4} className="field-input w-full resize-none text-sm" placeholder="Describe qué ocurrió, dónde y cómo se detectó…" />
              {errors.description && <p className="text-sm text-red-400">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                  Nivel de riesgo
                </label>
                <select {...register("risk_level")} className="field-input w-full text-xs cursor-pointer">
                  <option value="">— Sin definir —</option>
                  <option value="bajo">Bajo</option>
                  <option value="medio">Medio</option>
                  <option value="alto">Alto</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                <input
                  className="cursor-pointer"
                  type="checkbox"
                  checked={linkSession}
                  onChange={(e) => {
                    setLinkSession(e.target.checked);
                    if (!e.target.checked) setSourceSessionId("");
                  }}
                />
                Vincular a una sesión de calibración
              </label>
              {linkSession && (
                <select
                  value={sourceSessionId}
                  onChange={(e) => setSourceSessionId(e.target.value)}
                  className="field-input w-full text-xs cursor-pointer"
                >
                  <option value="">— Seleccionar sesión —</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} — {s.instrument?.name ?? "Instrumento"} ({s.status})
                    </option>
                  ))}
                </select>
              )}
              {linkSession && (
                <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                  Si la sesión aún no está aprobada, quedará bloqueada hasta que se reanude o se cierre la investigación.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Acciones inmediatas (opcional)
              </label>
              <textarea {...register("immediate_actions")} rows={2} className="field-input w-full resize-none text-sm" placeholder="Contención aplicada de inmediato…" />
            </div>
          </div>

          <div
            className="px-6 py-4 flex items-center justify-end gap-3"
            style={{ borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-app)" }}
          >
            <button type="button" onClick={onClose} className="h-8 px-5 rounded text-sm font-bold cursor-pointer hover-bg" style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-8 px-5 rounded text-sm cursor-pointer font-bold text-white flex items-center gap-2  disabled:opacity-60"
              style={{ backgroundColor: C.accent }}
            >
              {isSubmitting && <Loader2 size={13} className="animate-spin" />}
              Reportar NC
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
