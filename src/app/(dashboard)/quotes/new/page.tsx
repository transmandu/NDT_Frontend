"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import Link from "next/link";
import api from "@/lib/api";
import { getApiError } from "@/lib/apiErrors";
import { AnimatePresence } from "framer-motion";
import { AddClientModal } from "@/components/calibration/AddClientModal";
import { Field, DeleteConfirm } from "@/app/(dashboard)/quotes/catalog/page";
import ItemBuilder from "@/components/quotes/ItemBuilder";
import { useRouter } from "next/navigation";
import type { Client } from "@/types/calibration";
import type {
  Quote,
  QuoteItem,
  QuoteMethod,
  QuoteCommissionChannel,
  CreateQuotePayload,
  UpdateQuotePayload,
  QuoteCurrencyDisplay,
} from "@/types/quotes";
import {
  Check,
  Loader2,
  FilePlus2,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  FlaskConical,
  ClipboardCheck,
  Send,
} from "lucide-react";
import { C } from "@/lib/colors";
import toast from "react-hot-toast";

/*
 * ─── Zod schema — Paso 1 (Cliente) ───
 * `client_id` NO va aquí: se maneja como estado de React controlado aparte
 * (igual que /calibration/new), no vía react-hook-form. Registrar un <select>
 * con react-hook-form y llamar `setValue()` tras crear un cliente nuevo no
 * funciona de forma confiable aquí — el <option> recién creado todavía no
 * existe en el DOM en el instante en que `setValue` corre (llega antes de que
 * React vuelva a renderizar con la lista de clientes ya invalidada), así que
 * la selección se pierde en silencio. Un <select> controlado por estado se
 * "auto-corrige" en el siguiente render sin importar el orden.
 */
const clientStepSchema = z.object({
  project_name: z.string().max(255).optional().or(z.literal("")),
  currency_display: z.enum(["usd", "bs", "both"]),
});
type ClientStepForm = z.infer<typeof clientStepSchema>;

const STEPS = [
  { n: 1, label: "Cliente" },
  { n: 2, label: "Partidas" },
  { n: 3, label: "Revisión" },
] as const;

/* ══════════════════════════════════════════════════════════ */
/*  PAGE — orquesta los 3 pasos del wizard                      */
/* ══════════════════════════════════════════════════════════ */
export default function NewQuotePage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [quote, setQuote] = useState<Quote | null>(null);

  return (
    <div className="space-y-4 w-full animate-fadeIn">
      <Stepper current={step} quote={quote} />

      {step === 1 && (
        <ClientStep
          onCreated={(q) => {
            setQuote(q);
            setStep(2);
          }}
        />
      )}

      {step === 2 && quote && (
        <ItemsStep quote={quote} onContinue={() => setStep(3)} />
      )}

      {step === 3 && quote && <ReviewStep quote={quote} onBack={() => setStep(2)} />}
    </div>
  );
}

