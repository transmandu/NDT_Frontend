"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { C } from "@/lib/colors";
import type { LibraryDocument, LibraryShareRequest } from "@/types/library";

const PIE_COLORS = [C.accent, C.primary, C.success, C.info, C.warning, C.danger, "#8B5CF6", "#06B6D4"];

export function DashboardModal({
  documents,
  shareRequests,
  onClose,
}: {
  documents: LibraryDocument[];
  shareRequests: LibraryShareRequest[];
  onClose: () => void;
}) {
  const total = documents.length;
  const byCategory = Object.entries(
    documents.reduce<Record<string, number>>((acc, d) => {
      const name = d.category?.name ?? "Sin categoría";
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const [now] = useState(() => Date.now());
  const expired = documents.filter((d) => d.current_status === "vencido").length;
  const expiringSoon = documents.filter((d) => {
    if (!d.expiration_date) return false;
    const days = (new Date(d.expiration_date).getTime() - now) / 86_400_000;
    return days >= 0 && days <= 5;
  }).length;

  const totalAccesses = shareRequests
    .filter((r) => r.status === "approved" && r.shared_link)
    .reduce((sum, r) => sum + (r.shared_link?.access_count ?? 0), 0);

  const requestStats = {
    pending: shareRequests.filter((r) => r.status === "pending").length,
    approved: shareRequests.filter((r) => r.status === "approved").length,
    rejected: shareRequests.filter((r) => r.status === "rejected").length,
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
        className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)", maxHeight: "88vh" }}
      >
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="flex items-center gap-2">
            <BarChart3 size={26} style={{ color: C.accent }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>Dashboard de la Biblioteca</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover-bg" style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            <StatTile label="Documentos" value={total} color={C.accent} />
            <StatTile label="Vencidos" value={expired} color={C.danger} />
            <StatTile label="Por vencer (≤5d)" value={expiringSoon} color={C.warning} />
            <StatTile label="Accesos externos" value={totalAccesses} color={C.info} />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="panel rounded-lg p-4" style={{ border: "1px solid var(--border-color)" }}>
              <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Distribución por categoría</p>
              {byCategory.length === 0 ? (
                <p className="text-[11px] py-8 text-center" style={{ color: "var(--text-muted)" }}>Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={35} outerRadius={65} paddingAngle={2}>
                      {byCategory.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {byCategory.map((c, i) => (
                  <span key={c.name} className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {c.name} ({c.value})
                  </span>
                ))}
              </div>
            </div>

            <div className="panel rounded-lg p-4 space-y-3" style={{ border: "1px solid var(--border-color)" }}>
              <p className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Solicitudes de compartir</p>
              <RequestRow label="Pendientes" value={requestStats.pending} color={C.primary} />
              <RequestRow label="Aprobadas" value={requestStats.approved} color={C.success} />
              <RequestRow label="Rechazadas" value={requestStats.rejected} color={C.danger} />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="panel rounded-lg p-3" style={{ border: `1px solid ${color}30` }}>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

function RequestRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between text-md ">
      <span className="flex items-center gap-1.5" style={{ color: "var(--text-main)" }}>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} /> {label}
      </span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
