'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Eye, Download, Loader2, FileCheck, AlertCircle, Play, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CalibrationReview from '@/components/calibration/CalibrationReview';
import toast from 'react-hot-toast';
import type { CalibrationSession, Certificate } from '@/types/calibration';

import { C } from '@/lib/colors';
const COLORS = { primary: C.primary, success: C.success, warning: C.warning, danger: C.danger };

const DRAFT_KEY = 'ndt_active_draft';
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

function isDraftResumable(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < TWELVE_HOURS_MS;
}

const statusLabels: Record<string, string> = {
  draft: 'Borrador', pending_review: 'En Revisión', approved: 'Aprobado', rejected: 'Rechazado',
};
const statusColors: Record<string, string> = {
  draft: COLORS.warning, pending_review: COLORS.primary, approved: COLORS.success, rejected: COLORS.danger,
};

export default function CalibrationPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'drafts' | 'rejected' | 'issued'>('pending');
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const reviewId = searchParams.get('review');
    if (reviewId) {
      setReviewingId(Number(reviewId));
      router.replace('/calibration', undefined);
    }
  }, [searchParams, router]);

  const { data: sessions = [], isLoading } = useQuery<CalibrationSession[]>({
    queryKey: ['calibrationSessions'],
    queryFn: () => api.get('/calibration/sessions').then(r => r.data.data || []),
    staleTime: 1000 * 60 * 5,
  });

  const { data: certificates = [], isLoading: loadingCerts } = useQuery<Certificate[]>({
    queryKey: ['certificates'],
    queryFn: () => api.get('/certificates').then(r => r.data.data || []),
    enabled: activeTab === 'issued',
    staleTime: 1000 * 30,
  });

  const pending  = sessions.filter(s => s.status === 'pending_review');
  const drafts   = sessions.filter(s => s.status === 'draft');
  const rejected = sessions.filter(s => s.status === 'rejected');

  const handleDownload = async (certId: number, certNumber: string) => {
    setDownloadingId(certId);
    try {
      const res = await api.get(`/certificates/${certId}/download`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${certNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('No se pudo descargar el certificado');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteDraft = async (id: number) => {
    if (!window.confirm(`Eliminar borrador CS-${id}? Esta accion no se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/calibration/sessions/${id}`);
      queryClient.invalidateQueries({ queryKey: ['calibrationSessions'] });
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.sessionId === id) localStorage.removeItem(DRAFT_KEY);
        } catch { /* ignore */ }
      }
      toast.success(`Borrador CS-${id} eliminado`);
    } catch {
      toast.error('No se pudo eliminar el borrador');
    } finally {
      setDeletingId(null);
    }
  };

  if (reviewingId) {
    return <CalibrationReview id={reviewingId} onBack={() => setReviewingId(null)} />;
  }

  return (
    <div className="space-y-4 w-full animate-fadeIn">
      {/* Tabs */}
      <div id="tour-center-tabs" className="flex flex-wrap mb-4 gap-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
        {([
          ['pending',  `En Revisión (${pending.length})`],
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
        <div id="tour-center-table" className="panel rounded-md shadow-sm overflow-x-auto w-full">
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
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{s.technician?.name || 'â€"'}</td>
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
        /* â"€â"€ BORRADORES â"€â"€ */
        <div className="panel rounded-md shadow-sm overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead>
              <tr>
                <th className="px-4 py-2 th-theme text-[11px]">ID</th>
                <th className="px-4 py-2 th-theme text-[11px]">Instrumento</th>
                <th className="px-4 py-2 th-theme text-[11px]">Técnico</th>
                <th className="px-4 py-2 th-theme text-[11px]">Fecha</th>
                <th className="px-4 py-2 th-theme text-right">Acción</th>
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
                drafts.map(s => {
                  const resumable = s.created_at && isDraftResumable(s.created_at);
                  return (
                  <tr key={s.id} className="td-theme hover-bg transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">CS-{s.id}</td>
                    <td className="px-4 py-3">{s.instrument?.name || `Inst #${s.instrument_id}`}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{s.technician?.name || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                      {resumable ? (
                        <button
                          onClick={() => {
                            localStorage.setItem(DRAFT_KEY, JSON.stringify({
                              sessionId: s.id,
                              createdAt: s.created_at,
                            }));
                            router.push('/calibration/new');
                          }}
                          className="inline-flex items-center gap-1.5 rounded text-[11px] font-medium h-7 px-3 transition-colors text-white"
                          style={{ backgroundColor: COLORS.success }}>
                          <Play size={12} /> Reanudar
                        </button>
                      ) : (
                        <>
                          <span
                            className="inline-flex items-center gap-1 rounded text-[10px] font-medium h-6 px-2"
                            style={{ backgroundColor: COLORS.warning + '20', color: COLORS.warning, border: `1px solid ${COLORS.warning}40` }}>
                            Expirado
                          </span>
                          <button
                            onClick={() => handleDeleteDraft(s.id)}
                            disabled={deletingId === s.id}
                            className="inline-flex items-center justify-center rounded h-7 w-7 transition-colors"
                            style={{ backgroundColor: COLORS.danger + '15', color: COLORS.danger, border: `1px solid ${COLORS.danger}30` }}
                            title="Eliminar borrador">
                            {deletingId === s.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Trash2 size={13} />}
                          </button>
                        </>
                      )}
                      <button onClick={() => router.push(`/calibration/${s.id}`)}
                        className="inline-flex items-center gap-1.5 rounded text-[11px] font-medium h-7 px-3 transition-colors"
                        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'rejected' ? (
        /* â"€â"€ RECHAZADAS â"€â"€ */
        <div className="panel rounded-md shadow-sm overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead>
              <tr>
                <th className="px-4 py-2 th-theme text-[11px]">ID</th>
                <th className="px-4 py-2 th-theme text-[11px]">Instrumento</th>
                <th className="px-4 py-2 th-theme text-[11px]">Técnico</th>
                <th className="px-4 py-2 th-theme text-[11px]">Motivo</th>
                <th className="px-4 py-2 th-theme text-right">Acción</th>
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
                rejected.map(s => (
                  <tr key={s.id} className="td-theme hover-bg transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">CS-{s.id}</td>
                    <td className="px-4 py-3">{s.instrument?.name || `Inst #${s.instrument_id}`}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{s.technician?.name || 'â€"'}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: COLORS.danger }} title={s.observation ?? undefined}>{s.observation || 'â€"'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setReviewingId(s.id)}
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
        /* ── CERTIFICADOS EMITIDOS ── */
        <div id="tour-center-certs" className="panel rounded-md shadow-sm overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead>
              <tr>
                <th className="px-4 py-2 th-theme text-[11px]">Nº Certificado</th>
                <th className="px-4 py-2 th-theme text-[11px]">Instrumento</th>
                <th className="px-4 py-2 th-theme text-[11px]">S/N</th>
                <th className="px-4 py-2 th-theme text-[11px] hidden sm:table-cell">Fecha Cal.</th>
                <th className="px-4 py-2 th-theme text-[11px] hidden sm:table-cell">Próxima Cal.</th>
                <th className="px-4 py-2 th-theme text-[11px]">Conformidad</th>
                <th className="px-4 py-2 th-theme text-right">Documento</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {loadingCerts ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`skel-i-${i}`}>
                    <td colSpan={7} className="px-4 py-3.5">
                      <div className="h-4 rounded animate-pulse w-full" style={{ backgroundColor: 'var(--bg-hover)' }} />
                    </td>
                  </tr>
                ))
              ) : certificates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      <FileCheck size={28} className="opacity-30" />
                      <span className="text-[11px]">No hay certificados emitidos aún.</span>
                      <span className="text-[10px] opacity-70">Los certificados aparecen aquí al aprobar una sesión de calibración.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                certificates.map(cert => (
                  <tr key={cert.id} className="td-theme hover-bg transition-colors">
                    <td className="px-4 py-2.5 font-mono font-bold text-[11px]" style={{ color: COLORS.primary }}>
                      {cert.certificate_number}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-[11px]">{cert.instrument_name || '—'}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{cert.instrument_code}</p>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {cert.instrument_serial || '—'}
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {cert.calibration_date ? new Date(cert.calibration_date).toLocaleDateString('es', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-[11px]">
                      {cert.next_calibration_date
                        ? <span style={{ color: new Date(cert.next_calibration_date) < new Date() ? COLORS.danger : COLORS.success }}>
                            {new Date(cert.next_calibration_date).toLocaleDateString('es', { day:'2-digit', month:'short', year:'numeric' })}
                          </span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {cert.conforms === true && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: '#10b98115', color: '#10b981', border: '1px solid #10b98130' }}>
                          Conforme
                        </span>
                      )}
                      {cert.conforms === false && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: `${COLORS.danger}15`, color: COLORS.danger, border: `1px solid ${COLORS.danger}30` }}>
                          No Conforme
                        </span>
                      )}
                      {cert.conforms === null && (
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No eval.</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {cert.pdf_ready ? (
                        <button
                          onClick={() => handleDownload(cert.id, cert.certificate_number)}
                          disabled={downloadingId === cert.id}
                          className="inline-flex items-center justify-center rounded text-[11px] font-semibold transition-all h-7 px-3 gap-1.5 text-white disabled:opacity-60"
                          style={{ backgroundColor: COLORS.primary }}
                        >
                          {downloadingId === cert.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <Download size={12} />}
                          PDF
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          <AlertCircle size={11} /> Generando…
                        </span>
                      )}
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
