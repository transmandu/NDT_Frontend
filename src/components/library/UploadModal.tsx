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
import { flattenFolderOptions } from "@/lib/libraryTree";
import { VisibilityPicker } from "./VisibilityPicker";
import type { LibraryCategory, LibraryFolderNode, LibraryRole } from "@/types/library";

const MAX_SIZE_MB = 10;
const ACCEPTED_EXT = [".pdf", ".xlsx", ".xls"];

export function UploadModal({
  categories,
  folders,
  defaultFolderId,
  canSetVisibility,
  onClose,
}: {
  categories: LibraryCategory[];
  folders: LibraryFolderNode[];
  defaultFolderId: number | null;
  canSetVisibility: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const folderOptions = flattenFolderOptions(folders);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [folderId, setFolderId] = useState<string>(
    defaultFolderId ? String(defaultFolderId) : "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [requiresExpiry, setRequiresExpiry] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");
  const [requiresReview, setRequiresReview] = useState(false);
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [visibleToRoles, setVisibleToRoles] = useState<LibraryRole[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const uploadMut = useMutation({
    mutationFn: (formData: FormData) =>
      api.post("/library/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["libraryDocuments"] });
      qc.invalidateQueries({ queryKey: ["libraryCategories"] });
      toast.success("Documento cargado — versión v1.0 creada");
      onClose();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const handleFile = (f: File | null) => {
    setFileError(null);
    if (!f) return setFile(null);
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXT.includes(ext)) {
      setFileError("Solo se permiten formatos PDF y Excel (.xlsx, .xls).");
      setFile(null);
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`El archivo no puede superar los ${MAX_SIZE_MB} MB.`);
      setFile(null);
      return;
    }
    setFile(f);
  };

  const dateIsPast = requiresExpiry && expirationDate !== "" && expirationDate < today;

  const canSubmit =
    title.trim().length > 0 &&
    categoryId !== "" &&
    (categoryId !== "otro" || newCategoryName.trim().length > 0) &&
    !!file &&
    (!requiresExpiry || (expirationDate !== "" && !dateIsPast)) &&
    (!requiresReview || nextReviewDate !== "");

  const onSubmit = () => {
    if (!file) return;
    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("category_id", categoryId);
    if (categoryId === "otro") fd.append("new_category_name", newCategoryName.trim());
    if (folderId) fd.append("folder_id", folderId);
    fd.append("requires_expiry", requiresExpiry ? "1" : "0");
    if (requiresExpiry) fd.append("expiration_date", expirationDate);
    if (requiresReview && nextReviewDate) fd.append("next_review_date", nextReviewDate);
    if (versionLabel.trim()) fd.append("version_label", versionLabel.trim());
    if (visibleToRoles) visibleToRoles.forEach((r) => fd.append("visible_to_roles[]", r));
    fd.append("file", file);
    uploadMut.mutate(fd);
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
        transition={{ duration: 0.18 }}
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)", maxHeight: "92vh" }}
      >
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-main)" }}>Subir documento</h2>
          <button onClick={onClose} className="p-1.5 rounded hover-bg" style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Título *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Procedimiento de calibración de balanzas" className="field-input text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Categoría *</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field-input uppercase">
                <option className="text-xs" value="">— Seleccionar —</option>
                {categories.map((c) => (
                  <option className="text-xs uppercase" key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option className="text-xs" value="otro">+ Otra (crear nueva)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Carpeta destino</label>
              <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className="field-input">
                <option className="text-xs" value="">— Raíz —</option>
                {folderOptions.map((f) => (
                  <option className="text-xs" key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          {categoryId === "otro" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Nombre de la nueva categoría</label>
              <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="field-input" />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Archivo (PDF o Excel, máx. {MAX_SIZE_MB} MB) *</label>
            <label
              className="flex flex-col items-center justify-center gap-1.5 py-6 rounded-lg cursor-pointer transition-colors"
              style={{ border: "2px dashed var(--border-color)", backgroundColor: "var(--bg-app)" }}
            >
              <UploadCloud size={20} style={{ color: C.accent }} />
              <span className="text-[11px]" style={{ color: "var(--text-main)" }}>
                {file ? file.name : "Haz clic para elegir un archivo"}
              </span>
              <input type="file" accept=".pdf,.xlsx,.xls" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
            </label>
            {fileError && <p className="text-[10px]" style={{ color: C.danger }}>{fileError}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: "var(--text-main)" }}>
              <input type="checkbox" checked={requiresExpiry} onChange={(e) => setRequiresExpiry(e.target.checked)} className="accent-(--brand-primary) h-3.5 w-3.5" />
              Este documento tiene fecha de vencimiento
            </label>
            {requiresExpiry && (
              <>
                <input type="date" min={today} value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} className="field-input" />
                {dateIsPast && (
                  <p className="text-xs" style={{ color: C.danger }}>La fecha de vencimiento no puede ser anterior a hoy.</p>
                )}
              </>
            )}
            {!requiresExpiry && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Se marcará como PERMANENTE.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: "var(--text-main)" }}>
              <input type="checkbox" checked={requiresReview} onChange={(e) => setRequiresReview(e.target.checked)} className="accent-(--brand-primary) h-3.5 w-3.5" />
              Este documento amerita revisión periódica
            </label>
            {requiresReview && (
              <input type="date" min={today} value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} className="field-input" />
            )}
            {!requiresReview && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Recordatorio de revisión periódica, independiente del vencimiento.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Etiqueta de versión (opcional)</label>
            <input value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder='Ej: "Revisión 2026"' className="field-input text-xs" />
          </div>

          {canSetVisibility && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Visibilidad</label>
              <VisibilityPicker value={visibleToRoles} onChange={setVisibleToRoles} />
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 shrink-0" style={{ borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-app)" }}>
          <button onClick={onClose} className="h-8 px-4 rounded text-xs font-medium hover-bg" style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>Cancelar</button>
          <button
            disabled={!canSubmit || uploadMut.isPending}
            onClick={onSubmit}
            className="h-8 px-5 rounded text-xs font-semibold text-white flex items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: C.accent }}
          >
            {uploadMut.isPending && <Loader2 size={13} className="animate-spin" />} Subir documento
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
