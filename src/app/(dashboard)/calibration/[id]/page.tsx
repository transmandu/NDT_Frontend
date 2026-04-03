'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { FlaskConical, CheckCircle, XCircle, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { label: string; badge: string; color: string }> = {
  draft: { label: 'Borrador', badge: 'badge-draft', color: '#94a3b8' },
  pending_review: { label: 'En Revisión', badge: 'badge-pending', color: '#fbbf24' },
  approved: { label: 'Aprobada', badge: 'badge-approved', color: '#34d399' },
  rejected: { label: 'Rechazada', badge: 'badge-rejected', color: '#f87171' },
};

export default function CalibrationDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const loadSession = () => {
    api.get(`/calibration/sessions/${id}`).then(r => { setSession(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadSession(); }, [id]);

  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.post(`/calibration/sessions/${id}/submit`, { raw_payload: session.raw_payload || {} });
      toast.success('Sesión enviada a revisión');
      loadSession();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setActionLoading(false); }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.post(`/calibration/sessions/${id}/approve`);
      toast.success('Sesión aprobada');
      loadSession();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Ingrese un motivo'); return; }
    setActionLoading(true);
    try {
      await api.post(`/calibration/sessions/${id}/reject`, { reason: rejectReason });
      toast.success('Sesión rechazada');
      loadSession();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div style={{ padding: 40 }}><div className="skeleton" style={{ height: 400, width: '100%' }} /></div>;
  if (!session) return <div style={{ padding: 40, color: '#64748b' }}>Sesión no encontrada</div>;

  const sc = statusConfig[session.status] || statusConfig.draft;

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FlaskConical size={24} color={sc.color} /> Sesión #{session.id}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>
            {session.procedure_schema?.name || 'Procedimiento'} — {new Date(session.created_at).toLocaleDateString('es')}
          </p>
        </div>
        <span className={`badge ${sc.badge}`} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>{sc.label}</span>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 28 }}>
        <div className="card">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: 12 }}>INSTRUMENTO</h3>
          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{session.instrument?.name || '—'}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{session.instrument?.internal_code} — {session.instrument?.brand} {session.instrument?.model}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>Serial: {session.instrument?.serial_number}</div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: 12 }}>CONDICIONES AMBIENTALES</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>Temperatura</div><div style={{ fontWeight: 600 }}>{session.ambient_temperature} °C</div></div>
            <div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>Humedad</div><div style={{ fontWeight: 600 }}>{session.ambient_humidity} %</div></div>
            <div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>Presión</div><div style={{ fontWeight: 600 }}>{session.ambient_pressure || '—'} hPa</div></div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: 12 }}>PERSONAL</h3>
          <div><span style={{ fontSize: '0.75rem', color: '#64748b' }}>Técnico: </span><span style={{ fontWeight: 500 }}>{session.technician?.name || '—'}</span></div>
          {session.auditor && <div style={{ marginTop: 6 }}><span style={{ fontSize: '0.75rem', color: '#64748b' }}>Auditor: </span><span style={{ fontWeight: 500 }}>{session.auditor?.name}</span></div>}
          {session.approved_at && <div style={{ marginTop: 6 }}><span style={{ fontSize: '0.75rem', color: '#64748b' }}>Aprobada: </span><span style={{ fontWeight: 500 }}>{new Date(session.approved_at).toLocaleString('es')}</span></div>}
        </div>
      </div>

      {/* Standards */}
      {session.standards?.length > 0 && (
        <div className="card" style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: 12 }}>PATRONES UTILIZADOS</h3>
          <table className="data-table">
            <thead><tr><th>Código</th><th>Nombre</th><th>Certificado</th><th className="numeric">U</th><th className="numeric">k</th></tr></thead>
            <tbody>
              {session.standards.map((s: any) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, color: '#34d399' }}>{s.internal_code}</td>
                  <td>{s.name}</td>
                  <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{s.certificate_number}</td>
                  <td className="numeric" style={{ color: '#fbbf24' }}>{s.uncertainty_u}</td>
                  <td className="numeric">{s.k_factor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Final Results */}
      {session.final_results?.length > 0 && (
        <div className="card" style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: 12 }}>RESULTADOS DE INCERTIDUMBRE</h3>
          <table className="data-table">
            <thead><tr><th className="numeric">Nominal</th><th className="numeric">Promedio</th><th className="numeric">Error</th><th className="numeric">u_c</th><th className="numeric">k</th><th className="numeric">U (expandida)</th></tr></thead>
            <tbody>
              {session.final_results.map((r: any, i: number) => (
                <tr key={i}>
                  <td className="numeric">{r.nominal_value}</td>
                  <td className="numeric">{r.average_measured}</td>
                  <td className="numeric" style={{ color: '#f87171' }}>{r.error}</td>
                  <td className="numeric">{r.combined_uncertainty}</td>
                  <td className="numeric">{r.k_factor}</td>
                  <td className="numeric" style={{ color: '#fbbf24', fontWeight: 700, fontSize: '1rem' }}>±{r.expanded_uncertainty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div className="card">
        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: 16 }}>ACCIONES</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {session.status === 'draft' && (user?.role === 'technician' || user?.role === 'supervisor') && (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={actionLoading}>
              {actionLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />} Enviar a Revisión
            </button>
          )}

          {session.status === 'pending_review' && user?.role === 'auditor' && (
            <>
              <button className="btn btn-success" onClick={handleApprove} disabled={actionLoading}>
                <CheckCircle size={16} /> Aprobar
              </button>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="input" placeholder="Motivo de rechazo..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ width: 300 }} />
                <button className="btn btn-danger" onClick={handleReject} disabled={actionLoading}>
                  <XCircle size={16} /> Rechazar
                </button>
              </div>
            </>
          )}

          {session.status === 'approved' && session.certificate_code && (
            <div style={{ padding: '12px 20px', background: 'rgba(16,185,129,0.1)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)' }}>
              <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Certificado: {session.certificate_code}</span>
            </div>
          )}

          {session.status === 'approved' && !session.certificate_code && (
            <div style={{ padding: '12px 20px', background: 'rgba(16,185,129,0.1)', borderRadius: 12 }}>
              <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Sesión aprobada</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
