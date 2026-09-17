"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Trash2, Loader2, X, FlaskConical } from "lucide-react";
import api from "@/lib/api";
import { getApiError } from "@/lib/apiErrors";
import { C } from "@/lib/colors";
import { Field } from "@/app/(dashboard)/quotes/catalog/page";
import type {
  CatalogItem,
  LaborRate,
  QuoteMethod,
  QuoteItem,
  CreateQuoteItemPayload,
  CreateQuoteItemMaterialLine,
  CreateQuoteItemEquipmentLine,
  CreateQuoteItemLaborLine,
} from "@/types/quotes";

/**
 * Forma esperada del ui_schema de cada QuoteMethod: refleja 1 a 1 el payload
 * real de POST /quotes/{quote}/items (materials/equipment/labor), así que
 * "precargar desde el método" es simplemente copiar estos arreglos tal cual
 * al estado del formulario — el usuario después ajusta cantidades o agrega/
 * quita líneas sueltas.
 */
interface MethodUiSchema {
  materials?: Partial<CreateQuoteItemMaterialLine>[];
  equipment?: Partial<CreateQuoteItemEquipmentLine>[];
  labor?: Partial<CreateQuoteItemLaborLine>[];
}

/* Filas de formulario: todo como string para que los <input>/<select> se
   comporten como controlados sin pelear con el tipado numérico hasta el envío. */
interface MaterialRow {
  catalog_item_id: string;
  quantity: string;
  waste_pct: string;
}
interface EquipmentRow {
  catalog_item_id: string;
  quantity: string;
}
interface LaborRow {
  labor_rate_id: string;
  quantity: string;
  days: string;
}

