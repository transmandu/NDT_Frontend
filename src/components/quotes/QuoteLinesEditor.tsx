"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { C } from "@/lib/colors";
import type {
  CatalogItem,
  LaborRate,
  CreateQuoteItemMaterialLine,
  CreateQuoteItemEquipmentLine,
  CreateQuoteItemLaborLine,
} from "@/types/quotes";

/**
 * Forma del ui_schema de un QuoteMethod: refleja 1 a 1 el payload real de
 * POST /quotes/{quote}/items (materials/equipment/labor). Lo comparten el
 * armado de una partida (ItemBuilder) y la edición de la plantilla de un
 * método (/quotes/methods) — ambos editan exactamente estas tres listas.
 */
export interface MethodUiSchema {
  materials?: Partial<CreateQuoteItemMaterialLine>[];
  equipment?: Partial<CreateQuoteItemEquipmentLine>[];
  labor?: Partial<CreateQuoteItemLaborLine>[];
}

/* Filas de formulario: todo como string para que los <input>/<select> se
   comporten como controlados sin pelear con el tipado numérico hasta el envío. */
export interface MaterialRow {
  catalog_item_id: string;
  quantity: string;
  waste_pct: string;
}
export interface EquipmentRow {
  catalog_item_id: string;
  quantity: string;
}
export interface LaborRow {
  labor_rate_id: string;
  quantity: string;
  days: string;
}
export interface LinesState {
  materials: MaterialRow[];
  equipment: EquipmentRow[];
  labor: LaborRow[];
}

export const emptyLines: LinesState = { materials: [], equipment: [], labor: [] };

const emptyMaterial: MaterialRow = { catalog_item_id: "", quantity: "1", waste_pct: "" };
const emptyEquipment: EquipmentRow = { catalog_item_id: "", quantity: "1" };
const emptyLabor: LaborRow = { labor_rate_id: "", quantity: "1", days: "1" };

export function linesFromSchema(schema: MethodUiSchema | null | undefined): LinesState {
  const s = schema ?? {};
  return {
    materials: (s.materials ?? []).map((m) => ({
      catalog_item_id: m.catalog_item_id != null ? String(m.catalog_item_id) : "",
      quantity: m.quantity != null ? String(m.quantity) : "1",
      waste_pct: m.waste_pct != null ? String(m.waste_pct) : "",
    })),
    equipment: (s.equipment ?? []).map((e) => ({
      catalog_item_id: e.catalog_item_id != null ? String(e.catalog_item_id) : "",
      quantity: e.quantity != null ? String(e.quantity) : "1",
    })),
    labor: (s.labor ?? []).map((l) => ({
      labor_rate_id: l.labor_rate_id != null ? String(l.labor_rate_id) : "",
      quantity: l.quantity != null ? String(l.quantity) : "1",
      days: l.days != null ? String(l.days) : "1",
    })),
  };
}

export function serializeLines(lines: LinesState): {
  materials: CreateQuoteItemMaterialLine[];
  equipment: CreateQuoteItemEquipmentLine[];
  labor: CreateQuoteItemLaborLine[];
} {
  return {
    materials: lines.materials.map((m) => ({
      catalog_item_id: Number(m.catalog_item_id),
      quantity: Number(m.quantity),
      waste_pct: m.waste_pct !== "" ? Number(m.waste_pct) : undefined,
    })),
    equipment: lines.equipment.map((e) => ({
      catalog_item_id: Number(e.catalog_item_id),
      quantity: Number(e.quantity),
    })),
    labor: lines.labor.map((l) => ({
      labor_rate_id: Number(l.labor_rate_id),
      quantity: Number(l.quantity),
      days: Number(l.days),
    })),
  };
}

