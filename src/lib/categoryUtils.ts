/**
 * Shared category normalization utility.
 *
 * Instruments and standards are sometimes stored with Spanish category names
 * (e.g. "masa", "presión") and sometimes with English keys (e.g. "mass",
 * "pressure"). This utility provides a single source of truth for mapping
 * any variant to the canonical English key used across the system.
 */

export const CATEGORY_NORMALIZE: Record<string, string> = {
  masa:          'mass',
  mass:          'mass',
  dimensional:   'dimensional',
  presion:       'pressure',
  'presión':     'pressure',
  pressure:      'pressure',
  torque:        'torque',
  electrico:     'electrical',
  'eléctrico':   'electrical',
  electrical:    'electrical',
  temperatura:   'temperature',
  temperature:   'temperature',
  humedad:       'temperature',   // termohigrómetros
};

/**
 * Normalizes a raw category string to its canonical English key.
 * Returns the input lower-cased unchanged if no mapping exists.
 */
export function normalizeCategory(raw: string | null | undefined): string {
  if (!raw) return '';
  const lower = raw.toLowerCase();
  return CATEGORY_NORMALIZE[lower] ?? lower;
}

/**
 * Returns true if two category strings refer to the same canonical category,
 * regardless of language or capitalization.
 */
export function isSameCategory(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeCategory(a) === normalizeCategory(b);
}
