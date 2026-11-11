/**
 * Torque unit catalog and conversion (mirror of the backend
 * `App\Services\Metrology\Units\TorqueUnit` / `TorqueConverter`).
 *
 * Exact SI factors — ISO/IEC 17025:2017 §6.5 requires every conversion to be
 * traceable to the SI. The factors are exact constants (not measurements), so
 * they add no extra uncertainty:
 *
 *   1 kgf·cm = 9.80665 N × 0.01 m   = 0.0980665 N·m
 *   1 lbf·in = 4.4482216152605 N × 0.0254 m = 0.112984829027615 N·m
 *   1 lbf·ft = 4.4482216152605 N × 0.3048 m = 1.3558179483314004 N·m
 *
 * Every conversion goes through the coherent SI unit (N·m) in a single hop:
 * `value × factor(from) / factor(to)`.
 */

export const TORQUE_UNITS = [
  "N·m",
  "kN·m",
  "kgf·cm",
  "lbf·ft",
  "lbf·in",
] as const;

export type TorqueUnit = (typeof TORQUE_UNITS)[number];

const FACTOR_TO_NM: Record<TorqueUnit, number> = {
  "N·m": 1.0,
  "kN·m": 1000.0,
  "kgf·cm": 0.0980665,
  "lbf·ft": 1.3558179483314004,
  "lbf·in": 0.112984829027615,
};

/**
 * Resolve a unit label tolerating writing variants
 * ("N.m", "N m", "kgf.cm", "lbf in", uppercase, etc.).
 * Returns null for non-torque or unknown units.
 */
export function tryParseTorqueUnit(
  label: string | null | undefined,
): TorqueUnit | null {
  if (!label) return null;
  const key = label
    .trim()
    .toLowerCase()
    .replace(/[\s.·⋅×]/g, "");
  switch (key) {
    case "nm":
      return "N·m";
    case "knm":
      return "kN·m";
    case "kgfcm":
    case "kgcm":
      return "kgf·cm";
    case "lbfft":
      return "lbf·ft";
    case "lbfin":
      return "lbf·in";
    default:
      return null;
  }
}

/** Convert a numeric value between torque units (single hop through N·m). */
export function convertTorque(
  value: number,
  from: TorqueUnit,
  to: TorqueUnit,
): number {
  if (from === to) return value;
  return (value * FACTOR_TO_NM[from]) / FACTOR_TO_NM[to];
}

/**
 * Convert a resolution/spec between torque units. Numerically identical to
 * `convertTorque` — kept as a named alias for readability at call sites.
 */
export const convertTorqueResolution = convertTorque;
/**
 * Decimal place (expressed as a resolution, e.g. 0.01) implied by an expanded
 * uncertainty rounded to `sigFigs` significant figures (GUM §7.2.6 — 2 sig
 * figs is the standard practice).
 */
export function uncertaintyResolution(
  u: number | null | undefined,
  sigFigs = 2,
): number | null {
  if (u === null || u === undefined || !Number.isFinite(u) || u === 0)
    return null;
  const order = Math.floor(Math.log10(Math.abs(u)));
  const decimals = Math.max(0, sigFigs - 1 - order);
  return Math.pow(10, -decimals);
}

/**
 * Display resolution for a measured value: the **coarser** of the converted
 * instrument resolution and the decimal place implied by the expanded
 * uncertainty (GUM §7.2.6). The report can never claim more precision than
 * either the instrument resolution or the uncertainty statement.
 */
export function effectiveDisplayResolution(
  convertedResolution: number | null | undefined,
  expandedU: number | null | undefined,
): number | null {
  const uRes = uncertaintyResolution(expandedU);
  const r =
    convertedResolution !== null &&
    convertedResolution !== undefined &&
    convertedResolution > 0
      ? convertedResolution
      : null;
  if (r === null) return uRes;
  if (uRes === null) return r;
  return Math.max(r, uRes);
}

/**
 * Numeric BudgetPoint fields expressed in the measurement unit for a torque
 * calibration — the ones that must be converted for display. `k_factor`,
 * `n_readings`, percentages and degrees of freedom are dimensionless.
 */
const TORQUE_POINT_NUMERIC_FIELDS = [
  "nominal_value",
  "mean",
  "average_measured",
  "instrument",
  "instrument_bar",
  "std_deviation",
  "error",
  "absolute_error",
  "correction",
  "combined_uncertainty",
  "expanded_uncertainty",
  "expanded_u",
] as const;

/**
 * Convert the measurement-unit fields of a result point from one torque unit
 * to another, for display. The conversion is applied to the raw (stored)
 * values — never to already display-rounded values — so the round trip stays
 * lossless.
 *
 * Also computes `display_resolution`: the coarser of the converted instrument
 * resolution and the converted U decimal place, so downstream renderers can
 * round the measured value consistently with the uncertainty statement.
 *
 * The conformity verdict is NOT touched: it was evaluated by the backend in
 * the calculation unit before any conversion (ISO/IEC 17025 §7.8.6).
 */
export function convertTorquePoint<T extends { display_resolution?: number }>(
  point: T,
  from: TorqueUnit,
  to: TorqueUnit,
  convertedResolution: number | null,
): T {
  const next: Record<string, unknown> & { display_resolution?: number } = {
    ...(point as Record<string, unknown>),
  };

  if (from !== to) {
    for (const field of TORQUE_POINT_NUMERIC_FIELDS) {
      const v = next[field];
      if (typeof v === "number" && Number.isFinite(v)) {
        next[field] = convertTorque(v, from, to);
      }
    }
  }

  next.unit = to;
  next.display_resolution =
    effectiveDisplayResolution(
      convertedResolution,
      (next.expanded_uncertainty ?? next.expanded_u) as
        | number
        | null
        | undefined,
    ) ?? undefined;

  return next as T;
}
