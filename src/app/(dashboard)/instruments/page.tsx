'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Search, Plus, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import type { Instrument } from '@/types/calibration';

const COLORS = { success: '#10B981', primary: '#FFA526' };

export default function InstrumentsPage() {
  const [search, setSearch] = useState('');

  const { data: instruments = [], isLoading: loading } = useQuery<Instrument[]>({
    queryKey: ['instruments'],
    queryFn: () => api.get('/instruments').then(r => r.data.data || []),
  });

  const filtered = instruments.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) || i.internal_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3 w-full animate-fadeIn">
      {/* Toolbar */}
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

      {/* Table */}
      <div id="tour-data-table" className="panel rounded-md shadow-sm overflow-x-auto w-full">
        <table className="w-full text-left text-xs min-w-[600px]">
          <thead>
            <tr>
              <th className="px-4 py-2 th-theme text-[11px]">ID Interno</th>
              <th className="px-4 py-2 th-theme text-[11px]">Nombre / Marca</th>
              <th className="px-4 py-2 th-theme text-[11px] hidden sm:table-cell">Rango</th>
              <th className="px-4 py-2 th-theme text-[11px]">Resolución</th>
              <th className="px-4 py-2 th-theme text-[11px]">Estado</th>
              <th className="px-4 py-2 th-theme text-right"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="td-theme"><td colSpan={6} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-hover)' }} /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>No se encontraron instrumentos</td></tr>
            ) : (
              filtered.map(inst => (
                <InstrumentRow key={inst.id} inst={inst} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InstrumentRow({ inst }: { inst: Instrument }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <tr className="td-theme hover-bg transition-colors">
      <td className="px-4 py-2.5 font-medium whitespace-nowrap">{inst.internal_code}</td>
      <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{inst.name} / {inst.brand}</td>
      <td className="px-4 py-2.5 hidden sm:table-cell whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
        {inst.range_min ?? 0} - {inst.range_max ?? '—'} {inst.unit}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap">{inst.resolution} {inst.unit}</td>
      <td className="px-4 py-2.5">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap"
          style={{
            backgroundColor: `${inst.status === 'active' ? COLORS.success : COLORS.primary}15`,
            color: inst.status === 'active' ? COLORS.success : COLORS.primary,
            border: `1px solid ${inst.status === 'active' ? COLORS.success : COLORS.primary}30`,
          }}>
          {inst.status === 'active' ? 'Operativo' : 'En Calibración'}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right relative">
        <div className="inline-block text-left" ref={menuRef}>
          <button onClick={() => setIsOpen(!isOpen)} style={{ color: 'var(--text-muted)' }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <MoreHorizontal size={14} />
          </button>
          
          {/* IMPORTANTE: Usamos Framer motion u HTML condicional. Para simplificar sin AnimatePresence (ya que react no está importado globalmente a veces, pero podemos usar condicional simple) */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1E232B] border border-gray-200 dark:border-gray-700 shadow-xl rounded-md z-[60] flex flex-col py-1" style={{ right: '1rem' }}>
              <p className="px-3 py-1.5 text-[9px] uppercase font-semibold border-b border-gray-100 dark:border-gray-800 text-left" style={{ color: 'var(--text-muted)' }}>Mantenimiento</p>
              <Link href={`/calibration/new?instrument_id=${inst.id}`} onClick={() => setIsOpen(false)} className="px-3 py-2 text-xs text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium block" style={{ color: COLORS.primary }}>
                🎛️ Calibrar Equipo
              </Link>
              <button className="px-3 py-2 text-xs text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" style={{ color: 'var(--text-main)' }}>
                Ver Ficha Técnica
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
