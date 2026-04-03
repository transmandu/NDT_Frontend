export interface MetadataRequirement {
  field: string;
  label: string;
  type: 'number' | 'string' | 'date';
  unit?: string;
  required: boolean;
  min?: number;
  max?: number;
  default?: any;
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
  instrument?: any;
  technician?: any;
  procedure_schema?: any;
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
  location: string | null;
  status: string;
}

export interface Standard {
  id: number;
  internal_code: string;
  name: string;
  brand: string;
  category: string;
  certificate_number: string;
  uncertainty_u: number;
  k_factor: number;
  expiry_date: string;
  calibrated_by_lab: string;
}
