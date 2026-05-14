export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  job_title?: string;
}

export interface UncertaintySource {
  source_name: string;
  type: 'A' | 'B';
  distribution: string;
  value?: number;
  divisor?: number;
  sensitivity_coefficient?: number;
  standard_uncertainty: number;
  degrees_of_freedom: number | null;
  note?: string;
}

/**
 * Magnitude/category strings emitted by the backend (`ProcedureSchema.category`
 * and `Instrument.category`). They are in Spanish and correspond to physical
 * magnitudes, not instrument types.
 */
export type InstrumentCategory =
  | 'presion'      // → manómetros
  | 'masa'         // → balanzas
  | 'temperatura'  // → termohigrómetros (canal T)
  | 'humedad'      // → termohigrómetros (canal HR)
  | 'electrica'    // → multímetros
  | 'torque'       // → torquímetros
  | 'dimensional'; // → vernier / pie de rey

/**
 * Logical table shape used by the audit results view. Many physical categories
 * collapse onto the same table layout (e.g. temperatura/humedad → thermohygrometer).
 */
export type ResultsTableType =
  | 'manometer'
  | 'balance'
  | 'thermohygrometer'
  | 'multimeter'
  | 'torquemeter'
  | 'vernier'
  | 'generic'; // safe fallback for unknown procedures

export interface BudgetPoint {
  /* Identification */
  nominal_value?: number;
  nominal_length_mm?: number;
  nominal?: number;
  nominal_bar?: number;
  point_g?: number;
  function?: string;
  unit?: string;

  /* Measured / derived values */
  mean?: number;
  mean_mm?: number;
  mean_reading?: number;
  average_measured?: number;
  mean_reference?: number;
  std_deviation?: number;
  std_deviation_um?: number;
  n_readings?: number;

  /* Error variants */
  error?: number;
  error_ascending?: number;
  error_descending?: number;
  absolute_error?: number;
  relative_error_pct?: number;
  hysteresis?: number;
  correction?: number;

  /* Multimeter-specific */
  range?: number;
  ac_frequency_hz?: number;
  offset_correction?: number;
  corrected_mean?: number;
  has_zero_reading?: boolean;

  /* Manometer-specific */
  mean_instrument_asc?: number;
  mean_standard_asc?: number;
  hydrostatic_correction_applied?: boolean;
  hydrostatic_delta?: number;

  /* GUM result */
  combined_uncertainty?: number;
  combined_uncertainty_mm?: number;
  combined_uncertainty_um?: number;
  expanded_uncertainty?: number;
  expanded_uncertainty_mm?: number;
  expanded_uncertainty_um?: number;
  expanded_uncertainty_pct?: number;
  expanded_u?: number;
  k_factor?: number;
  effective_dof?: number;

  /* Traceability and conformity */
  standard_used?: { name?: string; cert?: string; U?: number; k?: number };
  conformity_statement?: string | null;

  /* Legacy fields kept for compatibility */
  instrument?: number;
  instrument_bar?: number;
  uncertainty_sources?: UncertaintySource[];
}

export interface BudgetPreview {
  functions?: Record<string, BudgetPoint[]>;
  points?: BudgetPoint[];
  temperature?: { points: BudgetPoint[] };
  humidity?: { points: BudgetPoint[] };
}

export interface TraceabilityEntry {
  lab: string;
  certificate_number?: string;
  date?: string;
}

export interface MetadataRequirement {
  field: string;
  label: string;
  type: 'number' | 'string' | 'date';
  unit?: string;
  required: boolean;
  min?: number;
  max?: number;
  default?: number | string | boolean | null;
}

export interface GridColumn {
  key: string;
  label: string;
  type: 'number' | 'string' | 'select' | 'number_array';
  unit?: string;
  editable: boolean;
  required: boolean;
  precision?: number;
  min?: number;
  max?: number;
  options?: string[];
  computed?: boolean;
  formula_hint?: string;
}

export interface GridSettings {
  min_iterations: number;
  max_iterations: number;
  readonly_on_submit: boolean;
  show_statistics: boolean;
}

export interface RowsConfig {
  dynamic: boolean;
  fixed_rows?: number | null;
  row_labels?: string[] | null;
  nominal_values?: string | number[] | null;
  percentages?: number[];
}

