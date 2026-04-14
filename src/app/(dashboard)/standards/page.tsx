'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Loader2 } from 'lucide-react';
import type { Standard } from '@/types/calibration';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';

const COLORS = { success: '#10B981', warning: '#FFB812', danger: '#FF1E12' };

function getStatusInfo(expiryDate: string) {
  const exp = new Date(expiryDate);
  const now = new Date();
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return { label: 'Vencido',    color: COLORS.danger };
  if (diffDays < 90) return { label: 'Por Vencer', color: COLORS.warning };
  return { label: 'Vigente', color: COLORS.success };
}

const columns: ColumnDef<Standard>[] = [
  {
    accessorKey: 'internal_code',
    header: 'Código',
    enableColumnFilter: false,
    cell: ({ getValue }) => (
      <span className="font-mono font-bold text-[11px]" style={{ color: COLORS.success }}>{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Descripción',
    enableColumnFilter: false,
    cell: ({ getValue }) => (
      <span className="text-[11px] font-medium" style={{ color: 'var(--text-main)' }}>{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Categoría',
    enableColumnFilter: true, // auto-select for low cardinality
    cell: ({ getValue }) => (
      <span className="text-[10px] px-2 py-0.5 rounded capitalize font-medium"
        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: 'certificate_number',
    header: 'Certificado Ref.',
    enableColumnFilter: false,
    cell: ({ getValue }) => (
      <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{getValue<string>()}</span>
    ),
  },
  {
    id: 'uncertainty',
    header: 'Incertidumbre (U)',
    enableSorting: true,
    enableColumnFilter: false,
    accessorFn: row => Number(row.uncertainty_u),
    cell: ({ row }) => (
      <span className="font-mono text-[11px]" style={{ color: 'var(--text-main)' }}>
        {row.original.uncertainty_u} <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>(k={row.original.k_factor})</span>
      </span>
    ),
  },
  {
    accessorKey: 'expiry_date',
    header: 'Vencimiento',
    enableColumnFilter: false,
    cell: ({ getValue }) => (
      <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
        {new Date(getValue<string>()).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Estado',
    enableSorting: false,
    enableColumnFilter: true,
    accessorFn: row => {
      const d = Math.ceil((new Date(row.expiry_date).getTime() - Date.now()) / 86400000);
      return d < 0 ? 'Vencido' : d < 90 ? 'Por Vencer' : 'Vigente';
    },
    cell: ({ row }) => {
      const s = getStatusInfo(row.original.expiry_date);
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap"
          style={{ backgroundColor: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
          {s.label}
        </span>
      );
    },
  },
];

export default function StandardsPage() {
  const { data: standards = [], isLoading } = useQuery<Standard[]>({
    queryKey: ['standards'],
    queryFn: () => api.get('/standards').then(r => r.data.data || []),
  });

  return (
    <div className="space-y-3 w-full animate-fadeIn">
      {isLoading ? (
        <div className="panel rounded-md shadow-sm p-8 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: COLORS.success }} />
          Cargando patrones de referencia…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={standards}
          searchPlaceholder="Buscar por código, nombre o certificado…"
          toolbarRight={
            <button
              className="h-7 px-3 text-[11px] rounded font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-app)' }}
            >
              <Plus size={13} /> Agregar Patrón
            </button>
          }
        />
      )}
    </div>
  );
}
