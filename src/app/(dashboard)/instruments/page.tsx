'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import {
  Plus, MoreHorizontal, X, Loader2,
  Wrench, Trash2, Pencil, AlertTriangle, ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import type { Instrument, Standard } from '@/types/calibration';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';

/* ─── Constants ──────────────────────────────────────────── */
const COLORS = { success: '#10B981', primary: '#FFA526', danger: '#EF4444' };

const INSTRUMENT_TYPES = [
  { code: 'DIM-001', label: 'Pie de Rey / Vernier', prefix: 'VER', icon: '📐', category: 'dimensional', unit: 'mm', unitOptions: ['mm', 'cm', 'in'], color: '#6366F1', description: 'Calibración dimensional por comparación con bloques patrón', extras: [{ key: 'functions_exterior', label: 'Bocas Exteriores', type: 'checkbox', hint: 'Habilitar medición exterior' }, { key: 'functions_interior', label: 'Bocas Interiores', type: 'checkbox', hint: 'Habilitar medición interior' }, { key: 'functions_depth', label: 'Sonda de Profundidad', type: 'checkbox', hint: 'Habilitar sonda depth' }] },
  { code: 'ME-005', label: 'Balanza Analítica', prefix: 'BAL', icon: '⚖️', category: 'mass', unit: 'g', unitOptions: ['g', 'kg', 'mg'], color: '#10B981', description: 'Calibración gravimétrica con pesas patrón clase OIML', extras: [{ key: 'num_points', label: 'Puntos de calibración', type: 'number', hint: 'Cantidad de puntos (ej: 5)', placeholder: '5', min: 3, max: 10 }] },
  { code: 'ISO-6789', label: 'Llave Dinamométrica', prefix: 'TOR', icon: '🔧', category: 'torque', unit: 'N·m', unitOptions: ['N·m', 'kN·m', 'lbf·ft', 'lbf·in'], color: '#F59E0B', description: 'Calibración según ISO 6789-1:2017 y ISO 6789-2:2017', extras: [{ key: 'torque_type', label: 'Tipo de torquímetro', type: 'select', options: ['Click (disparador)', 'Dial (analógico)', 'Beam (viga)', 'Digital (electrónico)'], hint: 'Clasificación constructiva del instrumento' }] },
  { code: 'ME-003', label: 'Manómetro de Presión', prefix: 'MAN', icon: '🌡️', category: 'pressure', unit: 'bar', unitOptions: ['bar', 'psi', 'kPa', 'MPa', 'Pa'], color: '#EF4444', description: 'Calibración por comparación con transductor de presión patrón', extras: [{ key: 'gauge_type', label: 'Tipo de manómetro', type: 'select', options: ['Analógico (bourdon)', 'Digital', 'Diferencial', 'Absoluto'], hint: 'Principio de operación' }] },
  { code: 'EL-001', label: 'Multímetro / Voltímetro', prefix: 'ELM', icon: '🔌', category: 'electrical', unit: 'V', unitOptions: ['V', 'mV', 'A', 'mA', 'Ω', 'kΩ', 'MΩ'], color: '#8B5CF6', description: 'Calibración eléctrica con calibrador de procesos patrón', extras: [{ key: 'measurement_function', label: 'Función de medición principal', type: 'select', options: ['Tensión DC (VDC)', 'Tensión AC (VAC)', 'Corriente DC (ADC)', 'Corriente AC (AAC)', 'Resistencia (Ω)'], hint: 'Variable eléctrica que se calibrará' }] },
  { code: 'M-LAB-01', label: 'Termohigrómetro', prefix: 'THG', icon: '💧', category: 'temperature', unit: '°C', unitOptions: ['°C', '°F', 'K', '%HR'], color: '#06B6D4', description: 'Calibración de temperatura y humedad relativa en cámara controlada', extras: [{ key: 'sensor_type', label: 'Tipo de sensor', type: 'select', options: ['Termopar tipo K', 'RTD PT100', 'Termistor NTC', 'Capacitivo (humedad)', 'Combinado T+HR'], hint: 'Principio de medición del sensor' }, { key: 'measures_humidity', label: 'Mide Humedad Relativa', type: 'checkbox', hint: 'Activar si el equipo también mide %HR' }] },
] as const;

