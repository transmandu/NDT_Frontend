'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2, AlertCircle, FileCode2, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { isAxiosError } from 'axios';
import type { ProcedureSchema } from '@/types/calibration';

/* ─── Constants ────────────────────────────────────────────── */
import { C } from '@/lib/colors';
const ACCENT = C.accent; // índigo — color de "esquemas"

const CATEGORIES = [
  { value: 'dimensional',  label: 'Dimensional' },
  { value: 'mass',         label: 'Masa' },
  { value: 'torque',       label: 'Torque' },
  { value: 'pressure',     label: 'Presión' },
  { value: 'electrical',   label: 'Eléctrico' },
  { value: 'temperature',  label: 'Temperatura / Humedad' },
  { value: 'other',        label: 'Otro' },
];

/* ─── Zod schema ───────────────────────────────────────────── */
const schemaForm = z.object({
  code:        z.string().min(1, 'Requerido').regex(/^[A-Z0-9\-]+$/, 'Solo mayúsculas, números y guiones'),
  name:        z.string().min(1, 'Requerido'),
  description: z.string().optional(),
  version:     z.string().regex(/^\d+\.\d+(\.\d+)?$/, 'Formato: 1.0 o 1.0.0'),
  category:    z.string().min(1, 'Selecciona una categoría'),
  is_active:   z.boolean(),
  ui_schema_raw:        z.string().min(2, 'Requerido'),
  math_config_raw:      z.string().optional(),
  validation_rules_raw: z.string().optional(),
});
type SchemaFormValues = z.infer<typeof schemaForm>;

/* ─── JSON validation helper ───────────────────────────────── */
function validateUiSchema(raw: string): { ok: boolean; message: string } {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.procedure_code)   return { ok: false, message: 'Falta "procedure_code"' };
    if (!parsed.procedure_name)   return { ok: false, message: 'Falta "procedure_name"' };
    if (!Array.isArray(parsed.metadata_requirements)) return { ok: false, message: 'Falta array "metadata_requirements"' };
    if (!Array.isArray(parsed.grids) || parsed.grids.length === 0) return { ok: false, message: 'Falta array "grids" con al menos 1 elemento' };
    for (const g of parsed.grids) {
      if (!g.id)      return { ok: false, message: `Grid sin "id"` };
      if (!g.title)   return { ok: false, message: `Grid "${g.id}" sin "title"` };
      if (!Array.isArray(g.columns) || g.columns.length === 0) return { ok: false, message: `Grid "${g.id}" sin "columns"` };
    }
    return { ok: true, message: `Válido · ${parsed.grids.length} grid(s) · ${parsed.metadata_requirements.length} campo(s) de metadata` };
  } catch (e: unknown) {
    return { ok: false, message: e instanceof Error ? e.message : 'JSON inválido' };
  }
}

function validateOptionalJson(raw: string): { ok: boolean; message: string } {
  if (!raw || raw.trim() === '' || raw.trim() === 'null') return { ok: true, message: 'Vacío (se guardará null)' };
  try { JSON.parse(raw); return { ok: true, message: 'JSON válido' }; }
  catch (e: unknown) { return { ok: false, message: e instanceof Error ? e.message : 'JSON inválido' }; }
}

