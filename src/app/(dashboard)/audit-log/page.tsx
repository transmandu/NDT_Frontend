'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Search } from 'lucide-react';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/audit-logs').then(r => { setLogs(r.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.user?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3 w-full animate-fadeIn">
      <div className="flex items-center input-theme rounded px-2 py-1 w-full sm:w-64 shadow-sm" style={{ border: '1px solid var(--border-color)' }}>
        <Search size={12} className="mr-1.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
        <input type="text" placeholder="Buscar en bitácora..." value={search} onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-[11px] w-full" style={{ color: 'var(--text-main)' }} />
      </div>

      <div className="panel rounded-md shadow-sm overflow-x-auto w-full">
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
              filtered.map((log, i) => (
                <tr key={i} className="td-theme hover-bg transition-colors">
                  <td className="px-4 py-2.5 font-mono text-[11px] whitespace-nowrap">{new Date(log.created_at).toLocaleString('es')}</td>
                  <td className="px-4 py-2.5 font-medium whitespace-nowrap">{log.user?.name || '—'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{log.action}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{log.auditable_type?.split('\\').pop()} #{log.auditable_id}</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell text-[10px] max-w-[200px] truncate" style={{ color: 'var(--text-muted)' }}>{JSON.stringify(log.metadata)?.slice(0, 80)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
