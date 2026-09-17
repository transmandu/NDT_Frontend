"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { getApiError } from "@/lib/apiErrors";
import { fmtDate } from "@/utils/formatters";
import type { QuoteParameter } from "@/types/quotes";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, X, Loader2, SlidersHorizontal, AlertTriangle, History } from "lucide-react";
import { C } from "@/lib/colors";
import { Field } from "@/app/(dashboard)/quotes/catalog/page";

/* ─── Zod schema — refleja exactamente las reglas de QuoteParameterController::store() ─── */
const parametersSchema = z.object({
  effective_from: z.string().min(1, "Fecha requerida"),
  exchange_rate_bs_usd: z.coerce.number().min(0, "Debe ser ≥ 0"),
  usd_cost_factor: z.coerce.number().min(0, "Debe ser ≥ 0"),
  salary_increase_factor: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z.number().min(0).nullable().optional(),
  ),
  fcas_factor: z.coerce.number().min(0, "Debe ser ≥ 0"),
  default_admin_pct: z.coerce.number().min(0).max(100),
  default_utility_pct: z.coerce.number().min(0).max(100),
  default_tax_pct: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z.number().min(0).max(100).nullable().optional(),
  ),
  rounding_significant_figures: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z.number().int().min(1).max(6).nullable().optional(),
  ),
  salary_reference: z.enum(["civ", "custom"]),
});
type ParametersForm = z.infer<typeof parametersSchema>;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-sm font-mono font-bold mt-0.5" style={{ color: "var(--text-main)" }}>
        {value}
      </p>
      {hint && (
        <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{hint}</p>
      )}
    </div>
  );
}

