'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Eye, Download, ArrowLeft, XCircle, ClipboardCheck, BookOpen, ChevronDown, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.get('/calibration/sessions').then(r => { setSessions(r.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const pending = sessions.filter(s => s.status === 'pending_review' || s.status === 'draft');
  const issued = sessions.filter(s => s.status === 'approved');

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
              {pending.length === 0 ? (
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
              {issued.length === 0 ? (
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
  const [showTraceability, setShowTraceability] = useState(true);

  useEffect(() => {
    api.get(`/calibration/sessions/${id}`).then(r => setSession(r.data)).catch(() => {});
  }, [id]);

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

        {/* Results summary */}
        {session?.final_results?.length > 0 && (
          <>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>2. Resultados de Incertidumbre</h3>
            <div className="rounded-md overflow-x-auto mb-6" style={{ border: '1px solid var(--border-color)' }}>
              <table className="w-full text-xs text-left min-w-[400px]">
                <thead className="th-theme">
                  <tr>
                    <th className="px-3 py-2 text-[11px]">Punto Nominal</th>
                    <th className="px-3 py-2 text-[11px] text-right">u_c</th>
                    <th className="px-3 py-2 text-[11px] text-right">k</th>
                    <th className="px-3 py-2 text-[11px] text-right font-bold">U (expandida)</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                  {session.final_results.map((r: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-mono">{r.nominal_value}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.combined_uncertainty}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.k_factor}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: COLORS.primary }}>± {r.expanded_uncertainty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Traceability */}
        <div className="rounded-md" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}>
          <button onClick={() => setShowTraceability(!showTraceability)}
            className="w-full flex items-center justify-between p-3 text-xs font-semibold hover-bg transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-2"><BookOpen size={14} /> Trazabilidad y Fórmulas GUM</span>
            <motion.div animate={{ rotate: showTraceability ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={14} /></motion.div>
          </button>
          <AnimatePresence>
            {showTraceability && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }} className="overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
                <div className="p-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Cálculos documentados de acuerdo al <strong>JCGM 100:2008 (ISO GUM)</strong>.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormulaCard title="1. Incertidumbre Tipo A" formula="u_A = s / √n" desc="s = desviación estándar, n = número de lecturas." />
                    <FormulaCard title="2. Incertidumbre Tipo B (Resolución)" formula="u_B1 = a / (2 × √3)" desc="Distribución rectangular. a = resolución mínima." />
                    <FormulaCard title="3. Incertidumbre Tipo B (Patrón)" formula="u_B2 = U_patrón / k" desc="Distribución normal con factor k del certificado." />
                    <FormulaCard title="4. Incertidumbre Expandida" formula="u_c = √(u_A² + u_B1² + u_B2²) | U = k × u_c" desc="Raíz suma de cuadrados × factor k=2 (95% confianza)." />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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

function FormulaCard({ title, formula, desc }: { title: string; formula: string; desc: string }) {
  return (
    <div className="space-y-2">
      <h5 className="text-[11px] font-bold" style={{ color: 'var(--text-main)' }}>{title}</h5>
      <div className="p-2 rounded text-center" style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
        <p className="font-mono text-xs" style={{ color: 'var(--text-main)' }}>{formula}</p>
      </div>
      <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>{desc}</p>
    </div>
  );
}
