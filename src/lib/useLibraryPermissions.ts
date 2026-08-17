import { useAuthStore } from "@/stores/authStore";

/**
 * Matriz de permisos de la Biblioteca Digital, espejo de
 * NDT_Backend/app/Services/Library/LibraryPermissions.php (§6 de la guía de
 * replicación). Solo controla la UI (mostrar/ocultar botones) — el backend
 * es la autoridad real, igual que el resto de la app.
 */
export function useLibraryPermissions() {
  const role = useAuthStore((s) => s.user?.role) ?? "";

  const isAdmin = role === "admin";
  const isAuditor = role === "auditor";
  const canUploadOrManage =
    isAdmin || role === "technician" || role === "supervisor";

  return {
    isAdmin,
    canUpload: canUploadOrManage,
    canManageFolders: canUploadOrManage,
    // Admin no solicita: ya tiene "Generar enlace directo" (sin aprobación).
    // Solo quienes NO tienen esa vía directa necesitan pedirla.
    canRequestShare: role === "technician" || role === "supervisor",
    canGenerateShareDirectly: isAdmin,
    canApproveShare: isAdmin || isAuditor,
    canDeleteDocument: isAdmin,
    canDeleteVersion: isAdmin,
    canSetVisibility: isAdmin,
    canViewAllTraceability: isAdmin || isAuditor,
  };
}
