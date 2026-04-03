'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { ClipboardList, Download } from 'lucide-react';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/audit-logs').then(r => { setLogs(r.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClipboardList size={24} color="#ef4444" /> Registro de Auditoría
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>Trazabilidad completa ISO/IEC 17025</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Evento</th>
              <th>Entidad</th>
              <th>ID</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6}><div className="skeleton" style={{ height: 20, width: '100%' }} /></td></tr>
              ))
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No hay registros de auditoría</td></tr>
            ) : (
              logs.map((log: any) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(log.created_at).toLocaleString('es')}</td>
                  <td>{log.user?.name || '—'}</td>
                  <td><span className={`badge ${log.event === 'created' ? 'badge-approved' : log.event === 'updated' ? 'badge-pending' : 'badge-rejected'}`}>{log.event}</span></td>
                  <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{log.auditable_type?.split('\\').pop()}</td>
                  <td>#{log.auditable_id}</td>
                  <td style={{ color: '#64748b', fontSize: '0.75rem' }}>{log.ip_address}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
