"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle, X } from "lucide-react";
import { C } from "@/lib/colors";
import { VisibilityPicker } from "./VisibilityPicker";
import type { LibraryFolderNode, LibraryRole } from "@/types/library";

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)" }}
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/* ─── Crear carpeta ──────────────────────────────────────── */
export function CreateFolderDialog({
  parentName,
  canSetVisibility,
  submitting,
  error,
  onSubmit,
  onClose,
}: {
  parentName: string;
  canSetVisibility: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: (name: string, visibleToRoles: LibraryRole[] | null) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<LibraryRole[] | null>(null);

  return (
    <Overlay onClose={onClose}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-color)" }}>
        <h3 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>Nueva carpeta</h3>
        <button onClick={onClose} className="p-1 rounded hover-bg cursor-pointer"><X size={15} style={{ color: "var(--text-muted)" }} /></button>
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ubicación: <strong>{parentName}</strong></p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la carpeta"
          className="field-input text-sm"
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onSubmit(name.trim(), roles); }}
        />
        {canSetVisibility && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>
              Visibilidad
            </label>
            <VisibilityPicker value={roles} onChange={setRoles} />
          </div>
        )}
        {error && <p className="text-[10px]" style={{ color: C.danger }}>{error}</p>}
      </div>
      <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-app)" }}>
        <button onClick={onClose} className="h-8 px-4 rounded text-sm cursor-pointer font-medium hover-bg" style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>Cancelar</button>
        <button
          disabled={!name.trim() || submitting}
          onClick={() => onSubmit(name.trim(), roles)}
          className="h-8 px-4 rounded text-sm cursor-pointer font-semibold text-white flex items-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: C.accent }}
        >
          {submitting && <Loader2 size={13} className="animate-spin" />} Crear
        </button>
      </div>
    </Overlay>
  );
}

/* ─── Renombrar / visibilidad ────────────────────────────── */
export function RenameFolderDialog({
  folder,
  canSetVisibility,
  submitting,
  error,
  onSubmit,
  onClose,
}: {
  folder: LibraryFolderNode;
  canSetVisibility: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: (name: string, visibleToRoles: LibraryRole[] | null) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(folder.name);
  const [roles, setRoles] = useState<LibraryRole[] | null>(folder.visible_to_roles);

  return (
    <Overlay onClose={onClose}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-color)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>Editar carpeta</h3>
        <button onClick={onClose} className="p-1 rounded hover-bg"><X size={15} style={{ color: "var(--text-muted)" }} /></button>
      </div>
      <div className="px-5 py-4 space-y-3">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field-input"
        />
        {canSetVisibility ? (
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>
              Visibilidad
            </label>
            <VisibilityPicker value={roles} onChange={setRoles} />
          </div>
        ) : (
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Solo un administrador puede cambiar la visibilidad de la carpeta.
          </p>
        )}
        {error && <p className="text-[10px]" style={{ color: C.danger }}>{error}</p>}
      </div>
      <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-app)" }}>
        <button onClick={onClose} className="h-8 px-4 rounded text-sm font-medium hover-bg" style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>Cancelar</button>
        <button
          disabled={!name.trim() || submitting}
          onClick={() => onSubmit(name.trim(), roles)}
          className="h-8 px-4 rounded text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: C.accent }}
        >
          {submitting && <Loader2 size={13} className="animate-spin" />} Guardar
        </button>
      </div>
    </Overlay>
  );
}

/* ─── Eliminar carpeta ───────────────────────────────────── */
export function DeleteFolderDialog({
  folder,
  submitting,
  error,
  onConfirm,
  onClose,
}: {
  folder: LibraryFolderNode;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Overlay onClose={onClose}>
      <div className="p-6 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${C.danger}15` }}>
          <AlertTriangle size={24} style={{ color: C.danger }} />
        </div>
        <h3 className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>¿Eliminar &quot;{folder.name}&quot;?</h3>
        <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
          Solo se puede eliminar si está vacía (sin documentos ni subcarpetas).
        </p>
        {error && <p className="text-[10px] mb-3" style={{ color: C.danger }}>{error}</p>}
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="h-8 px-5 rounded text-[11px] font-medium hover-bg" style={{ border: "1px solid var(--border-color)", color: "var(--text-muted)" }}>Cancelar</button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="h-8 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: C.danger }}
          >
            {submitting && <Loader2 size={12} className="animate-spin" />} Eliminar
          </button>
        </div>
      </div>
    </Overlay>
  );
}