/* ─── Sub-components ───────────────────────────────────────── */
function Field({ label, error, children, hint }: { label: string; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
      {hint && !error && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      {error && <p className="text-[10px] text-red-400 flex items-center gap-1">{error}</p>}
    </div>
  );
}

function JsonEditor({
  label, value, onChange, validator, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  validator: (v: string) => { ok: boolean; message: string }; required?: boolean;
}) {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const validate = () => setResult(validator(value));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}{required && <span className="text-red-400 ml-1">*</span>}
        </label>
        <button type="button" onClick={validate}
          className="text-[10px] px-2 py-0.5 rounded font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: `${ACCENT}20`, color: ACCENT }}>
          Validar JSON
        </button>
      </div>
      <textarea
        value={value}
        onChange={e => { onChange(e.target.value); setResult(null); }}
        rows={10}
        spellCheck={false}
        className="field-input w-full font-mono text-[10px] leading-relaxed resize-y"
        style={{ minHeight: 180, fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}
        placeholder={'{\n  "procedure_code": "...",\n  ...\n}'}
      />
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-2 p-2 rounded text-[10px]"
            style={{
              backgroundColor: result.ok ? '#10B98115' : '#EF444415',
              border: `1px solid ${result.ok ? '#10B98130' : '#EF444430'}`,
              color: result.ok ? '#10B981' : '#EF4444',
            }}>
            {result.ok
              ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
              : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
            <span>{result.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  MODAL PRINCIPAL                                           */
/* ══════════════════════════════════════════════════════════ */
export default function SchemaModal({
  schema,
  supportedCodes,
  onClose,
}: {
  schema: ProcedureSchema | null;
  supportedCodes: string[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!schema;
  const [tab, setTab] = useState<'basic' | 'json'>('basic');

  /* ─── Form ── */
  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<SchemaFormValues>({
    resolver: zodResolver(schemaForm),
    defaultValues: isEdit ? {
      code:                 schema.code,
      name:                 schema.name,
      description:          schema.description ?? '',
      version:              schema.version,
      category:             schema.category,
      is_active:            schema.is_active,
      ui_schema_raw:        JSON.stringify(schema.ui_schema, null, 2),
      math_config_raw:      schema.math_config ? JSON.stringify(schema.math_config, null, 2) : '',
      validation_rules_raw: schema.validation_rules ? JSON.stringify(schema.validation_rules, null, 2) : '',
    } : {
      version:   '1.0',
      is_active: true,
      ui_schema_raw: JSON.stringify({
        procedure_code: '',
        procedure_name: '',
        metadata_requirements: [],
        grids: [],
      }, null, 2),
      math_config_raw:      '',
      validation_rules_raw: '',
    },
  });

  const uiRaw  = watch('ui_schema_raw');
  const mathRaw = watch('math_config_raw') ?? '';
  const valRaw  = watch('validation_rules_raw') ?? '';

  /* ─── Mutation ── */
  const mutation = useMutation({
    mutationFn: async (data: SchemaFormValues) => {
      // Parse JSON fields before sending
      const parseOrNull = (raw: string) => {
        if (!raw || raw.trim() === '' || raw.trim() === 'null') return null;
        return JSON.parse(raw);
      };

      const payload = {
        code:             data.code,
        name:             data.name,
        description:      data.description || null,
        version:          data.version,
        category:         data.category,
        is_active:        data.is_active,
        ui_schema:        JSON.parse(data.ui_schema_raw),
        math_config:      parseOrNull(data.math_config_raw ?? ''),
        validation_rules: parseOrNull(data.validation_rules_raw ?? ''),
      };

      if (isEdit) {
        return api.put(`/calibration/schemas/${schema.id}`, payload);
      }
      return api.post('/calibration/schemas', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schemas'] });
      toast.success(isEdit ? 'Esquema actualizado correctamente.' : 'Esquema creado exitosamente.');
      onClose();
    },
    onError: (err: unknown) => {
      if (isAxiosError(err)) {
        const msgs = err.response?.data?.errors as Record<string, string[]> | undefined;
        if (msgs) {
          const first = Object.values(msgs)[0];
          toast.error(Array.isArray(first) ? first[0] : String(first));
          return;
        }
        toast.error(err.response?.data?.message || 'Error al guardar el esquema.');
        return;
      }
      toast.error('Error al guardar el esquema.');
    },
  });

  const onSubmit = async (data: SchemaFormValues) => {
    // Validate JSON fields first
    const uiCheck  = validateUiSchema(data.ui_schema_raw);
    const mathCheck = validateOptionalJson(data.math_config_raw ?? '');
    const valCheck  = validateOptionalJson(data.validation_rules_raw ?? '');

    if (!uiCheck.ok) {
      toast.error(`UI Schema inválido: ${uiCheck.message}`);
      setTab('json');
      return;
    }
    if (!mathCheck.ok) {
      toast.error(`Math Config inválido: ${mathCheck.message}`);
      setTab('json');
      return;
    }
    if (!valCheck.ok) {
      toast.error(`Validation Rules inválido: ${valCheck.message}`);
      setTab('json');
      return;
    }

    mutation.mutate(data);
  };

  /* ─── Escape key ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const hasStrategy = isEdit && supportedCodes.includes(schema.code);

  /* ─── Render ── */
  const modal = (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', maxHeight: '94vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              {isEdit ? `Editar Esquema — ${schema.code}` : 'Nuevo Esquema de Procedimiento'}
            </h2>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {isEdit
                ? `v${schema.version} · ${schema.category}${hasStrategy ? ' · Estrategia implementada' : ' · Sin estrategia matemática'}`
                : 'Define el código, nombre, categoría y el JSON de la interfaz de usuario'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover-bg transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex shrink-0 px-6 gap-1 pt-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
          {([['basic', Settings2, 'Información General'], ['json', FileCode2, 'Configuración JSON']] as const).map(([key, Icon, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-t-md transition-colors relative"
              style={{
                color: tab === key ? ACCENT : 'var(--text-muted)',
                backgroundColor: tab === key ? `${ACCENT}10` : 'transparent',
                borderBottom: tab === key ? `2px solid ${ACCENT}` : '2px solid transparent',
              }}>
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {tab === 'basic' ? (
              <div className="space-y-4">
                {/* Row 1: code + version */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Código *" error={errors.code?.message} hint="Mayúsculas y guiones. Ej: DIM-001">
                    <input {...register('code')} disabled={isEdit}
                      className={`field-input font-mono uppercase ${isEdit ? 'opacity-60 cursor-default' : ''}`}
                      placeholder="DIM-001" />
                  </Field>
                  <Field label="Versión *" error={errors.version?.message} hint="Semver: 1.0 o 1.0.0">
                    <input {...register('version')} className="field-input font-mono" placeholder="1.0" />
                  </Field>
                </div>

                {/* Row 2: name */}
                <Field label="Nombre del Procedimiento *" error={errors.name?.message}>
                  <input {...register('name')} className="field-input" placeholder="Calibración Dimensional — Pie de Rey" />
                </Field>

                {/* Row 3: category + is_active */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Categoría *" error={errors.category?.message}>
                    <select {...register('category')} className="field-input">
                      <option value="">— Seleccionar —</option>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Estado">
                    <div className="flex items-center h-9 gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" {...register('is_active')} className="sr-only peer" />
                        <div className="w-9 h-5 rounded-full peer-checked:bg-green-500 bg-gray-300 dark:bg-gray-600 transition-colors" />
                        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                      </label>
                      <span className="text-[11px]" style={{ color: 'var(--text-main)' }}>
                        {watch('is_active') ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </Field>
                </div>

                {/* Row 4: description */}
                <Field label="Descripción" error={errors.description?.message}>
                  <textarea {...register('description')} rows={3} className="field-input resize-none"
                    placeholder="Calibración por comparación directa con bloques patrón según procedimiento interno..." />
                </Field>

                {/* Info card */}
                <div className="p-3 rounded-lg text-[10px] leading-relaxed space-y-1"
                  style={{ backgroundColor: `${ACCENT}08`, border: `1px solid ${ACCENT}25`, color: 'var(--text-muted)' }}>
                  <p className="font-semibold" style={{ color: ACCENT }}>Flujo de configuración</p>
                  <p>1. Completa los campos de esta pestaña para identificar el procedimiento.</p>
                  <p>2. Ve a <strong>Configuración JSON</strong> para definir el <code>ui_schema</code> (grids de medición) y el <code>math_config</code> (parámetros del motor de cálculo).</p>
                  <p>3. El código debe coincidir con el <code>procedure_code</code> dentro del <code>ui_schema</code>.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <JsonEditor
                  label="UI Schema"
                  required
                  value={uiRaw}
                  onChange={v => setValue('ui_schema_raw', v)}
                  validator={validateUiSchema}
                />
                <JsonEditor
                  label="Math Config (opcional)"
                  value={mathRaw}
                  onChange={v => setValue('math_config_raw', v)}
                  validator={validateOptionalJson}
                />
                <JsonEditor
                  label="Validation Rules (opcional)"
                  value={valRaw}
                  onChange={v => setValue('validation_rules_raw', v)}
                  validator={validateOptionalJson}
                />
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-4 flex items-center justify-between shrink-0"
            style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {errors.ui_schema_raw && <span className="text-red-400">Verifica el UI Schema en la pestaña JSON</span>}
            </p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose}
                className="h-8 px-4 rounded text-[11px] font-medium transition-colors hover-bg"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting || mutation.isPending}
                className="h-8 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 transition-opacity disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}>
                {(isSubmitting || mutation.isPending) && <Loader2 size={13} className="animate-spin" />}
                {isEdit ? 'Guardar Cambios' : 'Crear Esquema'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
