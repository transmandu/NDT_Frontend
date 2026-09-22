"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Receipt,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Download,
  Send,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import api from "@/lib/api";
import { getApiError } from "@/lib/apiErrors";
import { useAuthStore } from "@/stores/authStore";
import { fmtDate } from "@/utils/formatters";
import { downloadBlob } from "@/lib/downloadHelper";
import { Field, DeleteConfirm } from "@/app/(dashboard)/quotes/catalog/page";
import ItemBuilder from "@/components/quotes/ItemBuilder";
import { C } from "@/lib/colors";
import type {
  Quote,
  QuoteItem,
  QuoteMethod,
  QuoteStatus,
  QuoteCommissionChannel,
  UpdateQuotePayload,
} from "@/types/quotes";

const STATUS_LABELS: Record<QuoteStatus, { label: string; color: string }> = {
  draft: { label: "Borrador", color: C.statusDraft },
  issued: { label: "Emitida", color: C.info },
  won: { label: "Ganada", color: C.success },
  lost: { label: "Perdida", color: C.danger },
};

const COMMISSION_LABELS: Record<QuoteCommissionChannel, string> = {
  none: "Ninguna",
  lloyds: "Lloyd's — 10% del subtotal",
  prespuntar: "Prespuntar — 25% del subtotal",
  hangar74: "Hangar 74 — 30% de la utilidad",
};

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === "admin" || role === "supervisor";

  const { data: quote, isLoading, isError } = useQuery<Quote>({
    queryKey: ["quotes", id],
    queryFn: () => api.get(`/quotes/${id}`).then((r) => r.data.data),
  });

  const { data: methods = [] } = useQuery<QuoteMethod[]>({
    queryKey: ["quote-methods"],
    queryFn: () => api.get("/quote-methods").then((r) => r.data.data || []),
  });

  if (isLoading) {
    return (
      <div className="panel rounded-md shadow-sm p-8 text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
        <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: C.primary }} />
        Cargando cotización…
      </div>
    );
  }

  if (isError || !quote) {
    return (
      <div
        className="panel rounded-md shadow-sm p-8 text-center text-[11px] flex flex-col items-center gap-2"
        style={{ color: "var(--text-muted)" }}
      >
        <Receipt size={20} />
        No se encontró la cotización.
        <button onClick={() => router.push("/quotes")} className="text-[11px] font-semibold mt-1" style={{ color: C.primary }}>
          Volver al listado
        </button>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[quote.status];

  return (
    <div className="space-y-3 w-full animate-fadeIn max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/quotes" className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <ArrowLeft size={13} /> Volver al listado
        </Link>
        <span
          className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color, border: `1px solid ${statusInfo.color}30` }}
        >
          {statusInfo.label}
        </span>
      </div>

      <div className="panel rounded-md shadow-sm p-5" style={{ border: "1px solid var(--border-color)" }}>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-base font-bold font-mono" style={{ color: C.primary }}>
            {quote.code}
          </h1>
        </div>
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {quote.client?.company_name ?? "—"}
          {quote.project_name && ` — ${quote.project_name}`}
        </p>
      </div>

      {quote.status === "draft" ? (
        <DraftDetail quote={quote} methods={methods} canWrite={canWrite} />
      ) : (
        <IssuedDetail quote={quote} methods={methods} canWrite={canWrite} />
      )}
    </div>
  );
}

