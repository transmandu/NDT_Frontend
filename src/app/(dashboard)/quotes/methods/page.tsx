"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { getApiError } from "@/lib/apiErrors";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { QuoteMethod } from "@/types/quotes";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Pencil, X, Loader2, FlaskConical } from "lucide-react";
import { C } from "@/lib/colors";
import { Field } from "@/app/(dashboard)/quotes/catalog/page";
import QuoteLinesEditor, {
  linesFromSchema,
  serializeLines,
  validateLines,
  type LinesState,
  type MethodUiSchema,
} from "@/components/quotes/QuoteLinesEditor";

/* ─── Zod schema — refleja exactamente las reglas de QuoteMethodController ─── */
const quoteMethodSchema = z.object({
  code: z.string().min(1, "Código requerido").max(255),
  name: z.string().min(1, "Nombre requerido").max(255),
  default_unit: z.string().max(255).optional().or(z.literal("")),
  is_active: z.boolean().optional(),
});
type QuoteMethodForm = z.infer<typeof quoteMethodSchema>;

export default function QuoteMethodsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<QuoteMethod | null>(null);
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === "admin";

  const { data: methods = [], isLoading } = useQuery<QuoteMethod[]>({
    queryKey: ["quote-methods", "admin"],
    queryFn: () =>
      api.get("/quote-methods?include_inactive=1").then((r) => r.data.data || []),
  });

  const columns: ColumnDef<QuoteMethod>[] = useMemo(
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
        accessorKey: "name",
        header: "Nombre",
        cell: ({ getValue }) => (
          <span className="text-sm" style={{ color: "var(--text-main)" }}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "default_unit",
        header: "Unidad por Defecto",
        enableColumnFilter: false,
        cell: ({ getValue }) => (
          <span className="font-mono text-sm" style={{ color: "var(--text-muted)" }}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        id: "schema_summary",
        header: "Plantilla de partida",
        enableColumnFilter: false,
        enableSorting: false,
        cell: ({ row }) => {
          const schema = (row.original.ui_schema ?? {}) as MethodUiSchema;
          const counts = [
            ["Mat.", schema.materials],
            ["Eq.", schema.equipment],
            ["MO", schema.labor],
          ]
            .filter(([, arr]) => Array.isArray(arr) && arr.length > 0)
            .map(([label, arr]) => `${label} ${(arr as unknown[]).length}`);
          return (
            <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
              {counts.length > 0 ? counts.join(" · ") : "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: "Estado",
        enableColumnFilter: true,
        cell: ({ getValue }) => (
          <span
            className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
            style={{
              backgroundColor: getValue<boolean>() ? `${C.success}15` : `${C.danger}15`,
              color: getValue<boolean>() ? C.success : C.danger,
              border: `1px solid ${getValue<boolean>() ? C.success : C.danger}30`,
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
              size: 48,
              cell: ({ row }: { row: { original: QuoteMethod } }) => (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setEditTarget(row.original);
                      setModalOpen(true);
                    }}
                    className="p-1.5 rounded hover-bg transition-colors cursor-pointer"
                    title="editar"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              ),
            } as ColumnDef<QuoteMethod>,
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
          Cargando métodos…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={methods}
          searchPlaceholder="Buscar por código o nombre…"
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
                <Plus size={13} /> Nuevo Método
              </button>
            )
          }
        />
      )}

      <AnimatePresence>
        {modalOpen && (
          <QuoteMethodModal method={editTarget} onClose={() => setModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  MODAL                                                      */
/* ══════════════════════════════════════════════════════════ */
function QuoteMethodModal({
  method,
  onClose,
}: {
  method: QuoteMethod | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!method;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<QuoteMethodForm>({
    resolver: zodResolver(quoteMethodSchema) as Resolver<QuoteMethodForm>,
    defaultValues: method
      ? {
          code: method.code,
          name: method.name,
          default_unit: method.default_unit,
          is_active: method.is_active,
        }
      : { default_unit: "Serv", is_active: true },
  });

  const [lines, setLines] = useState<LinesState>(() =>
    linesFromSchema(method?.ui_schema as MethodUiSchema | undefined),
  );

  const onSubmit = async (data: QuoteMethodForm) => {
    const linesError = validateLines(lines);
    if (linesError) {
      toast.error(linesError);
      return;
    }
    try {
      // Se conservan las claves del esquema que este editor no maneja (si las hubiera).
      const payload = { ...data, ui_schema: { ...(method?.ui_schema ?? {}), ...serializeLines(lines) } };
      if (isEdit) {
        await api.put(`/quote-methods/${method.id}`, payload);
        toast.success("Método actualizado");
      } else {
        await api.post("/quote-methods", payload);
        toast.success("Método creado");
      }
      qc.invalidateQueries({ queryKey: ["quote-methods"] });
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
        className="w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)", maxHeight: "94vh" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <div className="flex items-center gap-2">
            <FlaskConical size={16} style={{ color: C.primary }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              {isEdit ? `Editar — ${method.code}` : "Nuevo Método NDT"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover-bg transition-colors cursor-pointer" style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Código *" error={errors.code?.message} hint="VT, UT, MT_S, PT_V…">
                <input {...register("code")} className="field-input font-mono" placeholder="VT" />
              </Field>
              <Field label="Unidad por Defecto" error={errors.default_unit?.message}>
                <input {...register("default_unit")} className="field-input" placeholder="Serv" />
              </Field>
            </div>
            <Field label="Nombre *" error={errors.name?.message}>
              <input {...register("name")} className="field-input" placeholder="Inspección Visual" />
            </Field>
            <div className="space-y-3 rounded-md p-4" style={{ backgroundColor: "var(--bg-app)", border: "1px solid var(--border-color)" }}>
              <div>
                <p className="text-[11px] font-bold" style={{ color: "var(--text-main)" }}>
                  Plantilla de partida
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Materiales, equipo y mano de obra que se precargan al elegir este método en una cotización.
                  El usuario podrá ajustar cantidades o quitar y agregar líneas en cada partida; cambiar la
                  plantilla aquí no modifica cotizaciones ya creadas.
                </p>
              </div>
              <QuoteLinesEditor value={lines} onChange={setLines} />
            </div>
            {isEdit && (
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" className="w-4 h-4 rounded accent-orange-500" {...register("is_active")} />
                <span className="text-[11px]" style={{ color: "var(--text-main)" }}>
                  Método activo (visible al armar cotizaciones)
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
              {isEdit ? "Guardar Cambios" : "Crear Método"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
