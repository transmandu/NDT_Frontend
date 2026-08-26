"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import qualityApi from "@/lib/qualityApi";
import { getApiError } from "@/lib/apiErrors";
import type { QualityAttachment } from "@/types/quality";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function QualityAttachmentList({
  attachments,
}: {
  attachments: QualityAttachment[];
}) {
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownload = async (att: QualityAttachment) => {
    setDownloadingId(att.id);
    try {
      await qualityApi.downloadAttachment(att.id, att.original_name);
    } catch (err) {
      toast.error(getApiError(err) || "No se pudo verificar la integridad del archivo.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (attachments.length === 0) {
    return (
      <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
        Sin adjuntos.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="flex items-center gap-2 rounded px-2.5 py-1.5"
          style={{
            backgroundColor: "var(--bg-app)",
            border: "1px solid var(--border-color)",
          }}
        >
          <FileText size={18} style={{ color: "var(--text-muted)" }} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium truncate"
              style={{ color: "var(--text-main)" }}
              title={att.original_name}
            >
              {att.original_name}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {formatSize(att.file_size)} · {att.uploaded_by ?? "—"}
            </p>
          </div>
          <button
            onClick={() => handleDownload(att)}
            disabled={downloadingId === att.id}
            title="Descargar (verifica integridad SHA-256)"
            className="p-1.5 rounded hover-bg shrink-0 disabled:opacity-50 cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            {downloadingId === att.id ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
