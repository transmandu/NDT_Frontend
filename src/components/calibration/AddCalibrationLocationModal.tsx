"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { C } from "@/lib/colors";
import type { CalibrationLocation } from "@/types/calibration";

export function AddCalibrationLocationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (location: CalibrationLocation) => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("El nombre del lugar es requerido");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/calibration-locations", {
        name,
        address: address || null,
      });
      const created: CalibrationLocation = res.data.location;
      toast.success("Lugar de calibración agregado");
      onCreated(created);
    } catch (err: unknown) {
      const axiosErr = err as { userMessage?: string };
      toast.error(
        axiosErr.userMessage || "No se pudo agregar el lugar de calibración",
      );
    } finally {
      setSaving(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border-color)",
          maxHeight: "92vh",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <h2 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            Nuevo Lugar de Calibración
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover-bg cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <label
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Nombre del lugar *
            </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del lugar"
            className="w-full h-9 px-2.5 rounded input-theme text-xs"
            autoFocus
          />
          <label
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Dirección
            </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Dirección (opcional)"
            className="w-full h-9 px-2.5 rounded input-theme text-xs"
          />
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-4 shrink-0"
          style={{ borderTop: "1px solid var(--border-color)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md text-xs font-medium hover-bg cursor-pointer"
            style={{ border: "1px solid var(--border-color)", color: "var(--text-muted)" }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 px-4 rounded-md text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: C.primary, color: "#2C2C2C" }}
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Guardar Lugar
          </button>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modal, document.body);
}
