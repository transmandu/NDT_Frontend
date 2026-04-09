'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Search, Plus, MoreHorizontal } from 'lucide-react';
import type { Standard } from '@/types/calibration';

const COLORS = { success: '#10B981', warning: '#FFB812', danger: '#FF1E12' };

export default function StandardsPage() {
  const [search, setSearch] = useState('');

  const { data: standards = [], isLoading: loading } = useQuery<Standard[]>({
    queryKey: ['standards'],
    queryFn: () => api.get('/standards').then(r => r.data.data || []),
  });

  const filtered = standards.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.internal_code.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusInfo = (expiryDate: string) => {
    const exp = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Vencido', color: COLORS.danger };
    if (diffDays < 90) return { label: 'Por Vencer', color: COLORS.warning };
    return { label: 'Vigente', color: COLORS.success };
  };

  return (
    <div className="space-y-3 w-full animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-1">
        <div id="tour-table-filter" className="flex items-center input-theme rounded px-2 py-1 w-full sm:w-64 shadow-sm" style={{ border: '1px solid var(--border-color)' }}>
          <Search size={12} className="mr-1.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Filtrar datos..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-[11px] w-full" style={{ color: 'var(--text-main)' }} />
        </div>
        <button className="h-7 px-2.5 text-[11px] rounded font-medium flex items-center justify-center gap-1.5 w-full sm:w-auto shadow-sm transition-transform active:scale-95"
          style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-app)' }}>
          <Plus size={12} /> Agregar
        </button>
      </div>

      <div id="tour-data-table" className="panel rounded-md shadow-sm overflow-x-auto w-full">
        <table className="w-full text-left text-xs min-w-[600px]">
          <thead>
            <tr>
              <th className="px-4 py-2 th-theme text-[11px]">Código</th>
              <th className="px-4 py-2 th-theme text-[11px]">Descripción</th>
              <th className="px-4 py-2 th-theme text-[11px] hidden sm:table-cell">Certificado Ref.</th>
              <th className="px-4 py-2 th-theme text-[11px]">Incertidumbre (U)</th>
              <th className="px-4 py-2 th-theme text-[11px]">Vencimiento</th>
              <th className="px-4 py-2 th-theme text-[11px]">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="td-theme"><td colSpan={6} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>No se encontraron patrones</td></tr>
            ) : (
              filtered.map(std => {
                const status = getStatusInfo(std.expiry_date);
                return (
                  <tr key={std.id} className="td-theme hover-bg transition-colors">
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap">{std.internal_code}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{std.name}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{std.certificate_number}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px]">{std.uncertainty_u} (k={std.k_factor})</td>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {new Date(std.expiry_date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ backgroundColor: `${status.color}15`, color: status.color, border: `1px solid ${status.color}30` }}>
                        {status.label}
                      </span>
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
