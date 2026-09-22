"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { getApiError } from "@/lib/apiErrors";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { LaborRate } from "@/types/quotes";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X, Loader2, Coins } from "lucide-react";
import { C } from "@/lib/colors";
import { Field, DeleteConfirm } from "@/app/(dashboard)/quotes/catalog/page";

const COLORS = { danger: C.danger };

/* ─── Zod schema — refleja exactamente las reglas de LaborRateController ─── */
const laborRateSchema = z.object({
  role_name: z.string().min(1, "Nombre del rol requerido").max(255),
  daily_rate_usd: z.coerce.number().min(0, "Debe ser ≥ 0"),
  civ_level_code: z.string().max(255).optional().or(z.literal("")),
  sort_order: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z.number().int().min(0).nullable().optional(),
  ),
  is_active: z.boolean().optional(),
});
type LaborRateForm = z.infer<typeof laborRateSchema>;

export default function LaborRatesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LaborRate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LaborRate | null>(null);
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === "admin";

  const { data: rates = [], isLoading } = useQuery<LaborRate[]>({
    queryKey: ["labor-rates", "admin"],
    queryFn: () =>
      api.get("/labor-rates?include_inactive=1").then((r) => r.data.data || []),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/labor-rates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["labor-rates"] });
      toast.success("Tarifa eliminada");
      setDeleteTarget(null);
    },
    onError: (err: unknown) => toast.error(getApiError(err)),
  });

  const columns: ColumnDef<LaborRate>[] = useMemo(
    () => [
      {
        accessorKey: "role_name",
        header: "Rol",
        cell: ({ getValue }) => (
          <span className="font-medium text-sm" style={{ color: "var(--text-main)" }}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "daily_rate_usd",
        header: "Tarifa Diaria",
        enableColumnFilter: false,
        cell: ({ getValue }) => (
          <span className="font-mono text-sm" style={{ color: "var(--text-main)" }}>
            ${Number(getValue<string>()).toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: "civ_level_code",
        header: "Nivel CIV",
        enableColumnFilter: false,
        cell: ({ getValue }) => (
          <span className="font-mono text-sm" style={{ color: "var(--text-muted)" }}>
            {getValue<string>() ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "sort_order",
        header: "Orden",
        enableColumnFilter: false,
        cell: ({ getValue }) => (
          <span className="font-mono text-sm" style={{ color: "var(--text-muted)" }}>
            {getValue<string | null>() ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Estado",
        enableColumnFilter: true,
        cell: ({ getValue }) => (
          <span
            className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
            style={{
              backgroundColor: getValue<boolean>() ? `${C.success}15` : `${COLORS.danger}15`,
              color: getValue<boolean>() ? C.success : COLORS.danger,
              border: `1px solid ${getValue<boolean>() ? C.success : COLORS.danger}30`,
            }}
          >
            {getValue<boolean>() ? "Activo" : "Inactivo"}
          </span>
        ),
      },
      ...(canWrite
        ? [
            {
              id: "actions",
              header: "",
              enableSorting: false,
              enableColumnFilter: false,
              size: 70,
              cell: ({ row }: { row: { original: LaborRate } }) => (
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => {
                      setEditTarget(row.original);
                      setModalOpen(true);
                    }}
                    className="p-1.5 rounded hover-bg transition-colors cursor-pointer"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(row.original)}
                    className="p-1.5 rounded hover-bg transition-colors cursor-pointer"
                    style={{ color: COLORS.danger }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ),
            } as ColumnDef<LaborRate>,
          ]
        : []),
    ],
    [canWrite],
  );

  return (
    <div className="space-y-3 w-full animate-fadeIn">
      {isLoading ? (
        <div
          className="panel rounded-md shadow-sm p-8 text-center text-[11px]"
          style={{ color: "var(--text-muted)" }}
        >
          <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: C.primary }} />
          Cargando tarifas…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rates}
          searchPlaceholder="Buscar por rol…"
          toolbarRight={
            canWrite && (
              <button
                onClick={() => {
                  setEditTarget(null);
                  setModalOpen(true);
                }}
                className="h-7 px-3 text-[11px] rounded font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 hover:opacity-90 whitespace-nowrap"
                style={{ backgroundColor: C.accent, color: "#fff" }}
              >
                <Plus size={13} /> Nueva Tarifa
              </button>
            )
          }
        />
      )}

      <AnimatePresence>
        {modalOpen && (
          <LaborRateModal rate={editTarget} onClose={() => setModalOpen(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm
            label={deleteTarget.role_name}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => deleteMut.mutate(deleteTarget.id)}
            loading={deleteMut.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  MODAL                                                      */
/* ══════════════════════════════════════════════════════════ */
function LaborRateModal({
  rate,
  onClose,
}: {
  rate: LaborRate | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!rate;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LaborRateForm>({
    resolver: zodResolver(laborRateSchema) as Resolver<LaborRateForm>,
    defaultValues: rate
      ? {
          role_name: rate.role_name,
          daily_rate_usd: Number(rate.daily_rate_usd),
          civ_level_code: rate.civ_level_code ?? "",
          sort_order: rate.sort_order ? Number(rate.sort_order) : undefined,
          is_active: rate.is_active,
        }
      : { is_active: true },
  });

  const onSubmit = async (data: LaborRateForm) => {
    try {
      const payload = { ...data, civ_level_code: data.civ_level_code || null };
      if (isEdit) {
        await api.put(`/labor-rates/${rate.id}`, payload);
        toast.success("Tarifa actualizada");
      } else {
        await api.post("/labor-rates", payload);
        toast.success("Tarifa creada");
      }
      qc.invalidateQueries({ queryKey: ["labor-rates"] });
      onClose();
    } catch (err: unknown) {
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
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)", maxHeight: "94vh" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <div className="flex items-center gap-2">
            <Coins size={16} style={{ color: C.primary }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              {isEdit ? `Editar — ${rate.role_name}` : "Nueva Tarifa de Mano de Obra"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover-bg transition-colors cursor-pointer" style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            <Field label="Nombre del Rol *" error={errors.role_name?.message}>
              <input {...register("role_name")} className="field-input" placeholder="Inspector NDT Nivel II" />
            </Field>
            <Field label="Tarifa Diaria (USD) *" error={errors.daily_rate_usd?.message}>
              <input {...register("daily_rate_usd")} type="number" step="any" min="0" className="field-input font-mono" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nivel CIV" error={errors.civ_level_code?.message} hint="Certificación (opcional)">
                <input {...register("civ_level_code")} className="field-input" placeholder="Nivel II" />
              </Field>
              <Field label="Orden de Visualización" error={errors.sort_order?.message}>
                <input {...register("sort_order")} type="number" step="1" min="0" className="field-input font-mono" placeholder="0" />
              </Field>
            </div>
            {isEdit && (
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" className="w-4 h-4 rounded accent-orange-500" {...register("is_active")} />
                <span className="text-[11px]" style={{ color: "var(--text-main)" }}>
                  Tarifa activa (visible al armar cotizaciones)
                </span>
              </label>
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
              disabled={isSubmitting}
              className="h-8 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 transition-opacity disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: C.accent }}
            >
              {isSubmitting && <Loader2 size={13} className="animate-spin" />}
              {isEdit ? "Guardar Cambios" : "Crear Tarifa"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
