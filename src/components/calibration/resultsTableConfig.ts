import type {
  BudgetPoint,
  InstrumentCategory,
  ResultsTableType,
} from '@/types/calibration';
import {
  formatMeasured,
  formatSigned,
  formatUncertainty,
  NUMERIC_PLACEHOLDER,
} from '@/lib/metrologyFormat';

export type BudgetPointWithFunction = BudgetPoint & { function?: string };

/**
 * Per-render context: the instrument unit and resolution dictate the right
 * number of decimals for measured values, errors and corrections (GUM §7.2.6).
 */
export type RenderContext = {
  unit: string;
  resolution: number | null;
};

export type ColumnDef = {
  key: string;
  label: string;
  align?: 'left' | 'right';
  bold?: boolean;
  color?: string;
  /** When true, do not append the instrument unit to the header label. */
  unitless?: boolean;
  render: (point: BudgetPointWithFunction, ctx: RenderContext) => string;
};

/** Common GUM result columns shared by every table. */
const colUc: ColumnDef = {
  key: 'uc',
  label: 'u_c',
  align: 'right',
  render: (p) => formatUncertainty(p.combined_uncertainty_mm ?? p.combined_uncertainty),
};
const colK: ColumnDef = {
  key: 'k',
  label: 'k',
  align: 'right',
  unitless: true,
  render: (p) => formatMeasured(p.k_factor),
};
const colU: ColumnDef = {
  key: 'U',
  label: 'U (expandida)',
  align: 'right',
  bold: true,
  color: '#FFA526',
  render: (p) => `± ${formatUncertainty(p.expanded_uncertainty_mm ?? p.expanded_uncertainty)}`,
};

const colNominal: ColumnDef = {
  key: 'nominal',
  label: 'Punto Nominal',
  render: (p, { resolution }) =>
    formatMeasured(p.nominal_value ?? p.nominal_length_mm ?? p.nominal, resolution),
};

const colError: ColumnDef = {
  key: 'error',
  label: 'Error',
  align: 'right',
  render: (p, { resolution }) => formatSigned(p.error, resolution),
};

/* ────────────────────────────────────────────────────────────────
 *  Per-category column layouts.
 *  Field names mirror exactly what each Strategy emits in PHP.
 *  See NDT_Backend/app/Services/Metrology/Strategies/*.php
 * ──────────────────────────────────────────────────────────────── */

const MANOMETER_COLUMNS: ColumnDef[] = [
  colNominal,
  {
    key: 'error_asc',
    label: 'Error asc.',
    align: 'right',
    render: (p, { resolution }) => formatSigned(p.error_ascending, resolution),
  },
  {
    key: 'error_desc',
    label: 'Error desc.',
    align: 'right',
    render: (p, { resolution }) =>
      p.error_descending === null || p.error_descending === undefined
        ? NUMERIC_PLACEHOLDER
        : formatSigned(p.error_descending, resolution),
  },
  {
    key: 'hysteresis',
    label: 'Histéresis',
    align: 'right',
    render: (p, { resolution }) => formatMeasured(p.hysteresis, resolution),
  },
  colUc,
  colK,
  colU,
];

const BALANCE_COLUMNS: ColumnDef[] = [
  colNominal,
  {
    key: 'mean',
    label: 'Medido prom.',
    align: 'right',
    render: (p, { resolution }) => formatMeasured(p.average_measured ?? p.mean, resolution),
  },
  colError,
  {
    key: 'correction',
    label: 'Corrección',
    align: 'right',
    render: (p, { resolution }) => formatSigned(p.correction, resolution),
  },
  colUc,
  colK,
  colU,
];

/**
 * Thermohygrometer columns: each row already carries its own unit (°C or %HR)
 * because temperature and humidity points share the same table.
 * We surface that per-row unit in the magnitude cell rather than the headers.
 */
const THERMOHYGROMETER_COLUMNS: ColumnDef[] = [
  {
    key: 'magnitude',
    label: 'Magnitud',
    unitless: true,
    render: (p) => (p.unit ? `${p.function ?? NUMERIC_PLACEHOLDER} (${p.unit})` : p.function ?? NUMERIC_PLACEHOLDER),
  },
  {
    key: 'setpoint',
    label: 'Setpoint',
    align: 'right',
    unitless: true,
    render: (p) => formatMeasured(p.nominal_value),
  },
  {
    key: 'mean',
    label: 'Medido prom.',
    align: 'right',
    unitless: true,
    render: (p) => formatMeasured(p.average_measured ?? p.mean),
  },
  {
    key: 'reference',
    label: 'Patrón prom.',
    align: 'right',
    unitless: true,
    render: (p) => formatMeasured(p.mean_reference),
  },
  { ...colError, unitless: true },
  { ...colUc, unitless: true },
  colK,
  { ...colU, unitless: true },
];