export function validateLines(lines: LinesState): string | null {
  for (const m of lines.materials) {
    if (!m.catalog_item_id) return "Cada línea de materiales necesita un ítem del catálogo.";
    if (!m.quantity || Number(m.quantity) < 0) return "Cantidad de material inválida.";
  }
  for (const e of lines.equipment) {
    if (!e.catalog_item_id) return "Cada línea de equipo necesita un ítem del catálogo.";
    if (!e.quantity || Number(e.quantity) < 0) return "Cantidad de equipo inválida.";
  }
  for (const l of lines.labor) {
    if (!l.labor_rate_id) return "Cada línea de mano de obra necesita un rol.";
    if (!l.quantity || Number(l.quantity) < 0) return "Cantidad de mano de obra inválida.";
    if (!l.days || Number(l.days) < 0) return "Días de mano de obra inválidos.";
  }
  return null;
}

export default function QuoteLinesEditor({
  value,
  onChange,
}: {
  value: LinesState;
  onChange: (next: LinesState) => void;
}) {
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

  const { materials, equipment, labor } = value;
  const setMaterials = (materials: MaterialRow[]) => onChange({ ...value, materials });
  const setEquipment = (equipment: EquipmentRow[]) => onChange({ ...value, equipment });
  const setLabor = (labor: LaborRow[]) => onChange({ ...value, labor });

  return (
    <>
      <LineSection
        title="Materiales"
        rows={materials}
        onAdd={() => setMaterials([...materials, { ...emptyMaterial }])}
        columns={[
          { label: "Ítem del catálogo", className: "flex-1" },
          { label: "Cantidad", className: "w-20" },
          { label: "% Merma", className: "w-24" },
        ]}
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
            <RemoveButton onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))} />
          </div>
        ))}
      </LineSection>

      <LineSection
        title="Equipo"
        rows={equipment}
        onAdd={() => setEquipment([...equipment, { ...emptyEquipment }])}
        columns={[
          { label: "Ítem del catálogo", className: "flex-1" },
          { label: "Cantidad", className: "w-20" },
        ]}
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
            <RemoveButton onClick={() => setEquipment(equipment.filter((_, idx) => idx !== i))} />
          </div>
        ))}
      </LineSection>

      <LineSection
        title="Mano de Obra"
        rows={labor}
        onAdd={() => setLabor([...labor, { ...emptyLabor }])}
        columns={[
          { label: "Rol", className: "flex-1" },
          { label: "Personas", className: "w-16" },
          { label: "Días", className: "w-16" },
        ]}
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
              onChange={(e) => setLabor(labor.map((r, idx) => (idx === i ? { ...r, quantity: e.target.value } : r)))}
              className="field-input w-16 font-mono text-[11px]"
            />
            <input
              type="number"
              step="any"
              min="0"
              placeholder="Días"
              value={row.days}
              onChange={(e) => setLabor(labor.map((r, idx) => (idx === i ? { ...r, days: e.target.value } : r)))}
              className="field-input w-16 font-mono text-[11px]"
            />
            <RemoveButton onClick={() => setLabor(labor.filter((_, idx) => idx !== i))} />
          </div>
        ))}
      </LineSection>
    </>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="p-1.5 rounded hover-bg shrink-0" style={{ color: C.danger }}>
      <Trash2 size={13} />
    </button>
  );
}

interface ColumnHeader {
  label: string;
  /** Mismo ancho que el input de esa columna en las filas. */
  className: string;
}

function LineSection<T>({
  title,
  rows,
  onAdd,
  columns,
  children,
}: {
  title: string;
  rows: T[];
  onAdd: () => void;
  columns: ColumnHeader[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          {title}
        </span>
        <button
          type="button"
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
        <div className="space-y-1.5">
          <div className="flex gap-2 items-center">
            {columns.map((c) => (
              <span
                key={c.label}
                className={`text-[9px] font-semibold uppercase tracking-wider truncate ${c.className}`}
                style={{ color: "var(--text-muted)" }}
              >
                {c.label}
              </span>
            ))}
            {/* Mismo ancho que el botón de quitar de cada fila, para que las columnas queden alineadas. */}
            <span className="w-[25px] shrink-0" aria-hidden />
          </div>
          {children}
        </div>
      )}
    </div>
  );
}
