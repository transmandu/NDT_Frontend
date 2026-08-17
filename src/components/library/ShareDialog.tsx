"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Loader2, X, Link2, Send, Copy, Clock } from "lucide-react";
import api from "@/lib/api";
import { getApiError } from "@/lib/apiErrors";
import { C } from "@/lib/colors";
import type { LibraryDocument, LibrarySharedLink } from "@/types/library";

export function ShareDialog({
  doc,
  canGenerateDirectly,
  canRequestShare,
  onClose,
}: {
  doc: LibraryDocument;
  canGenerateDirectly: boolean;
  canRequestShare: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"generate" | "request">(canGenerateDirectly ? "generate" : "request");
  const [sharedWithName, setSharedWithName] = useState("");
  const [reason, setReason] = useState("");
  // Se guarda como texto (no number) para que el campo pueda quedar vacío
  // mientras se escribe — con estado number, borrar el valor por defecto
  // dejaba un "0" pegado que no se podía quitar (Number("") === 0).
  const [expiresInHours, setExpiresInHours] = useState("48");
  const expiresInHoursNum = Number(expiresInHours) || 0;
  const [readOnly, setReadOnly] = useState(true);
  const [versionOnly, setVersionOnly] = useState(false);

  const { data: activeLinks = [] } = useQuery<LibrarySharedLink[]>({
    queryKey: ["libraryActiveShare", doc.id],
    queryFn: () => api.get(`/library/documents/${doc.id}/active-share`).then((r) => r.data.shared_links || []),
  });

  const payload = () => ({
    document_id: doc.id,
    shared_with_name: sharedWithName.trim(),
    reason: reason.trim(),
    expires_in_hours: expiresInHoursNum,
    read_only: readOnly,
    version_id: versionOnly ? doc.latest_version?.id : undefined,
  });

  const generateMut = useMutation({
    mutationFn: () =>
      api
        .post<{ shared_link: LibrarySharedLink }>(`/library/documents/${doc.id}/share`, payload())
        .then((r) => r.data.shared_link),
    onSuccess: (link) => {
      qc.invalidateQueries({ queryKey: ["libraryActiveShare", doc.id] });
      navigator.clipboard.writeText(link.url).catch(() => {});
      toast.success("Enlace generado y copiado al portapapeles", { duration: 5000, icon: "🔗" });
      setReason("");
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const requestMut = useMutation({
    mutationFn: () => api.post(`/library/share-requests`, payload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["libraryShareRequests"] });
      toast.success("Solicitud enviada — un auditor debe aprobarla");
      onClose();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Enlace copiado");
  };

  const canSubmit =
    sharedWithName.trim().length > 0 &&
    reason.trim().length >= 10 &&
    expiresInHoursNum >= 24 &&
    expiresInHoursNum <= 168;

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
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)", maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--text-main)" }}>Compartir documento</h2>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>{doc.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover-bg" style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>

        {canGenerateDirectly && canRequestShare && (
          <div className="flex px-6 pt-3 gap-1 shrink-0">
            {(["generate", "request"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3 py-1.5 text-[13px] font-semibold rounded-t-md transition-colors"
                style={{
                  color: tab === t ? C.accent : "var(--text-muted)",
                  borderBottom: tab === t ? `2px solid ${C.accent}` : "2px solid transparent",
                }}
              >
                {t === "generate" ? "Generar enlace" : "Solicitar"}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Destinatario *</label>
            <input value={sharedWithName} onChange={(e) => setSharedWithName(e.target.value)} placeholder="Nombre de quien recibirá el enlace" className="field-input text-[13px]" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Justificación * (mín. 10 caracteres)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Motivo para compartir este documento" className="field-input text-[13px] resize-none justify-center" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Duración (24–168 h)</label>
              <input type="number" min={24} max={168} value={expiresInHours} onChange={(e) => setExpiresInHours(e.target.value)} className="field-input text-[13px]" />
            </div>
            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer text-[13px] h-8" style={{ color: "var(--text-main)" }}>
                <input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} className="accent-(--brand-primary) h-3.5 w-3.5" />
                Solo lectura (no descargable)
              </label>
            </div>
          </div>
          {doc.latest_version && (
            <label className="flex items-center gap-2 cursor-pointer text-[13px]" style={{ color: "var(--text-main)" }}>
              <input type="checkbox" checked={versionOnly} onChange={(e) => setVersionOnly(e.target.checked)} className="accent-(--brand-primary) h-3.5 w-3.5" />
              Fijar a la versión actual ({doc.latest_version.display_version}) en vez de seguir siempre la vigente
            </label>
          )}

          {tab === "generate" && activeLinks.length > 0 && (
            <div className="pt-2 space-y-2" style={{ borderTop: "1px solid var(--border-color)" }}>
              <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Enlaces activos</p>
              {activeLinks.map((l) => (
                <div key={l.id} className="flex items-center gap-2 p-2 rounded-md text-[12px]" style={{ border: "1px solid var(--border-color)" }}>
                  <Link2 size={12} className="shrink-0" style={{ color: C.accent }} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ color: "var(--text-main)" }}>{l.shared_with_name || "Sin destinatario"} · {l.access_count} accesos</p>
                    <p className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}><Clock size={9} /> vence {new Date(l.expires_at).toLocaleString("es-ES")}</p>
                  </div>
                  <button onClick={() => copyLink(l.url)} className="p-1 rounded hover-bg shrink-0" style={{ color: "var(--text-muted)" }}><Copy size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 shrink-0" style={{ borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-app)" }}>
          <button onClick={onClose} className="h-8 px-4 rounded text-[13px] font-medium hover-bg" style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>Cerrar</button>
          {tab === "generate" ? (
            <button
              disabled={!canSubmit || generateMut.isPending}
              onClick={() => generateMut.mutate()}
              className="h-8 px-4 rounded text-[13px] font-semibold text-white flex items-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: C.accent }}
            >
              {generateMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />} Generar enlace
            </button>
          ) : (
            <button
              disabled={!canSubmit || requestMut.isPending}
              onClick={() => requestMut.mutate()}
              className="h-8 px-4 rounded text-[13px] font-semibold text-white flex items-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: C.accent }}
            >
              {requestMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Enviar solicitud
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
