"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import {
  Plus,
  FolderPlus,
  Inbox,
  BarChart3,
  Loader2,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { getApiError } from "@/lib/apiErrors";
import { C } from "@/lib/colors";
import { DataTable } from "@/components/ui/data-table";
import { useLibraryPermissions } from "@/lib/useLibraryPermissions";
import { useShareRequestNotifications } from "@/lib/useShareRequestNotifications";
import { findFolderNode } from "@/lib/libraryTree";
import { downloadBlob } from "@/lib/downloadHelper";
import type { LibraryCategory, LibraryDocument, LibraryFolderNode, ExpiryStatus } from "@/types/library";

import { FolderTree } from "@/components/library/FolderTree";
import { CreateFolderDialog, RenameFolderDialog, DeleteFolderDialog } from "@/components/library/FolderDialogs";
import { UploadModal } from "@/components/library/UploadModal";
import { UploadVersionDialog } from "@/components/library/UploadVersionDialog";
import { VersionHistoryPanel } from "@/components/library/VersionHistoryPanel";
import { ShareDialog } from "@/components/library/ShareDialog";
import { ShareRequestsPanel } from "@/components/library/ShareRequestsPanel";
import { DashboardModal } from "@/components/library/DashboardModal";
import { SecureFileViewer } from "@/components/library/SecureFileViewer";
import { DocumentActionsMenu } from "@/components/library/DocumentActionsMenu";
import { DocumentPermissionsDialog } from "@/components/library/DocumentPermissionsDialog";

const STATUS_BADGE: Record<ExpiryStatus | "n/a", { label: string; color: string }> = {
  vigente: { label: "VIGENTE", color: C.success },
  vencido: { label: "VENCIDO", color: C.danger },
  no_aplica: { label: "PERMANENTE", color: "#3B82F6" },
  "n/a": { label: "SIN VERSIÓN", color: "#9CA3AF" },
};

function fileIcon(fileType: string | null) {
  if (fileType === "pdf") return <FileText size={14} style={{ color: C.danger }} />;
  if (fileType === "xlsx" || fileType === "xls") return <FileSpreadsheet size={14} style={{ color: "#10B981" }} />;
  return <FileIcon size={14} style={{ color: "var(--text-muted)" }} />;
}

function statusBadge(doc: LibraryDocument, now: number) {
  const days = doc.expiration_date
    ? Math.ceil((new Date(doc.expiration_date).getTime() - now) / 86_400_000)
    : null;
  if (doc.current_status === "vigente" && days !== null && days >= 0 && days <= 5) {
    return { label: `VENCE EN ${days}D`, color: C.warning };
  }
  return STATUS_BADGE[doc.current_status];
}

