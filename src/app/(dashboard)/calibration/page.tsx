'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { FlaskConical, Plus, Search, Filter } from 'lucide-react';
import type { CalibrationSession } from '@/types/calibration';
import { useAuthStore } from '@/stores/authStore';

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  pending_review: 'En Revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export default function CalibrationPage() {
  const [sessions, setSessions] = useState<CalibrationSession[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    api.get(`/calibration/sessions${params}`).then(r => {
      setSessions(r.data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FlaskConical size={24} color="#f59e0b" /> Sesiones de Calibración
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>Gestión del ciclo de vida de calibraciones</p>
        </div>
        {(user?.role === 'technician' || user?.role === 'supervisor') && (
          <Link href="/calibration/new">
            <button className="btn btn-primary"><Plus size={16} /> Nueva Sesión</button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['', 'draft', 'pending_review', 'approved', 'rejected'].map(s => (
          <button key={s} className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setStatusFilter(s)} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
            {s === '' ? 'Todas' : statusLabels[s]}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Instrumento</th>
              <th>Procedimiento</th>
              <th>Técnico</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="skeleton" style={{ height: 20, width: '100%' }} /></td></tr>
              ))
            ) : sessions.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No hay sesiones de calibración</td></tr>
            ) : (
              sessions.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>#{s.id}</td>
                  <td>{s.instrument?.name || `Inst #${s.instrument_id}`}</td>
                  <td style={{ color: '#94a3b8' }}>{s.procedure_schema?.code || '—'}</td>
                  <td>{s.technician?.name || '—'}</td>
                  <td><span className={`badge badge-${s.status === 'pending_review' ? 'pending' : s.status}`}>{statusLabels[s.status]}</span></td>
                  <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(s.created_at).toLocaleDateString('es')}</td>
                  <td>
                    <Link href={`/calibration/${s.id}`}>
                      <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>Ver</button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
