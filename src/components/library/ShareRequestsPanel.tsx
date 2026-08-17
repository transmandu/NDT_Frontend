"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { X, Check, Ban, Loader2, Inbox, Send, Link2, Copy, Clock } from "lucide-react";
import api from "@/lib/api";
import { getApiError } from "@/lib/apiErrors";
import { C } from "@/lib/colors";
import type { LibraryShareRequest, ShareRequestStatus } from "@/types/library";

type TabValue = ShareRequestStatus;

const TAB_LABELS: Record<TabValue, string> = {
  pending: "Pendientes",
  approved: "Aprobadas",
  rejected: "Rechazadas",
};

const EMPTY_LABELS: Record<TabValue, string> = {
  pending: "pendientes",
  approved: "aprobadas",
  rejected: "rechazadas",
};

export function ShareRequestsPanel({
  requests,
  canApprove,
  onClose,
}: {
  requests: LibraryShareRequest[];
  canApprove: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabValue>("pending");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const approveMut = useMutation({
    mutationFn: (id: number) => api.patch(`/library/share-requests/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["libraryShareRequests"] });
      toast.success("Solicitud aprobada — enlace generado");
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.patch(`/library/share-requests/${id}/reject`, { rejection_reason: reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["libraryShareRequests"] });
      toast.success("Solicitud rechazada");
      setRejectingId(null);
      setRejectionReason("");
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Enlace copiado");
  };

  const filtered = requests.filter((r) => r.status === tab);
  const counts: Record<TabValue, number> = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  const panel = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
        className="absolute right-0 top-0 h-full w-full sm:w-110 flex flex-col shadow-2xl"
        style={{ backgroundColor: "var(--bg-panel)", borderLeft: "1px solid var(--border-color)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="flex items-center gap-2">
            <Inbox size={18} style={{ color: C.accent }} />
            <h2 className="text-base font-bold" style={{ color: "var(--text-main)" }}>Solicitudes de compartir</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover-bg" style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 px-5 pt-3 pb-2 shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
          {(["pending", "approved", "rejected"] as const).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                style={{
                  backgroundColor: active ? C.accent : "transparent",
                  color: active ? "#fff" : "var(--text-muted)",
                }}
              >
                {TAB_LABELS[t].toUpperCase()}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-4.5 text-center"
                  style={{
                    backgroundColor: active ? "rgba(255,255,255,0.25)" : "var(--bg-app)",
                    color: active ? "#fff" : "var(--text-muted)",
                  }}
                >
                  {counts[t]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-10">
              <Send size={40} strokeWidth={1.5} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
              <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
                No hay solicitudes {EMPTY_LABELS[tab]}
              </p>
              <p className="text-xs max-w-65" style={{ color: "var(--text-muted)" }}>
                Los técnicos y supervisores pueden solicitar compartir documentos desde el menú de acciones.
              </p>
            </div>
          ) : (
            filtered.map((r) => (
              <div key={r.id} className="p-3 rounded-lg" style={{ border: "1px solid var(--border-color)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-main)" }}>{r.document_title}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Solicitado por {r.requested_by_name}
                      {r.shared_with_name ? ` · para ${r.shared_with_name}` : ""} · {r.expires_in_hours}h {r.read_only ? "· solo lectura" : ""}
                    </p>
                    <p className="text-[10px] mt-1 italic" style={{ color: "var(--text-main)" }}>&quot;{r.reason}&quot;</p>
                    {r.status === "rejected" && r.rejection_reason && (
                      <p className="text-[10px] mt-1" style={{ color: C.danger }}>Motivo de rechazo: {r.rejection_reason}</p>
                    )}
                    {r.status !== "pending" && (
                      <p className="text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>
                        Revisado por {r.reviewed_by_name} · {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString("es-ES") : ""}
                      </p>
                    )}
                    {r.status === "approved" && r.shared_link && (
                      <div className="flex items-center gap-2 mt-2 p-2 rounded-md text-[11px]" style={{ border: "1px solid var(--border-color)", backgroundColor: "var(--bg-app)" }}>
                        <Link2 size={12} className="shrink-0" style={{ color: C.accent }} />
                        <div className="flex-1 min-w-0">
                          <p className="truncate" style={{ color: "var(--text-main)" }}>{r.shared_link.url}</p>
                          <p className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                            <Clock size={9} /> vence {new Date(r.shared_link.expires_at).toLocaleString("es-ES")}
                          </p>
                        </div>
                        <button onClick={() => copyLink(r.shared_link!.url)} title="Copiar enlace" className="p-1 rounded hover-bg shrink-0" style={{ color: "var(--text-muted)" }}>
                          <Copy size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  {r.status === "pending" && canApprove && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        disabled={approveMut.isPending}
                        onClick={() => approveMut.mutate(r.id)}
                        title="Aprobar"
                        className="h-8 w-8 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ backgroundColor: `${C.success}18`, color: C.success }}
                      >
                        {approveMut.isPending && approveMut.variables === r.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Check size={18} />
                        )}
                      </button>
                      <button
                        disabled={approveMut.isPending}
                        onClick={() => { setRejectingId(r.id); setRejectionReason(""); }}
                        title="Rechazar"
                        className="h-8 w-8 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ backgroundColor: `${C.danger}18`, color: C.danger }}
                      >
                        <Ban size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {rejectingId === r.id && (
                  <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--border-color)" }}>
                    <textarea
                      autoFocus
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={2}
                      placeholder="Motivo del rechazo (mín. 5 caracteres)"
                      className="field-input resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setRejectingId(null)} className="h-7 px-3 rounded text-[10px] font-medium hover-bg" style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>Cancelar</button>
                      <button
                        disabled={rejectionReason.trim().length < 5 || rejectMut.isPending}
                        onClick={() => rejectMut.mutate({ id: r.id, reason: rejectionReason.trim() })}
                        className="h-7 px-3 rounded text-[10px] font-semibold text-white flex items-center gap-1.5 disabled:opacity-60"
                        style={{ backgroundColor: C.danger }}
                      >
                        {rejectMut.isPending && <Loader2 size={11} className="animate-spin" />} Confirmar rechazo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(panel, document.body);
}