export interface GridSchema {
  id: string;
  title: string;
  type: 'single_column_iterations' | 'positional_grid' | 'multi_point_matrix' | 'custom_function_grid';
  description: string;
  settings: GridSettings;
  columns: GridColumn[];
  rows_config: RowsConfig;
}

export interface ProcedureUiSchema {
  procedure_code: string;
  procedure_name: string;
  metadata_requirements: MetadataRequirement[];
  grids: GridSchema[];
}

export interface UncertaintyResult {
  nominal_value: number;
  average_measured: number;
  error: number;
  correction: number;
  combined_uncertainty: number;
  effective_dof: number;
  k_factor: number;
  expanded_uncertainty: number;
  conformity_statement: string | null;
}

export interface CalibrationSession {
  id: number;
  instrument_id: number;
  user_id: number;
  approved_by: number | null;
  procedure_schema_id: number;
  certificate_code: string | null;
  category: string;
  ambient_temperature: number;
  ambient_humidity: number;
  ambient_pressure: number | null;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  observation: string | null;
  frozen_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  instrument?: Instrument;
  technician?: User;
  procedure_schema?: ProcedureSchema;
  standards?: Standard[];
  calculated_results?: BudgetPreview & { unit?: string };
  final_results?: BudgetPreview & { unit?: string };
  raw_payload?: Record<string, unknown>;
  calibration_date?: string | null;
  next_calibration_date?: string | null;
  ambient_temperature_uncertainty?: number | null;
  approved_by?: number | null;
}

export interface Instrument {
  id: number;
  internal_code: string;
  name: string;
  brand: string;
  model: string;
  serial_number: string;
  resolution: number;
  unit: string;
  category: string;
  range_min: number | null;
  range_max: number | null;
  /** Máximo Error Permitido (EMP) — usado para evaluar conformidad ISO 17025 §7.8.6. */
  emp: number | null;
  calibration_interval_months?: number | null;
  location: string | null;
  status: string;
}

/**
 * Frozen snapshot of a Standard's metrological data at session-creation time.
 * Lives on the `calibration_session_standards` pivot under `snapshot_data`
 * (see Standard::toSnapshot() in the backend). Used so the audit view shows
 * exactly the values that were in effect when the calibration was performed,
 * even if the standard's record is later updated.
 */
export interface StandardSnapshot {
  id?: number;
  internal_code?: string;
  name?: string;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  certificate_number?: string;
  unit?: string | null;
  resolution?: number | null;
  uncertainty_u?: number;
  k_factor?: number;
  uncertainty_slope?: number | null;
  drift_rate_per_year?: number | null;
  oiml_class?: string | null;
  mass_density?: number | null;
  calibration_date?: string | null;
  expiry_date?: string | null;
  calibrated_by_lab?: string | null;
}

export interface Standard {
  id: number;
  internal_code: string;
  name: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  resolution: number | null;
  unit: string | null;
  category: string;
  certificate_number: string;
  uncertainty_u: number;
  k_factor: number;
  calibration_date: string | null;
  expiry_date: string;
  calibrated_by_lab: string | null;
  traceability_chain: TraceabilityEntry[] | null;
  /* Category-specific metrological fields */
  drift_rate_per_year: number | null; // Mass: OIML drift
  oiml_class: string | null;           // Mass: E1, E2, F1, F2, M1…
  mass_density: number | null;         // Mass: kg/m³ for air buoyancy
  uncertainty_slope: number | null;    // Dimensional: b in U=a+b·L
  created_at?: string;
  updated_at?: string;
  /**
   * Pivot data carried by `session.standards` when loaded through the
   * `calibration_session_standards` many-to-many. The `snapshot_data` JSON
   * holds the frozen metrological state used during the calibration.
   */
  pivot?: { snapshot_data?: StandardSnapshot | null };
}

export interface ProcedureSchema {
  id: number;
  code: string;
  name: string;
  description: string | null;
  version: string;
  category: string;
  is_active: boolean;
  ui_schema: ProcedureUiSchema;
  validation_rules: Record<string, any> | null;
  math_config: Record<string, any> | null;
  calibration_sessions_count?: number;
  has_strategy?: boolean;
  created_at: string;
  updated_at: string;
}