/* ─── Indicador de pasos ─── */
function Stepper({ current, quote }: { current: 1 | 2 | 3; quote: Quote | null }) {
  return (
    <div className="panel rounded-md shadow-sm p-4" style={{ border: "1px solid var(--border-color)" }}>
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{
                  backgroundColor: s.n < current ? C.success : s.n === current ? C.accent : "var(--bg-hover)",
                  color: s.n <= current ? "#fff" : "var(--text-muted)",
                }}
              >
                {s.n < current ? <Check size={12} /> : s.n}
              </span>
              <span
                className="text-[11px] font-semibold whitespace-nowrap"
                style={{ color: s.n === current ? "var(--text-main)" : "var(--text-muted)" }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-color)" }} />
            )}
          </div>
        ))}
      </div>
      {quote && (
        <p
          className="text-[10px] mt-3 pt-3"
          style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-color)" }}
        >
          <span className="font-mono font-bold" style={{ color: C.primary }}>
            {quote.code}
          </span>
          {" — "}
          {quote.client?.company_name}
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  PASO 1 — Cliente                                            */
/* ══════════════════════════════════════════════════════════ */
function ClientStep({ onCreated }: { onCreated: (quote: Quote) => void }) {
  const qc = useQueryClient();
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientError, setClientError] = useState<string | undefined>();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => api.get("/clients").then((r) => r.data.data || []),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientStepForm>({
    resolver: zodResolver(clientStepSchema) as Resolver<ClientStepForm>,
    defaultValues: { currency_display: "usd" },
  });

  const handleClientCreated = async (created: Client) => {
    await qc.invalidateQueries({ queryKey: ["clients"] });
    setSelectedClientId(String(created.id));
    setClientError(undefined);
    setShowAddClient(false);
  };

  const onSubmit = async (data: ClientStepForm) => {
    if (!selectedClientId) {
      setClientError("Selecciona un cliente");
      return;
    }
    const payload: CreateQuotePayload = {
      client_id: Number(selectedClientId),
      project_name: data.project_name || null,
      currency_display: data.currency_display as QuoteCurrencyDisplay,
    };
    try {
      const res = await api.post("/quotes", payload);
      const created = res.data.data as Quote;
      toast.success(`Cotización ${created.code} creada`);
      onCreated(created);
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 404) {
        toast.error(
          "No hay parámetros de cotización activos. Crea una versión en Cotizaciones → Parámetros antes de continuar.",
        );
      } else {
        toast.error(getApiError(err));
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="panel rounded-md shadow-sm p-6 space-y-4"
      style={{ border: "1px solid var(--border-color)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <FilePlus2 size={16} style={{ color: C.primary }} />
        <h2 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          Datos del Cliente
        </h2>
      </div>

      <Field label="Cliente *" error={clientError}>
        <div className="flex gap-2">
          <select
            value={selectedClientId}
            onChange={(e) => {
              setSelectedClientId(e.target.value);
              setClientError(undefined);
            }}
            className="field-input"
          >
            <option value="">— Seleccionar cliente —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowAddClient(true)}
            className="h-8 px-3 rounded text-[11px] font-semibold whitespace-nowrap flex items-center gap-1 hover-bg transition-colors cursor-pointer"
            style={{ border: "1px solid var(--border-color)", color: "var(--text-muted)" }}
          >
            <Plus size={13} /> Nuevo
          </button>
        </div>
      </Field>

      <Field label="Nombre del Proyecto" error={errors.project_name?.message} hint="Opcional — referencia interna">
        <input {...register("project_name")} className="field-input" placeholder="Inspección tanque T-101" />
      </Field>

      <Field label="Moneda de Presentación" error={errors.currency_display?.message}>
        <select {...register("currency_display")} className="field-input">
          <option value="usd">USD</option>
          <option value="bs">Bolívares</option>
          <option value="both">USD / Bolívares</option>
        </select>
      </Field>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-9 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 transition-opacity disabled:opacity-60 cursor-pointer"
          style={{ backgroundColor: C.accent }}
        >
          {isSubmitting && <Loader2 size={13} className="animate-spin" />}
          Crear Borrador y Continuar
        </button>
      </div>

      {showAddClient && (
        <AddClientModal onClose={() => setShowAddClient(false)} onCreated={handleClientCreated} />
      )}
    </form>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  PASO 2 — Partidas                                           */
/* ══════════════════════════════════════════════════════════ */
function ItemsStep({ quote, onContinue }: { quote: Quote; onContinue: () => void }) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuoteItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: methods = [] } = useQuery<QuoteMethod[]>({
    queryKey: ["quote-methods"],
    queryFn: () => api.get("/quote-methods").then((r) => r.data.data || []),
  });

  const { data: freshQuote, refetch } = useQuery<Quote>({
    queryKey: ["quotes", quote.id, "wizard"],
    queryFn: () => api.get(`/quotes/${quote.id}`).then((r) => r.data.data),
    initialData: quote,
  });

  const items = freshQuote?.items ?? [];
  const subtotalPreview = items.reduce((sum, i) => sum + Number(i.total_price_usd || 0), 0);

  const methodCode = (id: string) => methods.find((m) => String(m.id) === id)?.code ?? "—";

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/quotes/${quote.id}/items/${deleteTarget.id}`);
      toast.success("Partida eliminada");
      setDeleteTarget(null);
      refetch();
    } catch (err: unknown) {
      toast.error(getApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  if (methods.length === 0) {
    return (
      <div
        className="panel rounded-md shadow-sm p-8 text-center text-[11px] flex flex-col items-center gap-2"
        style={{ color: "var(--text-muted)" }}
      >
        <FlaskConical size={20} />
        No hay métodos NDT activos todavía.
        <Link href="/quotes/methods" className="text-[11px] font-semibold mt-1" style={{ color: C.primary }}>
          Crear el primero →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="panel rounded-md shadow-sm p-5" style={{ border: "1px solid var(--border-color)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            Partidas
          </h2>
          {!showBuilder && (
            <button
              onClick={() => setShowBuilder(true)}
              className="h-7 px-3 text-[11px] rounded font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 hover:opacity-90"
              style={{ backgroundColor: C.accent, color: "#fff" }}
            >
              <Plus size={13} /> Agregar Partida
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-[11px] py-4 text-center" style={{ color: "var(--text-muted)" }}>
            Todavía no hay partidas agregadas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  {["Método", "Descripción", "Cant.", "Precio Unit.", "Total", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2 px-2 font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
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
                    <td className="py-1.5 px-2">
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1 rounded hover-bg"
                        style={{ color: C.danger }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="py-2 px-2 text-right font-semibold" style={{ color: "var(--text-muted)" }}>
                    Subtotal (aprox.)
                  </td>
                  <td className="py-2 px-2 font-mono font-bold" style={{ color: "var(--text-main)" }}>
                    ${subtotalPreview.toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <AnimatePresence>
          {showBuilder && (
            <ItemBuilder
              quoteId={quote.id}
              methods={methods}
              onAdded={() => {
                refetch();
                setShowBuilder(false);
              }}
              onCancel={() => setShowBuilder(false)}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onContinue}
          disabled={items.length === 0}
          className="h-9 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 transition-opacity disabled:opacity-40"
          style={{ backgroundColor: C.accent }}
        >
          Continuar a Revisión <ArrowRight size={14} />
        </button>
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm
            label={deleteTarget.description}
            description={
              <>
                <strong>{deleteTarget.description}</strong> se eliminará de esta cotización de
                forma <strong>permanente</strong>.
              </>
            }
            onCancel={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Etiquetas y % reales de cada canal de comisión (QuotePricingEngine) ─── */
const COMMISSION_LABELS: Record<QuoteCommissionChannel, string> = {
  none: "Ninguna",
  lloyds: "Lloyd's — 10% del subtotal",
  prespuntar: "Prespuntar — 25% del subtotal",
  hangar74: "Hangar 74 — 30% de la utilidad",
};

/* ══════════════════════════════════════════════════════════ */
/*  PASO 3 — Revisión                                           */
/* ══════════════════════════════════════════════════════════ */
function ReviewStep({ quote, onBack }: { quote: Quote; onBack: () => void }) {
  const router = useRouter();
  const [commissionChannel, setCommissionChannel] = useState<QuoteCommissionChannel>(
    quote.commission_channel ?? "none",
  );
  const [notes, setNotes] = useState(quote.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const { data: freshQuote } = useQuery<Quote>({
    queryKey: ["quotes", quote.id, "wizard"],
    queryFn: () => api.get(`/quotes/${quote.id}`).then((r) => r.data.data),
    initialData: quote,
  });

  const { data: methods = [] } = useQuery<QuoteMethod[]>({
    queryKey: ["quote-methods"],
    queryFn: () => api.get("/quote-methods").then((r) => r.data.data || []),
  });
  const methodCode = (id: string) => methods.find((m) => String(m.id) === id)?.code ?? "—";

  const items = freshQuote?.items ?? [];
  const subtotal = items.reduce((sum, i) => sum + Number(i.total_price_usd || 0), 0);
  const taxPct = Number(freshQuote?.tax_pct_applied ?? 0);
  const tax = subtotal * (taxPct / 100);
  const total = subtotal + tax;

  const persistDetails = () =>
    api.put(`/quotes/${quote.id}`, {
      commission_channel: commissionChannel,
      notes: notes || null,
    } satisfies UpdateQuotePayload);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await persistDetails();
      toast.success("Cotización guardada como borrador");
      router.push("/quotes");
    } catch (err: unknown) {
      toast.error(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleIssue = async () => {
    setIssuing(true);
    try {
      await persistDetails();
      // El servidor genera el PDF (DomPDF + QR) de forma síncrona antes de
      // responder — medido en ~20-29s incluso con una sola partida, cerca del
      // timeout global de 30s de axios (api.ts). Sin este override, un
      // usuario real podía ver un error de conexión aunque la cotización SÍ
      // quedara emitida en el servidor (confirmado: BD marcaba status=issued
      // mientras el navegador abortaba la petición con un 499 de nginx).
      const res = await api.post(`/quotes/${quote.id}/issuances`, undefined, { timeout: 90_000 });
      const issued = res.data.data as Quote;
      toast.success(`Cotización ${issued.code} emitida`);
      router.push(`/quotes/${quote.id}`);
    } catch (err: unknown) {
      toast.error(getApiError(err));
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="panel rounded-md shadow-sm p-5" style={{ border: "1px solid var(--border-color)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={16} style={{ color: C.primary }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              Revisión Final
            </h2>
          </div>
          <button
            onClick={onBack}
            className="text-[11px] font-semibold flex items-center gap-1"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft size={13} /> Volver a Partidas
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Cliente
            </p>
            <p style={{ color: "var(--text-main)" }}>{freshQuote?.client?.company_name ?? "—"}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Proyecto
            </p>
            <p style={{ color: "var(--text-main)" }}>{freshQuote?.project_name || "—"}</p>
          </div>
        </div>

        <div className="overflow-x-auto mb-4">
          <table className="w-full text-[10px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                {["Método", "Descripción", "Cant.", "Precio Unit.", "Total"].map((h) => (
                  <th
                    key={h}
                    className="text-left py-2 px-2 font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="flex flex-col items-end gap-1 text-[11px] mb-5 pb-4"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <p style={{ color: "var(--text-muted)" }}>
            Subtotal: <span className="font-mono">${subtotal.toFixed(2)}</span>
          </p>
          <p style={{ color: "var(--text-muted)" }}>
            IVA ({taxPct}%): <span className="font-mono">${tax.toFixed(2)}</span>
          </p>
          <p className="text-[13px] font-bold" style={{ color: "var(--text-main)" }}>
            Total: <span className="font-mono">${total.toFixed(2)}</span>
          </p>
          <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>
            Aproximado — el servidor recalcula el total oficial (y la comisión) al emitir.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
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
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="field-input"
            />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={handleSaveDraft}
          disabled={saving || issuing}
          className="h-9 px-4 rounded text-[11px] font-medium hover-bg disabled:opacity-60 flex items-center gap-2"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          Guardar como Borrador y Salir
        </button>
        <button
          onClick={handleIssue}
          disabled={saving || issuing}
          className="h-9 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 transition-opacity disabled:opacity-60"
          style={{ backgroundColor: C.accent }}
        >
          {issuing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Emitir Cotización
        </button>
      </div>
    </div>
  );
}
