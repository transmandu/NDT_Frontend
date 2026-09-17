import type { Client } from './calibration';

/**
 * Verificado empíricamente contra el driver sqlsrv real (no es solo la teoría
 * de los casts `decimal:N`): en un fetch fresco desde SQL Server — el caso
 * real de cualquier request HTTP vía route-model-binding — SOLO el `id`
 * (primary key) de cada tabla llega como number JSON. Cualquier otra columna
 * entera o foránea sin cast explícito (`sort_order`, `depreciation_days`,
 * `rounding_significant_figures`, `created_by`, `quote_parameters_id`, etc.)
 * llega como string, igual que los campos con cast `decimal:N`. Por eso este
 * alias se usa tanto para decimales como para enteros/FKs "crudos": todo lo
 * que no sea el `id` propio de la fila se tipa como string, y se convierte
 * con `Number(...)`/`parseFloat(...)` solo en el momento de mostrarlo o
 * calcular en el cliente, nunca antes.
 */
export type DecimalString = string;

export type QuoteStatus = 'draft' | 'issued' | 'won' | 'lost';
export type QuoteCurrencyDisplay = 'usd' | 'bs' | 'both';
export type QuoteCommissionChannel = 'none' | 'lloyds' | 'prespuntar' | 'hangar74';
export type QuoteItemLineKind = 'material' | 'equipment' | 'labor';

/** Refleja CatalogItemResource. */
export interface CatalogItem {
  id: number;
  code: string;
  type: string;
  description: string;
  unit: string;
  unit_price_usd: DecimalString;
  depreciation_days: DecimalString | null;
  default_waste_pct: DecimalString;
  is_active: boolean;
}

/** Refleja LaborRateResource. */
export interface LaborRate {
  id: number;
  role_name: string;
  daily_rate_usd: DecimalString;
  civ_level_code: string | null;
  sort_order: DecimalString | null;
  is_active: boolean;
}

/**
 * Refleja QuoteMethodResource. `ui_schema` es el JSON (cast `array` en el
 * modelo) que describe las líneas de costo por defecto (material/equipo/
 * mano de obra) para ese método NDT — mismo rol que `procedure_schemas.ui_schema`
 * cumple para las calibraciones.
 */
export interface QuoteMethod {
  id: number;
  code: string;
  name: string;
  default_unit: string;
  ui_schema: Record<string, unknown> | null;
  is_active: boolean;
}

/** Refleja QuoteParameterResource. No existe `update`: cada fila es una versión. */
export interface QuoteParameter {
  id: number;
  effective_from: string;
  exchange_rate_bs_usd: DecimalString;
  usd_cost_factor: DecimalString;
  salary_increase_factor: DecimalString;
  fcas_factor: DecimalString;
  default_admin_pct: DecimalString;
  default_utility_pct: DecimalString;
  default_tax_pct: DecimalString;
  rounding_significant_figures: DecimalString;
  salary_reference: DecimalString | null;
  is_active: boolean;
  created_by: DecimalString | null;
}

/** Refleja QuoteItemLineResource. */
export interface QuoteItemLine {
  id: number;
  quote_item_id: DecimalString;
  kind: QuoteItemLineKind;
  catalog_item_id: DecimalString | null;
  labor_rate_id: DecimalString | null;
  description: string;
  quantity: DecimalString;
  waste_pct: DecimalString | null;
  depreciation_days: DecimalString | null;
  unit_cost_usd: DecimalString;
  days: DecimalString | null;
  line_total_usd: DecimalString;
}

/** Refleja QuoteItemResource. `lines` solo viene cuando el backend la carga explícitamente. */
export interface QuoteItem {
  id: number;
  quote_id: DecimalString;
  quote_method_id: DecimalString;
  item_order: DecimalString | null;
  description: string;
  unit: string;
  quantity: DecimalString;
  execution_days: DecimalString | null;
  materials_subtotal_usd: DecimalString;
  equipment_subtotal_usd: DecimalString;
  labor_subtotal_usd: DecimalString;
  unit_price_calculated_usd: DecimalString;
  unit_price_assumed_usd: DecimalString;
  override_reason: string | null;
  total_price_usd: DecimalString;
  // OJO: QuoteItemResource NO expone una relación `method`, solo
  // `quote_method_id` — si se necesita el nombre/código del método hay que
  // resolverlo contra la lista de /quote-methods en el cliente.
  lines?: QuoteItemLine[];
}

/**
 * Refleja QuoteResource. `pdf_ready` (= Quote::pdfExists()) le evita al
 * frontend tener que intentar la descarga solo para saber si ya existe —
 * mismo campo que ya usa CertificateResource. Los campos `*_applied` son el
 * snapshot de quote_parameters congelado en `store()`: la tasa/FCAS/%admin/
 * %utilidad/%impuesto bajo los que se calculó ESTA cotización en particular,
 * inmutable aunque quote_parameters cambie después.
 */
export interface Quote {
  id: number;
  code: string;
  status: QuoteStatus;
  currency_display: QuoteCurrencyDisplay;
  project_name: string | null;
  subtotal_usd: DecimalString | null;
  tax_amount_usd: DecimalString | null;
  total_usd: DecimalString | null;
  commission_channel: QuoteCommissionChannel | null;
  commission_amount_usd: DecimalString | null;
  pdf_ready: boolean;
  issued_at: string | null;
  notes: string | null;
  created_at: string | null;
  quote_parameters_id: DecimalString;
  exchange_rate_applied: DecimalString;
  usd_cost_factor_applied: DecimalString;
  fcas_factor_applied: DecimalString;
  admin_pct_applied: DecimalString;
  utility_pct_applied: DecimalString;
  tax_pct_applied: DecimalString;
  created_by: DecimalString;
  client?: Client;
  items?: QuoteItem[];
}

/** Payload para POST /quotes. */
export interface CreateQuotePayload {
  client_id: number;
  project_name?: string | null;
  currency_display?: QuoteCurrencyDisplay;
}

/** Payload para PUT /quotes/{id} — solo válido en status draft. */
export interface UpdateQuotePayload {
  project_name?: string | null;
  currency_display?: QuoteCurrencyDisplay;
  commission_channel?: QuoteCommissionChannel;
  notes?: string | null;
}

/**
 * Payload para POST /quotes/{quote}/items — verificado línea por línea contra
 * la validación real de QuoteItemController::store(). OJO: NO es un arreglo
 * unificado `lines[]` con un discriminador `kind` (así lo tenía yo en el
 * Paso 1, antes de releer el controlador) — son tres arreglos separados con
 * forma distinta cada uno: materials trae waste_pct opcional, equipment no
 * trae nada de desperdicio, y labor trae days en vez de waste_pct. El backend
 * calcula todos los subtotales (QuotePricingEngine) a partir de estas líneas
 * — el frontend nunca envía precios ya calculados, solo cantidades y
 * referencias a catálogo/tarifas.
 */
export interface CreateQuoteItemMaterialLine {
  catalog_item_id: number;
  quantity: number;
  waste_pct?: number | null;
}

export interface CreateQuoteItemEquipmentLine {
  catalog_item_id: number;
  quantity: number;
}

export interface CreateQuoteItemLaborLine {
  labor_rate_id: number;
  quantity: number;
  days: number;
}

export interface CreateQuoteItemPayload {
  quote_method_id: number;
  description: string;
  unit?: string;
  quantity: number;
  execution_days?: number | null;
  materials?: CreateQuoteItemMaterialLine[];
  equipment?: CreateQuoteItemEquipmentLine[];
  labor?: CreateQuoteItemLaborLine[];
}
