import api from "@/lib/api";
import { downloadBlob } from "@/lib/downloadHelper";
import type {
  AssignableUser,
  CorrectiveAction,
  Nonconformity,
  QualityAttachment,
  QualityMethodSchema,
  QualityTimelineEntry,
  RootCauseAnalysis,
} from "@/types/quality";

/* ════════════════════════════════════════════════════════════
   Gestión de Calidad — cliente de API (Fase 4)
   Funciones delgadas y tipadas sobre `api` (axios). Los hooks de
   react-query viven en las páginas/componentes que las usan.
   ════════════════════════════════════════════════════════════ */

/* ─── No Conformidades ───────────────────────────────────── */
export const qualityApi = {
  listNonconformities: (params?: Record<string, string | boolean>) =>
    api
      .get<{ data: Nonconformity[] }>("/quality/nc", { params })
      .then((r) => r.data.data),

  getNonconformity: (id: number) =>
    api
      .get<{ nonconformity: Nonconformity }>(`/quality/nc/${id}`)
      .then((r) => r.data.nonconformity),

  createNonconformity: (payload: {
    title: string;
    description: string;
    source_type?: string;
    source_id?: number;
    detected_at?: string;
    impact_assessment?: string;
    immediate_actions?: string;
    risk_level?: string;
  }) =>
    api
      .post<{ nonconformity: Nonconformity }>("/quality/nc", payload)
      .then((r) => r.data.nonconformity),

  updateNonconformity: (
    id: number,
    payload: Partial<
      Pick<
        Nonconformity,
        "title" | "description" | "impact_assessment" | "immediate_actions"
      >
    > & { risk_level?: string },
  ) =>
    api
      .put<{ nonconformity: Nonconformity }>(`/quality/nc/${id}`, payload)
      .then((r) => r.data.nonconformity),

  transitionNonconformity: (
    id: number,
    to: string,
    extra?: Record<string, unknown>,
  ) =>
    api
      .post<{ nonconformity: Nonconformity }>(`/quality/nc/${id}/transitions`, {
        to,
        ...extra,
      })
      .then((r) => r.data.nonconformity),

  resumeNonconformity: (id: number) =>
    api
      .post<{ nonconformity: Nonconformity }>(`/quality/nc/${id}/resume`)
      .then((r) => r.data.nonconformity),

  decideDisposition: (
    id: number,
    payload: {
      certificate_disposition: string;
      client_notification_required: boolean;
    },
  ) =>
    api
      .post<{ nonconformity: Nonconformity }>(
        `/quality/nc/${id}/disposition`,
        payload,
      )
      .then((r) => r.data.nonconformity),

  ncTimeline: (id: number) =>
    api
      .get<{ timeline: QualityTimelineEntry[] }>(`/quality/nc/${id}/timeline`)
      .then((r) => r.data.timeline),

  /** Candidatos a responsable de una AC — Supervisor/Auditor/Admin (versión liviana de /users, que es solo admin). */
  listAssignableUsers: () =>
    api
      .get<{ users: AssignableUser[] }>("/quality/assignable-users")
      .then((r) => r.data.users),

  /* ─── Acciones Correctivas ────────────────────────────── */
  listCorrectiveActions: (params?: Record<string, string | number>) =>
    api
      .get<{ data: CorrectiveAction[] }>("/quality/ac", { params })
      .then((r) => r.data.data),

  getCorrectiveAction: (id: number) =>
    api
      .get<{ corrective_action: CorrectiveAction }>(`/quality/ac/${id}`)
      .then((r) => r.data.corrective_action),

  createCorrectiveAction: (payload: {
    nonconformity_id: number;
    title: string;
    description: string;
    method_schema_id?: number;
    assigned_to?: number;
    start_date?: string;
    target_date?: string;
  }) =>
    api
      .post<{ corrective_action: CorrectiveAction }>("/quality/ac", payload)
      .then((r) => r.data.corrective_action),

  updateCorrectiveAction: (
    id: number,
    payload: Partial<{
      title: string;
      description: string;
      root_cause_analysis: RootCauseAnalysis;
      method_schema_id: number;
      action_plan: Record<string, unknown>;
      assigned_to: number | null;
      start_date: string;
      target_date: string;
    }>,
  ) =>
    api
      .put<{ corrective_action: CorrectiveAction }>(
        `/quality/ac/${id}`,
        payload,
      )
      .then((r) => r.data.corrective_action),

  transitionCorrectiveAction: (
    id: number,
    to: string,
    extra?: Record<string, unknown>,
  ) =>
    api
      .post<{ corrective_action: CorrectiveAction }>(
        `/quality/ac/${id}/transitions`,
        { to, ...extra },
      )
      .then((r) => r.data.corrective_action),

  verifyEffectiveness: (id: number, result: "eficaz" | "no_eficaz", note?: string) =>
    api
      .post<{ corrective_action: CorrectiveAction }>(
        `/quality/ac/${id}/verifications`,
        { result, note },
      )
      .then((r) => r.data.corrective_action),

  acTimeline: (id: number) =>
    api
      .get<{ timeline: QualityTimelineEntry[] }>(`/quality/ac/${id}/timeline`)
      .then((r) => r.data.timeline),

  /* ─── Adjuntos ────────────────────────────────────────── */
  uploadNcAttachment: (ncId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<{ attachment: QualityAttachment }>(
        `/quality/nc/${ncId}/attachments`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
      .then((r) => r.data.attachment);
  },

  uploadAcAttachment: (acId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<{ attachment: QualityAttachment }>(
        `/quality/ac/${acId}/attachments`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
      .then((r) => r.data.attachment);
  },

  downloadAttachment: (attachmentId: number, filename: string) =>
    api
      .get(`/quality/attachments/${attachmentId}/download`, {
        responseType: "blob",
      })
      .then((r) => downloadBlob(r.data, filename)),

  /* ─── Esquemas de causa raíz ──────────────────────────── */
  listMethodSchemas: () =>
    api
      .get<{ data: QualityMethodSchema[] }>("/quality/method-schemas")
      .then((r) => r.data.data),
};

export default qualityApi;
