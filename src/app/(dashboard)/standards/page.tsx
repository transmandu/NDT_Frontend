'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import {
  Plus, X, Loader2, AlertTriangle, Trash2,
  MoreHorizontal, Pencil, CheckCircle, AlertCircle, Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import type { Standard } from '@/types/calibration';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';

/* ─── Constants ──────────────────────────────────────────── */
import { C } from '@/lib/colors';
const COLORS = { success: C.success, warning: C.warning, danger: C.danger, primary: C.primary };

const STANDARD_CATEGORIES = [
  { category: 'dimensional', label: 'Bloques Patrón / Calibre', prefix: 'BLK', icon: '📐', color: '#6366F1', unit: 'mm', description: 'Bloques Johansson, cintas patrón, calibres de referencia', extras: [{ key: 'uncertainty_slope', label: 'Pendiente de Incertidumbre (b)', type: 'number', hint: 'b en U = a + b·L [µm/mm]', placeholder: '0.001' }] },
  { category: 'mass',        label: 'Pesas Patrón OIML',       prefix: 'MAS', icon: '⚖️', color: '#10B981', unit: 'g',  description: 'Pesas clase E1/E2/F1/F2/M1/M2/M3 según OIML R111', extras: [{ key: 'oiml_class', label: 'Clase OIML', type: 'select', options: ['E1', 'E2', 'F1', 'F2', 'M1', 'M2', 'M3'], hint: 'Clase de exactitud según OIML R111' }, { key: 'drift_rate_per_year', label: 'Tasa de Deriva Anual', type: 'number', hint: 'mg/año observado (null = usar estimación OIML)', placeholder: '---' }, { key: 'mass_density', label: 'Densidad del Material', type: 'number', hint: 'kg/m³ para corrección de empuje del aire', placeholder: '8000' }] },
  { category: 'torque',      label: 'Patrón de Torque',        prefix: 'TQP', icon: '🔧', color: '#F59E0B', unit: 'N·m', description: 'Transductor de torque de referencia trazable al BIPM', extras: [] },
  { category: 'pressure',    label: 'Transductor Patrón',      prefix: 'PRE', icon: '🌡️', color: '#EF4444', unit: 'bar', description: 'Transductor de presión patrón de alta exactitud', extras: [] },
  { category: 'electrical',  label: 'Calibrador de Proceso',   prefix: 'CAL', icon: '🔌', color: '#8B5CF6', unit: 'V',  description: 'Calibrador multiparámetro de señales eléctricas', extras: [] },
  { category: 'temperature', label: 'Sensor de Referencia T',  prefix: 'TMP', icon: '💧', color: '#06B6D4', unit: '°C', description: 'Termómetro/termohigrómetro de referencia trazable', extras: [] },
] as const;
type StdCat = typeof STANDARD_CATEGORIES[number];

/** Maps any Spanish or legacy category name to the canonical English key */
const CATEGORY_NORMALIZE: Record<string, string> = {
  masa:          'mass',
  mass:          'mass',
  dimensional:   'dimensional',
  presion:       'pressure',
  'presión':     'pressure',
  pressure:      'pressure',
  torque:        'torque',
  electrico:     'electrical',
  'eléctrico':   'electrical',
  electrical:    'electrical',
  temperatura:   'temperature',
  temperature:   'temperature',
};

function findCategoryByKey(key: string | null): StdCat | null {
  if (!key) return null;
  const normalized = CATEGORY_NORMALIZE[key.toLowerCase()] ?? key.toLowerCase();
  return STANDARD_CATEGORIES.find(c => c.category === normalized) ?? null;
}

/* ─── Zod Schema ─────────────────────────────────────────── */
const standardSchema = z.object({
  internal_code:       z.string().min(1, 'Código requerido'),
  name:                z.string().min(1, 'Nombre requerido'),
  brand:               z.string().nullable().optional(),
  model:               z.string().nullable().optional(),
  serial_number:       z.string().nullable().optional(),
  resolution:          z.coerce.number().nullable().optional(),
  unit:                z.string().nullable().optional(),
  category:            z.string().min(1, 'Categoría requerida'),
  certificate_number:  z.string().min(1, 'N° certificado requerido'),
  uncertainty_u:       z.coerce.number().positive('Debe ser > 0'),
  k_factor:            z.coerce.number().positive('Debe ser > 0'),
  calibration_date:    z.string().nullable().optional(),
  expiry_date:         z.string().min(1, 'Vencimiento requerido'),
  calibrated_by_lab:   z.string().nullable().optional(),
  /* Category extras */
  uncertainty_slope:   z.coerce.number().nullable().optional(),
  oiml_class:          z.string().nullable().optional(),
  drift_rate_per_year: z.coerce.number().nullable().optional(),
  mass_density:        z.coerce.number().nullable().optional(),
});
type StandardForm = z.infer<typeof standardSchema>;

