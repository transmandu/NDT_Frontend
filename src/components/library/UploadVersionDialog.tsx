"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Loader2, X, UploadCloud } from "lucide-react";
import api from "@/lib/api";
import { getApiError } from "@/lib/apiErrors";
import { C } from "@/lib/colors";
import type { LibraryDocument } from "@/types/library";

const MAX_SIZE_MB = 10;
const ACCEPTED_EXT = [".pdf", ".xlsx", ".xls", ".doc", ".docx"];

export function UploadVersionDialog({
  doc,
  onClose,
}: {
  doc: LibraryDocument;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const latest = doc.latest_version;
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [changeLog, setChangeLog] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [requiresExpiry, setRequiresExpiry] = useState(latest?.requires_expiry ?? false);
  const [expirationDate, setExpirationDate] = useState(latest?.expiration_date ?? "");
  const [requiresReview, setRequiresReview] = useState(!!latest?.next_review_date);
  const [nextReviewDate, setNextReviewDate] = useState(latest?.next_review_date ?? "");

  const mut = useMutation({
    mutationFn: (formData: FormData) =>
      api.post(`/library/documents/${doc.id}/versions`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["libraryDocuments"] });
      qc.invalidateQueries({ queryKey: ["libraryVersions", doc.id] });
      toast.success("Nueva versión creada");
      onClose();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const handleFile = (f: File | null) => {
    setFileError(null);
    if (!f) return setFile(null);
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXT.includes(ext)) {
      setFileError("Solo se permiten formatos PDF, Excel (.xlsx, .xls) y Word (.doc, .docx).");
      return setFile(null);
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`El archivo no puede superar los ${MAX_SIZE_MB} MB.`);
      return setFile(null);
    }
    setFile(f);
  };

  const dateIsPast = requiresExpiry && expirationDate !== "" && expirationDate < today;

  const onSubmit = () => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    if (changeLog.trim()) fd.append("change_log", changeLog.trim());
    if (versionLabel.trim()) fd.append("version_label", versionLabel.trim());
    fd.append("requires_expiry", requiresExpiry ? "1" : "0");
    if (requiresExpiry && expirationDate) fd.append("expiration_date", expirationDate);
    if (requiresReview && nextReviewDate) fd.append("next_review_date", nextReviewDate);
    mut.mutate(fd);
  };

  const modal = (
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
        className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)" }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div>
            <h2 className="text-md font-bold" style={{ color: "var(--text-main)" }}>Nueva versión</h2>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {doc.title} · última: {latest?.display_version ?? "—"} → próxima: v{(latest?.version_sequence ?? 0) + 1}.0
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover-bg" style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <label
            className="flex flex-col items-center justify-center gap-1.5 py-6 rounded-lg cursor-pointer transition-colors"
            style={{ border: "2px dashed var(--border-color)", backgroundColor: "var(--bg-app)" }}
          >
            <UploadCloud size={20} style={{ color: C.accent }} />
            <span className="text-[11px]" style={{ color: "var(--text-main)" }}>
              {file ? file.name : "Haz clic para elegir el nuevo archivo"}
            </span>
            <input type="file" accept=".pdf,.xlsx,.xls,.doc,.docx" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          </label>
          {fileError && <p className="text-[10px]" style={{ color: C.danger }}>{fileError}</p>}

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Justificación del cambio</label>
            <textarea value={changeLog} onChange={(e) => setChangeLog(e.target.value)} rows={2} placeholder="Ej: Actualización tras revisión anual del procedimiento" className="field-input resize-none text-[13px]" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Etiqueta de versión (opcional)</label>
            <input value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} className="field-input" />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-[13px]" style={{ color: "var(--text-main)" }}>
              <input type="checkbox" checked={requiresExpiry} onChange={(e) => setRequiresExpiry(e.target.checked)} className="accent-(--brand-primary) h-3.5 w-3.5" />
              Tiene fecha de vencimiento
            </label>
            {requiresExpiry && (
              <>
                <input type="date" min={today} value={expirationDate ?? ""} onChange={(e) => setExpirationDate(e.target.value)} className="field-input" />
                {dateIsPast && (
                  <p className="text-[10px]" style={{ color: C.danger }}>La fecha de vencimiento no puede ser anterior a hoy.</p>
                )}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-[13px]" style={{ color: "var(--text-main)" }}>
              <input type="checkbox" checked={requiresReview} onChange={(e) => setRequiresReview(e.target.checked)} className="accent-(--brand-primary) h-3.5 w-3.5" />
              Este documento amerita revisión periódica
            </label>
            {requiresReview && (
              <input type="date" min={today} value={nextReviewDate ?? ""} onChange={(e) => setNextReviewDate(e.target.value)} className="field-input" />
            )}
          </div>
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3" style={{ borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-app)" }}>
          <button onClick={onClose} className="h-8 px-4 rounded text-[11px] font-medium hover-bg" style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>Cancelar</button>
          <button
            disabled={!file || (requiresExpiry && (!expirationDate || dateIsPast)) || (requiresReview && !nextReviewDate) || mut.isPending}
            onClick={onSubmit}
            className="h-8 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: C.accent }}
          >
            {mut.isPending && <Loader2 size={13} className="animate-spin" />} Crear versión
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
