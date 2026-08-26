/**
 * Tipos del motor de UI Schema para causa raíz (Fase 3 del módulo de
 * Gestión de Calidad). Los tipos completos de Nonconformity/CorrectiveAction
 * se agregan en Fase 4, cuando se construyen las páginas que los consumen.
 */

export interface FiveWhysStep {
  level: number;
  question: string;
  answer: string;
  evidence: string;
}

export interface FiveWhysSchema {
  type: "sequential_steps";
  steps: FiveWhysStep[];
}

export interface IshikawaCause {
  cause: string;
  evidence: string;
  subcauses: string[];
}

export interface IshikawaCategory {
  category: string;
  causes: IshikawaCause[];
}

export interface IshikawaSchema {
  type: "categorized_causes";
  categories: IshikawaCategory[];
}

/** Unión discriminada por `type` — cubre los seeds del sistema (5 Whys, Ishikawa). */
export type QualityUiSchema = FiveWhysSchema | IshikawaSchema;

export interface QualityMethodSchema {
  id: number;
  key: string;
  name: string;
  description: string | null;
  ui_schema: QualityUiSchema;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

/** Lo que se guarda en CorrectiveAction.root_cause_analysis — misma forma que ui_schema, ya respondida. */
export type RootCauseAnalysis = QualityUiSchema;

/* ════════════════════════════════════════════════════════════
   Fase 4 — Entidades NC / AC (reflejan los Resources del backend)
   ════════════════════════════════════════════════════════════ */

export type NcSourceType =
  | "calibration_session"
  | "instrument"
  | "standard"
  | "library_document";

export type NcStatus =
  | "abierta"
  | "en_investigacion"
  | "plan_accion"
  | "en_implementacion"
  | "en_seguimiento"
  | "cerrada"
  | "cancelada";

export type AcStatus =
  | "plan_accion"
  | "en_implementacion"
  | "en_verificacion"
  | "eficaz"
  | "no_eficaz"
  | "cancelada";

export type RiskLevel = "bajo" | "medio" | "alto";
export type ClosureResult = "eficaz" | "no_eficaz";
export type CertificateDisposition = "mantener" | "reemitir" | "retirar";

export interface QualityUserRef {
  id: number;
  name: string;
  email: string;
  role: string | null;
  job_title: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Versión liviana de QualityUserRef para poblar el picker de responsable (GET /quality/assignable-users). */
export interface AssignableUser {
  id: number;
  name: string;
  role: string | null;
}

export interface QualityAttachment {
  id: number;
  original_name: string;
  mime_type: string;
  file_size: number;
  file_hash: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface CorrectiveAction {
  id: number;
  nonconformity_id: number;
  code: string;
  title: string;
  description: string;
  root_cause_analysis: RootCauseAnalysis | null;
  method_schema: QualityMethodSchema | null;
  action_plan: Record<string, unknown> | null;
  assignee: QualityUserRef | null;
  start_date: string | null;
  target_date: string | null;
  status: AcStatus;
  cancellation_reason: string | null;
  effectiveness_verification: string | null;
  verified_at: string | null;
  verifier: QualityUserRef | null;
  attachments?: QualityAttachment[];
  created_at: string;
  updated_at: string;
}

export interface Nonconformity {
  id: number;
  code: string;
  title: string;
  description: string;
  source_type: NcSourceType | null;
  source_id: number | null;
  detector: QualityUserRef | null;
  detected_at: string | null;
  status: NcStatus;
  impact_assessment: string | null;
  immediate_actions: string | null;
  risk_level: RiskLevel | null;
  due_date_verification: string | null;
  resumed_at: string | null;
  resumer: QualityUserRef | null;
  cancelled_at: string | null;
  canceller: QualityUserRef | null;
  cancellation_reason: string | null;
  closed_at: string | null;
  closer: QualityUserRef | null;
  closure_result: ClosureResult | null;
  affects_issued_results: boolean;
  client_notification_required: boolean;
  client_notified_at: string | null;
  certificate_disposition: CertificateDisposition | null;
  disposition_decided_at: string | null;
  corrective_actions?: CorrectiveAction[];
  attachments?: QualityAttachment[];
  created_at: string;
  updated_at: string;
}

export interface QualityTimelineEntry {
  event: "created" | "updated" | "deleted";
  user: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}