/* ─── Status helper ──────────────────────────────────────── */
function getStatus(expiry: string) {
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { label: 'Vencido',    color: COLORS.danger,  icon: AlertCircle };
  if (days < 90) return { label: 'Por Vencer', color: COLORS.warning, icon: Clock };
  return               { label: 'Vigente',     color: COLORS.success, icon: CheckCircle };
}

/* ─── Actions Cell ───────────────────────────────────────── */
function ActionsCell({ std, onEdit, onDelete }: { std: Standard; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('[data-std-menu]')) setOpen(false); };
    if (open) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative flex justify-end" data-std-menu>
      <button onClick={() => setOpen(v => !v)} className="p-1.5 rounded hover-bg transition-colors" style={{ color: 'var(--text-muted)' }}>
        <MoreHorizontal size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.95 }} transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-1 w-44 rounded-md shadow-xl z-[60] overflow-hidden py-1"
            style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)' }}>
            <p className="px-3 py-1.5 text-[9px] uppercase font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>Acciones</p>
            <button onClick={() => { setOpen(false); onEdit(); }} className="px-3 py-2 text-xs flex items-center gap-2 hover-bg transition-colors w-full text-left" style={{ color: 'var(--text-main)' }}>
              <Pencil size={13} /> Editar Patrón
            </button>
            <button onClick={() => { setOpen(false); onDelete(); }} className="px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left font-medium" style={{ color: COLORS.danger, borderTop: '1px solid var(--border-color)' }}>
              <Trash2 size={13} /> Eliminar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Column Definitions ─────────────────────────────────── */
