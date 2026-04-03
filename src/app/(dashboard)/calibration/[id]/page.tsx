'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, BookOpen, ChevronDown, XCircle, ClipboardCheck, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

const COLORS = { primary: '#FFA526', success: '#10B981', danger: '#FF1E12' };

export default function CalibrationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [session, setSession] = useState<any>(null);
  const [showTraceability, setShowTraceability] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/calibration/sessions/${id}`).then(r => { setSession(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  const isAuditor = user?.role === 'auditor' || user?.role === 'admin';
  const isPending = session?.status === 'pending_review';

  const handleApprove = async () => {
    try { await api.post(`/calibration/sessions/${id}/approve`); toast.success('Sesión aprobada exitosamente'); router.push('/calibration'); } catch { toast.error('Error al aprobar'); }
  };
  const handleReject = async () => {
    try { await api.post(`/calibration/sessions/${id}/reject`, { reason: 'Requiere corrección' }); toast.success('Sesión rechazada'); router.push('/calibration'); } catch { toast.error('Error al rechazar'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-xs" style={{ color: 'var(--text-muted)' }}>Cargando...</div>;
  if (!session) return <div className="flex items-center justify-center h-64 text-xs" style={{ color: 'var(--text-muted)' }}>Sesión no encontrada</div>;

  return (
    <div className="w-full space-y-5 animate-fadeIn max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => router.push('/calibration')} className="flex items-center gap-1 text-xs hover:underline transition-colors" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Volver a Bandeja
        </button>
        {isAuditor && isPending && (
          <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest"
            style={{ border: '1px solid rgba(59,130,246,0.3)' }}>Modo Auditoría</span>
        )}
      </div>

      <div className="panel rounded-md shadow-sm p-5 w-full" style={{ borderTop: '4px solid #3b82f6' }}>
        <h2 className="text-lg font-bold mb-1">Sesión CS-{id}</h2>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
          Técnico: {session.technician?.name || '—'} | Estado: {session.status} | Fecha: {new Date(session.created_at).toLocaleDateString('es')}
        </p>

        <div className="rounded-md p-4 mb-6" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
          <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider">Datos Generales</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Equipo</p><p className="text-xs font-medium">{session.instrument?.internal_code} ({session.instrument?.name})</p></div>
            <div><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Procedimiento</p><p className="text-xs font-medium">{session.procedure_schema?.code || '—'}</p></div>
            <div><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Temperatura</p><p className="text-xs font-medium font-mono">{session.ambient_temperature} °C</p></div>
            <div><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Humedad</p><p className="text-xs font-medium font-mono">{session.ambient_humidity} %</p></div>
          </div>
        </div>

        {session.final_results?.length > 0 && (
          <>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider">Resultados</h3>
            <div className="rounded-md overflow-x-auto mb-6" style={{ border: '1px solid var(--border-color)' }}>
              <table className="w-full text-xs text-left min-w-[400px]">
                <thead className="th-theme"><tr><th className="px-3 py-2 text-[11px]">Punto</th><th className="px-3 py-2 text-[11px] text-right">u_c</th><th className="px-3 py-2 text-[11px] text-right">k</th><th className="px-3 py-2 text-[11px] text-right font-bold">U</th></tr></thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                  {session.final_results.map((r: any, i: number) => (
                    <tr key={i}><td className="px-3 py-2 font-mono">{r.nominal_value}</td><td className="px-3 py-2 text-right font-mono">{r.combined_uncertainty}</td><td className="px-3 py-2 text-right font-mono">{r.k_factor}</td><td className="px-3 py-2 text-right font-mono font-bold" style={{ color: COLORS.primary }}>± {r.expanded_uncertainty}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Traceability */}
        <div className="rounded-md" style={{ border: '1px solid var(--border-color)' }}>
          <button onClick={() => setShowTraceability(!showTraceability)} className="w-full flex items-center justify-between p-3 text-xs font-semibold hover-bg" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-2"><BookOpen size={14} /> Trazabilidad GUM</span>
            <motion.div animate={{ rotate: showTraceability ? 180 : 0 }}><ChevronDown size={14} /></motion.div>
          </button>
          <AnimatePresence>
            {showTraceability && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <FC t="u_A = s / √n" d="Tipo A: Repetibilidad" /><FC t="u_B1 = a / (2×√3)" d="Tipo B: Resolución" />
                  <FC t="u_B2 = U_pat / k" d="Tipo B: Patrón" /><FC t="U = k × √(Σu²)" d="Expandida (k=2, 95%)" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isAuditor && isPending && (
          <div className="mt-8 pt-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border-color)' }}>
            <button onClick={handleReject} className="h-9 px-5 rounded-md text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 flex items-center gap-1.5" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
              <XCircle size={14} /> Rechazar
            </button>
            <button onClick={handleApprove} className="h-9 px-5 rounded-md text-xs font-semibold text-white shadow-md active:scale-95 flex items-center gap-1.5" style={{ backgroundColor: COLORS.success }}>
              <ClipboardCheck size={14} /> Aprobar y Emitir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FC({ t, d }: { t: string; d: string }) {
  return (<div className="space-y-1"><p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{d}</p><div className="p-2 rounded text-center" style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}><p className="font-mono text-xs">{t}</p></div></div>);
}
