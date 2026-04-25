/**
 * Sistema de colores compartido — Orinoco Q&C LIMS
 *
 * Un solo objeto importado por cualquier componente que necesite colores
 * de marca, semánticos o de rol. Evita inconsistencias entre archivos.
 *
 * Uso:
 *   import { C } from '@/lib/colors';
 *   style={{ color: C.primary }}
 *   style={{ backgroundColor: C.danger }}
 */

export const C = {
  /* ── Marca ─────────────────────────────────────── */
  primary:  '#FFA526',   // naranja principal (botones CTA, pestañas activas)
  accent:   '#6366F1',   // índigo   (esquemas, admin, highlights secundarios)

  /* ── Semánticos ─────────────────────────────────── */
  success:  '#10B981',   // verde    (aprobado, confirmado, activo)
  warning:  '#F59E0B',   // ámbar    (borrador, advertencia, atención)
  danger:   '#EF4444',   // rojo     (rechazado, error, eliminar)
  info:     '#3B82F6',   // azul     (modo auditoría, información)

  /* ── Roles de usuario ───────────────────────────── */
  roleAdmin:      '#EF4444',   // rojo   (admin — máximo privilegio)
  roleAuditor:    '#3B82F6',   // azul   (auditor)
  roleTechnician: '#10B981',   // verde  (técnico)
  roleSupervisor: '#F59E0B',   // ámbar  (supervisor)

  /* ── Estados de sesión ──────────────────────────── */
  statusDraft:   '#9CA3AF',   // gris    (borrador)
  statusPending: '#FFA526',   // naranja (en revisión)
  statusApproved:'#10B981',   // verde   (aprobado)
  statusRejected:'#EF4444',   // rojo    (rechazado)
} as const;

export type ColorKey = keyof typeof C;

/** Devuelve el color de un estado de sesión de calibración */
export function sessionStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft:          C.statusDraft,
    pending_review: C.statusPending,
    approved:       C.statusApproved,
    rejected:       C.statusRejected,
  };
  return map[status] ?? C.statusDraft;
}

/** Devuelve el color del rol de un usuario */
export function roleColor(role: string): string {
  const map: Record<string, string> = {
    admin:      C.roleAdmin,
    auditor:    C.roleAuditor,
    technician: C.roleTechnician,
    supervisor: C.roleSupervisor,
  };
  return map[role] ?? C.accent;
}