/* ─── Tabla de partidas compartida entre las dos vistas ─── */
function ItemsTable({
  items,
  methods,
  onDelete,
}: {
  items: QuoteItem[];
  methods: QuoteMethod[];
  onDelete?: (item: QuoteItem) => void;
}) {
  const methodCode = (id: string) => methods.find((m) => String(m.id) === id)?.code ?? "—";

  if (items.length === 0) {
    return (
      <p className="text-[11px] py-4 text-center" style={{ color: "var(--text-muted)" }}>
        Sin partidas.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
            {["Método", "Descripción", "Cant.", "Precio Unit.", "Total", onDelete ? "" : null]
              .filter((h): h is string => h !== null)
              .map((h) => (
                <th key={h} className="text-left py-2 px-2 font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  {h}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
              <td className="py-1.5 px-2 font-mono font-bold" style={{ color: C.primary }}>
                {methodCode(item.quote_method_id)}
              </td>
              <td className="py-1.5 px-2" style={{ color: "var(--text-main)" }}>
                {item.description}
              </td>
              <td className="py-1.5 px-2 font-mono">
                {Number(item.quantity)} {item.unit}
              </td>
              <td className="py-1.5 px-2 font-mono">${Number(item.unit_price_assumed_usd).toFixed(2)}</td>
              <td className="py-1.5 px-2 font-mono font-semibold">${Number(item.total_price_usd).toFixed(2)}</td>
              {onDelete && (
                <td className="py-1.5 px-2">
                  <button onClick={() => onDelete(item)} className="p-1 rounded hover-bg" style={{ color: C.danger }}>
                    <Trash2 size={13} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  BORRADOR — items editables + emitir/eliminar                */
/* ══════════════════════════════════════════════════════════ */
function DraftDetail({ quote, methods, canWrite }: { quote: Quote; methods: QuoteMethod[]; canWrite: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = useState<QuoteItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [deleteQuoteConfirm, setDeleteQuoteConfirm] = useState(false);
  const [deletingQuote, setDeletingQuote] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [projectName, setProjectName] = useState(quote.project_name ?? "");
  const [commissionChannel, setCommissionChannel] = useState<QuoteCommissionChannel>(quote.commission_channel ?? "none");
  const [notes, setNotes] = useState(quote.notes ?? "");

  const items = quote.items ?? [];
  const subtotalPreview = items.reduce((sum, i) => sum + Number(i.total_price_usd || 0), 0);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["quotes", quote.id] });

  const handleItemDelete = async () => {
    if (!deleteItemTarget) return;
    setDeletingItem(true);
    try {
      await api.delete(`/quotes/${quote.id}/items/${deleteItemTarget.id}`);
      toast.success("Partida eliminada");
      setDeleteItemTarget(null);
      invalidate();
    } catch (err: unknown) {
      toast.error(getApiError(err));
    } finally {
      setDeletingItem(false);
    }
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      await api.put(`/quotes/${quote.id}`, {
        project_name: projectName || null,
        commission_channel: commissionChannel,
        notes: notes || null,
      } satisfies UpdateQuotePayload);
      toast.success("Cambios guardados");
      invalidate();
    } catch (err: unknown) {
      toast.error(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleIssue = async () => {
    setIssuing(true);
    try {
      await handleSaveDetails();
      // Ver comentario equivalente en quotes/new/page.tsx: el servidor genera
      // el PDF de forma síncrona (~20-29s medido) y puede superar el timeout
      // global de 30s de axios, abortando la petición en el navegador aunque
      // la cotización sí quede emitida en el servidor.
      const res = await api.post(`/quotes/${quote.id}/issuances`, undefined, { timeout: 90_000 });
      const issued = res.data.data as Quote;
      toast.success(`Cotización ${issued.code} emitida`);
      invalidate();
    } catch (err: unknown) {
      toast.error(getApiError(err));
    } finally {
      setIssuing(false);
    }
  };

  const handleDeleteQuote = async () => {
    setDeletingQuote(true);
    try {
      await api.delete(`/quotes/${quote.id}`);
      toast.success("Cotización eliminada");
      router.push("/quotes");
    } catch (err: unknown) {
      toast.error(getApiError(err));
    } finally {
      setDeletingQuote(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="panel rounded-md shadow-sm p-5" style={{ border: "1px solid var(--border-color)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            Partidas
          </h2>
          {canWrite && !showBuilder && (
            <button
              onClick={() => setShowBuilder(true)}
              className="h-7 px-3 text-[11px] rounded font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 hover:opacity-90"
              style={{ backgroundColor: C.accent, color: "#fff" }}
            >
              <Plus size={13} /> Agregar Partida
            </button>
          )}
        </div>

        <ItemsTable items={items} methods={methods} onDelete={canWrite ? (i) => setDeleteItemTarget(i) : undefined} />

        {items.length > 0 && (
          <p className="text-right text-[11px] mt-2 font-semibold" style={{ color: "var(--text-main)" }}>
            Subtotal (aprox.): <span className="font-mono">${subtotalPreview.toFixed(2)}</span>
          </p>
        )}

        <AnimatePresence>
          {showBuilder && (
            <ItemBuilder
              quoteId={quote.id}
              methods={methods}
              onAdded={() => {
                invalidate();
                setShowBuilder(false);
              }}
              onCancel={() => setShowBuilder(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {canWrite && (
        <div className="panel rounded-md shadow-sm p-5 space-y-4" style={{ border: "1px solid var(--border-color)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            Detalles
          </h2>
          <Field label="Nombre del Proyecto">
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="field-input" />
          </Field>
          <Field label="Canal de Comisión">
            <select
              value={commissionChannel}
              onChange={(e) => setCommissionChannel(e.target.value as QuoteCommissionChannel)}
              className="field-input"
            >
              {Object.entries(COMMISSION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notas" hint="Opcional — visibles solo internamente, no en el PDF del cliente">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="field-input" />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setDeleteQuoteConfirm(true)}
              disabled={saving || issuing}
              className="h-9 px-4 rounded text-[11px] font-medium hover-bg disabled:opacity-60"
              style={{ color: C.danger, border: `1px solid ${C.danger}40` }}
            >
              Eliminar Cotización
            </button>
            <button
              onClick={handleSaveDetails}
              disabled={saving || issuing}
              className="h-9 px-4 rounded text-[11px] font-medium hover-bg disabled:opacity-60 flex items-center gap-2"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Guardar Cambios
            </button>
            <button
              onClick={handleIssue}
              disabled={saving || issuing || items.length === 0}
              className="h-9 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 transition-opacity disabled:opacity-40"
              style={{ backgroundColor: C.accent }}
            >
              {issuing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Emitir Cotización
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {deleteItemTarget && (
          <DeleteConfirm
            label={deleteItemTarget.description}
            description={
              <>
                <strong>{deleteItemTarget.description}</strong> se eliminará de esta cotización de forma{" "}
                <strong>permanente</strong>.
              </>
            }
            onCancel={() => setDeleteItemTarget(null)}
            onConfirm={handleItemDelete}
            loading={deletingItem}
          />
        )}
        {deleteQuoteConfirm && (
          <DeleteConfirm
            label={quote.code}
            description={
              <>
                La cotización <strong>{quote.code}</strong> se eliminará de forma <strong>permanente</strong>, junto
                con todas sus partidas.
              </>
            }
            onCancel={() => setDeleteQuoteConfirm(false)}
            onConfirm={handleDeleteQuote}
            loading={deletingQuote}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  EMITIDA / GANADA / PERDIDA — solo lectura + acciones         */
/* ══════════════════════════════════════════════════════════ */
function IssuedDetail({ quote, methods, canWrite }: { quote: Quote; methods: QuoteMethod[]; canWrite: boolean }) {
  const qc = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const items = quote.items ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["quotes", quote.id] });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/quotes/${quote.id}/pdf`, { responseType: "blob" });
      downloadBlob(res.data, `${quote.code}.pdf`);
    } catch {
      toast.error("No se pudo descargar el PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const handleMark = async (result: "won" | "lost") => {
    setUpdatingStatus(true);
    try {
      await api.post(`/quotes/${quote.id}/${result}`);
      toast.success(result === "won" ? "Cotización marcada como ganada" : "Cotización marcada como perdida");
      invalidate();
    } catch (err: unknown) {
      toast.error(getApiError(err));
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="panel rounded-md shadow-sm p-5" style={{ border: "1px solid var(--border-color)" }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-main)" }}>
          Partidas
        </h2>
        <ItemsTable items={items} methods={methods} />

        <div
          className="flex flex-col items-end gap-1 text-[11px] mt-4 pt-4"
          style={{ borderTop: "1px solid var(--border-color)" }}
        >
          <p style={{ color: "var(--text-muted)" }}>
            Subtotal: <span className="font-mono">${Number(quote.subtotal_usd ?? 0).toFixed(2)}</span>
          </p>
          <p style={{ color: "var(--text-muted)" }}>
            IVA ({Number(quote.tax_pct_applied)}%):{" "}
            <span className="font-mono">${Number(quote.tax_amount_usd ?? 0).toFixed(2)}</span>
          </p>
          <p className="text-[13px] font-bold" style={{ color: "var(--text-main)" }}>
            Total: <span className="font-mono">${Number(quote.total_usd ?? 0).toFixed(2)}</span>
          </p>
          {quote.commission_channel && quote.commission_channel !== "none" && (
            <p style={{ color: "var(--text-muted)" }}>
              Comisión ({COMMISSION_LABELS[quote.commission_channel]}):{" "}
              <span className="font-mono">${Number(quote.commission_amount_usd ?? 0).toFixed(2)}</span>
            </p>
          )}
          <p style={{ color: "var(--text-muted)" }}>
            Emitida: <span className="font-mono">{quote.issued_at ? fmtDate(quote.issued_at) : "—"}</span>
          </p>
        </div>

        {quote.notes && (
          <div className="mt-3 pt-3 text-[11px]" style={{ borderTop: "1px solid var(--border-color)" }}>
            <p className="font-semibold uppercase tracking-wider text-[9px] mb-1" style={{ color: "var(--text-muted)" }}>
              Notas
            </p>
            <p style={{ color: "var(--text-main)" }}>{quote.notes}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <a
          href={`/verify-quote/${quote.code}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold flex items-center gap-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          <ShieldCheck size={13} /> Ver verificación pública
        </a>

        <div className="flex gap-2">
          {quote.status === "issued" && canWrite && (
            <>
              <button
                onClick={() => handleMark("lost")}
                disabled={updatingStatus}
                className="h-9 px-4 rounded text-[11px] font-medium hover-bg disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                style={{ color: C.danger, border: `1px solid ${C.danger}40` }}
              >
                <ThumbsDown size={13} /> Marcar Perdida
              </button>
              <button
                onClick={() => handleMark("won")}
                disabled={updatingStatus}
                className="h-9 px-4 rounded text-[11px] font-semibold text-white flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: C.success }}
              >
                <ThumbsUp size={13} /> Marcar Ganada
              </button>
            </>
          )}
          <button
            onClick={handleDownload}
            disabled={!quote.pdf_ready || downloading}
            className="h-9 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 disabled:opacity-40 cursor-pointer"
            style={{ backgroundColor: C.accent }}
            title={!quote.pdf_ready ? "El PDF aún no está disponible" : undefined}
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Descargar PDF
          </button>
        </div>
      </div>

      {!quote.pdf_ready && (
        <div
          className="flex items-center gap-2 rounded px-3 py-2 text-[11px]"
          style={{ backgroundColor: `${C.warning}12`, border: `1px solid ${C.warning}40`, color: C.warning }}
        >
          <AlertTriangle size={13} /> El PDF todavía no está disponible para esta cotización.
        </div>
      )}
    </div>
  );
}
