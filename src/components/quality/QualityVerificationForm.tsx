"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { C } from "@/lib/colors";

/** Modal que captura `due_date_verification` al mover una NC a "En Seguimiento" (plan §4.2). */
export default function QualityVerificationForm({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (dueDate: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-xl p-5 shadow-2xl"
        style={{
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            Pasar a Seguimiento
          </h3>
          <button onClick={onCancel} style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>
        <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
          Fecha en la que se verificará la eficacia de las acciones correctivas.
        </p>
        <label
          className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          Fecha de verificación *
        </label>
        <input
          type="date"
          value={dueDate}
          min={today}
          onChange={(e) => setDueDate(e.target.value)}
          className="field-input w-full"
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="h-8 px-4 rounded text-[11px] font-medium hover-bg"
            style={{
              color: "var(--text-muted)",
              border: "1px solid var(--border-color)",
            }}
          >
            Volver
          </button>
          <button
            disabled={!dueDate}
            onClick={() => onConfirm(dueDate)}
            className="h-8 px-4 rounded text-[11px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: C.primary }}
          >
            Confirmar
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
