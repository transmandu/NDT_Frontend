"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Loader2, X, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { getApiError } from "@/lib/apiErrors";
import { C } from "@/lib/colors";
import { VisibilityPicker } from "./VisibilityPicker";
import type { LibraryDocument, LibraryRole } from "@/types/library";

export function DocumentPermissionsDialog({
  doc,
  onClose,
}: {
  doc: LibraryDocument;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [roles, setRoles] = useState<LibraryRole[] | null>(doc.visible_to_roles);

  const mut = useMutation({
    mutationFn: () =>
      api.patch(`/library/documents/${doc.id}/visibility`, { visible_to_roles: roles }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["libraryDocuments"] });
      toast.success("Visibilidad actualizada");
      onClose();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

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
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-sm rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)" }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} style={{ color: C.accent }} />
            <h3 className="text-md font-bold" style={{ color: "var(--text-main)" }}>Permisos del documento</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover-bg"><X size={15} style={{ color: "var(--text-muted)" }} /></button>
        </div>
        <div className="px-5 py-4 space-y-2">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{doc.title}</p>
          <VisibilityPicker value={roles} onChange={setRoles} />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Esta restricción nunca puede ser más amplia que la de su carpeta ({doc.folder_breadcrumb ?? "raíz"}).
          </p>
        </div>
        <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-app)" }}>
          <button onClick={onClose} className="h-8 px-4 rounded text-[11px] font-medium hover-bg" style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>Cancelar</button>
          <button
            disabled={mut.isPending}
            onClick={() => mut.mutate()}
            className="h-8 px-4 rounded text-[11px] font-semibold text-white flex items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: C.accent }}
          >
            {mut.isPending && <Loader2 size={13} className="animate-spin" />} Guardar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
