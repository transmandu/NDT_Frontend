'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Eye, Download, ArrowLeft, XCircle, ClipboardCheck, BookOpen, ChevronDown, Send, Minimize2, Maximize2, Sigma } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuditMathBreakdown from '@/components/calibration/AuditMathBreakdown';

const COLORS = { primary: '#FFA526', success: '#10B981', warning: '#FFB812', danger: '#FF1E12' };

const statusLabels: Record<string, string> = {
  draft: 'Borrador', pending_review: 'En Revisión', approved: 'Aprobado', rejected: 'Rechazado',
};
const statusColors: Record<string, string> = {
  draft: COLORS.warning, pending_review: COLORS.primary, approved: COLORS.success, rejected: COLORS.danger,
};

export default function CalibrationPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'issued'>('pending');
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const reviewId = searchParams.get('review');
    if (reviewId) {
      setReviewingId(Number(reviewId));
      router.replace('/calibration', undefined); // Limpia la URL para evitar recargas raras
    }
  }, [searchParams, router]);

  const { data: sessions = [], isLoading } = useQuery<any[]>({
    queryKey: ['calibrationSessions'],
    queryFn: () => api.get('/calibration/sessions').then(r => r.data.data || []),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const pending = sessions.filter((s: any) => s.status === 'pending_review' || s.status === 'draft');
  const issued = sessions.filter((s: any) => s.status === 'approved');

  if (reviewingId) {
    return <CalibrationReview id={reviewingId} onBack={() => setReviewingId(null)} />;
  }

  return (
    <div className="space-y-4 w-full animate-fadeIn">
      {/* Tabs */}
      <div id="tour-cert-tabs" className="flex mb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <button onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'pending' ? 'border-b-2' : 'hover-bg'}`}
          style={{ color: activeTab === 'pending' ? COLORS.primary : 'var(--text-muted)', borderColor: activeTab === 'pending' ? COLORS.primary : 'transparent' }}>
          Pendientes de Revisión ({pending.length})
        </button>
        <button onClick={() => setActiveTab('issued')}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'issued' ? 'border-b-2' : 'hover-bg'}`}
          style={{ color: activeTab === 'issued' ? COLORS.primary : 'var(--text-muted)', borderColor: activeTab === 'issued' ? COLORS.primary : 'transparent' }}>
          Certificados Emitidos
        </button>
      </div>

      {activeTab === 'pending' ? (
        <div id="tour-data-table" className="panel rounded-md shadow-sm overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead>
              <tr>
                <th className="px-4 py-2 th-theme text-[11px]">ID Borrador</th>
                <th className="px-4 py-2 th-theme text-[11px]">Instrumento</th>
                <th className="px-4 py-2 th-theme text-[11px]">Técnico</th>
                <th className="px-4 py-2 th-theme text-[11px]">Fecha Medición</th>
                <th className="px-4 py-2 th-theme text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`skel-p-${i}`} className="td-theme border-b border-[var(--border-color)]">
                    <td colSpan={5} className="px-4 py-3.5">
                      <div className="h-4 rounded animate-pulse w-full" style={{ backgroundColor: 'var(--bg-hover)' }} />
                    </td>
                  </tr>
                ))
              ) : pending.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>No hay sesiones pendientes</td></tr>
              ) : (
                pending.map(s => (
                  <tr key={s.id} className="td-theme hover-bg transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">CS-{s.id}</td>
                    <td className="px-4 py-3">{s.instrument?.name || `Inst #${s.instrument_id}`}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{s.technician?.name || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setReviewingId(s.id)}
                        className="inline-flex items-center justify-center rounded text-[11px] font-medium transition-colors h-7 px-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 gap-1.5"
                        style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
                        <Eye size={14} /> Auditar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel rounded-md shadow-sm overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead>
              <tr>
                <th className="px-4 py-2 th-theme text-[11px]">Nº Certificado</th>
                <th className="px-4 py-2 th-theme text-[11px]">Instrumento</th>
                <th className="px-4 py-2 th-theme text-[11px] hidden sm:table-cell">Fecha Emisión</th>
                <th className="px-4 py-2 th-theme text-[11px]">U. Expandida</th>
                <th className="px-4 py-2 th-theme text-right">Documento</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`skel-i-${i}`} className="td-theme border-b border-[var(--border-color)]">
                    <td colSpan={5} className="px-4 py-3.5">
                      <div className="h-4 rounded animate-pulse w-full" style={{ backgroundColor: 'var(--bg-hover)' }} />
                    </td>
                  </tr>
                ))
              ) : issued.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>No hay certificados emitidos</td></tr>
              ) : (
                issued.map(s => (
                  <tr key={s.id} className="td-theme hover-bg transition-colors">
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap">{s.certificate_code || `CERT-${s.id}`}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>{s.instrument?.name || '—'}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{new Date(s.approved_at || s.updated_at).toLocaleDateString('es')}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px]">± —</td>
                    <td className="px-4 py-2.5 text-right">
                      <button className="inline-flex items-center justify-center rounded text-[11px] font-medium transition-colors h-7 px-2 hover-bg gap-1.5"
                        style={{ border: '1px solid var(--border-color)' }}>
                        <Download size={12} /> <span className="hidden sm:inline">PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* --- AUDIT REVIEW SUBVIEW --- */
function CalibrationReview({ id, onBack }: { id: number; onBack: () => void }) {
  const [session, setSession] = useState<any>(null);
  const [showProcedure, setShowProcedure] = useState(false);

  useEffect(() => {
    api.get(`/calibration/sessions/${id}`).then(r => setSession(r.data)).catch(() => {});
  }, [id]);

  // Flatten all results from calculated_results (recalculated) or final_results (legacy)
  const allResults: any[] = (() => {
    if (!session) return [];

    // Prefer calculated_results (recalculated from raw_payload by the backend)
    const source = session.calculated_results || session.final_results;
    if (!source) return [];

    // Vernier-style: results grouped by functions (e.g. { functions: { exterior: [...], interior: [...] } })
    if (source.functions) {
      const flat: any[] = [];
      for (const [funcKey, points] of Object.entries(source.functions)) {
        for (const pt of points as any[]) {
          flat.push({ ...pt, function: funcKey });
        }
      }
      return flat;
    }
    // Balanza-style: results.points array
    if (source.points) {
      return source.points;
    }
    // Direct array
    if (Array.isArray(source)) {
      return source;
    }
    return [];
  })();

  const hasDetailedSources = allResults.some(
    (r: any) => r.uncertainty_sources && r.uncertainty_sources.length > 0
  );

  return (
    <div className="w-full space-y-5 animate-fadeIn max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-2">
        <button onClick={onBack} className="flex items-center gap-1 text-xs hover:underline transition-colors" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Volver a Bandeja
        </button>
        <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest"
          style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
          Modo Auditoría
        </span>
      </div>

      <div className="panel rounded-md shadow-sm p-5 w-full" style={{ borderTop: '4px solid #3b82f6' }}>
        <h2 className="text-lg font-bold mb-1">Revisión Técnica de Borrador: CS-{id}</h2>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
          Realizado por: {session?.technician?.name || '—'} | Fecha: {session ? new Date(session.created_at).toLocaleDateString('es') : '—'}
        </p>

        {/* General Data */}
        <div className="rounded-md p-4 mb-6" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
          <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>1. Datos Generales e Identificación</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Equipo Calibrado</p><p className="text-xs font-medium">{session?.instrument?.internal_code} ({session?.instrument?.name})</p></div>
            <div><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Procedimiento</p><p className="text-xs font-medium">{session?.procedure_schema?.code || '—'}</p></div>
            <div><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Temperatura</p><p className="text-xs font-medium font-mono">{session?.ambient_temperature} °C</p></div>
            <div><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Humedad</p><p className="text-xs font-medium font-mono">{session?.ambient_humidity} %</p></div>
          </div>
        </div>

        {/* ── Results Summary (visible when procedure is collapsed) ── */}
        <AnimatePresence mode="wait">
          {!showProcedure && allResults.length > 0 && (
            <motion.div
              key="results-top"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
              transition={{ duration: 0.35 }}
            >
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>2. Resultados de Incertidumbre</h3>
              <ResultsTable results={allResults} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Toggle Procedure Button ── */}
        {hasDetailedSources && (
          <motion.div layout className="my-5">
            <button
              onClick={() => setShowProcedure(!showProcedure)}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-md text-[12px] font-semibold transition-all duration-300 group"
              style={{
                border: showProcedure
                  ? '1px solid rgba(255,165,38,0.4)'
                  : '1px dashed rgba(255,165,38,0.4)',
                backgroundColor: showProcedure
                  ? 'rgba(255,165,38,0.06)'
                  : 'transparent',
                color: COLORS.primary,
              }}
            >
              {showProcedure ? (
                <>
                  <Minimize2 size={15} />
                  Minimizar Procedimiento
                  <motion.div animate={{ rotate: 180 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={14} />
                  </motion.div>
                </>
              ) : (
                <>
                  <Sigma size={15} />
                  Ver Procedimiento Completo de Cálculo
                  <motion.div animate={{ rotate: 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={14} />
                  </motion.div>
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* ── Full Procedure (expandable) ── */}
        <AnimatePresence>
          {showProcedure && (
            <motion.div
              key="procedure"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <div
                className="rounded-md p-5 mb-5"
                style={{
                  backgroundColor: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  borderTop: `3px solid ${COLORS.primary}`,
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen size={16} style={{ color: COLORS.primary }} />
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                    Procedimiento de Cálculo — JCGM 100:2008 (ISO GUM)
                  </h3>
                </div>
                <p className="text-[10px] mb-5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  A continuación se documenta el procedimiento completo de cálculo de incertidumbre,
                  paso a paso, con los valores reales obtenidos durante la calibración. Cada punto de
                  calibración muestra las ecuaciones aplicadas según la &ldquo;Guide to the Expression of
                  Uncertainty in Measurement&rdquo; (GUM).
                </p>

                <AuditMathBreakdown
                  results={allResults}
                  instrumentUnit={session?.instrument?.unit}
                />
              </div>

              {/* ── Results at bottom (after procedure is shown) ── */}
              {allResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-color)' }} />
                    <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Resumen Final de Resultados
                    </span>
                    <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-color)' }} />
                  </div>
                  <ResultsTable results={allResults} highlight />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auditor Actions */}
        <div className="mt-8 pt-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button className="h-9 px-5 rounded-md text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 transition-colors flex items-center gap-1.5"
            style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
            <XCircle size={14} /> Rechazar a Técnico
          </button>
          <button className="h-9 px-5 rounded-md text-xs font-semibold text-white shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
            style={{ backgroundColor: COLORS.success }}>
            <ClipboardCheck size={14} /> Aprobar y Emitir Certificado
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Reusable Results Table ─────────────────────────────────── */
function ResultsTable({ results, highlight }: { results: any[]; highlight?: boolean }) {
  return (
    <div
      className="rounded-md overflow-x-auto mb-4"
      style={{
        border: highlight ? '2px solid rgba(255,165,38,0.3)' : '1px solid var(--border-color)',
        boxShadow: highlight ? '0 0 20px rgba(255,165,38,0.06)' : 'none',
      }}
    >
      <table className="w-full text-xs text-left min-w-[500px]">
        <thead className="th-theme">
          <tr>
            <th className="px-3 py-2 text-[11px]">Punto Nominal</th>
            {results.some(r => r.function) && <th className="px-3 py-2 text-[11px]">Función</th>}
            {results.some(r => r.error !== undefined) && <th className="px-3 py-2 text-[11px] text-right">Error</th>}
            <th className="px-3 py-2 text-[11px] text-right">u_c</th>
            <th className="px-3 py-2 text-[11px] text-right">k</th>
            <th className="px-3 py-2 text-[11px] text-right font-bold">U (expandida)</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {results.map((r: any, i: number) => {
            const funcMap: Record<string, string> = {
              exterior: 'Exterior', interior: 'Interior', depth: 'Profundidad',
            };
            return (
              <motion.tr
                key={i}
                initial={highlight ? { backgroundColor: 'rgba(255,165,38,0.1)' } : {}}
                animate={{ backgroundColor: 'transparent' }}
                transition={{ delay: i * 0.08, duration: 0.8 }}
              >
                <td className="px-3 py-2 font-mono">{r.nominal_value}</td>
                {results.some(r => r.function) && (
                  <td className="px-3 py-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {funcMap[r.function] || r.function || '—'}
                  </td>
                )}
                {results.some(r => r.error !== undefined) && (
                  <td className="px-3 py-2 text-right font-mono">{r.error !== undefined ? r.error : '—'}</td>
                )}
                <td className="px-3 py-2 text-right font-mono">
                  {r.combined_uncertainty_mm ?? r.combined_uncertainty ?? '—'}
                </td>
                <td className="px-3 py-2 text-right font-mono">{r.k_factor}</td>
                <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: COLORS.primary }}>
                  ± {r.expanded_uncertainty_mm ?? r.expanded_uncertainty ?? '—'}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