export default function QuoteParametersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === "admin";

  const {
    data: current,
    isLoading,
    isError,
  } = useQuery<QuoteParameter>({
    queryKey: ["quote-parameters", "current"],
    queryFn: () => api.get("/quote-parameters/current").then((r) => r.data.data),
  });

  const { data: history = [] } = useQuery<QuoteParameter[]>({
    queryKey: ["quote-parameters", "history"],
    queryFn: () => api.get("/quote-parameters").then((r) => r.data.data || []),
  });

  return (
    <div className="space-y-3 w-full animate-fadeIn">
      <div className="panel rounded-md shadow-sm p-5" style={{ border: "1px solid var(--border-color)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} style={{ color: C.primary }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              Versión Vigente
            </h2>
          </div>
          {canWrite && (
            <button
              onClick={() => setModalOpen(true)}
              className="h-7 px-3 text-[11px] rounded font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 hover:opacity-90 whitespace-nowrap cursor-pointer"
              style={{ backgroundColor: C.accent, color: "#fff" }}
            >
              <Plus size={13} /> Nueva Versión
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-6 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={18} className="animate-spin mx-auto mb-2" style={{ color: C.primary }} />
            Cargando parámetros…
          </div>
        ) : isError || !current ? (
          <div
            className="flex items-start gap-2 rounded px-3 py-3 text-[11px]"
            style={{ backgroundColor: `${C.danger}10`, border: `1px solid ${C.danger}30`, color: C.danger }}
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              No hay ninguna versión de parámetros activa todavía.
              {canWrite ? " Crea la primera con \"Nueva Versión\"." : " Contacta a un administrador."}
            </span>
          </div>
        ) : (
          <>
            <p className="text-[10px] mb-4" style={{ color: "var(--text-muted)" }}>
              Vigente desde el {fmtDate(current.effective_from)} — estos valores se congelan en
              cada cotización al crearla, así que cambiarlos aquí nunca afecta cotizaciones ya
              emitidas.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat label="Tasa Bs/USD" value={Number(current.exchange_rate_bs_usd).toFixed(4)} />
              <Stat label="Factor Costo USD" value={Number(current.usd_cost_factor).toFixed(4)} />
              <Stat
                label="Factor FCAS"
                value={Number(current.fcas_factor).toFixed(4)}
                hint="Recargo sobre mano de obra"
              />
              <Stat
                label="Aumento Salarial"
                value={Number(current.salary_increase_factor).toFixed(4)}
              />
              <Stat label="% Administración" value={`${Number(current.default_admin_pct)}%`} />
              <Stat label="% Utilidad" value={`${Number(current.default_utility_pct)}%`} />
              <Stat label="% IVA" value={`${Number(current.default_tax_pct)}%`} />
              <Stat
                label="Cifras Significativas"
                value={String(current.rounding_significant_figures)}
                hint="Redondeo de precios"
              />
            </div>
            <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border-color)" }}>
              <span
                className="text-[9px] px-2 py-0.5 rounded font-medium uppercase tracking-wider"
                style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}
              >
                Referencia salarial: {current.salary_reference === "civ" ? "CIV (tabulador oficial)" : "Personalizado"}
              </span>
            </div>
          </>
        )}
      </div>

      {history.length > 1 && (
        <div className="panel rounded-md shadow-sm p-5" style={{ border: "1px solid var(--border-color)" }}>
          <div className="flex items-center gap-2 mb-3">
            <History size={14} style={{ color: "var(--text-muted)" }} />
            <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-main)" }}>
              Historial de Versiones
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  {["Vigente desde", "Tasa Bs/USD", "FCAS", "% Admin", "% Utilidad", "% IVA", "Estado"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2 px-2 font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td className="py-1.5 px-2 font-mono">{fmtDate(h.effective_from)}</td>
                    <td className="py-1.5 px-2 font-mono">{Number(h.exchange_rate_bs_usd).toFixed(4)}</td>
                    <td className="py-1.5 px-2 font-mono">{Number(h.fcas_factor).toFixed(4)}</td>
                    <td className="py-1.5 px-2 font-mono">{Number(h.default_admin_pct)}%</td>
                    <td className="py-1.5 px-2 font-mono">{Number(h.default_utility_pct)}%</td>
                    <td className="py-1.5 px-2 font-mono">{Number(h.default_tax_pct)}%</td>
                    <td className="py-1.5 px-2">
                      {h.is_active ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: `${C.success}15`, color: C.success }}>
                          VIGENTE
                        </span>
                      ) : (
                        <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <NewParametersModal current={current} onClose={() => setModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  MODAL — Nueva Versión                                       */
/* ══════════════════════════════════════════════════════════ */
function NewParametersModal({
  current,
  onClose,
}: {
  current: QuoteParameter | undefined;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ParametersForm>({
    resolver: zodResolver(parametersSchema) as Resolver<ParametersForm>,
    defaultValues: current
      ? {
          effective_from: new Date().toISOString().slice(0, 10),
          exchange_rate_bs_usd: Number(current.exchange_rate_bs_usd),
          usd_cost_factor: Number(current.usd_cost_factor),
          salary_increase_factor: Number(current.salary_increase_factor),
          fcas_factor: Number(current.fcas_factor),
          default_admin_pct: Number(current.default_admin_pct),
          default_utility_pct: Number(current.default_utility_pct),
          default_tax_pct: Number(current.default_tax_pct),
          rounding_significant_figures: Number(current.rounding_significant_figures),
          salary_reference: current.salary_reference as ParametersForm["salary_reference"],
        }
      : {
          effective_from: new Date().toISOString().slice(0, 10),
          salary_reference: "custom",
        },
  });

  const mutation = useMutation({
    mutationFn: (data: ParametersForm) => api.post("/quote-parameters", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote-parameters"] });
      toast.success("Nueva versión activada");
      onClose();
    },
    onError: (err: unknown) => toast.error(getApiError(err)),
  });

  const onSubmit = (data: ParametersForm) => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    mutation.mutate(data);
  };

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)", maxHeight: "94vh" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} style={{ color: C.primary }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              Nueva Versión de Parámetros
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover-bg transition-colors cursor-pointer" style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            <div
              className="flex items-start gap-2 rounded px-3 py-2.5 text-[11px]"
              style={{ backgroundColor: `${C.warning}12`, border: `1px solid ${C.warning}40`, color: C.warning }}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                Esto desactiva la versión vigente y activa esta como la nueva. Las cotizaciones ya
                emitidas no se ven afectadas (sus valores quedan congelados), pero{" "}
                <strong>toda cotización nueva desde este momento usará estos valores</strong>. No
                se puede editar ni revertir — solo crear otra versión más.
              </span>
            </div>

            <Field label="Vigente Desde *" error={errors.effective_from?.message}>
              <input {...register("effective_from")} type="date" className="field-input font-mono" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Tasa Bs/USD *" error={errors.exchange_rate_bs_usd?.message}>
                <input {...register("exchange_rate_bs_usd")} type="number" step="any" min="0" className="field-input font-mono" />
              </Field>
              <Field label="Factor Costo USD *" error={errors.usd_cost_factor?.message} hint="Sobrecosto de importación">
                <input {...register("usd_cost_factor")} type="number" step="any" min="0" className="field-input font-mono" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Factor FCAS *" error={errors.fcas_factor?.message} hint="Recargo sobre mano de obra">
                <input {...register("fcas_factor")} type="number" step="any" min="0" className="field-input font-mono" />
              </Field>
              <Field label="Aumento Salarial" error={errors.salary_increase_factor?.message}>
                <input {...register("salary_increase_factor")} type="number" step="any" min="0" className="field-input font-mono" placeholder="1.0000" />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="% Administración *" error={errors.default_admin_pct?.message}>
                <input {...register("default_admin_pct")} type="number" step="any" min="0" max="100" className="field-input font-mono" />
              </Field>
              <Field label="% Utilidad *" error={errors.default_utility_pct?.message}>
                <input {...register("default_utility_pct")} type="number" step="any" min="0" max="100" className="field-input font-mono" />
              </Field>
              <Field label="% IVA" error={errors.default_tax_pct?.message}>
                <input {...register("default_tax_pct")} type="number" step="any" min="0" max="100" className="field-input font-mono" placeholder="16" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Cifras Significativas"
                error={errors.rounding_significant_figures?.message}
                hint="Redondeo de precios finales (1–6)"
              >
                <input {...register("rounding_significant_figures")} type="number" step="1" min="1" max="6" className="field-input font-mono" placeholder="3" />
              </Field>
              <Field label="Referencia Salarial *" error={errors.salary_reference?.message}>
                <select {...register("salary_reference")} className="field-input">
                  <option value="custom">Personalizado</option>
                  <option value="civ">CIV (tabulador oficial)</option>
                </select>
              </Field>
            </div>

            {confirming && (
              <div
                className="flex items-start gap-2 rounded px-3 py-2.5 text-[11px] font-medium"
                style={{ backgroundColor: `${C.danger}10`, border: `1px solid ${C.danger}40`, color: C.danger }}
              >
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>Presiona &quot;Confirmar y Activar&quot; para aplicar el cambio ahora mismo.</span>
              </div>
            )}
          </div>

          <div
            className="px-6 py-4 flex items-center justify-end gap-3 shrink-0"
            style={{ borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-app)" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 rounded text-[11px] font-medium transition-colors hover-bg cursor-pointer"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="h-8 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 transition-opacity disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: confirming ? C.danger : C.accent }}
            >
              {(isSubmitting || mutation.isPending) && <Loader2 size={13} className="animate-spin" />}
              {confirming ? "Confirmar y Activar" : "Continuar"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
