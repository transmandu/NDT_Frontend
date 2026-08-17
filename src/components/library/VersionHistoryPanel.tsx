"use client";

import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { X, Download, Trash2, Loader2, History } from "lucide-react";
import api from "@/lib/api";
import { getApiError } from "@/lib/apiErrors";
import { C } from "@/lib/colors";
import { downloadBlob } from "@/lib/downloadHelper";
import type { LibraryDocument, LibraryDocumentVersion, ExpiryStatus } from "@/types/library";

const STATUS_BADGE: Record<ExpiryStatus, { label: string; color: string }> = {
  vigente: { label: "VIGENTE", color: C.success },
  vencido: { label: "VENCIDO", color: C.danger },
  no_aplica: { label: "PERMANENTE", color: "#3B82F6" },
};

export function VersionHistoryPanel({
  doc,
  canDeleteVersion,
  onUploadNewVersion,
  onClose,
}: {
  doc: LibraryDocument;
  canDeleteVersion: boolean;
  onUploadNewVersion: () => void;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const { data: versions = [], isLoading } = useQuery<LibraryDocumentVersion[]>({
    queryKey: ["libraryVersions", doc.id],
    queryFn: () => api.get(`/library/documents/${doc.id}/versions`).then((r) => r.data.data || []),
  });

  const deleteMut = useMutation({
    mutationFn: (versionId: number) => api.delete(`/library/versions/${versionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["libraryVersions", doc.id] });
      qc.invalidateQueries({ queryKey: ["libraryDocuments"] });
      toast.success("Versión eliminada");
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const download = async (versionId: number, filename: string) => {
    try {
      const res = await api.get(`/library/versions/${versionId}/download`, { responseType: "blob" });
      downloadBlob(res.data, filename);
    } catch {
      toast.error("No se pudo descargar la versión.");
    }
  };

  const panel = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)", maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="flex items-center gap-2">
            <History size={16} style={{ color: C.accent }} />
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--text-main)" }}>Historial de versiones</h2>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{doc.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rou ded hover-bg" style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {isLoading ? (
            <p className="text-[13px] text-center py-6" style={{ color: "var(--text-muted)" }}>Cargando…</p>
          ) : versions.length === 0 ? (
            <p className="text-[13px] text-center py-6" style={{ color: "var(--text-muted)" }}>Sin versiones disponibles.</p>
          ) : (
            versions.map((v, i) => {
              const badge = STATUS_BADGE[v.expiry_status];
              return (
                <div
                  key={v.id}
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{
                    border: `1px solid ${i === 0 ? "var(--brand-primary)" : "var(--border-color)"}`,
                    backgroundColor: i === 0 ? "color-mix(in srgb, var(--brand-primary) 6%, transparent)" : "transparent",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[15px] font-bold" style={{ color: "var(--text-main)" }}>{v.version_number}</span>
                      {v.version_label && v.version_label !== v.version_number && (
                        <span className="text-[12px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}>{v.version_label}</span>
                      )}
                      {i === 0 && (
                        <span className="text-[12px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: `${C.accent}20`, color: C.accent }}>Actual</span>
                      )}
                      <span className="text-[13px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: `${badge.color}15`, color: badge.color }}>{badge.label}</span>
                    </div>
                    <p className="text-[14px] mt-1" style={{ color: "var(--text-muted)" }}>{v.change_log || "Sin justificación registrada"}</p>
                    <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
                      Subido por {v.uploaded_by ?? "—"} · {v.emission_date ?? "—"}
                      {v.expiration_date ? ` · vence ${v.expiration_date}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button title="Descargar" onClick={() => download(v.id, `${doc.title}_${v.version_number}`)} className="p-1.5 cursor-pointer rounded hover-bg" style={{ color: "var(--text-muted)" }}><Download size={18} /></button>
                    {canDeleteVersion && (
                      <button
                        title="Eliminar versión"
                        disabled={deleteMut.isPending}
                        onClick={() => { if (confirm(`¿Eliminar la ${v.version_number}? Esta acción no se puede deshacer.`)) deleteMut.mutate(v.id); }}
                        className="p-1.5 rounded hover-bg cursor-pointer"
                        style={{ color: C.danger }}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-end shrink-0" style={{ borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-app)" }}>
          <button
            onClick={onUploadNewVersion}
            className="h-8 px-4 rounded text-[13px] font-semibold text-white flex items-center gap-2"
            style={{ backgroundColor: C.accent }}
          >
            {deleteMut.isPending && <Loader2 size={13} className="animate-spin" />} Subir nueva versión
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(panel, document.body);
}
