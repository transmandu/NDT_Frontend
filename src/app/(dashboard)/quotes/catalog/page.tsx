
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
import type { CatalogItem } from "@/types/quotes";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X, Loader2, Package, AlertTriangle } from "lucide-react";
import { C } from "@/lib/colors";

const COLORS = { danger: C.danger };

const TYPE_LABELS: Record<string, string> = {
  epp: "EPP",
  equipment: "Equipo",
  material: "Material",
  consumable: "Consumible",
};

/* ─── Zod schema — refleja exactamente las reglas de CatalogItemController ─── */
const catalogItemSchema = z.object({
  code: z.string().min(1, "Código requerido").max(255),
  type: z.enum(["epp", "equipment", "material", "consumable"]),
  description: z.string().min(1, "Descripción requerida").max(255),
  unit: z.string().min(1, "Unidad requerida").max(255),
  unit_price_usd: z.coerce.number().min(0, "Debe ser ≥ 0"),
  depreciation_days: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z.number().int().min(1).nullable().optional(),
  ),
  default_waste_pct: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z.number().min(0).max(100).nullable().optional(),
  ),
  is_active: z.boolean().optional(),
});
type CatalogItemForm = z.infer<typeof catalogItemSchema>;

export default function QuoteCatalogPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CatalogItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === "admin";

  const { data: items = [], isLoading } = useQuery<CatalogItem[]>({
    queryKey: ["catalog-items", "admin"],
    queryFn: () =>
      api.get("/catalog-items?include_inactive=1").then((r) => r.data.data || []),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/catalog-items/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog-items"] });
      toast.success("Ítem eliminado");
      setDeleteTarget(null);
    },
    onError: (err: unknown) => toast.error(getApiError(err)),
  });

  const columns: ColumnDef<CatalogItem>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Código",
        cell: ({ getValue }) => (
          <span className="font-mono font-bold text-sm" style={{ color: C.primary }}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: "Tipo",
        enableColumnFilter: true,
        cell: ({ getValue }) => (
          <span
            className="text-sm px-2 py-0.5 rounded font-medium"
            style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}
          >
            {TYPE_LABELS[getValue<string>()] ?? getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: "Descripción",
        cell: ({ getValue }) => (
          <span className="text-xs" style={{ color: "var(--text-main)" }}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "unit",
        header: "Unidad",
        enableColumnFilter: false,
        cell: ({ getValue }) => (
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "unit_price_usd",
        header: "Precio Unit.",
        enableColumnFilter: false,
        cell: ({ getValue }) => (
          <span className="font-mono  text-sm" style={{ color: "var(--text-main)" }}>
            ${Number(getValue<string>()).toFixed(2)}
          </span>
        ),
      },
      {
        id: "depreciation_days",
        header: "Depreciación",
        enableColumnFilter: false,
        cell: ({ row }) =>
          row.original.depreciation_days ? (
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {row.original.depreciation_days} días
            </span>
          ) : (
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>—</span>
          ),
      },
      {
        id: "default_waste_pct",
        header: "% Merma",
        enableColumnFilter: false,
        cell: ({ row }) => (
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            {Number(row.original.default_waste_pct)}%
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
              cell: ({ row }: { row: { original: CatalogItem } }) => (
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
            } as ColumnDef<CatalogItem>,
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
          Cargando catálogo…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          searchPlaceholder="Buscar por código o descripción…"
          toolbarRight={
            canWrite && (
              <button
                onClick={() => {
                  setEditTarget(null);
                  setModalOpen(true);
                }}
                className="h-7 px-3 text-[11px] rounded font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 hover:opacity-90 whitespace-nowrap cursor-pointer"
                style={{ backgroundColor: C.accent, color: "#fff" }}
              >
                <Plus size={13} /> Nuevo Ítem
              </button>
            )
          }
        />
      )}

      <AnimatePresence>
        {modalOpen && (
          <CatalogItemModal item={editTarget} onClose={() => setModalOpen(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm
            label={`${deleteTarget.code} — ${deleteTarget.description}`}
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
function CatalogItemModal({
  item,
  onClose,
}: {
  item: CatalogItem | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!item;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CatalogItemForm>({
    resolver: zodResolver(catalogItemSchema) as Resolver<CatalogItemForm>,
    defaultValues: item
      ? {
          code: item.code,
          type: item.type as CatalogItemForm["type"],
          description: item.description,
          unit: item.unit,
          unit_price_usd: Number(item.unit_price_usd),
          depreciation_days: item.depreciation_days ? Number(item.depreciation_days) : undefined,
          default_waste_pct: item.default_waste_pct ? Number(item.default_waste_pct) : undefined,
          is_active: item.is_active,
        }
      : { type: "material", is_active: true },
  });

  const onSubmit = async (data: CatalogItemForm) => {
    try {
      if (isEdit) {
        await api.put(`/catalog-items/${item.id}`, data);
        toast.success("Ítem actualizado");
      } else {
        await api.post("/catalog-items", data);
        toast.success("Ítem creado");
      }
      qc.invalidateQueries({ queryKey: ["catalog-items"] });
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
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)", maxHeight: "94vh" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <div className="flex items-center gap-2">
            <Package size={16} style={{ color: C.primary }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              {isEdit ? `Editar — ${item.code}` : "Nuevo Ítem de Catálogo"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover-bg transition-colors cursor-pointer" style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Código *" error={errors.code?.message}>
                <input {...register("code")} className="field-input font-mono" placeholder="MAT-001" />
              </Field>
              <Field label="Tipo *" error={errors.type?.message}>
                <select {...register("type")} className="field-input">
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Descripción *" error={errors.description?.message}>
              <input {...register("description")} className="field-input" placeholder="Solvente limpiador para VT" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Unidad *" error={errors.unit?.message}>
                <input {...register("unit")} className="field-input" placeholder="litro, unidad, día…" />
              </Field>
              <Field label="Precio Unitario (USD) *" error={errors.unit_price_usd?.message}>
                <input {...register("unit_price_usd")} type="number" step="any" min="0" className="field-input font-mono" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Días de Depreciación"
                error={errors.depreciation_days?.message}
                hint="Solo aplica a equipos"
              >
                <input {...register("depreciation_days")} type="number" step="1" min="1" className="field-input font-mono" placeholder="—" />
              </Field>
              <Field
                label="% Merma por Defecto"
                error={errors.default_waste_pct?.message}
                hint="Solo aplica a materiales"
              >
                <input {...register("default_waste_pct")} type="number" step="any" min="0" max="100" className="field-input font-mono" placeholder="—" />
              </Field>
            </div>
            {isEdit && (
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" className="w-4 h-4 rounded accent-orange-500" {...register("is_active")} />
                <span className="text-[11px]" style={{ color: "var(--text-main)" }}>
                  Ítem activo (visible al armar cotizaciones)
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
              {isEdit ? "Guardar Cambios" : "Crear Ítem"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}

/* ─── Helpers compartidos por las pantallas de administración de Cotizaciones ─── */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{hint}</p>
      )}
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}

export function DeleteConfirm({
  label,
  description,
  onCancel,
  onConfirm,
  loading,
}: {
  label: string;
  /** Texto de advertencia; por defecto el de catálogo/tarifas (permanente + rechazo si está en uso). */
  description?: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="w-full max-w-sm rounded-xl p-6 shadow-2xl text-center"
        style={{ backgroundColor: "var(--bg-panel)", border: `2px solid ${COLORS.danger}20` }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${COLORS.danger}15` }}
        >
          <AlertTriangle size={24} style={{ color: COLORS.danger }} />
        </div>
        <h3 className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>¿Eliminar definitivamente?</h3>
        <p className="text-[11px] mb-6" style={{ color: "var(--text-muted)" }}>
          {description ?? (
            <>
              <strong>{label}</strong> se eliminará de forma <strong>permanente</strong> (no hay
              papelera). Si ya fue usado en alguna cotización, el sistema rechazará el borrado —
              en ese caso, desactívalo en su lugar.
            </>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="h-8 px-5 rounded text-[11px] font-medium hover-bg transition-colors"
            style={{ border: "1px solid var(--border-color)", color: "var(--text-muted)" }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="h-8 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: COLORS.danger }}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Eliminar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(content, document.body);
}
