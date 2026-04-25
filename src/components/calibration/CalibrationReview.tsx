'use client';

/**
 * Shared CalibrationReview component.
 *
 * Displays the full audit view for a calibration session:
 *  - General data (instrument, procedure, ambient conditions)
 *  - Uncertainty results table
 *  - Expandable full GUM calculation procedure (AuditMathBreakdown)
 *  - Approve / Reject actions (visible only to auditor/admin when status = pending_review)
 *  - Rejection modal with mandatory reason textarea (ISO 17025)
 *
 * Props:
 *  - id: number          — calibration session id
 *  - onBack: () => void  — callback fired after approve/reject or when user clicks "Volver"
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import {
  ArrowLeft, XCircle, ClipboardCheck, BookOpen,
  ChevronDown, Minimize2, Sigma, Loader2, Download, FileCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuditMathBreakdown from '@/components/calibration/AuditMathBreakdown';

import { C } from '@/lib/colors';

// Legacy alias so JSX below requires no changes
const COLORS = { primary: C.primary, success: C.success, danger: C.danger };

/* ══════════════════════════════════════════════════════════ */
/*  Main Component                                            */
/* ══════════════════════════════════════════════════════════ */
export default function CalibrationReview({ id, onBack }: { id: number; onBack: () => void }) {
  const [session, setSession]             = useState<any>(null);
  const [showProcedure, setShowProcedure] = useState(false);
  const [rejectOpen, setRejectOpen]       = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading]             = useState(true);
  const [approvedCertId, setApprovedCertId] = useState<number | null>(null);
  const [downloading, setDownloading]     = useState(false);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const isAuditor = user?.role === 'auditor' || user?.role === 'admin';
  const isPending = session?.status === 'pending_review';

  useEffect(() => {
    setLoading(true);
    api.get(`/calibration/sessions/${id}`)
      .then(r => setSession(r.data))
      .catch(() => toast.error('No se pudo cargar la sesión'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await api.post(`/calibration/sessions/${id}/approve`);
      const { certificate_id, pdf_ready } = res.data;
      // Invalidate caches so the lists update immediately
      queryClient.invalidateQueries({ queryKey: ['calibrationSessions'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      if (certificate_id && pdf_ready) {
        setApprovedCertId(certificate_id);
        toast.success('Sesion aprobada - certificado generado');
      } else {
        toast.success('Sesion aprobada - certificado emitido');
        onBack();
      }
    } catch {
      toast.error('Error al aprobar la sesion');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadCert = async (certId: number, certNumber?: string) => {
    setDownloading(true);
    try {
      const res = await api.get(`/certificates/${certId}/download`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${certNumber || `CERT-${certId}`}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar el certificado');
    } finally {
      setDownloading(false);
    }
  };

  const handleReject = async (reason: string) => {
    setActionLoading(true);
    try {
      await api.post(`/calibration/sessions/${id}/reject`, { reason });
      // Invalidate cache so the pending list updates
      queryClient.invalidateQueries({ queryKey: ['calibrationSessions'] });
      toast.success('Sesion rechazada - el tecnico fue notificado');
      onBack();
    } catch {
      toast.error('Error al rechazar la sesion');
    } finally {
      setActionLoading(false);
      setRejectOpen(false);
    }
  };

  /* ── Flatten results from any strategy shape ── */
  const allResults: any[] = (() => {
    if (!session) return [];
    const source = session.calculated_results || session.final_results;
    if (!source) return [];
    if (source.functions) {
      const flat: any[] = [];
      for (const [funcKey, points] of Object.entries(source.functions)) {
        for (const pt of points as any[]) {
          flat.push({ ...pt, function: funcKey });
        }
      }
      return flat;
    }
    if (source.points)    return source.points;
    if (Array.isArray(source)) return source;
    return [];
  })();

  const hasDetailedSources = allResults.some(
    (r: any) => r.uncertainty_sources && r.uncertainty_sources.length > 0
  );

  /* ── Loading skeleton ── */
  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
      <Loader2 size={16} className="animate-spin" /> Cargando sesión de calibración…
    </div>
  );

  if (!session) return (
    <div className="flex items-center justify-center h-64 text-xs" style={{ color: 'var(--text-muted)' }}>
      Sesión no encontrada.
    </div>
  );

  /* ────────────────────────────────────────────────────────── */
  return (
    <div className="w-full space-y-5 animate-fadeIn max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={onBack}
          className="flex items-center gap-1 text-xs hover:underline transition-colors"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Volver a Bandeja
        </button>
        <div className="flex items-center gap-2">
          {session.status === 'approved' && (
            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest"
              style={{ backgroundColor: '#10B98115', color: '#10B981', border: '1px solid #10B98130' }}>
              ✓ Aprobado
            </span>
          )}
          {session.status === 'rejected' && (
            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest"
              style={{ backgroundColor: `${COLORS.danger}15`, color: COLORS.danger, border: `1px solid ${COLORS.danger}30` }}>
              ✗ Rechazado
            </span>
          )}
          {isPending && (
            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest"
              style={{ backgroundColor: '#3B82F615', color: '#3B82F6', border: '1px solid #3B82F630' }}>
              Modo Auditoría
            </span>
          )}
        </div>
      </div>

      <div className="panel rounded-md shadow-sm p-5 w-full" style={{ borderTop: '4px solid #3b82f6' }}>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-main)' }}>
          Sesión CS-{id}
        </h2>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
          Técnico: {session.technician?.name || '—'} | Procedimiento: <strong>{session.procedure_schema?.code || '—'}</strong> | Fecha: {new Date(session.created_at).toLocaleDateString('es')}
        </p>

        {/* Rejection reason banner */}
        {session.status === 'rejected' && session.observation && (
          <div className="mb-4 p-3 rounded-md flex items-start gap-2 text-[11px]"
            style={{ backgroundColor: `${COLORS.danger}10`, border: `1px solid ${COLORS.danger}30`, color: COLORS.danger }}>
            <XCircle size={14} className="shrink-0 mt-0.5" />
            <span><strong>Motivo del rechazo:</strong> {session.observation}</span>
          </div>
        )}

        {/* 1. General Data */}
        <div className="rounded-md p-4 mb-6" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
          <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
            1. Datos Generales e Identificación
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Equipo Calibrado</p><p className="text-xs font-medium">{session.instrument?.internal_code} ({session.instrument?.name})</p></div>
            <div><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Procedimiento</p><p className="text-xs font-medium">{session.procedure_schema?.code || '—'}</p></div>
            <div><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Temperatura Amb.</p><p className="text-xs font-medium font-mono">{session.ambient_temperature} °C</p></div>
            <div><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Humedad Relativa</p><p className="text-xs font-medium font-mono">{session.ambient_humidity} %</p></div>
          </div>
        </div>

        {/* 2. Results summary */}
        <AnimatePresence mode="wait">
          {!showProcedure && allResults.length > 0 && (
            <motion.div key="results-top"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }} transition={{ duration: 0.35 }}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>2. Resultados de Incertidumbre</h3>
              <ResultsTable results={allResults} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle: show/hide full calculation procedure */}
        {hasDetailedSources && (
          <motion.div layout className="my-5">
            <button onClick={() => setShowProcedure(!showProcedure)}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-md text-[12px] font-semibold transition-all duration-300"
              style={{
                border: showProcedure ? '1px solid rgba(255,165,38,0.4)' : '1px dashed rgba(255,165,38,0.4)',
                backgroundColor: showProcedure ? 'rgba(255,165,38,0.06)' : 'transparent',
                color: COLORS.primary,
              }}>
              {showProcedure ? (
                <><Minimize2 size={15} /> Minimizar Procedimiento <motion.div animate={{ rotate: 180 }} transition={{ duration: 0.2 }}><ChevronDown size={14} /></motion.div></>
              ) : (
                <><Sigma size={15} /> Ver Procedimiento Completo de Cálculo <motion.div animate={{ rotate: 0 }} transition={{ duration: 0.2 }}><ChevronDown size={14} /></motion.div></>
              )}
            </button>
          </motion.div>
        )}

        {/* Full GUM procedure (expandable) */}
        <AnimatePresence>
          {showProcedure && (
            <motion.div key="procedure"
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden">
              <div className="rounded-md p-5 mb-5" style={{
                backgroundColor: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                borderTop: `3px solid ${COLORS.primary}`,
              }}>
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen size={16} style={{ color: COLORS.primary }} />
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                    Procedimiento de Cálculo — JCGM 100:2008 (ISO GUM)
                  </h3>
                </div>
                <p className="text-[10px] mb-5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  A continuación se documenta el procedimiento completo de cálculo de incertidumbre, paso a paso,
                  con los valores reales obtenidos durante la calibración. Cada punto de calibración muestra las
                  ecuaciones aplicadas según la &ldquo;Guide to the Expression of Uncertainty in Measurement&rdquo; (GUM).
                </p>
                <AuditMathBreakdown results={allResults} instrumentUnit={session?.instrument?.unit} />
              </div>

              {allResults.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-color)' }} />
                    <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>Resumen Final de Resultados</span>
                    <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-color)' }} />
                  </div>
                  <ResultsTable results={allResults} highlight />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auditor Actions */}
        {isAuditor && isPending && (
          <div className="mt-8 pt-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border-color)' }}>
            <button onClick={() => setRejectOpen(true)} disabled={actionLoading}
              className="h-9 px-5 rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              style={{ color: COLORS.danger, backgroundColor: `${COLORS.danger}10`, border: `1px solid ${COLORS.danger}30` }}>
              <XCircle size={14} /> Rechazar a Técnico
            </button>
            <button onClick={handleApprove} disabled={actionLoading}
              className="h-9 px-5 rounded-md text-xs font-semibold text-white shadow-md active:scale-95 flex items-center gap-1.5 disabled:opacity-50 transition-transform"
              style={{ backgroundColor: C.accent }}>
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
              Aprobar y Emitir Certificado
            </button>
          </div>
        )}

        {/* Post-approval download banner */}
        <AnimatePresence>
          {approvedCertId && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="mt-6 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-4"
              style={{ background: 'linear-gradient(135deg,#10b98115,#6366f115)', border: '1px solid #10b98140' }}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full shrink-0"
                style={{ backgroundColor: '#10b98120', border: '2px solid #10b98140' }}>
                <FileCheck size={22} style={{ color: '#10b981' }} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                  Certificado ISO 17025 Generado
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  El PDF fue creado y firmado con hash SHA-256. Descárguelo o vuelva a la bandeja.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleDownloadCert(approvedCertId, session?.certificate_code)}
                  disabled={downloading}
                  className="h-9 px-4 rounded-md text-xs font-semibold text-white flex items-center gap-2 disabled:opacity-60 transition-opacity"
                  style={{ backgroundColor: '#10b981' }}
                >
                  {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  Descargar PDF
                </button>
                <button onClick={onBack}
                  className="h-9 px-4 rounded-md text-xs font-medium hover-bg transition-colors"
                  style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  Volver
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Download button for already-approved sessions */}
        {session?.status === 'approved' && !approvedCertId && session?.certificate && (
          <div className="mt-4 pt-4 flex justify-end" style={{ borderTop: '1px solid var(--border-color)' }}>
            <button
              onClick={() => handleDownloadCert(session.certificate.id, session.certificate_code)}
              disabled={downloading}
              className="h-8 px-4 rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: C.primary, color: '#fff' }}
            >
              {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Descargar Certificado PDF
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {rejectOpen && (
          <RejectModal
            onCancel={() => setRejectOpen(false)}
            onConfirm={handleReject}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  Reject Modal                                              */
/* ══════════════════════════════════════════════════════════ */
function RejectModal({ onCancel, onConfirm, loading }: {
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 10;

  const content = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.18 }}
        className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-panel)', border: `2px solid ${COLORS.danger}30` }}>

        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <XCircle size={16} style={{ color: COLORS.danger }} /> Rechazar Sesión de Calibración
          </h2>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            El técnico recibirá el motivo del rechazo para hacer las correcciones necesarias (ISO 17025).
          </p>
        </div>

        <div className="px-6 py-5 space-y-3">
          <label className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
            Motivo del rechazo <span className="text-red-400">*</span>
          </label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} autoFocus
            placeholder="Describa el motivo técnico (lecturas fuera de especificación, datos incompletos, condiciones ambientales inválidas…)"
            className="field-input w-full resize-none text-[11px]" style={{ minHeight: 100 }} />
          <p className="text-[10px]" style={{ color: valid ? 'var(--text-muted)' : COLORS.danger }}>
            {reason.trim().length}/500 — {valid ? 'listo' : 'mínimo 10 caracteres'}
          </p>
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3"
          style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
          <button onClick={onCancel}
            className="h-8 px-4 rounded text-[11px] font-medium hover-bg transition-colors"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
            Cancelar
          </button>
          <button onClick={() => valid && onConfirm(reason.trim())}
            disabled={!valid || loading}
            className="h-8 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: COLORS.danger }}>
            {loading && <Loader2 size={12} className="animate-spin" />}
            <XCircle size={12} /> Confirmar Rechazo
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(content, document.body);
}

/* ══════════════════════════════════════════════════════════ */
/*  Results Table                                             */
/* ══════════════════════════════════════════════════════════ */
function ResultsTable({ results, highlight }: { results: any[]; highlight?: boolean }) {
  const funcMap: Record<string, string> = { exterior: 'Exterior', interior: 'Interior', depth: 'Profundidad' };
  const hasFunction = results.some(r => r.function);
  const hasError    = results.some(r => r.error !== undefined);

  return (
    <div className="rounded-md overflow-x-auto mb-4" style={{
      border: highlight ? '2px solid rgba(255,165,38,0.3)' : '1px solid var(--border-color)',
      boxShadow: highlight ? '0 0 20px rgba(255,165,38,0.06)' : 'none',
    }}>
      <table className="w-full text-xs text-left min-w-[500px]">
        <thead className="th-theme"><tr>
          <th className="px-3 py-2 text-[11px]">Punto Nominal</th>
          {hasFunction && <th className="px-3 py-2 text-[11px]">Función</th>}
          {hasError    && <th className="px-3 py-2 text-[11px] text-right">Error</th>}
          <th className="px-3 py-2 text-[11px] text-right">u_c</th>
          <th className="px-3 py-2 text-[11px] text-right">k</th>
          <th className="px-3 py-2 text-[11px] text-right font-bold">U (expandida)</th>
        </tr></thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {results.map((r: any, i: number) => (
            <motion.tr key={i}
              initial={highlight ? { backgroundColor: 'rgba(255,165,38,0.1)' } : {}}
              animate={{ backgroundColor: 'transparent' }}
              transition={{ delay: i * 0.08, duration: 0.8 }}>
              <td className="px-3 py-2 font-mono">{r.nominal_value}</td>
              {hasFunction && <td className="px-3 py-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>{funcMap[r.function] || r.function || '—'}</td>}
              {hasError    && <td className="px-3 py-2 text-right font-mono">{r.error !== undefined ? r.error : '—'}</td>}
              <td className="px-3 py-2 text-right font-mono">{r.combined_uncertainty_mm ?? r.combined_uncertainty ?? '—'}</td>
              <td className="px-3 py-2 text-right font-mono">{r.k_factor}</td>
              <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: '#FFA526' }}>
                ± {r.expanded_uncertainty_mm ?? r.expanded_uncertainty ?? '—'}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