const emptyMaterial: MaterialRow = { catalog_item_id: "", quantity: "1", waste_pct: "" };
const emptyEquipment: EquipmentRow = { catalog_item_id: "", quantity: "1" };
const emptyLabor: LaborRow = { labor_rate_id: "", quantity: "1", days: "1" };

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
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [labor, setLabor] = useState<LaborRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: materialItems = [] } = useQuery<CatalogItem[]>({
    queryKey: ["catalog-items", "material"],
    queryFn: () => api.get("/catalog-items?type=material").then((r) => r.data.data || []),
  });
  // El equipo de protección personal (EPP) se cotiza con la misma fórmula de
  // depreciación que el equipo técnico (confirmado contra el Excel origen: los 25
  // ítems EPP traen "Días dep." igual que los de tipo Equipo), así que también debe
  // poder elegirse aquí — no solo el catálogo type=equipment.
  const { data: equipmentTypeItems = [] } = useQuery<CatalogItem[]>({
    queryKey: ["catalog-items", "equipment"],
    queryFn: () => api.get("/catalog-items?type=equipment").then((r) => r.data.data || []),
  });
  const { data: eppItems = [] } = useQuery<CatalogItem[]>({
    queryKey: ["catalog-items", "epp"],
    queryFn: () => api.get("/catalog-items?type=epp").then((r) => r.data.data || []),
  });
  const equipmentItems = useMemo(
    () => [...equipmentTypeItems, ...eppItems].sort((a, b) => a.description.localeCompare(b.description)),
    [equipmentTypeItems, eppItems],
  );
  const { data: laborRates = [] } = useQuery<LaborRate[]>({
    queryKey: ["labor-rates"],
    queryFn: () => api.get("/labor-rates").then((r) => r.data.data || []),
  });

  const handleMethodChange = (id: string) => {
    setMethodId(id);
    const method = methods.find((m) => String(m.id) === id);
    if (!method) return;

    const schema = (method.ui_schema ?? {}) as MethodUiSchema;
    setDescription(method.name);
    setUnit(method.default_unit);
    setQuantity("1");
    setExecutionDays("1");
    setMaterials(
      (schema.materials ?? []).map((m) => ({
        catalog_item_id: m.catalog_item_id != null ? String(m.catalog_item_id) : "",
        quantity: m.quantity != null ? String(m.quantity) : "1",
        waste_pct: m.waste_pct != null ? String(m.waste_pct) : "",
      })),
    );
    setEquipment(
      (schema.equipment ?? []).map((e) => ({
        catalog_item_id: e.catalog_item_id != null ? String(e.catalog_item_id) : "",
        quantity: e.quantity != null ? String(e.quantity) : "1",
      })),
    );
    setLabor(
      (schema.labor ?? []).map((l) => ({
        labor_rate_id: l.labor_rate_id != null ? String(l.labor_rate_id) : "",
        quantity: l.quantity != null ? String(l.quantity) : "1",
        days: l.days != null ? String(l.days) : "1",
      })),
    );
  };

  const validate = (): string | null => {
    if (!methodId) return "Selecciona un método NDT.";
    if (!description.trim()) return "La descripción es requerida.";
    if (!quantity || Number(quantity) < 0.01) return "La cantidad debe ser mayor a 0.";
    for (const m of materials) {
      if (!m.catalog_item_id) return "Cada línea de materiales necesita un ítem del catálogo.";
      if (!m.quantity || Number(m.quantity) < 0) return "Cantidad de material inválida.";
    }
    for (const e of equipment) {
      if (!e.catalog_item_id) return "Cada línea de equipo necesita un ítem del catálogo.";
      if (!e.quantity || Number(e.quantity) < 0) return "Cantidad de equipo inválida.";
    }
    for (const l of labor) {
      if (!l.labor_rate_id) return "Cada línea de mano de obra necesita un rol.";
      if (!l.quantity || Number(l.quantity) < 0) return "Cantidad de mano de obra inválida.";
      if (!l.days || Number(l.days) < 0) return "Días de mano de obra inválidos.";
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const payload: CreateQuoteItemPayload = {
      quote_method_id: Number(methodId),
      description: description.trim(),
      unit: unit || undefined,
      quantity: Number(quantity),
      execution_days: executionDays ? Number(executionDays) : undefined,
      materials: materials.length
        ? materials.map((m) => ({
            catalog_item_id: Number(m.catalog_item_id),
            quantity: Number(m.quantity),
            waste_pct: m.waste_pct !== "" ? Number(m.waste_pct) : undefined,
          }))
        : undefined,
      equipment: equipment.length
        ? equipment.map((e) => ({
            catalog_item_id: Number(e.catalog_item_id),
            quantity: Number(e.quantity),
          }))
        : undefined,
      labor: labor.length
        ? labor.map((l) => ({
            labor_rate_id: Number(l.labor_rate_id),
            quantity: Number(l.quantity),
            days: Number(l.days),
          }))
        : undefined,
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

            <LineSection
              title="Materiales"
              rows={materials}
              onAdd={() => setMaterials([...materials, { ...emptyMaterial }])}
              onRemove={(i) => setMaterials(materials.filter((_, idx) => idx !== i))}
            >
              {materials.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={row.catalog_item_id}
                    onChange={(e) =>
                      setMaterials(materials.map((r, idx) => (idx === i ? { ...r, catalog_item_id: e.target.value } : r)))
                    }
                    className="field-input flex-1 text-[11px]"
                  >
                    <option value="">— Ítem —</option>
                    {materialItems.map((ci) => (
                      <option key={ci.id} value={ci.id}>
                        {ci.code} — {ci.description} (${Number(ci.unit_price_usd).toFixed(2)}/{ci.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Cant."
                    value={row.quantity}
                    onChange={(e) =>
                      setMaterials(materials.map((r, idx) => (idx === i ? { ...r, quantity: e.target.value } : r)))
                    }
                    className="field-input w-20 font-mono text-[11px]"
                  />
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    placeholder="% merma"
                    value={row.waste_pct}
                    onChange={(e) =>
                      setMaterials(materials.map((r, idx) => (idx === i ? { ...r, waste_pct: e.target.value } : r)))
                    }
                    className="field-input w-24 font-mono text-[11px]"
                  />
                  <button
                    onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))}
                    className="p-1.5 rounded hover-bg shrink-0"
                    style={{ color: C.danger }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </LineSection>

            <LineSection
              title="Equipo"
              rows={equipment}
              onAdd={() => setEquipment([...equipment, { ...emptyEquipment }])}
              onRemove={(i) => setEquipment(equipment.filter((_, idx) => idx !== i))}
            >
              {equipment.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={row.catalog_item_id}
                    onChange={(e) =>
                      setEquipment(equipment.map((r, idx) => (idx === i ? { ...r, catalog_item_id: e.target.value } : r)))
                    }
                    className="field-input flex-1 text-[11px]"
                  >
                    <option value="">— Ítem —</option>
                    {equipmentItems.map((ci) => (
                      <option key={ci.id} value={ci.id}>
                        {ci.code} — {ci.description} (${Number(ci.unit_price_usd).toFixed(2)}/{ci.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Cant."
                    value={row.quantity}
                    onChange={(e) =>
                      setEquipment(equipment.map((r, idx) => (idx === i ? { ...r, quantity: e.target.value } : r)))
                    }
                    className="field-input w-20 font-mono text-[11px]"
                  />
                  <button
                    onClick={() => setEquipment(equipment.filter((_, idx) => idx !== i))}
                    className="p-1.5 rounded hover-bg shrink-0"
                    style={{ color: C.danger }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </LineSection>

            <LineSection
              title="Mano de Obra"
              rows={labor}
              onAdd={() => setLabor([...labor, { ...emptyLabor }])}
              onRemove={(i) => setLabor(labor.filter((_, idx) => idx !== i))}
            >
              {labor.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={row.labor_rate_id}
                    onChange={(e) =>
                      setLabor(labor.map((r, idx) => (idx === i ? { ...r, labor_rate_id: e.target.value } : r)))
                    }
                    className="field-input flex-1 text-[11px]"
                  >
                    <option value="">— Rol —</option>
                    {laborRates.map((lr) => (
                      <option key={lr.id} value={lr.id}>
                        {lr.role_name} (${Number(lr.daily_rate_usd).toFixed(2)}/día)
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Cant."
                    value={row.quantity}
                    onChange={(e) =>
                      setLabor(labor.map((r, idx) => (idx === i ? { ...r, quantity: e.target.value } : r)))
                    }
                    className="field-input w-16 font-mono text-[11px]"
                  />
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Días"
                    value={row.days}
                    onChange={(e) =>
                      setLabor(labor.map((r, idx) => (idx === i ? { ...r, days: e.target.value } : r)))
                    }
                    className="field-input w-16 font-mono text-[11px]"
                  />
                  <button
                    onClick={() => setLabor(labor.filter((_, idx) => idx !== i))}
                    className="p-1.5 rounded hover-bg shrink-0"
                    style={{ color: C.danger }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </LineSection>

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

function LineSection<T>({
  title,
  rows,
  onAdd,
  children,
}: {
  title: string;
  rows: T[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          {title}
        </span>
        <button
          onClick={onAdd}
          className="text-[10px] font-semibold flex items-center gap-1"
          style={{ color: C.primary }}
        >
          <Plus size={12} /> Agregar línea
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          Sin líneas.
        </p>
      ) : (
        <div className="space-y-1.5">{children}</div>
      )}
    </div>
  );
}
