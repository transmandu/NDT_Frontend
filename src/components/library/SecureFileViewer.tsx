"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, Loader2, FileWarning } from "lucide-react";
import api from "@/lib/api";

/**
 * Visor seguro embebido en la app (§8.1.12). Usa el motor PDF nativo del
 * navegador dentro de un <iframe> en lugar de sumar una librería externa
 * (@react-pdf-viewer no está instalada en este proyecto) — da zoom,
 * paginación y pantalla completa "gratis", envueltos en el chrome de
 * nuestro propio modal (título, cerrar).
 * Para Excel (.xlsx/.xls) no hay renderizado inline posible en el
 * navegador: se muestra un aviso (decisión explícita, ver
 * docs/replicacion-biblioteca-digital.md §10 trampa #5).
 */
export function SecureFileViewer({
  viewUrl,
  title,
  fileType,
  onClose,
}: {
  viewUrl: string;
  title: string;
  fileType: string | null;
  onClose: () => void;
}) {
  const isPdf = fileType === "pdf";
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(isPdf);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPdf) return;
    // Guard contra respuestas obsoletas: en dev, StrictMode dispara este efecto
    // dos veces (dos peticiones concurrentes al mismo documento); sin esta
    // bandera, la que responde último "gana" el estado aunque sea la
    // redundante — si esa falla, pisa un `blobUrl` que ya había cargado bien
    // y el usuario ve "no se pudo cargar" con el documento realmente cargado.
    // También evita setState después de desmontar (fuga del Blob URL si el
    // usuario cierra el visor mientras la petición sigue en vuelo).
    let cancelled = false;
    let objectUrl: string | null = null;

    api
      .get(viewUrl, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo cargar el documento.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [viewUrl, isPdf]);

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="w-full h-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)" }}
      >
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-main)" }}>{title}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={onClose} title="Cerrar" className="p-1.5 rounded hover-bg" style={{ color: "var(--text-muted)" }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative" style={{ backgroundColor: "#525659" }}>
          {!isPdf ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6">
              <FileWarning size={32} style={{ color: "#fff" }} />
              <p className="text-[12px] text-white max-w-xs">
                La vista previa solo está disponible para PDF.
              </p>
            </div>
          ) : loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-white" />
            </div>
          ) : error ? (
            <div className="w-full h-full flex items-center justify-center text-white text-[12px]">{error}</div>
          ) : blobUrl ? (
            <iframe src={blobUrl} title={title} className="w-full h-full border-0" />
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
