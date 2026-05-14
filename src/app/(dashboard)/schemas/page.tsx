'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, MoreHorizontal, PowerOff, AlertTriangle,
  CheckCircle2, XCircle, BookOpen, Cpu, Power,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { isAxiosError } from 'axios';
import type { ProcedureSchema } from '@/types/calibration';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import SchemaModal from '@/components/schemas/SchemaModal';

/* ─── Constants ────────────────────────────────────────────── */
import { C } from '@/lib/colors';
const ACCENT = C.accent;
const DANGER  = C.danger;
const SUCCESS  = C.success;
const WARNING  = C.warning;

const CATEGORY_COLORS: Record<string, string> = {
  dimensional: '#6366F1',
  mass:        '#10B981',
  torque:      '#F59E0B',
  pressure:    '#EF4444',
  electrical:  '#8B5CF6',
  temperature: '#06B6D4',
  other:       '#6B7280',
};

function ActionsCell({
  schema,
  onDeactivate,
  onActivate,
}: { schema: ProcedureSchema; onDeactivate: () => void; onActivate: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded hover-bg transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <MoreHorizontal size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-1 w-44 rounded-md shadow-xl z-[60] overflow-hidden flex flex-col py-1"
            style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)' }}
          >
            {schema.is_active ? (
              <button
                onClick={() => { setOpen(false); onDeactivate(); }}
                className="px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left font-medium"
                style={{ color: DANGER }}>
                <PowerOff size={13} /> Desactivar
              </button>
            ) : (
              <button
                onClick={() => { setOpen(false); onActivate(); }}
                className="px-3 py-2 text-xs flex items-center gap-2 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors w-full text-left font-medium"
                style={{ color: SUCCESS }}>
                <Power size={13} /> Activar
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Column builder ───────────────────────────────────────── */
function buildColumns(
  supportedCodes: string[],
  onDeactivate: (s: ProcedureSchema) => void,
  onActivate: (s: ProcedureSchema) => void,
): ColumnDef<ProcedureSchema>[] {
  return [
    {
      accessorKey: 'code',
      header: 'Código',
      enableColumnFilter: false,
      cell: ({ row }) => {
        const color = CATEGORY_COLORS[row.original.category] ?? '#6B7280';
        return (
          <div>
            <span className="font-mono font-bold text-[11px]" style={{ color }}>{row.original.code}</span>
            <p className="text-[9px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>v{row.original.version}</p>
          </div>
        );
      },
    },
    {
      id: 'name_desc',
      header: 'Procedimiento',
      accessorFn: row => `${row.name} ${row.description ?? ''}`,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <div>
          <p className="text-[11px] font-medium" style={{ color: 'var(--text-main)' }}>{row.original.name}</p>
          {row.original.description && (
            <p className="text-[10px] truncate max-w-[260px]" style={{ color: 'var(--text-muted)' }}>{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Categoría',
      enableColumnFilter: true,
      cell: ({ getValue }) => {
        const cat = getValue<string>();
        const color = CATEGORY_COLORS[cat] ?? '#6B7280';
        return (
          <span className="text-[10px] px-2 py-0.5 rounded capitalize font-medium"
            style={{ backgroundColor: `${color}18`, color }}>
            {cat}
          </span>
        );
      },
    },
    {
      id: 'strategy',
      header: 'Motor',
      enableSorting: false,
      enableColumnFilter: true,
      accessorFn: row => supportedCodes.includes(row.code) ? 'Implementado' : 'Sin estrategia',
      cell: ({ row }) => {
        const has = supportedCodes.includes(row.original.code);
        return (
          <div className="flex items-center gap-1.5">
            <Cpu size={12} style={{ color: has ? SUCCESS : WARNING }} />
            <span className="text-[10px] font-medium" style={{ color: has ? SUCCESS : WARNING }}>
              {has ? 'Implementado' : 'Sin estrategia'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'sessions',
      header: 'Sesiones',
      enableSorting: true,
      enableColumnFilter: false,
      accessorFn: row => row.calibration_sessions_count ?? 0,
      cell: ({ getValue }) => (
        <span className="font-mono text-[11px] font-semibold" style={{ color: 'var(--text-main)' }}>
          {getValue<number>()}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Estado',
      enableColumnFilter: true,
      accessorFn: row => row.is_active ? 'Activo' : 'Inactivo',
      cell: ({ row }) => {
        const active = row.original.is_active;
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap"
            style={{
              backgroundColor: active ? `${SUCCESS}15` : `${DANGER}15`,
              color: active ? SUCCESS : DANGER,
              border: `1px solid ${active ? SUCCESS : DANGER}30`,
            }}>
            {active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
            {active ? 'Activo' : 'Inactivo'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      enableColumnFilter: false,
      size: 48,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ActionsCell
            schema={row.original}
            onDeactivate={() => onDeactivate(row.original)}
            onActivate={() => onActivate(row.original)}
          />
        </div>
      ),
    },
  ];
}

/* ─── Deactivate Confirm dialog ────────────────────────────── */
function DeactivateConfirm({
  schema,
  onCancel,
  onConfirm,
  loading,
}: { schema: ProcedureSchema; onCancel: () => void; onConfirm: () => void; loading: boolean }) {
  const content = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="w-full max-w-sm rounded-xl p-6 shadow-2xl text-center"
        style={{ backgroundColor: 'var(--bg-panel)', border: `2px solid ${DANGER}20` }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${DANGER}15` }}>
          <AlertTriangle size={24} style={{ color: DANGER }} />
        </div>
        <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-main)' }}>
          ¿Desactivar esquema?
        </h3>
        <p className="text-[10px] font-mono font-bold mb-3" style={{ color: ACCENT }}>{schema.code}</p>
        <p className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>
          El esquema se marcará como <strong>inactivo</strong>. No podrá usarse en nuevas calibraciones.
        </p>
        <p className="text-[10px] mb-6" style={{ color: 'var(--text-muted)' }}>
          Las <strong>{schema.calibration_sessions_count ?? 0}</strong> sesiones históricas asociadas permanecerán intactas.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel}
            className="h-8 px-5 rounded text-[11px] font-medium hover-bg transition-colors"
            style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="h-8 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: DANGER }}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <PowerOff size={12} />}
            Desactivar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(content, document.body);
}

/* ══════════════════════════════════════════════════════════ */
/*  PAGE                                                      */
/* ══════════════════════════════════════════════════════════ */
export default function SchemasPage() {
  const [deactivateTarget, setDeactivateTarget] = useState<ProcedureSchema | null>(null);
  const qc = useQueryClient();

  /* ─── Query: all schemas (admin view) ── */
  const { data, isLoading } = useQuery<{ schemas: ProcedureSchema[]; supported_codes: string[] }>({
    queryKey: ['schemas'],
    queryFn: () => api.get('/calibration/schemas/all').then(r => r.data),
  });

  const schemas       = data?.schemas ?? [];
  const supportedCodes = data?.supported_codes ?? [];

  /* ─── Stats ── */
  const stats = useMemo(() => ({
    total:    schemas.length,
    active:   schemas.filter(s => s.is_active).length,
    withEngine: schemas.filter(s => supportedCodes.includes(s.code)).length,
    sessions: schemas.reduce((acc, s) => acc + (s.calibration_sessions_count ?? 0), 0),
  }), [schemas, supportedCodes]);

  /* ─── Deactivate mutation ── */
  const deactivateMut = useMutation({
    mutationFn: (id: number) => api.delete(`/calibration/schemas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schemas'] });
      toast.success('Esquema desactivado correctamente.');
      setDeactivateTarget(null);
    },
    onError: (err: unknown) => {
      const msg = isAxiosError(err) ? (err.response?.data?.message ?? 'Error al desactivar el esquema.') : 'Error al desactivar el esquema.';
      toast.error(msg);
      setDeactivateTarget(null);
    },
  });

  /* ─── Activate mutation ── */
  const activateMut = useMutation({
    mutationFn: (id: number) => api.put(`/calibration/schemas/${id}`, { is_active: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schemas'] });
      toast.success('Esquema activado correctamente.');
    },
    onError: (err: unknown) => {
      const msg = isAxiosError(err) ? (err.response?.data?.message ?? 'Error al activar el esquema.') : 'Error al activar el esquema.';
      toast.error(msg);
    },
  });

  /* ─── Columns ── */
  const columns = useMemo(() => buildColumns(
    supportedCodes,
    s => setDeactivateTarget(s),
    s => activateMut.mutate(s.id),
  ), [supportedCodes]);

  return (
    <div className="space-y-4 w-full animate-fadeIn">

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Esquemas',     value: stats.total,      color: ACCENT,   icon: BookOpen },
          { label: 'Activos',            value: stats.active,     color: SUCCESS,  icon: CheckCircle2 },
          { label: 'Con Motor Matemático', value: stats.withEngine, color: C.accent, icon: Cpu },
          { label: 'Sesiones Totales',   value: stats.sessions,   color: WARNING,  icon: BookOpen },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="panel rounded-lg p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}18` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <p className="text-lg font-bold leading-none" style={{ color }}>{value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <div className="panel rounded-md shadow-sm p-8 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: ACCENT }} />
          Cargando esquemas de procedimiento…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={schemas}
          searchPlaceholder="Buscar por código, nombre o categoría…"
        />
      )}

      <AnimatePresence>
        {deactivateTarget && (
          <DeactivateConfirm
            schema={deactivateTarget}
            onCancel={() => setDeactivateTarget(null)}
            onConfirm={() => deactivateMut.mutate(deactivateTarget.id)}
            loading={deactivateMut.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
