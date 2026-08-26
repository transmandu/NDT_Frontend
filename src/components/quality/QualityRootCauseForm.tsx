"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X, CheckCircle2, Circle } from "lucide-react";
import type {
  FiveWhysSchema,
  IshikawaCategory,
  IshikawaSchema,
  QualityMethodSchema,
  QualityUiSchema,
} from "@/types/quality";
import { C } from "@/lib/colors";

interface QualityRootCauseFormProps {
  /** Esquema (5 Whys / Ishikawa / variante creada por admin) — trae la forma en blanco en ui_schema. */
  schema: QualityMethodSchema;
  /** Respuesta actual (misma forma que schema.ui_schema, ya rellena). null = aún no iniciada. */
  value: QualityUiSchema | null;
  onChange: (value: QualityUiSchema) => void;
  readOnly?: boolean;
}

/* ─── Helpers ────────────────────────────────────────────── */
function isFiveWhys(s: QualityUiSchema): s is FiveWhysSchema {
  return s.type === "sequential_steps";
}
function isIshikawa(s: QualityUiSchema): s is IshikawaSchema {
  return s.type === "categorized_causes";
}

// Laravel convierte "" a null en el body de la request (ConvertEmptyStringsToNull)
// antes de guardar, así que un paso "sin responder" puede llegar como
// answer: null en vez de "" — nunca asumir que estos campos son siempre string.
function completionOf(s: QualityUiSchema): { done: number; total: number } {
  if (isFiveWhys(s)) {
    return {
      done: s.steps.filter((step) => (step.answer ?? "").trim().length > 0).length,
      total: s.steps.length,
    };
  }
  return {
    done: s.categories.filter((cat) => cat.causes.length > 0).length,
    total: s.categories.length,
  };
}

/* ─── Main Export ────────────────────────────────────────── */
export default function QualityRootCauseForm({
  schema,
  value,
  onChange,
  readOnly = false,
}: QualityRootCauseFormProps) {
  // Semilla en blanco (copia de schema.ui_schema) la primera vez que se abre el
  // formulario para esta AC — mismo patrón de "init on empty" que DynamicGrid.
  useEffect(() => {
    if (value === null) {
      onChange(structuredClone(schema.ui_schema));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, schema]);

  const current = value ?? schema.ui_schema;
  const { done, total } = useMemo(() => completionOf(current), [current]);
  const complete = done > 0;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4
            className="text-sm font-bold"
            style={{ color: "var(--text-main)" }}
          >
            {schema.name}
          </h4>
          {schema.description && (
            <p
              className="text-xs font-bold mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {schema.description}
            </p>
          )}
        </div>
        <span
          className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded shrink-0"
          style={{
            backgroundColor: complete ? `${C.success}15` : `${C.warning}15`,
            color: complete ? C.success : C.warning,
          }}
        >
          {complete ? <CheckCircle2 size={12} /> : <Circle size={12} />}
          {done}/{total} completado{done === 1 ? "" : "s"}
        </span>
      </div>

      {isFiveWhys(current) ? (
        <FiveWhysForm
          schema={current}
          onChange={onChange}
          readOnly={readOnly}
        />
      ) : isIshikawa(current) ? (
        <IshikawaForm schema={current} onChange={onChange} readOnly={readOnly} />
      ) : null}
    </div>
  );
}

