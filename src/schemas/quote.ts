/** Refleja exactamente lo que devuelve GET /verify-quote/{code} (público, sin auth). */
export interface QuoteVerificationItem {
  description: string;
  unit: string;
  quantity: number;
  unit_price_assumed_usd: number;
  total_price_usd: number;
}

export interface QuoteVerificationResponse {
  found: boolean;
  message?: string;
  quote?: {
    code: string;
    status: string;
    issued_at: string | null;
    project_name: string | null;
    currency_display: string;
  };
  client?: {
    company_name: string;
  };
  items?: QuoteVerificationItem[];
  totals?: {
    subtotal_usd: number;
    tax_amount_usd: number;
    total_usd: number;
  };
  prepared_by?: string;
  hash?: {
    stored: string | null;
    computed: string;
    matches: boolean;
  };
  laboratory?: {
    name: string;
    address: string;
    city: string;
  };
}