/* ─── Zod Schema ─────────────────────────────────────────── */
const instrumentSchema = z.object({
  internal_code: z.string().min(1, 'Código requerido'),
  name: z.string().min(1, 'Nombre requerido'),
  brand: z.string().min(1, 'Marca requerida'),
  model: z.string().min(1, 'Modelo requerido'),
  serial_number: z.string().min(1, 'Serie requerido'),
  category: z.string().min(1),
  unit: z.string().min(1, 'Unidad requerida'),
  resolution: z.coerce.number().positive('Debe ser > 0'),
  range_min: z.coerce.number().nullable().optional(),
  range_max: z.coerce.number().nullable().optional(),
  location: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive', 'in_calibration']),
  factory_standard_id: z.coerce.number().nullable().optional(),
  extras_json: z.string().optional(),
});
type InstrumentForm = z.infer<typeof instrumentSchema>;

/* ─── Column Actions Cell ────────────────────────────────── */
function ActionsCell({ inst, onEdit, onDelete }: { inst: Instrument; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="p-1.5 rounded hover-bg transition-colors" style={{ color: 'var(--text-muted)' }}>
        <MoreHorizontal size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.95 }} transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-1 w-48 rounded-md shadow-xl z-[60] overflow-hidden flex flex-col py-1"
            style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)' }}>
            <p className="px-3 py-1.5 text-[9px] uppercase font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>Acciones</p>
            <Link href={`/calibration/new?instrument_id=${inst.id}`} onClick={() => setOpen(false)}
              className="px-3 py-2 text-xs flex items-center gap-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors font-medium"
              style={{ color: COLORS.primary }}>
              <Wrench size={13} /> Calibrar Equipo
            </Link>
            <button onClick={() => { setOpen(false); onEdit(); }}
              className="px-3 py-2 text-xs flex items-center gap-2 hover-bg transition-colors w-full text-left"
              style={{ color: 'var(--text-main)' }}>
              <Pencil size={13} /> Editar Ficha
            </button>
            <button onClick={() => { setOpen(false); onDelete(); }}
              className="px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left font-medium"
              style={{ color: COLORS.danger, borderTop: '1px solid var(--border-color)' }}>
              <Trash2 size={13} /> Eliminar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Column Definitions ─────────────────────────────────── */