/* ─── 5 Whys ─────────────────────────────────────────────── */
function FiveWhysForm({
  schema,
  onChange,
  readOnly,
}: {
  schema: FiveWhysSchema;
  onChange: (v: QualityUiSchema) => void;
  readOnly: boolean;
}) {
  const updateStep = (
    level: number,
    field: "answer" | "evidence",
    val: string,
  ) => {
    onChange({
      ...schema,
      steps: schema.steps.map((s) =>
        s.level === level ? { ...s, [field]: val } : s,
      ),
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {schema.steps.map((step) => (
        <div
          key={step.level}
          className="rounded-lg p-3 flex gap-3"
          style={{
            backgroundColor: "var(--bg-app)",
            border: "1px solid var(--border-color)",
          }}
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ backgroundColor: C.primary }}
          >
            {step.level}
          </span>
          <div className="flex-1 min-w-0 space-y-2">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-main)" }}
            >
              {step.question}
            </p>
            <textarea
              value={step.answer ?? ""}
              disabled={readOnly}
              onChange={(e) => updateStep(step.level, "answer", e.target.value)}
              placeholder="Respuesta…"
              rows={2}
              className="field-input w-full resize-none text-sm"
            />
            <textarea
              value={step.evidence ?? ""}
              disabled={readOnly}
              onChange={(e) =>
                updateStep(step.level, "evidence", e.target.value)
              }
              placeholder="Evidencia (opcional)…"
              rows={1}
              className="field-input w-full resize-none text-sm"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Ishikawa (6M) ──────────────────────────────────────── */
function IshikawaForm({
  schema,
  onChange,
  readOnly,
}: {
  schema: IshikawaSchema;
  onChange: (v: QualityUiSchema) => void;
  readOnly: boolean;
}) {
  const updateCategory = (index: number, next: IshikawaCategory) => {
    onChange({
      ...schema,
      categories: schema.categories.map((c, i) => (i === index ? next : c)),
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {schema.categories.map((cat, catIdx) => (
        <IshikawaCategoryCard
          key={cat.category}
          category={cat}
          readOnly={readOnly}
          onChange={(next) => updateCategory(catIdx, next)}
        />
      ))}
    </div>
  );
}

function IshikawaCategoryCard({
  category,
  onChange,
  readOnly,
}: {
  category: IshikawaCategory;
  onChange: (next: IshikawaCategory) => void;
  readOnly: boolean;
}) {
  const addCause = () =>
    onChange({
      ...category,
      causes: [...category.causes, { cause: "", evidence: "", subcauses: [] }],
    });

  const removeCause = (idx: number) =>
    onChange({
      ...category,
      causes: category.causes.filter((_, i) => i !== idx),
    });

  const updateCause = (
    idx: number,
    field: "cause" | "evidence",
    val: string,
  ) =>
    onChange({
      ...category,
      causes: category.causes.map((c, i) =>
        i === idx ? { ...c, [field]: val } : c,
      ),
    });

  const addSubcause = (idx: number) =>
    onChange({
      ...category,
      causes: category.causes.map((c, i) =>
        i === idx ? { ...c, subcauses: [...c.subcauses, ""] } : c,
      ),
    });

  const updateSubcause = (idx: number, subIdx: number, val: string) =>
    onChange({
      ...category,
      causes: category.causes.map((c, i) =>
        i === idx
          ? {
              ...c,
              subcauses: c.subcauses.map((s, si) => (si === subIdx ? val : s)),
            }
          : c,
      ),
    });

  const removeSubcause = (idx: number, subIdx: number) =>
    onChange({
      ...category,
      causes: category.causes.map((c, i) =>
        i === idx
          ? { ...c, subcauses: c.subcauses.filter((_, si) => si !== subIdx) }
          : c,
      ),
    });

  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-2"
      style={{
        backgroundColor: "var(--bg-app)",
        border: "1px solid var(--border-color)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-bold uppercase tracking-wide"
          style={{ color: C.accent }}
        >
          {category.category}
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={addCause}
            className="flex items-center justify-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded"
            style={{ color: C.primary, border: `1px dashed ${C.primary}` }}
          >
            <Plus size={16} /> Causa
          </button>
        )}
      </div>

      {category.causes.length === 0 && (
        <p className="text-[10px] italic" style={{ color: "var(--text-muted)" }}>
          Sin causas registradas.
        </p>
      )}

      <AnimatePresence initial={false}>
        {category.causes.map((cause, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded p-2 space-y-1.5"
            style={{
              backgroundColor: "var(--bg-panel)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div className="flex items-start gap-1.5">
              <input
                type="text"
                value={cause.cause ?? ""}
                disabled={readOnly}
                onChange={(e) => updateCause(idx, "cause", e.target.value)}
                placeholder="Causa…"
                className="field-input flex-1 text-sm"
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeCause(idx)}
                  className="p-1 rounded shrink-0 cursor-pointer"
                  style={{ color: "#ef4444" }}
                  title="Eliminar causa"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <input
              type="text"
              value={cause.evidence ?? ""}
              disabled={readOnly}
              onChange={(e) => updateCause(idx, "evidence", e.target.value)}
              placeholder="Evidencia (opcional)…"
              className="field-input w-full text-sm"
            />

            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {cause.subcauses.map((sub, subIdx) => (
                <div key={subIdx} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={sub ?? ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSubcause(idx, subIdx, e.target.value)
                    }
                    placeholder="Subcausa…"
                    className="field-input text-sm h-6 px-1.5 w-24"
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeSubcause(idx, subIdx)}
                      style={{ color: "#ef4444" }}
                      className="cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => addSubcause(idx)}
                  className="text-sm flex items-center gap-0.5 cursor-pointer"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Plus size={16} /> subcausa
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