/**
 * Multimeter columns: each row already carries its own unit (V, A, Ω) because
 * the same table mixes voltage, current and resistance points. Headers stay
 * unitless and the function cell shows the unit instead.
 */
const MULTIMETER_COLUMNS: ColumnDef[] = [
  {
    key: 'function',
    label: 'Función',
    unitless: true,
    render: (p) => (p.unit ? `${p.function ?? NUMERIC_PLACEHOLDER} (${p.unit})` : p.function ?? NUMERIC_PLACEHOLDER),
  },
  {
    key: 'applied',
    label: 'Valor aplicado',
    align: 'right',
    unitless: true,
    render: (p) => formatMeasured(p.nominal_value),
  },
  {
    key: 'reading',
    label: 'Lectura',
    align: 'right',
    unitless: true,
    render: (p) => formatMeasured(p.corrected_mean ?? p.mean_reading),
  },
  { ...colError, unitless: true },
  { ...colUc, unitless: true },
  colK,
  { ...colU, unitless: true },
];

const TORQUEMETER_COLUMNS: ColumnDef[] = [
  colNominal,
  {
    key: 'n',
    label: 'n',
    align: 'right',
    unitless: true,
    render: (p) => (p.n_readings !== undefined ? String(p.n_readings) : NUMERIC_PLACEHOLDER),
  },
  {
    key: 'mean',
    label: 'Media',
    align: 'right',
    render: (p, { resolution }) => formatMeasured(p.mean, resolution),
  },
  {
    key: 'std',
    label: 'Desv. típ.',
    align: 'right',
    render: (p) => formatUncertainty(p.std_deviation),
  },
  colError,
  colUc,
  colK,
  colU,
];

const VERNIER_FUNCTION_LABELS: Record<string, string> = {
  exterior: 'Exterior',
  interior: 'Interior',
  depth: 'Profundidad',
};

const VERNIER_COLUMNS: ColumnDef[] = [
  {
    key: 'function',
    label: 'Función',
    unitless: true,
    render: (p) =>
      VERNIER_FUNCTION_LABELS[p.function ?? ''] ?? p.function ?? NUMERIC_PLACEHOLDER,
  },
  colNominal,
  {
    key: 'mean',
    label: 'Media',
    align: 'right',
    render: (p, { resolution }) => formatMeasured(p.mean_mm ?? p.mean, resolution),
  },
  colError,
  colUc,
  colK,
  colU,
];

const GENERIC_COLUMNS: ColumnDef[] = [
  colNominal,
  {
    key: 'function',
    label: 'Función',
    unitless: true,
    render: (p) => p.function ?? NUMERIC_PLACEHOLDER,
  },
  colError,
  colUc,
  colK,
  colU,
];

export const RESULT_COLUMNS: Record<ResultsTableType, ColumnDef[]> = {
  manometer: MANOMETER_COLUMNS,
  balance: BALANCE_COLUMNS,
  thermohygrometer: THERMOHYGROMETER_COLUMNS,
  multimeter: MULTIMETER_COLUMNS,
  torquemeter: TORQUEMETER_COLUMNS,
  vernier: VERNIER_COLUMNS,
  generic: GENERIC_COLUMNS,
};

/**
 * Maps the backend's Spanish `category` (magnitude) to the logical table layout.
 * Falls back to 'generic' if the category is unknown or missing.
 */
export function resolveTableType(
  category: InstrumentCategory | string | undefined | null,
  procedureCode?: string | null
): ResultsTableType {
  switch (category) {
    case 'presion':
      return 'manometer';
    case 'masa':
      return 'balance';
    case 'temperatura':
    case 'humedad':
      return 'thermohygrometer';
    case 'electrica':
      return 'multimeter';
    case 'torque':
      return 'torquemeter';
    case 'dimensional':
      return 'vernier';
    default:
      // Best-effort fallback by procedure code prefix (ME-003, ME-005, …)
      if (procedureCode) {
        const upper = procedureCode.toUpperCase();
        if (upper.includes('ME-003')) return 'manometer';
        if (upper.includes('ME-005')) return 'balance';
        if (upper.includes('M-LAB-01')) return 'thermohygrometer';
        if (upper.includes('EL-001')) return 'multimeter';
        if (upper.includes('ISO-6789') || upper.includes('TOR')) return 'torquemeter';
        if (upper.includes('DIM') || upper.includes('VER')) return 'vernier';
      }
      return 'generic';
  }
}
