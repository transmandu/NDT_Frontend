'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Eye, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CalibrationReview from '@/components/calibration/CalibrationReview';

import { C } from '@/lib/colors';
const COLORS = { primary: C.primary, success: C.success, warning: C.warning, danger: C.danger };

const statusLabels: Record<string, string> = {
  draft: 'Borrador', pending_review: 'En RevisiÃ³n', approved: 'Aprobado', rejected: 'Rechazado',
};
const statusColors: Record<string, string> = {
  draft: COLORS.warning, pending_review: COLORS.primary, approved: COLORS.success, rejected: COLORS.danger,
};

export default function CalibrationPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'drafts' | 'rejected' | 'issued'>('pending');
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

  const pending  = sessions.filter((s: any) => s.status === 'pending_review');
  const drafts   = sessions.filter((s: any) => s.status === 'draft');
  const rejected = sessions.filter((s: any) => s.status === 'rejected');
  const issued   = sessions.filter((s: any) => s.status === 'approved');

  if (reviewingId) {
    return <CalibrationReview id={reviewingId} onBack={() => setReviewingId(null)} />;
  }

  return (
    <div className="space-y-4 w-full animate-fadeIn">
      {/* Tabs */}
      <div id="tour-cert-tabs" className="flex flex-wrap mb-4 gap-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
        {([
          ['pending',  `En RevisiÃ³n (${pending.length})`],
          ['drafts',   `Borradores (${drafts.length})`],
          ['rejected', `Rechazadas (${rejected.length})`],
          ['issued',   'Certificados Emitidos'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === key ? 'border-b-2' : 'hover-bg'}`}
            style={{ color: activeTab === key ? COLORS.primary : 'var(--text-muted)', borderColor: activeTab === key ? COLORS.primary : 'transparent' }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'pending' ? (
        <div id="tour-data-table" className="panel rounded-md shadow-sm overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead>
              <tr>
                <th className="px-4 py-2 th-theme text-[11px]">ID Borrador</th>
                <th className="px-4 py-2 th-theme text-[11px]">Instrumento</th>
                <th className="px-4 py-2 th-theme text-[11px]">TÃ©cnico</th>
                <th className="px-4 py-2 th-theme text-[11px]">Fecha MediciÃ³n</th>
                <th className="px-4 py-2 th-theme text-right">AcciÃ³n</th>
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
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{s.technician?.name || 'â€”'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setReviewingId(s.id)}
                        className="inline-flex items-center justify-center rounded text-[11px] font-medium transition-colors h-7 px-3 text-white gap-1.5"
                        style={{ backgroundColor: C.accent }}>
                        <Eye size={14} /> Auditar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'drafts' ? (
        /* â”€â”€ BORRADORES â”€â”€ */
        <div className="panel rounded-md shadow-sm overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead>
              <tr>
                <th className="px-4 py-2 th-theme text-[11px]">ID</th>
                <th className="px-4 py-2 th-theme text-[11px]">Instrumento</th>
                <th className="px-4 py-2 th-theme text-[11px]">TÃ©cnico</th>
                <th className="px-4 py-2 th-theme text-[11px]">Fecha</th>
                <th className="px-4 py-2 th-theme text-right">AcciÃ³n</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={`skel-d-${i}`}><td colSpan={5} className="px-4 py-3.5">
                    <div className="h-4 rounded animate-pulse w-full" style={{ backgroundColor: 'var(--bg-hover)' }} />
                  </td></tr>
                ))
              ) : drafts.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>No hay borradores guardados</td></tr>
              ) : (
                drafts.map((s: any) => (
                  <tr key={s.id} className="td-theme hover-bg transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">CS-{s.id}</td>
                    <td className="px-4 py-3">{s.instrument?.name || `Inst #${s.instrument_id}`}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{s.technician?.name || 'â€”'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => router.push(`/calibration/${s.id}`)}
                        className="inline-flex items-center gap-1.5 rounded text-[11px] font-medium h-7 px-3 transition-colors text-white"
                        style={{ backgroundColor: C.accent }}>
                        <Eye size={14} /> Ver Borrador
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'rejected' ? (
        /* â”€â”€ RECHAZADAS â”€â”€ */
        <div className="panel rounded-md shadow-sm overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead>
              <tr>
                <th className="px-4 py-2 th-theme text-[11px]">ID</th>
                <th className="px-4 py-2 th-theme text-[11px]">Instrumento</th>
                <th className="px-4 py-2 th-theme text-[11px]">TÃ©cnico</th>
                <th className="px-4 py-2 th-theme text-[11px]">Motivo</th>
                <th className="px-4 py-2 th-theme text-right">AcciÃ³n</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={`skel-r-${i}`}><td colSpan={5} className="px-4 py-3.5">
                    <div className="h-4 rounded animate-pulse w-full" style={{ backgroundColor: 'var(--bg-hover)' }} />
                  </td></tr>
                ))
              ) : rejected.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>No hay sesiones rechazadas</td></tr>
              ) : (
                rejected.map((s: any) => (
                  <tr key={s.id} className="td-theme hover-bg transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">CS-{s.id}</td>
                    <td className="px-4 py-3">{s.instrument?.name || `Inst #${s.instrument_id}`}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{s.technician?.name || 'â€”'}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: COLORS.danger }} title={s.observation}>{s.observation || 'â€”'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => router.push(`/calibration/${s.id}`)}
                        className="inline-flex items-center gap-1.5 rounded text-[11px] font-medium h-7 px-3 transition-colors"
                        style={{ backgroundColor: '#EF444410', color: COLORS.danger, border: '1px solid #EF444430' }}>
                        <Eye size={14} /> Ver Detalle
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
                <th className="px-4 py-2 th-theme text-[11px]">NÂº Certificado</th>
                <th className="px-4 py-2 th-theme text-[11px]">Instrumento</th>
                <th className="px-4 py-2 th-theme text-[11px] hidden sm:table-cell">Fecha EmisiÃ³n</th>
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
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>{s.instrument?.name || 'â€”'}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{new Date(s.approved_at || s.updated_at).toLocaleDateString('es')}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px]">Â± â€”</td>
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

