/**
 * Etiquetas visibles de los roles del sistema. El slug interno (usado en
 * middleware, validaciones y lógica de permisos) NO cambia — solo el texto
 * que se muestra en la UI.
 */
export const ROLE_LABELS: Record<string, string> = {
  technician: "Técnico de laboratorio",
  supervisor: "Jefe de laboratorio",
  admin: "Gerente de laboratorio",
  auditor: "Auditor de Calidad",
};

export function roleLabel(role: string | null | undefined): string {
  if (!role) return "Rol";
  return ROLE_LABELS[role] ?? role;
}
