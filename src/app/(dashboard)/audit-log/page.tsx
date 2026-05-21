'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Search } from 'lucide-react';

interface AuditLogEntry {
  id?: number;
  created_at: string;
  event: string;
  auditable_type?: string;
  auditable_id?: number;
  user?: { id?: number; name?: string };
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
}

const EVENT_LABELS: Record<string, string> = {
  created:    'Creado',
  updated:    'Actualizado',
  deleted:    'Eliminado',
  submitted:  'Enviado a revisión',
  approved:   'Aprobado',
  rejected:   'Rechazado',
  login:      'Inicio de sesión',
  logout:     'Cierre de sesión',
  regenerated:'Certificado regenerado',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/audit-logs').then(r => { setLogs(r.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    (l.event || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.auditable_type || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3 w-full animate-fadeIn">
      <div id="tour-audit-filters" className="flex items-center input-theme rounded px-2 py-1 w-full sm:w-64 shadow-sm" style={{ border: '1px solid var(--border-color)' }}>
        <Search size={12} className="mr-1.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
        <input type="text" placeholder="Buscar en bitácora..." value={search} onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-[11px] w-full" style={{ color: 'var(--text-main)' }} />
      </div>

      <div id="tour-audit-table" className="panel rounded-md shadow-sm overflow-x-auto w-full">
        <table className="w-full text-left text-xs min-w-[600px]">
          <thead>
            <tr>
              <th className="px-4 py-2 th-theme text-[11px]">Fecha/Hora</th>
              <th className="px-4 py-2 th-theme text-[11px]">Usuario</th>
              <th className="px-4 py-2 th-theme text-[11px]">Acción</th>
              <th className="px-4 py-2 th-theme text-[11px]">Entidad</th>
              <th className="px-4 py-2 th-theme text-[11px] hidden sm:table-cell">Detalles</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="td-theme"><td colSpan={5} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>Sin registros</td></tr>
            ) : (
              filtered.map((log, i) => {
                const eventLabel = EVENT_LABELS[log.event] ?? log.event;
                const entity = log.auditable_type?.split('\\').pop();
                const details = log.new_values
                  ? Object.entries(log.new_values)
                      .filter(([k]) => !['password', 'remember_token'].includes(k))
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ')
                  : log.old_values
                  ? Object.keys(log.old_values).join(', ')
                  : '—';

                return (
                  <tr key={i} className="td-theme hover-bg transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[11px] whitespace-nowrap">{new Date(log.created_at).toLocaleString('es')}</td>
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap">{log.user?.name || '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{
                        backgroundColor: log.event === 'deleted' ? 'rgba(239,68,68,0.1)' :
                                         log.event === 'approved' ? 'rgba(34,197,94,0.1)' :
                                         log.event === 'rejected' ? 'rgba(239,68,68,0.1)' :
                                         log.event === 'created' ? 'rgba(59,130,246,0.1)' :
                                         'rgba(255,165,38,0.1)',
                        color: log.event === 'deleted' ? '#ef4444' :
                               log.event === 'approved' ? '#22c55e' :
                               log.event === 'rejected' ? '#ef4444' :
                               log.event === 'created' ? '#3b82f6' :
                               '#FFA526',
                      }}>
                        {eventLabel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {entity} {log.auditable_id ? `#${log.auditable_id}` : ''}
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-[10px] max-w-[220px] truncate" style={{ color: 'var(--text-muted)' }} title={details}>
                      {details}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
