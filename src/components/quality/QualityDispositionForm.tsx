"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import qualityApi from "@/lib/qualityApi";
import { getApiError } from "@/lib/apiErrors";
import { C } from "@/lib/colors";
import type { CertificateDisposition } from "@/types/quality";

const OPTIONS: { value: CertificateDisposition; label: string }[] = [
  { value: "mantener", label: "Mantener — el certificado sigue siendo válido" },
  { value: "reemitir", label: "Reemitir — se emitirá un certificado corregido" },
  { value: "retirar", label: "Retirar — el certificado queda sin efecto" },
];

/** Decisión de disposición del certificado + notificación al cliente (§7.10.1.d/e). Exclusivo Auditor/Admin. */
export default function QualityDispositionForm({
  nonconformityId,
  onClose,
}: {
  nonconformityId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [disposition, setDisposition] = useState<CertificateDisposition>("mantener");
  const [notifyClient, setNotifyClient] = useState(true);

  const mut = useMutation({
    mutationFn: () =>
      qualityApi.decideDisposition(nonconformityId, {
        certificate_disposition: disposition,
        client_notification_required: notifyClient,
      }),
    onSuccess: () => {
      toast.success("Disposición registrada");
      qc.invalidateQueries({ queryKey: ["quality", "nc"] });
      onClose();
    },
    onError: (err) => toast.error(getApiError(err)),
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
        className="w-full max-w-md rounded-xl p-5 shadow-2xl"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            Disposición del certificado
          </h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-2 p-2.5 rounded cursor-pointer text-[11px]"
              style={{
                border: `1px solid ${disposition === opt.value ? C.primary : "var(--border-color)"}`,
                backgroundColor: disposition === opt.value ? `${C.primary}10` : "transparent",
                color: "var(--text-main)",
              }}
            >
              <input
                type="radio"
                name="disposition"
                className="mt-0.5"
                checked={disposition === opt.value}
                onChange={() => setDisposition(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>

        <label className="flex items-center gap-2 text-[11px] mb-4" style={{ color: "var(--text-main)" }}>
          <input
            type="checkbox"
            checked={notifyClient}
            onChange={(e) => setNotifyClient(e.target.checked)}
          />
          Notificar al cliente (§7.10.1.e)
        </label>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded text-[11px] font-medium hover-bg"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}
          >
            Cancelar
          </button>
          <button
            disabled={mut.isPending}
            onClick={() => mut.mutate()}
            className="h-8 px-4 rounded text-[11px] font-semibold text-white flex items-center gap-1.5 disabled:opacity-60"
            style={{ backgroundColor: C.primary }}
          >
            {mut.isPending && <Loader2 size={12} className="animate-spin" />}
            Confirmar
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
