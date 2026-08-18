"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  MoreHorizontal,
  Eye,
  Download,
  Share2,
  History,
  UploadCloud,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { C } from "@/lib/colors";

export function DocumentActionsMenu({
  canShare,
  canDeleteDocument,
  canSetVisibility,
  onView,
  onDownload,
  onShare,
  onHistory,
  onUploadVersion,
  onDelete,
  onPermissions,
}: {
  canShare: boolean;
  canDeleteDocument: boolean;
  canSetVisibility: boolean;
  onView: () => void;
  onDownload: () => void;
  onShare: () => void;
  onHistory: () => void;
  onUploadVersion: () => void;
  onDelete: () => void;
  onPermissions: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; flipUp: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const MENU_W = 208;
  const MENU_H_EST = 260;

  const computePos = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const flipUp = spaceBelow < MENU_H_EST + 8;
    setPos({
      top: flipUp ? r.top - MENU_H_EST - 4 : r.bottom + 4,
      left: Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8),
      flipUp,
    });
  };

  useEffect(() => {
    if (!open) return;
    computePos();
    const onClose = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onClose);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onClose);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const item = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    color?: string,
    borderTop?: boolean,
  ) => (
    <button
      onClick={() => { setOpen(false); action(); }}
      className="px-3 py-2 text-xs flex items-center gap-2 hover-bg transition-colors w-full text-left"
      style={{ color: color ?? "var(--text-main)", borderTop: borderTop ? "1px solid var(--border-color)" : undefined }}
    >
      {icon} {label}
    </button>
  );

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen((v) => !v)} className="p-1.5 rounded hover-bg transition-colors" style={{ color: "var(--text-muted)" }}>
        <MoreHorizontal size={15} />
      </button>
      {typeof window !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: pos.flipUp ? 6 : -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: pos.flipUp ? 6 : -6, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="fixed w-52 rounded-md shadow-xl z-100 overflow-hidden flex flex-col py-1"
                style={{ top: pos.top, left: pos.left, backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)" }}
              >
                {item("Ver", <Eye size={13} />, onView)}
                {item("Descargar", <Download size={13} />, onDownload)}
                {canShare && item("Compartir", <Share2 size={13} />, onShare)}
                {item("Historial de versiones", <History size={13} />, onHistory)}
                {item("Subir nueva versión", <UploadCloud size={13} />, onUploadVersion)}
                {canSetVisibility && item("Permisos", <ShieldCheck size={13} />, onPermissions, C.accent, true)}
                {canDeleteDocument && item("Eliminar", <Trash2 size={13} />, onDelete, C.danger, true)}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