function buildColumns(
  onEdit: (i: Instrument) => void,
  onDelete: (i: Instrument) => void,
): ColumnDef<Instrument>[] {
  const statusMap: Record<string, { label: string; color: string }> = {
    active:         { label: 'Operativo',      color: COLORS.success },
    inactive:       { label: 'Inactivo',        color: '#6B7280' },
    in_calibration: { label: 'En Calibración', color: COLORS.primary },
  };

  return [
    {
      accessorKey: 'internal_code',
      header: 'Código',
      enableColumnFilter: false,
      cell: ({ getValue }) => (
        <span className="font-mono font-bold text-[11px]" style={{ color: COLORS.primary }}>{getValue<string>()}</span>
      ),
    },
    {
      id: 'name_brand',
      header: 'Nombre / Marca / Modelo',
      accessorFn: row => `${row.name} ${row.brand} ${row.model}`,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-[11px]" style={{ color: 'var(--text-main)' }}>{row.original.name}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{row.original.brand} · {row.original.model}</p>
        </div>
      ),
    },
    {
      accessorKey: 'serial_number',
      header: 'S/N',
      enableColumnFilter: false,
      cell: ({ getValue }) => <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{getValue<string>()}</span>,
    },
    {
      accessorKey: 'category',
      header: 'Categoría',
      enableColumnFilter: true, // will auto-render as select (low cardinality)
      cell: ({ getValue }) => (
        <span className="text-[10px] px-2 py-0.5 rounded capitalize font-medium"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
          {getValue<string>()}
        </span>
      ),
    },
    {
      id: 'range',
      header: 'Rango & Res.',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const i = row.original;
        return (
          <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {i.range_min ?? 0} – {i.range_max ?? '∞'} {i.unit}<br />
            <span className="text-[9px]">Res: {i.resolution} {i.unit}</span>
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      enableColumnFilter: true, // select filter
      cell: ({ getValue }) => {
        const sc = statusMap[getValue<string>()] ?? statusMap.inactive;
        return (
          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
            style={{ backgroundColor: `${sc.color}15`, color: sc.color, border: `1px solid ${sc.color}30` }}>
            {sc.label}
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
            inst={row.original}
            onEdit={() => onEdit(row.original)}
            onDelete={() => onDelete(row.original)}
          />
        </div>
      ),
    },
  ];
}

/* ══════════════════════════════════════════════════════════ */
/*  PAGE                                                      */
/* ══════════════════════════════════════════════════════════ */
export default function InstrumentsPage() {
  const [modalOpen, setModalOpen]       = useState(false);
  const [editTarget, setEditTarget]     = useState<Instrument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Instrument | null>(null);
  const qc = useQueryClient();

  const { data: instruments = [], isLoading } = useQuery<Instrument[]>({
    queryKey: ['instruments'],
    queryFn: () => api.get('/instruments').then(r => r.data.data || []),
  });

  const { data: standards = [] } = useQuery<Standard[]>({
    queryKey: ['standards'],
    queryFn: () => api.get('/standards').then(r => r.data.data || []),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/instruments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['instruments'] }); toast.success('Instrumento eliminado'); setDeleteTarget(null); },
    onError: () => toast.error('Error al eliminar el instrumento'),
  });

  const columns = useMemo(
    () => buildColumns(inst => { setEditTarget(inst); setModalOpen(true); }, inst => setDeleteTarget(inst)),
    []
  );

  return (
    <div className="space-y-3 w-full animate-fadeIn">
      {isLoading ? (
        <div className="panel rounded-md shadow-sm p-8 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: COLORS.primary }} />
          Cargando instrumentos…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={instruments}
          searchPlaceholder="Buscar por código, nombre o marca…"
          toolbarRight={
            <button
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              className="h-7 px-3 text-[11px] rounded font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: COLORS.primary, color: '#fff' }}
            >
              <Plus size={13} /> Nuevo Instrumento
            </button>
          }
        />
      )}

      <AnimatePresence>
        {modalOpen && (
          <InstrumentModal instrument={editTarget} standards={standards} instruments={instruments} onClose={() => setModalOpen(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm name={deleteTarget.name} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteMut.mutate(deleteTarget.id)} loading={deleteMut.isPending} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  INSTRUMENT MODAL (unchanged logic, kept intact)          */
/* ══════════════════════════════════════════════════════════ */
function InstrumentModal({ instrument, standards, instruments, onClose }: {
  instrument: Instrument | null; standards: Standard[]; instruments: Instrument[]; onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!instrument;
  const editType = isEdit ? INSTRUMENT_TYPES.find(t => t.category === instrument.category) ?? null : null;
  const [selectedType, setSelectedType] = useState<typeof INSTRUMENT_TYPES[number] | null>(editType);

  const autoCode = useMemo(() => {
    if (!selectedType) return '';
    const prefix = selectedType.prefix;
    const existing = instruments.filter(i => i.internal_code.startsWith(prefix + '-'));
    const maxNum = existing.reduce((acc, i) => { const num = parseInt(i.internal_code.replace(prefix + '-', ''), 10); return isNaN(num) ? acc : Math.max(acc, num); }, 0);
    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
  }, [selectedType, instruments]);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<InstrumentForm>({
    resolver: zodResolver(instrumentSchema) as Resolver<InstrumentForm>,
    defaultValues: instrument ? {
      internal_code: instrument.internal_code, name: instrument.name, brand: instrument.brand,
      model: instrument.model, serial_number: instrument.serial_number, category: instrument.category,
      unit: instrument.unit, resolution: instrument.resolution, range_min: instrument.range_min ?? undefined,
      range_max: instrument.range_max ?? undefined, location: instrument.location ?? '', status: (instrument.status as any) ?? 'active',
    } : { status: 'active' },
  });

  useEffect(() => { if (selectedType && !isEdit) { setValue('internal_code', autoCode); setValue('category', selectedType.category); setValue('unit', selectedType.unit); } }, [selectedType, autoCode, isEdit, setValue]);

  const selectedUnit = watch('unit');
  const matchingStandards = selectedType ? standards.filter(s => s.category?.toLowerCase() === selectedType.category.toLowerCase()) : [];

  const onSubmit = async (data: InstrumentForm) => {
    try {
      if (isEdit) { await api.put(`/instruments/${instrument.id}`, data); toast.success('Instrumento actualizado'); }
      else { await api.post('/instruments', data); toast.success('Instrumento creado correctamente'); }
      qc.invalidateQueries({ queryKey: ['instruments'] });
      onClose();
    } catch (err: any) {
      const first = err.response?.data?.errors ? (Object.values(err.response.data.errors)[0] as string[])[0] : err.response?.data?.message || 'Error al guardar';
      toast.error(first);
    }
  };

  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); }, [onClose]);

  const modal = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.18 }}
        className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', maxHeight: '94vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            {selectedType && !isEdit && <button onClick={() => setSelectedType(null)} className="p-1 rounded hover-bg transition-colors" style={{ color: 'var(--text-muted)' }}><ChevronLeft size={16} /></button>}
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                {isEdit ? `✏️ Editar — ${instrument.internal_code}` : selectedType ? `${selectedType.icon} Nuevo ${selectedType.label}` : '➕ Nuevo Instrumento'}
              </h2>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {isEdit ? 'Modificar ficha técnica del equipo' : selectedType ? selectedType.description : 'Selecciona el tipo de equipo a registrar'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover-bg transition-colors" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {!selectedType && !isEdit ? (
            <div className="p-6">
              <p className="text-[11px] mb-4 font-medium" style={{ color: 'var(--text-muted)' }}>Selecciona el tipo de equipo. Solo se muestran los procedimientos implementados:</p>
              <div className="grid grid-cols-2 gap-3">
                {INSTRUMENT_TYPES.map(type => (
                  <motion.button key={type.code} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedType(type)}
                    className="flex flex-col items-start gap-2 p-4 rounded-lg text-left transition-all"
                    style={{ border: `2px solid ${type.color}30`, backgroundColor: `${type.color}08` }}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-2xl">{type.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold truncate" style={{ color: 'var(--text-main)' }}>{type.label}</p>
                        <p className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded inline-block mt-0.5" style={{ backgroundColor: `${type.color}20`, color: type.color }}>{type.code}</p>
                      </div>
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{type.description}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="px-6 py-5 space-y-5">
                <Section title="Identificación del Equipo">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Código Interno" error={errors.internal_code?.message}>
                      <div className="relative">
                        <input {...register('internal_code')} readOnly={!isEdit} className={`field-input font-mono ${!isEdit ? 'opacity-70 cursor-default' : ''}`} style={!isEdit ? { backgroundColor: 'var(--bg-hover)' } : undefined} />
                        {!isEdit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#10B98120', color: '#10B981' }}>AUTO</span>}
                      </div>
                    </Field>
                    <Field label="Estado operativo" error={errors.status?.message}>
                      <select {...register('status')} className="field-input">
                        <option value="active">Operativo</option>
                        <option value="inactive">Inactivo</option>
                        <option value="in_calibration">En Calibración</option>
                      </select>
                    </Field>
                    <Field label="Nombre del Equipo *" error={errors.name?.message}>
                      <input {...register('name')} placeholder={selectedType ? `Ej: ${selectedType.label} Digital` : 'Nombre del equipo'} className="field-input" />
                    </Field>
                    <Field label="Marca *" error={errors.brand?.message}>
                      <input {...register('brand')} placeholder="Mitutoyo, Fluke, Wika…" className="field-input" />
                    </Field>
                    <Field label="Modelo *" error={errors.model?.message}>
                      <input {...register('model')} placeholder="Número de modelo" className="field-input" />
                    </Field>
                    <Field label="Número de Serie *" error={errors.serial_number?.message}>
                      <input {...register('serial_number')} placeholder="S/N del fabricante" className="field-input" />
                    </Field>
                    <Field label="Ubicación" error={errors.location?.message} className="col-span-2">
                      <input {...register('location')} placeholder="Laboratorio de Metrología" className="field-input" />
                    </Field>
                  </div>
                </Section>

                <Section title="Características Metrológicas">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Unidad de Medida *" error={errors.unit?.message}>
                      {selectedType && selectedType.unitOptions.length > 0
                        ? <select {...register('unit')} className="field-input">{selectedType.unitOptions.map(u => <option key={u} value={u}>{u}</option>)}</select>
                        : <input {...register('unit')} placeholder="mm, kg…" className="field-input" />
                      }
                    </Field>
                    <Field label="Resolución *" error={errors.resolution?.message}>
                      <div className="relative">
                        <input {...register('resolution')} type="number" step="any" placeholder="0.01" className="field-input font-mono pr-12" />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none" style={{ color: 'var(--text-muted)' }}>{selectedUnit}</span>
                      </div>
                    </Field>
                    <Field label="Rango Mínimo" error={errors.range_min?.message}>
                      <div className="relative">
                        <input {...register('range_min')} type="number" step="any" placeholder="0" className="field-input font-mono pr-12" />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none" style={{ color: 'var(--text-muted)' }}>{selectedUnit}</span>
                      </div>
                    </Field>
                    <Field label="Rango Máximo" error={errors.range_max?.message}>
                      <div className="relative">
                        <input {...register('range_max')} type="number" step="any" placeholder="150" className="field-input font-mono pr-12" />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none" style={{ color: 'var(--text-muted)' }}>{selectedUnit}</span>
                      </div>
                    </Field>
                  </div>
                </Section>

                {selectedType && selectedType.extras.length > 0 && (
                  <Section title={`Configuración — ${selectedType.label}`} hint="Campos específicos para el procedimiento de calibración">
                    <div className="space-y-3">
                      {selectedType.extras.map((extra: any) => (
                        <div key={extra.key}>
                          <label className="text-[10px] font-medium uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                            {extra.label}{extra.hint && <span className="ml-2 normal-case tracking-normal opacity-70">— {extra.hint}</span>}
                          </label>
                          {extra.type === 'checkbox' ? (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="w-4 h-4 rounded accent-orange-500" {...register('extras_json' as any)} />
                              <span className="text-[11px]" style={{ color: 'var(--text-main)' }}>Habilitado</span>
                            </label>
                          ) : extra.type === 'select' ? (
                            <select className="field-input" {...register('extras_json' as any)}>
                              <option value="">— Seleccionar —</option>
                              {extra.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input type={extra.type} placeholder={extra.placeholder} min={extra.min} max={extra.max} className="field-input" {...register('extras_json' as any)} />
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                <Section title="Patrón de Referencia de Fábrica" hint="(opcional)">
                  {matchingStandards.length === 0 && selectedType
                    ? <p className="text-[11px] py-1" style={{ color: 'var(--text-muted)' }}>No hay patrones para <strong>{selectedType.category}</strong>.</p>
                    : <Field label="Patrón asociado" error={errors.factory_standard_id?.message}>
                        <select {...register('factory_standard_id')} className="field-input">
                          <option value="">— Ninguno / No aplica —</option>
                          {matchingStandards.map(s => <option key={s.id} value={s.id}>{s.internal_code} — {s.name} (U={s.uncertainty_u}, k={s.k_factor})</option>)}
                        </select>
                      </Field>
                  }
                </Section>
              </div>

              <div className="px-6 py-4 flex items-center justify-end gap-3 shrink-0" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                <button type="button" onClick={onClose} className="h-8 px-4 rounded text-[11px] font-medium transition-colors hover-bg" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="h-8 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 transition-opacity disabled:opacity-60" style={{ backgroundColor: COLORS.primary }}>
                  {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                  {isEdit ? 'Guardar Cambios' : 'Crear Instrumento'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}

/* ─── Delete Confirm ─────────────────────────────────────── */
function DeleteConfirm({ name, onCancel, onConfirm, loading }: { name: string; onCancel: () => void; onConfirm: () => void; loading: boolean }) {
  const content = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-xl p-6 shadow-2xl text-center" style={{ backgroundColor: 'var(--bg-panel)', border: `2px solid ${COLORS.danger}20` }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${COLORS.danger}15` }}><AlertTriangle size={24} style={{ color: COLORS.danger }} /></div>
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-main)' }}>¿Eliminar instrumento?</h3>
        <p className="text-[11px] mb-6" style={{ color: 'var(--text-muted)' }}>Se realizará un <strong>soft delete</strong> de <strong>"{name}"</strong>.<br />El historial de calibraciones permanecerá intacto.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} className="h-8 px-5 rounded text-[11px] font-medium hover-bg transition-colors" style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className="h-8 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 disabled:opacity-60" style={{ backgroundColor: COLORS.danger }}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Eliminar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(content, document.body);
}

/* ─── Helpers ─────────────────────────────────────────────── */
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>{title}</h3>
        {hint && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
      </div>
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>{children}</div>
    </div>
  );
}

function Field({ label, error, children, className = '' }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
      {error && <p className="text-[10px] text-red-400 flex items-center gap-1">⚠ {error}</p>}
    </div>
  );
}
