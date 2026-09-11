"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { C } from "@/lib/colors";
import type { Client } from "@/types/calibration";

export function AddClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (client: Client) => void;
}) {
  const [form, setForm] = useState({
    company_name: "",
    address: "",
    tax_id: "",
    phone_1: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.company_name.trim()) {
      toast.error("El nombre de la empresa es requerido");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/clients", form);
      const created: Client = res.data.client;
      toast.success("Cliente agregado");
      onCreated(created);
    } catch (err: unknown) {
      const axiosErr = err as { userMessage?: string };
      toast.error(axiosErr.userMessage || "No se pudo agregar el cliente");
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
            Nuevo Cliente
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover-bg cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <div className="space-y-1">
            <label
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Nombre de la Empresa *
            </label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              placeholder="Nombre de la empresa"
              className="w-full h-9 px-2.5 rounded input-theme text-xs"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Dirección
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Dirección"
              className="w-full h-9 px-2.5 rounded input-theme text-xs"
            />
          </div>
          <div className="space-y-1">
            <label
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              RIF
            </label>
            <input
              type="text"
              value={form.tax_id}
              onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
              placeholder="J-12345678-9"
              className="w-full h-9 px-2.5 rounded input-theme text-xs"
            />
          </div>
          <div className="space-y-1">
            <label
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Teléfono
            </label>
            <input
              type="text"
              value={form.phone_1}
              onChange={(e) => setForm({ ...form, phone_1: e.target.value })}
              placeholder="Teléfono"
              className="w-full h-9 px-2.5 rounded input-theme text-xs"
            />
          </div>
          <div className="space-y-1">
            <label  
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Correo
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Correo"
              className="w-full h-9 px-2.5 rounded input-theme text-xs"
            />
          </div>
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
            Guardar Cliente
          </button>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modal, document.body);
}