export default function LibraryPage() {
  const qc = useQueryClient();
  const perms = useLibraryPermissions();
  const { requests: shareRequests, pendingCount } = useShareRequestNotifications();

  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);

  const [createFolderParentId, setCreateFolderParentId] = useState<number | null | undefined>(undefined);
  const [renameFolder, setRenameFolder] = useState<LibraryFolderNode | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<LibraryFolderNode | null>(null);
  const [folderActionError, setFolderActionError] = useState<string | null>(null);

  const [shareTarget, setShareTarget] = useState<LibraryDocument | null>(null);
  const [historyTarget, setHistoryTarget] = useState<LibraryDocument | null>(null);
  const [uploadVersionTarget, setUploadVersionTarget] = useState<LibraryDocument | null>(null);
  const [permissionsTarget, setPermissionsTarget] = useState<LibraryDocument | null>(null);
  const [deleteDocTarget, setDeleteDocTarget] = useState<LibraryDocument | null>(null);
  const [viewerTarget, setViewerTarget] = useState<LibraryDocument | null>(null);

  const { data, isLoading } = useQuery<{ total: number; data: LibraryDocument[]; folders: LibraryFolderNode[] }>({
    queryKey: ["libraryDocuments"],
    queryFn: () => api.get("/library/documents").then((r) => r.data),
  });
  const documents = useMemo(() => data?.data ?? [], [data]);
  const folders = useMemo(() => data?.folders ?? [], [data]);

  const { data: categories = [] } = useQuery<LibraryCategory[]>({
    queryKey: ["libraryCategories"],
    queryFn: () => api.get("/library/categories-list").then((r) => r.data.categories || []),
  });

  const [now] = useState(() => Date.now());

  const visibleDocuments = useMemo(
    () => (selectedFolderId === null ? documents : documents.filter((d) => d.folder_id === selectedFolderId)),
    [documents, selectedFolderId],
  );

  /* ── Carpetas ── */
  const createFolderMut = useMutation({
    mutationFn: (payload: { name: string; parent_id: number | null; visible_to_roles: string[] | null }) =>
      api.post<{ folder: { id: number } }>("/library/folders", payload).then((r) => r.data.folder),
    onSuccess: (folder) => {
      qc.invalidateQueries({ queryKey: ["libraryDocuments"] });
      toast.success("Carpeta creada");
      setCreateFolderParentId(undefined);
      setFolderActionError(null);
      // Navega dentro de la carpeta recién creada — evita que "Subir documento"
      // siga apuntando a la ubicación anterior por defecto.
      setSelectedFolderId(folder.id);
    },
    onError: (err) => setFolderActionError(getApiError(err)),
  });

  const renameFolderMut = useMutation({
    mutationFn: (payload: { id: number; name: string; visible_to_roles: string[] | null }) =>
      api.patch(`/library/folders/${payload.id}`, { name: payload.name, visible_to_roles: payload.visible_to_roles }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["libraryDocuments"] });
      toast.success("Carpeta actualizada");
      setRenameFolder(null);
      setFolderActionError(null);
    },
    onError: (err) => setFolderActionError(getApiError(err)),
  });

  const deleteFolderMut = useMutation({
    mutationFn: (id: number) => api.delete(`/library/folders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["libraryDocuments"] });
      toast.success("Carpeta eliminada");
      if (deleteFolder && selectedFolderId === deleteFolder.id) setSelectedFolderId(null);
      setDeleteFolder(null);
      setFolderActionError(null);
    },
    onError: (err) => setFolderActionError(getApiError(err)),
  });

  /* ── Documentos ── */
  const deleteDocMut = useMutation({
    mutationFn: (id: number) => api.delete(`/library/documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["libraryDocuments"] });
      toast.success("Documento eliminado");
      setDeleteDocTarget(null);
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const handleDownload = async (doc: LibraryDocument) => {
    try {
      const res = await api.get(`/library/documents/${doc.id}/download`, { responseType: "blob" });
      const ext = doc.latest_version?.file_type ?? "pdf";
      downloadBlob(res.data, `${doc.title}.${ext}`);
    } catch {
      toast.error("No se pudo descargar el documento.");
    }
  };

  // ISO 17025 §8.3.2 — no bloquea la consulta interna de un documento vencido
  // (sigue siendo un uso legítimo, p. ej. auditorías), pero exige una
  // confirmación explícita en vez de dejarlo pasar como si nada.
  const confirmIfExpired = (doc: LibraryDocument, action: () => void) => {
    if (doc.current_status === "vencido") {
      const proceed = window.confirm(
        `Este documento está vencido${doc.expiration_date ? ` desde el ${doc.expiration_date}` : ""}. ¿Deseas continuar de todas formas?`,
      );
      if (!proceed) return;
    }
    action();
  };

  const columns: ColumnDef<LibraryDocument>[] = useMemo(
    () => [
      {
        id: "title",
        header: () => (
          <span className="inline-flex items-center gap-2">
            <span className="w-3.5 shrink-0" aria-hidden />
            Documento
          </span>
        ),
        accessorFn: (row) => row.title,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 min-w-0">
            {fileIcon(row.original.file_type)}
            <div className="min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: "var(--text-main)" }}>{row.original.title}</p>
              <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                {row.original.document_code && (
                  <span className="font-mono font-semibold mr-1.5" style={{ color: C.accent }}>{row.original.document_code}</span>
                )}
                {row.original.folder_breadcrumb || "Raíz"}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "category",
        id: "category",
        header: "Categoría",
        accessorFn: (row) => row.category?.name ?? "—",
        enableColumnFilter: true,
        cell: ({ getValue }) => (
          <span className="text-xs px-2 py-0.5 rounded font-medium text-center" style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        id: "version",
        header: "Versión",
        enableColumnFilter: false,
        cell: ({ row }) => {
          const v = row.original.latest_version;
          if (!v) return <span style={{ color: "var(--text-muted)" }}>—</span>;
          return (
            <span className="font-mono text-sm" style={{ color: "var(--text-main)" }}>
              {v.version_number}
              {v.version_label && v.version_label !== v.version_number && (
                <span className="block text-xs font-sans" style={{ color: "var(--text-muted)" }}>
                  {v.version_label}
                </span>
              )}
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Vigencia",
        enableColumnFilter: false,
        cell: ({ row }) => {
          const doc = row.original;
          const b = statusBadge(doc, now);
          const reviewDue =
            !!doc.next_review_date &&
            new Date(doc.next_review_date).getTime() <= now &&
            doc.current_status !== "vencido";
          return (
            <div className="flex flex-col gap-1 items-start">
              <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ backgroundColor: `${b.color}15`, color: b.color, border: `1px solid ${b.color}30` }}>
                {b.label}
              </span>
              {reviewDue && (
                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ backgroundColor: "#8B5CF615", color: "#8B5CF6", border: "1px solid #8B5CF630" }}>
                  REVISIÓN PENDIENTE
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "updated_at",
        header: "Actualizado",
        enableColumnFilter: false,
        cell: ({ row }) => (
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            {new Date(row.original.updated_at).toLocaleDateString("es-ES")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableColumnFilter: false,
        size: 48,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DocumentActionsMenu
              canShare={(perms.canGenerateShareDirectly || perms.canRequestShare) && row.original.current_status !== "vencido"}
              canDeleteDocument={perms.canDeleteDocument}
              canSetVisibility={perms.canSetVisibility}
              onView={() => confirmIfExpired(row.original, () => setViewerTarget(row.original))}
              onDownload={() => confirmIfExpired(row.original, () => handleDownload(row.original))}
              onShare={() => setShareTarget(row.original)}
              onHistory={() => setHistoryTarget(row.original)}
              onUploadVersion={() => setUploadVersionTarget(row.original)}
              onDelete={() => setDeleteDocTarget(row.original)}
              onPermissions={() => setPermissionsTarget(row.original)}
            />
          </div>
        ),
      },
    ],
    [perms.canDeleteDocument, perms.canSetVisibility, perms.canGenerateShareDirectly, perms.canRequestShare, now],
  );

  const selectedFolderName =
    selectedFolderId === null ? "Raíz" : (findFolderNode(folders, selectedFolderId)?.name ?? "Raíz");

  return (
    <div className="space-y-3 w-full animate-fadeIn">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-md font-bold" style={{ color: "var(--text-main)" }}>Biblioteca Digital</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Procedimientos, manuales y normas del laboratorio</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRequestsOpen(true)}
            className="h-8 px-3 text-sm rounded font-semibold flex items-center gap-1.5 hover-bg transition-colors relative cursor-pointer"
            style={{ border: "1px solid var(--border-color)", color: "var(--text-main)" }}
          >
            <Inbox  size={16} /> Solicitudes
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: C.danger }}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setDashboardOpen(true)}
            className="h-8 px-3 text-sm rounded font-semibold flex items-center gap-1.5 hover-bg transition-colors cursor-pointer"
            style={{ border: "1px solid var(--border-color)", color: "var(--text-main)" }}
          >
            <BarChart3 size={13} /> Dashboard
          </button>
          {perms.canManageFolders && (
            <button
              onClick={() => setCreateFolderParentId(selectedFolderId)}
              className="h-8 px-3 text-sm rounded font-semibold flex items-center gap-1.5 hover-bg transition-colors cursor-pointer"
              style={{ border: "1px solid var(--border-color)", color: "var(--text-main)" }}
            >
              <FolderPlus size={16} /> Nueva carpeta
            </button>
          )}
          {perms.canUpload && (
            <button
              onClick={() => setUploadOpen(true)}
              className="h-8 px-3 text-sm rounded font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: C.accent, color: "#fff" }}
            >
              <Plus size={16} /> Subir documento
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 items-start">
        <FolderTree
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelect={setSelectedFolderId}
          canManage={perms.canManageFolders}
          onCreateFolder={setCreateFolderParentId}
          onRenameFolder={setRenameFolder}
          onDeleteFolder={setDeleteFolder}
        />

        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Ubicación: <span style={{ color: "var(--text-main)" }}>{selectedFolderName}</span>
          </p>
          {isLoading ? (
            <div className="panel rounded-md shadow-sm p-8 text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
              <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: C.accent }} />
              Cargando documentos…
            </div>
          ) : visibleDocuments.length === 0 ? (
            <div className="panel rounded-md shadow-sm p-10 text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
              No hay documentos en esta carpeta.
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={visibleDocuments}
              searchPlaceholder="Buscar por título o categoría…"
            />
          )}
        </div>
      </div>

      {/* ── Carpetas ── */}
      {createFolderParentId !== undefined && (
        <CreateFolderDialog
          parentName={createFolderParentId === null ? "Raíz" : (findFolderNode(folders, createFolderParentId)?.name ?? "Raíz")}
          canSetVisibility={perms.canSetVisibility}
          submitting={createFolderMut.isPending}
          error={folderActionError}
          onSubmit={(name, roles) => createFolderMut.mutate({ name, parent_id: createFolderParentId, visible_to_roles: roles })}
          onClose={() => { setCreateFolderParentId(undefined); setFolderActionError(null); }}
        />
      )}
      {renameFolder && (
        <RenameFolderDialog
          folder={renameFolder}
          canSetVisibility={perms.canSetVisibility}
          submitting={renameFolderMut.isPending}
          error={folderActionError}
          onSubmit={(name, roles) => renameFolderMut.mutate({ id: renameFolder.id, name, visible_to_roles: roles })}
          onClose={() => { setRenameFolder(null); setFolderActionError(null); }}
        />
      )}
      {deleteFolder && (
        <DeleteFolderDialog
          folder={deleteFolder}
          submitting={deleteFolderMut.isPending}
          error={folderActionError}
          onConfirm={() => deleteFolderMut.mutate(deleteFolder.id)}
          onClose={() => { setDeleteFolder(null); setFolderActionError(null); }}
        />
      )}

      {/* ── Documentos ── */}
      {uploadOpen && (
        <UploadModal
          categories={categories}
          folders={folders}
          defaultFolderId={selectedFolderId}
          canSetVisibility={perms.canSetVisibility}
          onClose={() => setUploadOpen(false)}
        />
      )}
      {shareTarget && (
        <ShareDialog
          doc={shareTarget}
          canGenerateDirectly={perms.canGenerateShareDirectly}
          canRequestShare={perms.canRequestShare}
          onClose={() => setShareTarget(null)}
        />
      )}
      {historyTarget && (
        <VersionHistoryPanel
          doc={historyTarget}
          canDeleteVersion={perms.canDeleteVersion}
          onUploadNewVersion={() => { setUploadVersionTarget(historyTarget); setHistoryTarget(null); }}
          onClose={() => setHistoryTarget(null)}
        />
      )}
      {uploadVersionTarget && (
        <UploadVersionDialog doc={uploadVersionTarget} onClose={() => setUploadVersionTarget(null)} />
      )}
      {permissionsTarget && (
        <DocumentPermissionsDialog doc={permissionsTarget} onClose={() => setPermissionsTarget(null)} />
      )}
      {viewerTarget && (
        <SecureFileViewer
          viewUrl={`/library/view/${viewerTarget.id}`}
          title={viewerTarget.title}
          fileType={viewerTarget.file_type}
          onClose={() => setViewerTarget(null)}
        />
      )}
      {deleteDocTarget && (
        <DeleteDocumentDialog
          doc={deleteDocTarget}
          submitting={deleteDocMut.isPending}
          onConfirm={() => deleteDocMut.mutate(deleteDocTarget.id)}
          onClose={() => setDeleteDocTarget(null)}
        />
      )}

      {requestsOpen && (
        <ShareRequestsPanel
          requests={shareRequests}
          canApprove={perms.canApproveShare}
          onClose={() => setRequestsOpen(false)}
        />
      )}
      {dashboardOpen && (
        <DashboardModal documents={documents} shareRequests={shareRequests} onClose={() => setDashboardOpen(false)} />
      )}
    </div>
  );
}

function DeleteDocumentDialog({
  doc,
  submitting,
  onConfirm,
  onClose,
}: {
  doc: LibraryDocument;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="w-full max-w-sm rounded-xl p-6 shadow-2xl text-center"
        style={{ backgroundColor: "var(--bg-panel)", border: `2px solid ${C.danger}20` }}
      >
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${C.danger}15` }}>
          <AlertTriangle size={30} style={{ color: C.danger }} />
        </div>
        <h3 className="text-md font-bold mb-2" style={{ color: "var(--text-main)" }}>¿Eliminar documento?</h3>
        <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
          <strong>{doc.title}</strong> dejará de aparecer en la Biblioteca. El archivo, sus versiones y el historial quedan conservados — no se borra nada físicamente.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="h-8 px-5 rounded cursor-pointer text-xs font-medium hover-bg transition-colors" style={{ border: "1px solid var(--border-color)", color: "var(--text-muted)" }}>Cancelar</button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="h-8 px-5 rounded cursor-pointer text-xs font-semibold text-white flex justify-center items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: C.danger }}
          >
            <span className="flex items-center gap-2 leading-none">
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={16} />}
              <span>Eliminar</span>
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(content, document.body);
}
