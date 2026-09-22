"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Loader2, X, FlaskConical } from "lucide-react";
import api from "@/lib/api";
import { getApiError } from "@/lib/apiErrors";
import { C } from "@/lib/colors";
import { Field } from "@/app/(dashboard)/quotes/catalog/page";
import type { QuoteMethod, QuoteItem, CreateQuoteItemPayload } from "@/types/quotes";
import QuoteLinesEditor, {
  emptyLines,
  linesFromSchema,
  serializeLines,
  validateLines,
  type LinesState,
  type MethodUiSchema,
} from "@/components/quotes/QuoteLinesEditor";

export default function ItemBuilder({
  quoteId,
  methods,
  onAdded,
  onCancel,
}: {
  quoteId: number;
  methods: QuoteMethod[];
  onAdded: (item: QuoteItem) => void;
  onCancel: () => void;
}) {
  const [methodId, setMethodId] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [executionDays, setExecutionDays] = useState("1");
  const [lines, setLines] = useState<LinesState>(emptyLines);
  const [submitting, setSubmitting] = useState(false);

  const handleMethodChange = (id: string) => {
    setMethodId(id);
    const method = methods.find((m) => String(m.id) === id);
    if (!method) return;

    const schema = (method.ui_schema ?? {}) as MethodUiSchema;
    setDescription(method.name);
    setUnit(method.default_unit);
    setQuantity("1");
    setExecutionDays("1");
    setLines(linesFromSchema(schema));
  };

  const validate = (): string | null => {
    if (!methodId) return "Selecciona un método NDT.";
    if (!description.trim()) return "La descripción es requerida.";
    if (!quantity || Number(quantity) < 0.01) return "La cantidad debe ser mayor a 0.";
    const linesError = validateLines(lines);
    if (linesError) return linesError;
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const serialized = serializeLines(lines);

    const payload: CreateQuoteItemPayload = {
      quote_method_id: Number(methodId),
      description: description.trim(),
      unit: unit || undefined,
      quantity: Number(quantity),
      execution_days: executionDays ? Number(executionDays) : undefined,
      materials: serialized.materials.length ? serialized.materials : undefined,
      equipment: serialized.equipment.length ? serialized.equipment : undefined,
      labor: serialized.labor.length ? serialized.labor : undefined,
    };

    setSubmitting(true);
    try {
      const res = await api.post(`/quotes/${quoteId}/items`, payload);
      toast.success("Partida agregada");
      onAdded(res.data.data as QuoteItem);
    } catch (err: unknown) {
      toast.error(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div
        className="rounded-md p-5 space-y-4 mt-3"
        style={{ backgroundColor: "var(--bg-app)", border: "1px solid var(--border-color)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical size={15} style={{ color: C.primary }} />
            <h3 className="text-[12px] font-bold" style={{ color: "var(--text-main)" }}>
              Nueva Partida
            </h3>
          </div>
          <button onClick={onCancel} className="p-1 rounded hover-bg" style={{ color: "var(--text-muted)" }}>
            <X size={15} />
          </button>
        </div>

        <Field label="Método NDT *">
          <select
            value={methodId}
            onChange={(e) => handleMethodChange(e.target.value)}
            className="field-input"
          >
            <option value="">— Seleccionar método —</option>
            {methods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} — {m.name}
              </option>
            ))}
          </select>
        </Field>

        {methodId && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Descripción *">
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="field-input"
                />
              </Field>
              <Field label="Unidad">
                <input value={unit} onChange={(e) => setUnit(e.target.value)} className="field-input" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cantidad *">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="field-input font-mono"
                />
              </Field>
              <Field label="Días de Ejecución">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={executionDays}
                  onChange={(e) => setExecutionDays(e.target.value)}
                  className="field-input font-mono"
                />
              </Field>
            </div>

            <QuoteLinesEditor value={lines} onChange={setLines} />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onCancel}
                className="h-8 px-4 rounded text-[11px] font-medium hover-bg"
                style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="h-8 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: C.accent }}
              >
                {submitting && <Loader2 size={13} className="animate-spin" />}
                Agregar Partida
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
