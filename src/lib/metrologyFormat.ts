/**
 * Number formatting for metrology reports (JCGM 100:2008 GUM §7.2.6).
 *
 *  - Uncertainties (u_c, U) are rounded to a fixed number of significant figures
 *    (typically 2 per GUM §7.2.6) before display.
 *  - Measured values, nominal points, errors and corrections are rounded to the
 *    instrument's resolution so the report cannot claim more precision than
 *    the instrument actually provides.
 *
 * All helpers fall back to a safe placeholder when the input is undefined,
 * null, empty or NaN, so they can be used directly in render functions.
 */

export const NUMERIC_PLACEHOLDER = '—';

const toNumber = (v: number | string | undefined | null): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

/**
 * Round a value to a multiple of `resolution` and stringify with the right
 * number of decimals. Example: (23.456, 0.1) → "23.5".
 *
 * When `resolution` is missing, falls back to 5-decimal trimmed output
 * (matches the legacy `f5()` behaviour).
 */
export function formatMeasured(
  value: number | string | undefined | null,
  resolution?: number | null,
  fallback = NUMERIC_PLACEHOLDER,
): string {
  const n = toNumber(value);
  if (n === null) return fallback;

  const r = toNumber(resolution);
  if (r === null || r <= 0) {
    return parseFloat(n.toFixed(5)).toString();
  }

  const rounded = Math.round(n / r) * r;
  // Decimal places implied by the resolution (1 → 0, 0.1 → 1, 0.01 → 2, …).
  const decimals = Math.max(0, -Math.floor(Math.log10(r)));
  return rounded.toFixed(decimals);
}

/**
 * Same as formatMeasured but prefixes a sign for non-negative values, so
 * errors and corrections read as "+0.02" / "-0.02".
 */
export function formatSigned(
  value: number | string | undefined | null,
  resolution?: number | null,
  fallback = NUMERIC_PLACEHOLDER,
): string {
  const n = toNumber(value);
  if (n === null) return fallback;
  const body = formatMeasured(n, resolution, fallback);
  if (body === fallback) return fallback;
  return n >= 0 ? `+${body}` : body;
}

/**
 * Round an uncertainty to `sigFigs` significant figures (GUM §7.2.6 — 2 sig figs
 * is the standard practice). Returns the string in fixed-point notation so it
 * pairs naturally with `formatMeasured` for the measured value.
 *
 * Examples:
 *   formatUncertainty(0.02031, 2)  → "0.020"
 *   formatUncertainty(123.456, 2)  → "120"
 *   formatUncertainty(0.00045, 2)  → "0.00045"
 */
export function formatUncertainty(
  value: number | string | undefined | null,
  sigFigs = 2,
  fallback = NUMERIC_PLACEHOLDER,
): string {
  const n = toNumber(value);
  if (n === null || n === 0) return n === 0 ? '0' : fallback;

  const absN = Math.abs(n);
  const order = Math.floor(Math.log10(absN));
  const decimals = Math.max(0, sigFigs - 1 - order);
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(n * factor) / factor;
  return rounded.toFixed(decimals);
}