function buildColumns(onEdit: (s: Standard) => void, onDelete: (s: Standard) => void): ColumnDef<Standard>[] {
  return [
    {
      accessorKey: 'internal_code',
      header: 'Código',
      enableColumnFilter: false,
      cell: ({ getValue }) => <span className="font-mono font-bold text-[11px]" style={{ color: COLORS.success }}>{getValue<string>()}</span>,
    },
    {
      id: 'name_brand',
      header: 'Nombre / Marca',
      enableColumnFilter: false,
      accessorFn: row => `${row.name} ${row.brand ?? ''}`,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-[11px]" style={{ color: 'var(--text-main)' }}>{row.original.name}</p>
          {row.original.brand && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{row.original.brand}{row.original.model ? ` · ${row.original.model}` : ''}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Categoría',
      enableColumnFilter: true,
      cell: ({ getValue }) => <span className="text-[10px] px-2 py-0.5 rounded capitalize font-medium" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{getValue<string>()}</span>,
    },
    {
      accessorKey: 'certificate_number',
      header: 'Certificado',
      meta: { tourId: 'tour-std-col-cert' },
      enableColumnFilter: false,
      cell: ({ getValue }) => <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{getValue<string>()}</span>,
    },
    {
      id: 'uncertainty',
      header: 'U (k)',
      meta: { tourId: 'tour-std-col-uncertainty' },
      enableColumnFilter: false,
      enableSorting: true,
      accessorFn: row => Number(row.uncertainty_u),
      cell: ({ row }) => (
        <span className="font-mono text-[11px]" style={{ color: 'var(--text-main)' }}>
          ±{row.original.uncertainty_u} <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>(k={row.original.k_factor})</span>
        </span>
      ),
    },
    {
      accessorKey: 'expiry_date',
      header: 'Vencimiento',
      meta: { tourId: 'tour-std-col-expiry' },
      enableColumnFilter: false,
      cell: ({ getValue }) => <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{new Date(getValue<string>()).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</span>,
    },
    {
      id: 'status',
      header: 'Estado',
      meta: { tourId: 'tour-std-col-kfactor' },
      enableColumnFilter: true,
      enableSorting: false,
      accessorFn: row => {
        const d = Math.ceil((new Date(row.expiry_date).getTime() - Date.now()) / 86400000);
        return d < 0 ? 'Vencido' : d < 90 ? 'Por Vencer' : 'Vigente';
      },
      cell: ({ row }) => {
        const s = getStatus(row.original.expiry_date);
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap"
            style={{ backgroundColor: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
            <s.icon size={9} /> {s.label}
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
      cell: ({ row }) => <ActionsCell std={row.original} onEdit={() => onEdit(row.original)} onDelete={() => onDelete(row.original)} />,
    },
  ];
}

/* ══════════════════════════════════════════════════════════ */
/*  PAGE                                                      */
/* ══════════════════════════════════════════════════════════ */
export default function StandardsPage() {
  const searchParams   = useSearchParams();
  const [modalOpen, setModalOpen]         = useState(false);
  const [editTarget, setEditTarget]       = useState<Standard | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<Standard | null>(null);
  const [presetCategory, setPresetCategory] = useState<string | null>(null);
  const qc = useQueryClient();

  // Auto-open create modal when ?new=<category> is present in the URL
  useEffect(() => {
    const cat = searchParams.get('new');
    if (cat) {
      setPresetCategory(cat);
      setEditTarget(null);
      setModalOpen(true);
    }
  }, [searchParams]);

  const { data: standards = [], isLoading } = useQuery<Standard[]>({
    queryKey: ['standards'],
    queryFn: () => api.get('/standards').then(r => r.data.data || []),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/standards/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['standards'] }); toast.success('Patrón eliminado'); setDeleteTarget(null); },
    onError: () => toast.error('Error al eliminar el patrón'),
  });

  const columns = useMemo(
    () => buildColumns(s => { setEditTarget(s); setModalOpen(true); }, s => setDeleteTarget(s)),
    []
  );

  return (
    <div id="tour-std-page" className="space-y-3 w-full animate-fadeIn">
      {isLoading ? (
        <div className="panel rounded-md shadow-sm p-8 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: COLORS.success }} />
          Cargando patrones de referencia…
        </div>
      ) : (
        <div id="tour-std-table">
        <DataTable
          columns={columns}
          data={standards}
          searchPlaceholder="Buscar por código, nombre o certificado…"
          searchId="tour-std-search"
          toolbarRight={
            <button
              id="tour-std-add-btn"
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              className="h-7 px-3 text-[11px] rounded font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: C.accent, color: '#fff' }}
            >
              <Plus size={13} /> Nuevo Patrón
            </button>
          }
        />
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <StandardModal
            standard={editTarget}
            standards={standards}
            initialCategory={editTarget ? null : presetCategory}
            onClose={() => { setModalOpen(false); setEditTarget(null); setPresetCategory(null); }}
          />
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
/*  STANDARD MODAL                                           */
/* ══════════════════════════════════════════════════════════ */
function StandardModal({ standard, standards, initialCategory = null, onClose }: {
  standard: Standard | null;
  standards: Standard[];
  initialCategory?: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!standard;
  const editCat   = isEdit ? findCategoryByKey(standard.category) : null;
  const presetCat = findCategoryByKey(initialCategory ?? null);
  const [selectedCat, setSelectedCat] = useState<StdCat | null>(editCat ?? presetCat);

  const autoCode = useMemo(() => {
    if (!selectedCat) return '';
    const prefix = selectedCat.prefix;
    const existing = standards.filter(s => s.internal_code.startsWith(prefix + '-'));
    const max = existing.reduce((acc, s) => { const n = parseInt(s.internal_code.replace(prefix + '-', ''), 10); return isNaN(n) ? acc : Math.max(acc, n); }, 0);
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }, [selectedCat, standards]);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<StandardForm>({
    resolver: zodResolver(standardSchema) as Resolver<StandardForm>,
    defaultValues: standard ? {
      internal_code: standard.internal_code, name: standard.name, brand: standard.brand ?? '',
      model: standard.model ?? '', serial_number: standard.serial_number ?? '',
      resolution: standard.resolution ?? undefined, unit: standard.unit ?? '',
      category: standard.category, certificate_number: standard.certificate_number,
      uncertainty_u: standard.uncertainty_u, k_factor: standard.k_factor,
      calibration_date: standard.calibration_date?.split('T')[0] ?? '',
      expiry_date: standard.expiry_date?.split('T')[0] ?? '',
      calibrated_by_lab: standard.calibrated_by_lab ?? '',
      uncertainty_slope: standard.uncertainty_slope ?? undefined,
      oiml_class: standard.oiml_class ?? '',
      drift_rate_per_year: standard.drift_rate_per_year ?? undefined,
      mass_density: standard.mass_density ?? undefined,
    } : { k_factor: 2 },
  });

  useEffect(() => {
    if (selectedCat && !isEdit) {
      setValue('internal_code', autoCode);
      setValue('category', selectedCat.category);
      setValue('unit', selectedCat.unit);
    }
  }, [selectedCat, autoCode, isEdit, setValue]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const onSubmit = async (data: StandardForm) => {
    try {
      const payload = { ...data, traceability_chain: undefined };
      if (isEdit) { await api.put(`/standards/${standard.id}`, payload); toast.success('Patrón actualizado'); }
      else { await api.post('/standards', payload); toast.success('Patrón de referencia creado'); }
      qc.invalidateQueries({ queryKey: ['standards'] });
      onClose();
    } catch (err: any) {
      const first = err.response?.data?.errors ? (Object.values(err.response.data.errors)[0] as string[])[0] : err.response?.data?.message || 'Error al guardar';
      toast.error(first);
    }
  };

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
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
              {isEdit ? `✏️ Editar — ${standard.internal_code}` : selectedCat ? `${selectedCat.icon} Nuevo ${selectedCat.label}` : '🔬 Nuevo Patrón de Referencia'}
            </h2>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {isEdit ? 'Modificar ficha del patrón de referencia' : selectedCat ? selectedCat.description : 'Selecciona el tipo de magnitud que mide este patrón'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover-bg transition-colors" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1 — Category picker */}
          {!selectedCat && !isEdit ? (
            <div className="p-6">
              <p className="text-[11px] mb-4 font-medium" style={{ color: 'var(--text-muted)' }}>¿Qué magnitud mide este patrón?</p>
              <div className="grid grid-cols-2 gap-3">
                {STANDARD_CATEGORIES.map(cat => (
                  <motion.button key={cat.category} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCat(cat)}
                    className="flex flex-col items-start gap-2 p-4 rounded-lg text-left transition-all"
                    style={{ border: `2px solid ${cat.color}30`, backgroundColor: `${cat.color}08` }}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-2xl">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold truncate" style={{ color: 'var(--text-main)' }}>{cat.label}</p>
                        <p className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded inline-block mt-0.5" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>{cat.prefix}-XXX</p>
                      </div>
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{cat.description}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            /* Step 2 — Form */
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="px-6 py-5 space-y-5">

                {/* Identificación */}
                <Sec title="Identificación del Patrón">
                  <div className="grid grid-cols-2 gap-4">
                    <Fld label="Código Interno" error={errors.internal_code?.message}>
                      <div className="relative">
                        <input {...register('internal_code')} readOnly={!isEdit} className={`field-input font-mono ${!isEdit ? 'cursor-default opacity-70' : ''}`} style={!isEdit ? { backgroundColor: 'var(--bg-hover)' } : undefined} />
                        {!isEdit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#10B98120', color: '#10B981' }}>AUTO</span>}
                      </div>
                    </Fld>
                    <Fld label="Nombre del Patrón *" error={errors.name?.message}>
                      <input {...register('name')} placeholder={selectedCat ? `Ej: ${selectedCat.label} de Referencia` : 'Nombre'} className="field-input" />
                    </Fld>
                    <Fld label="Marca / Fabricante" error={errors.brand?.message}>
                      <input {...register('brand')} placeholder="Mitutoyo, Fluke, OIML…" className="field-input" />
                    </Fld>
                    <Fld label="Modelo" error={errors.model?.message}>
                      <input {...register('model')} placeholder="Número de modelo" className="field-input" />
                    </Fld>
                    <Fld label="Número de Serie" error={errors.serial_number?.message}>
                      <input {...register('serial_number')} placeholder="S/N del fabricante" className="field-input" />
                    </Fld>
                    <Fld label="Laboratorio Calibrador" error={errors.calibrated_by_lab?.message}>
                      <input {...register('calibrated_by_lab')} placeholder="INTI, CENLAB, Trescal…" className="field-input" />
                    </Fld>
                  </div>
                </Sec>

                {/* Características Metrológicas */}
                <Sec title="Características Metrológicas">
                  <div className="grid grid-cols-2 gap-4">
                    <Fld label="Unidad de Medida" error={errors.unit?.message}>
                      <input {...register('unit')} placeholder={selectedCat?.unit ?? 'mm, g, V…'} className="field-input" />
                    </Fld>
                    <Fld label="Resolución" error={errors.resolution?.message}>
                      <input {...register('resolution')} type="number" step="any" placeholder="0.001" className="field-input font-mono" />
                    </Fld>
                    <Fld label="Incertidumbre U *" error={errors.uncertainty_u?.message}>
                      <input {...register('uncertainty_u')} type="number" step="any" placeholder="0.05" className="field-input font-mono" />
                    </Fld>
                    <Fld label="Factor de cobertura k *" error={errors.k_factor?.message}>
                      <input {...register('k_factor')} type="number" step="any" placeholder="2" className="field-input font-mono" />
                    </Fld>
                  </div>
                </Sec>

                {/* Extras por categoría */}
                {selectedCat && selectedCat.extras.length > 0 && (
                  <Sec title={`Configuración — ${selectedCat.label}`} hint="Campos específicos para el cálculo de incertidumbre">
                    <div className="space-y-3">
                      {selectedCat.extras.map((ex: any) => (
                        <Fld key={ex.key} label={ex.label} hint={ex.hint} error={(errors as any)[ex.key]?.message}>
                          {ex.type === 'select'
                            ? <select {...register(ex.key as any)} className="field-input"><option value="">— Seleccionar —</option>{ex.options.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                            : <input {...register(ex.key as any)} type="number" step="any" placeholder={ex.placeholder} className="field-input font-mono" />
                          }
                        </Fld>
                      ))}
                    </div>
                  </Sec>
                )}

                {/* Certificado y vigencia */}
                <Sec title="Certificado y Vigencia">
                  <div className="grid grid-cols-2 gap-4">
                    <Fld label="N° Certificado de Calibración *" error={errors.certificate_number?.message} className="col-span-2">
                      <input {...register('certificate_number')} placeholder="Ej: INTI-2024-00123" className="field-input font-mono" />
                    </Fld>
                    <Fld label="Fecha de Calibración" error={errors.calibration_date?.message}>
                      <input {...register('calibration_date')} type="date" className="field-input" />
                    </Fld>
                    <Fld label="Fecha de Vencimiento *" error={errors.expiry_date?.message}>
                      <input {...register('expiry_date')} type="date" className="field-input" />
                    </Fld>
                  </div>
                </Sec>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 flex items-center justify-end gap-3 shrink-0" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                {!isEdit && (
                  <button type="button" onClick={() => setSelectedCat(null)} className="h-8 px-4 rounded text-[11px] font-medium transition-colors hover-bg mr-auto" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                    ← Cambiar tipo
                  </button>
                )}
                <button type="button" onClick={onClose} className="h-8 px-4 rounded text-[11px] font-medium transition-colors hover-bg" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="h-8 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 transition-opacity disabled:opacity-60" style={{ backgroundColor: C.accent }}>
                  {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                  {isEdit ? 'Guardar Cambios' : 'Crear Patrón'}
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
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-main)' }}>¿Eliminar patrón?</h3>
        <p className="text-[11px] mb-6" style={{ color: 'var(--text-muted)' }}>Se realizará un <strong>soft delete</strong> de <strong>"{name}"</strong>.<br />El historial de sesiones de calibración permanecerá intacto.</p>
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
function Sec({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
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

function Fld({ label, hint, error, children, className = '' }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[10px] font-semibold uppercase tracking-wider flex items-baseline gap-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
        {hint && <span className="normal-case tracking-normal font-normal opacity-70">— {hint}</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-400">⚠ {error}</p>}
    </div>
  );
}
