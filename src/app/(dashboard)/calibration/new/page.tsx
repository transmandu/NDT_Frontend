'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Send, Save, Loader2, Info, BookOpen, ChevronDown, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Instrument, Standard, GridSchema } from '@/types/calibration';
import DynamicGrid, { type GridData } from '@/components/calibration/DynamicGrid';
import { isSameCategory } from '@/lib/categoryUtils';

import { useQuery } from '@tanstack/react-query';

import { C } from '@/lib/colors';
const COLORS = { primary: C.primary, success: C.success };

// Strategies that are fully implemented in the backend
const IMPLEMENTED_STRATEGIES = ['ME-005', 'ME-003', 'EL-001', 'M-LAB-01', 'ISO-6789', 'DIM-001'];

export default function NewCalibrationPage() {
  const router = useRouter();

  // ─── Data from API (via Tanstack Query) ───
  const { data: instruments = [], isLoading: loadingInstruments } = useQuery<Instrument[]>({
    queryKey: ['instruments'],
    queryFn: () => api.get('/instruments').then(res => res.data.data || [])
  });

  const { data: standards = [], isLoading: loadingStandards } = useQuery<Standard[]>({
    queryKey: ['standards'],
    queryFn: () => api.get('/standards').then(res => res.data.data || [])
  });

  const { data: schemas = [], isLoading: loadingSchemas } = useQuery({
    queryKey: ['calibrationSchemas'],
    queryFn: () => api.get('/calibration/schemas').then(res => res.data.schemas || [])
  });

  const loading = loadingInstruments || loadingStandards || loadingSchemas;

  // ─── Selections ───
  const searchParams = useSearchParams();
  const [selectedInstrument, setSelectedInstrument] = useState(searchParams.get('instrument_id') || '');
  const [selectedStandard, setSelectedStandard] = useState('');

  // ── Environmental / Metadata ──
  const [environmentalData, setEnvironmentalData] = useState<Record<string, string>>({});
  // ── Certificate dates (static fields — not driven by schema) ──
  const [calibrationDate, setCalibrationDate]         = useState(() => new Date().toISOString().split('T')[0]);
  const [nextCalibrationDate, setNextCalibrationDate] = useState('');
  const [technicianObservation, setTechnicianObservation] = useState('');
  const [tempUncertainty, setTempUncertainty]         = useState('1.0'); // ±°C

  // ─── Grid data storage: gridId → { rowIdx → { colKey → value } } ───
  const [gridDataMap, setGridDataMap] = useState<Record<string, GridData>>({});

  // ─── Submission state ───
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [budgetResult, setBudgetResult] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, Set<string>>>({});

  // Reset form inputs whenever the selected instrument changes
  useEffect(() => {
    setBudgetResult(null);
    setGridDataMap({});
    setEnvironmentalData({});
    setNextCalibrationDate('');
    setTempUncertainty('1.0');
    setCalibrationDate(new Date().toISOString().split('T')[0]);
    setValidationErrors({});
  }, [selectedInstrument]);

  // Derived selections needed for queries
  const selectedInst = instruments.find((i: Instrument) => String(i.id) === selectedInstrument);
  const baseSchemaCode = selectedInst && schemas.length > 0
    ? schemas.find((s: { category?: string; code?: string }) => s.category?.toLowerCase() === selectedInst.category?.toLowerCase())?.code
    : null;

  // ─── Load full schema when instrument changes (Cached via Tanstack Query) ───
  const { data: matchedSchema = null, isFetching: loadingSchema } = useQuery({
    queryKey: ['schema', baseSchemaCode],
    queryFn: () => api.get(`/calibration/schema/${baseSchemaCode}`).then(res => res.data.schema),
    enabled: !!baseSchemaCode,
  });

  // ─── Derived ───
  const selectedStd = standards.find((s: Standard) => String(s.id) === selectedStandard);
  const grids: GridSchema[] = matchedSchema?.ui_schema?.grids || [];
  const procedureCode = matchedSchema?.code || '';
  const isStrategyImplemented = IMPLEMENTED_STRATEGIES.includes(procedureCode);

  // Filter standards by selected instrument's category
  const filteredStandards: Standard[] = selectedInst
    ? standards.filter((s: Standard) => isSameCategory(s.category, selectedInst.category))
    : standards;

  // Auto-preselect factory_standard when instrument changes
  useEffect(() => {
    if (!selectedInst) return;
    if (filteredStandards.length === 0) { setSelectedStandard(''); return; }

    // 1. Try to match factory_standard_id registered on the instrument
    if ((selectedInst as any).factory_standard_id) {
      const factoryMatch = filteredStandards.find(s => s.id === (selectedInst as any).factory_standard_id);
      if (factoryMatch) { setSelectedStandard(String(factoryMatch.id)); return; }
    }
    // 2. Auto-select if only one standard matches the category
    if (filteredStandards.length === 1) { setSelectedStandard(String(filteredStandards[0].id)); return; }
    // 3. Clear if currently selected standard no longer matches
    if (selectedStandard) {
      const stillValid = filteredStandards.some(s => String(s.id) === selectedStandard);
      if (!stillValid) setSelectedStandard('');
    }
  }, [selectedInstrument, filteredStandards]);

  // ─── Grid data handler ───
  const handleGridChange = useCallback((gridId: string, data: GridData) => {
    setGridDataMap(prev => ({ ...prev, [gridId]: data }));
  }, []);

  // ─── Build raw payload matching what the backend Strategy expects ───
  const buildPayload = useCallback(() => {
    const payload: Record<string, any> = {};

    // instrument_resolution is required by all backend strategies.
    if (selectedInst) {
      payload.instrument_resolution = selectedInst.resolution;
    }
    // NOTE: standard_uncertainty_u and standard_k_factor are read exclusively from
    // the immutable BD snapshot — they must NOT travel in the payload.

    // Add environmental metadata
    payload.metadata = { ...environmentalData };

    // Add grid data in the format the backend expects
    for (const grid of grids) {
      const gridData = gridDataMap[grid.id] || {};
      const rows = Object.keys(gridData).map(Number).sort((a, b) => a - b);

      if (grid.type === 'single_column_iterations') {
        // Backend expects array of { reading: number }
        payload[grid.id] = rows.map(rIdx => {
          const row = gridData[rIdx];
          const result: Record<string, any> = {};
          for (const col of grid.columns) {
            if (col.editable && row[col.key]) {
              result[col.key] = parseFloat(row[col.key]) || 0;
            }
          }
          return result;
        });
      } else if (grid.type === 'positional_grid') {
        // Backend expects array of { position, reading }
        payload[grid.id] = rows.map(rIdx => {
          const row = gridData[rIdx];
          const result: Record<string, any> = {};
          for (const col of grid.columns) {
            if (col.key === 'position') {
              result.position = row.position || `Pos ${rIdx + 1}`;
            } else if (col.editable && row[col.key]) {
              result[col.key] = parseFloat(row[col.key]) || 0;
            }
          }
          return result;
        });
      } else if (grid.type === 'multi_point_matrix') {
        // Backend expects array of point objects.
        // number_array cols → strategy-specific arrays:
        //   • Vernier  (DIM-001): flat float array  [50.01, 50.02, ...]
        //   • Others (ISO-6789, M-LAB-01, etc.): array of { reading: v }
        const isVernier = procedureCode === 'DIM-001';

        payload[grid.id] = rows.map(rIdx => {
          const row = gridData[rIdx];
          const result: Record<string, any> = {};

          for (const col of grid.columns) {
            if (col.key === 'nominal_value' || col.key === 'nominal_length_mm') {
              result[col.key] = parseFloat(row[col.key] || '0');
            } else if (col.key === 'standard_length_mm') {
              result.standard_length_mm = parseFloat(row[col.key] || row['nominal_length_mm'] || '0');
            } else if (col.type === 'number_array' && row[col.key]) {
              const vals = String(row[col.key]).split(',').map((v: string) => parseFloat(v.trim())).filter((n: number) => !isNaN(n));
              // Vernier: plain float array. Others: array of {reading: v}
              result[col.key] = isVernier ? vals : vals.map((v: number) => ({ reading: v }));
            } else if (col.editable && col.type === 'number' && row[col.key]) {
              result[col.key] = parseFloat(row[col.key]) || 0;
            }
          }
          return result;
        });
      } else {
        // Generic: pass raw data
        payload[grid.id] = rows.map(rIdx => {
          const row = gridData[rIdx];
          const result: Record<string, any> = {};
          for (const col of grid.columns) {
            if (row[col.key]) {
              result[col.key] = col.type === 'number' ? parseFloat(row[col.key]) : row[col.key];
            }
          }
          return result;
        });
      }
    }

    return payload;
  }, [gridDataMap, grids, selectedInst, selectedStd, environmentalData]);

  // ─── Validate required fields ───
  const validateFields = useCallback((): boolean => {
    if (!selectedInstrument) { toast.error('Seleccione un instrumento'); return false; }
    if (!selectedStandard) { toast.error('Seleccione un patrón de referencia'); return false; }
    if (!nextCalibrationDate) { toast.error('Indique la fecha de próxima calibración'); return false; }

    // Validate environmental requirements
    const metaReqs = matchedSchema?.ui_schema?.metadata_requirements || [];
    for (const req of metaReqs) {
      if (req.required && !environmentalData[req.field]) {
        toast.error(`Complete el campo requerido: ${req.label}`);
        return false;
      }
      if (req.min !== undefined && environmentalData[req.field]) {
        const val = parseFloat(environmentalData[req.field]);
        if (val < req.min) { toast.error(`${req.label} debe ser ≥ ${req.min}`); return false; }
      }
      if (req.max !== undefined && environmentalData[req.field]) {
        const val = parseFloat(environmentalData[req.field]);
        if (val > req.max) { toast.error(`${req.label} debe ser ≤ ${req.max}`); return false; }
      }
    }

    // Validate grids have data
    const newErrors: Record<string, Set<string>> = {};
    let hasErrors = false;
    for (const grid of grids) {
      const gridData = gridDataMap[grid.id] || {};
      const rows = Object.keys(gridData);
      if (rows.length === 0) {
        toast.error(`Complete la tabla: ${grid.title}`);
        return false;
      }
      const errorSet = new Set<string>();
      for (const rIdx of rows) {
        const row = gridData[Number(rIdx)];
        for (const col of grid.columns) {
          if (col.required && col.editable && !row[col.key]) {
            errorSet.add(`${rIdx}-${col.key}`);
            hasErrors = true;
          }
        }
      }
      newErrors[grid.id] = errorSet;
    }
    setValidationErrors(newErrors);

    if (hasErrors) {
      toast.error('Complete todos los campos requeridos marcados en rojo');
      return false;
    }

    return true;
  }, [selectedInstrument, selectedStandard, environmentalData, matchedSchema, grids, gridDataMap]);

  // ─── Save as draft ───  
  const handleSaveDraft = async () => {
    if (!selectedInstrument || !selectedStandard || !matchedSchema) {
      toast.error('Seleccione instrumento y patrón primero');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      const res = await api.post('/calibration/sessions', {
        instrument_id: parseInt(selectedInstrument),
        procedure_schema_id: matchedSchema.id,
        category: selectedInst?.category || '',
        ambient_temperature: parseFloat(environmentalData.air_temperature || '20'),
        ambient_temperature_uncertainty: parseFloat(tempUncertainty || '1.0'),
        ambient_humidity: parseFloat(environmentalData.humidity || '50'),
        ambient_pressure: environmentalData.ambient_pressure ? parseFloat(environmentalData.ambient_pressure) : null,
        observation: technicianObservation || null,
        standard_ids: [parseInt(selectedStandard)],
        calibration_date: calibrationDate || new Date().toISOString().split('T')[0],
        next_calibration_date: nextCalibrationDate || null,
      });

      // Update the session with raw payload
      if (res.data.session_id) {
        await api.put(`/calibration/sessions/${res.data.session_id}`, {
          raw_payload: payload,
        });
      }

      toast.success(`Borrador guardado (Sesión #${res.data.session_id})`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error guardando borrador';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Submit for calculation ───
  const handleSubmit = async () => {
    if (!validateFields()) return;

    if (!isStrategyImplemented) {
      toast.error(`La Strategy para ${procedureCode} aún no está implementada en el backend. Solo ME-005 (Balanza) y ME-003 (Manómetro) están disponibles.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload();

      // 1. Create session as draft
      const createRes = await api.post('/calibration/sessions', {
        instrument_id: parseInt(selectedInstrument),
        procedure_schema_id: matchedSchema.id,
        category: selectedInst?.category || '',
        ambient_temperature: parseFloat(environmentalData.air_temperature || '20'),
        ambient_temperature_uncertainty: parseFloat(tempUncertainty || '1.0'),
        ambient_humidity: parseFloat(environmentalData.humidity || '50'),
        ambient_pressure: environmentalData.ambient_pressure ? parseFloat(environmentalData.ambient_pressure) : null,
        observation: technicianObservation || null,
        standard_ids: [parseInt(selectedStandard)],
        calibration_date: calibrationDate || new Date().toISOString().split('T')[0],
        next_calibration_date: nextCalibrationDate || null,
      });

      const sessionId = createRes.data.session_id;

      // 2. Submit with raw_payload to trigger Strategy calculation
      const submitRes = await api.post(`/calibration/sessions/${sessionId}/submit`, {
        raw_payload: payload,
      });

      setBudgetResult(submitRes.data.budget_preview);
      toast.success(`✅ Sesión #${sessionId} procesada y enviada a revisión`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Error procesando calibración';
      toast.error(msg);
      console.error('Submit error:', err.response?.data);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading state ───
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2" style={{ color: 'var(--text-muted)' }}>
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Cargando inventario del laboratorio...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 animate-fadeIn max-w-[1400px] mx-auto">

      {/* ══════════════════════════════════════════════════════ */}
      {/* ═══ PASO 1: SELECCIÓN + CONDICIONES AMBIENTALES ═══  */}
      {/* ══════════════════════════════════════════════════════ */}
      <div id="tour-cal-step1" className="panel rounded-md shadow-sm p-5 w-full">
        <h3 className="text-sm font-semibold mb-5 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <StepBadge n={1} />
          Identificación del Ensayo
        </h3>

        {/* Instrument + Standard selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div id="tour-cal-instrument" className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Equipo a Calibrar <span className="text-red-500">*</span>
            </label>
            <select value={selectedInstrument}
              onChange={e => { setSelectedInstrument(e.target.value); setBudgetResult(null); }}
              className="w-full h-9 px-3 rounded input-theme text-xs">
              <option value="">— Seleccione Instrumento —</option>
              {instruments.map(i => (
                <option key={i.id} value={i.id}>
                  {i.internal_code} — {i.name} {i.brand} ({i.category})
                </option>
              ))}
            </select>
          </div>
          <div id="tour-cal-standard" className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Patrón de Referencia <span className="text-red-500">*</span>
            </label>
            <select value={selectedStandard}
              onChange={e => setSelectedStandard(e.target.value)}
              disabled={!!selectedInst && filteredStandards.length === 0}
              className="w-full h-9 px-3 rounded input-theme text-xs disabled:opacity-50 disabled:cursor-not-allowed">
              <option value="">{selectedInst ? `— Patrones de ${selectedInst.category} —` : '— Seleccione Instrumento primero —'}</option>
              {filteredStandards.map(s => (
                <option key={s.id} value={s.id}>
                  {s.internal_code} — {s.name}
                </option>
              ))}
            </select>

            {/* ── No-standards warning ─────────────────────── */}
            <AnimatePresence>
              {selectedInst && filteredStandards.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[11px] mt-1"
                    style={{ backgroundColor: '#EF444410', border: '1px solid #EF444435', color: '#EF4444' }}>
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span>
                      No hay patrones de referencia registrados para la categoría{' '}
                      <strong className="font-semibold">"{selectedInst.category}"</strong>.{' '}
                      Sin un patrón válido no es posible calibrar este equipo.{' '}
                      <Link href={`/standards?new=${selectedInst.category}`} className="underline font-semibold hover:opacity-80 transition-opacity">
                        Registrar patrón →
                      </Link>
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Instrument Info Card */}
        <AnimatePresence>
          {selectedInst && (
            <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 16 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-md" style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                <InfoChip label="Resolución" value={`${selectedInst.resolution} ${selectedInst.unit}`} />
                <InfoChip label="Rango" value={`${selectedInst.range_min ?? 0} — ${selectedInst.range_max ?? '∞'} ${selectedInst.unit}`} />
                <InfoChip label="S/N" value={selectedInst.serial_number} />
                <InfoChip label="Ubicación" value={selectedInst.location || '—'} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Schema loading */}
        {loadingSchema && (
          <div className="mt-4 p-4 text-center flex items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={14} className="animate-spin" />
            <span className="text-[11px]">Descargando esquema del procedimiento...</span>
          </div>
        )}

        {/* Dynamic Metadata Requirements */}
        <AnimatePresence>
          {matchedSchema && selectedInstrument && !loadingSchema && (
            <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 20 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden">
              <div id="tour-cal-ambient" className="p-4 rounded-md" style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                    <Info size={13} style={{ color: COLORS.primary }} />
                    Condiciones Ambientales
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                    {matchedSchema.code} v{matchedSchema.version}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(matchedSchema.ui_schema?.metadata_requirements || []).map((req: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {req.label} {req.required && <span className="text-red-500">*</span>}
                      </label>
                      <div className="relative">
                        <input type={req.type === 'number' ? 'number' : 'text'}
                          value={environmentalData[req.field] || ''}
                          onChange={e => setEnvironmentalData({ ...environmentalData, [req.field]: e.target.value })}
                          placeholder={req.default?.toString() || ''}
                          min={req.min} max={req.max}
                          step={req.type === 'number' ? 'any' : undefined}
                          className="w-full h-8 px-2.5 rounded input-theme text-xs font-mono pr-10" />
                        {req.unit && (
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium opacity-40">{req.unit}</span>
                        )}
                      </div>
                      {req.min !== undefined && req.max !== undefined && (
                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Rango: {req.min} – {req.max}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Static Certificate Fields (ISO 7.8.4) ──────────────── */}
              <div id="tour-cal-dates" className="mt-4 p-4 rounded-md" style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                <h4 className="text-[12px] font-semibold flex items-center gap-1.5 mb-4" style={{ color: 'var(--text-main)' }}>
                  <BookOpen size={13} style={{ color: C.accent }} />
                  Fechas &amp; Datos del Certificado
                  <span className="ml-auto text-[9px] px-2 py-0.5 rounded font-mono" style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-muted)' }}>ISO 7.8.4</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Temperature uncertainty */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Incert. Temperatura <span style={{ color: 'var(--text-muted)' }}>(±°C)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number" step="any" min="0" placeholder="1.0"
                        value={tempUncertainty}
                        onChange={e => setTempUncertainty(e.target.value)}
                        className="w-full h-8 px-2.5 rounded input-theme text-xs font-mono pr-10"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium opacity-40">°C</span>
                    </div>
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Incertidumbre del termómetro ambiental</span>
                  </div>

                  {/* Calibration date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Fecha de Calibración
                    </label>
                    <input
                      type="date"
                      value={calibrationDate}
                      onChange={e => setCalibrationDate(e.target.value)}
                      className="w-full h-8 px-2.5 rounded input-theme text-xs font-mono"
                    />
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Fecha en que se realizó físicamente</span>
                  </div>

                  {/* Next calibration date — required */}
                  <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                    <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Próxima Calibración <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={nextCalibrationDate}
                      onChange={e => setNextCalibrationDate(e.target.value)}
                      min={calibrationDate}
                      className="w-full h-8 px-2.5 rounded input-theme text-xs font-mono"
                      style={!nextCalibrationDate ? { border: '1px solid #EF444460' } : undefined}
                    />
                    <span className="text-[9px]" style={{ color: nextCalibrationDate ? 'var(--text-muted)' : '#EF4444' }}>
                      {nextCalibrationDate
                        ? `Intervalo: ${Math.round((new Date(nextCalibrationDate).getTime() - new Date(calibrationDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} meses`
                        : 'Requerido — se imprime en el certificado ISO 17025'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observaciones del técnico */}
              <div id="tour-cal-observations" className="space-y-1 mt-4">
                <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Observaciones del Técnico (ISO 7.8.2.j)
                </label>
                <textarea
                  value={technicianObservation}
                  onChange={e => setTechnicianObservation(e.target.value)}
                  placeholder="Ingrese observaciones adicionales sobre la calibración (opcional)..."
                  rows={3}
                  className="w-full px-2.5 py-2 rounded input-theme text-xs"
                  style={{ resize: 'vertical', minHeight: '60px' }}
                />
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Estas observaciones aparecerán en el certificado de calibración</span>
              </div>


              {/* Strategy warning */}
              {!isStrategyImplemented && (
                <div className="mt-3 p-3 rounded-md flex items-start gap-2 text-[11px]" style={{ backgroundColor: 'rgba(255,180,0,0.1)', border: '1px solid rgba(255,180,0,0.3)', color: '#d97706' }}>
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>La Strategy de cálculo para <strong>{procedureCode}</strong> aún no está implementada en el backend. Podrá llenar las tablas y guardar como borrador, pero el envío a revisión no está disponible.</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ═══ PASO 2: TABLAS DINÁMICAS DE MEDICIÓN ══════════  */}
      {/* ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {matchedSchema && selectedInstrument && selectedStandard && !loadingSchema && (
          <motion.div id="tour-cal-step2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="panel rounded-md shadow-sm p-5 w-full">
            <h3 className="text-sm font-semibold mb-5 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <StepBadge n={2} />
              Registro de Mediciones — {matchedSchema.name}
            </h3>

            {/* Standard info */}
            {selectedStd && (
              <div className="mb-5 p-3 rounded-md flex items-center gap-4 text-[11px]" style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Patrón:</span>
                <span className="font-medium">{selectedStd.name}</span>
                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>U = {selectedStd.uncertainty_u}, k = {selectedStd.k_factor}</span>
                <span style={{ color: 'var(--text-muted)' }}>Cert: {selectedStd.certificate_number}</span>
              </div>
            )}

            {/* Render each grid from JSON Schema */}
            <div className="space-y-8">
              {grids.map((grid: GridSchema, gIdx: number) => (
                <DynamicGrid
                  key={grid.id}
                  grid={grid}
                  gridIndex={gIdx}
                  data={gridDataMap[grid.id] || {}}
                  onChange={handleGridChange}
                  validationErrors={validationErrors[grid.id]}
                  instrumentInfo={selectedInst ? {
                    resolution: selectedInst.resolution,
                    unit: selectedInst.unit,
                    range_min: selectedInst.range_min,
                    range_max: selectedInst.range_max,
                  } : undefined}
                />
              ))}
            </div>

            {/* Action buttons */}
            {!budgetResult && (
              <div className="flex items-center justify-center gap-4 mt-8 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSaveDraft} disabled={saving}
                  className="h-10 px-5 rounded-md text-xs font-semibold shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                  style={{ border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar Borrador
                </motion.button>

                <motion.button id="tour-cal-submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit} disabled={submitting || !isStrategyImplemented}
                  className="h-10 px-6 rounded-md text-xs font-semibold text-white shadow-md flex items-center gap-2 transition-colors disabled:opacity-50"
                  style={{ backgroundColor: isStrategyImplemented ? C.accent : '#6b7280' }}>
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
                  Procesar GUM e Enviar a Revisión
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ═══ PASO 3: RESULTADOS REALES DEL BACKEND ═════════  */}
      {/* ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {budgetResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="panel rounded-md shadow-sm w-full overflow-hidden" style={{ borderLeft: `4px solid ${COLORS.success}` }}>
            <div className="p-5">
              <h3 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: COLORS.success }}>
                <StepBadge n={3} color={COLORS.success} />
                Presupuesto de Incertidumbre — Resultado GUM
              </h3>
              <p className="text-[11px] mb-5" style={{ color: 'var(--text-muted)' }}>
                Cálculos ejecutados por el motor metrológico del backend (Strategy {procedureCode}). Sesión congelada e inmutable.
              </p>

              {/* Unified matrix table — auto-detects instrument type */}
              <UnifiedResultsTable
                points={budgetResult.points || []}
                functions={budgetResult.functions}
                unit={selectedInst?.unit}
                procedureCode={procedureCode}
              />

              {/* Traceability accordion */}
              <TraceabilityAccordion />

              {/* Final actions */}
              <div className="mt-6 pt-4 flex justify-end" style={{ borderTop: '1px solid var(--border-color)' }}>
                <button onClick={() => router.push('/calibration')}
                  className="h-9 px-6 rounded text-[11px] font-medium text-white shadow-sm flex items-center gap-1.5 transition-transform active:scale-95"
                  style={{ backgroundColor: C.accent }}>
                  <Send size={14} /> Ver en Bandeja de Revisión
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────── */

function StepBadge({ n, color }: { n: number; color?: string }) {
  return (
    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
      style={{ backgroundColor: color || COLORS.primary }}>{n}</span>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-[11px] font-medium font-mono truncate" style={{ color: 'var(--text-main)' }}>{value}</p>
    </div>
  );
}

/* ─── Unified Results Table ─────────────────────────────── */
/* Handles two backend response shapes:                        */
/*   Standard  → { points: [...] }         (Balanza, Manóm., etc.) */
/*   Vernier   → { functions: { exterior, interior, depth } } */
function UnifiedResultsTable({
  points,
  functions,
  unit,
  procedureCode,
}: {
  points: any[];
  functions?: Record<string, any[]>;
  unit?: string;
  procedureCode?: string;
}) {
  // ── Vernier: flatten multi-function results ──
  const isVernier = procedureCode === 'DIM-001' || !!functions;

  if (isVernier && functions) {
    const funcLabels: Record<string, string> = {
      exterior: 'Bocas Exteriores',
      interior: 'Bocas Interiores',
      depth:    'Sonda de Profundidad',
    };

    return (
      <div className="flex flex-col gap-8">
        {Object.entries(functions).map(([funcKey, funcPoints]) => {
          if (!funcPoints || funcPoints.length === 0) return null;
          return (
            <div key={funcKey}>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-muted)' }}>
                📐 {funcLabels[funcKey] ?? funcKey}
              </p>
              {/* Reuse standard table for each function's points with µm unit */}
              <VernierFunctionTable points={funcPoints} />
            </div>
          );
        })}
      </div>
    );
  }

  // ── Standard instruments ──
  if (!points.length) return null;

  const first = points[0];

  // Unique sources from first point (constant across all points for balances)
  const sources: any[] = first?.uncertainty_sources || [];

  // Helper: check if a numeric extractor gives the same value for every point
  const isConstant = (fn: (pt: any) => number | undefined) => {
    const vals = points.map(fn);
    return vals.every(v => v === vals[0]);
  };

  const ucConstant = isConstant(p => p.combined_uncertainty);
  const kConstant  = isConstant(p => p.k_factor);
  const uConstant  = isConstant(p => p.expanded_uncertainty);

  const bd       = '1px solid var(--border-color)';
  const bdStrong = '2px solid var(--border-color)';
  const thMuted  = { color: 'var(--text-muted)', borderColor: 'var(--border-color)' };

  const typeBadge = (type: string) => (
    <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase"
      style={{
        backgroundColor: type === 'A' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)',
        color:           type === 'A' ? '#10B981' : '#818CF8',
        border:          `1px solid ${type === 'A' ? '#10B98130' : '#818CF830'}`,
      }}>{type}</span>
  );

  // Rows that vary per point → shown in bottom section
  const varPerPoint = !uConstant; // If U differs, so does Error

  return (
    <div className="flex flex-col gap-4">

      {/* ══ TABLE 1: UNCERTAINTY BUDGET ══ */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Presupuesto de Incertidumbre (GUM)
        </p>
        <div className="rounded-md overflow-hidden" style={{ border: bd }}>
          <table className="w-full text-xs text-left">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: bdStrong }}>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold" style={{ ...thMuted, width: 220, borderRight: bd }}>Fuente</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-center" style={{ ...thMuted, width: 44, borderRight: bd }}>Tipo</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold" style={{ ...thMuted, borderRight: bd }}>Distribución</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-right" style={{ ...thMuted, borderRight: bd }}>u(xi) [{unit}]</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-right" style={thMuted}>ν (g.l.)</th>
              </tr>
            </thead>
            <tbody>
              {/* Uncertainty sources — values are constant, show once */}
              {sources.map((src: any, i: number) => (
                <tr key={i} className="td-theme hover-bg transition-colors" style={{ borderBottom: bd }}>
                  <td className="px-3 py-2 font-medium" style={{ borderRight: bd, color: 'var(--text-main)' }}>{src.source_name}</td>
                  <td className="px-3 py-2 text-center" style={{ borderRight: bd }}>{typeBadge(src.type)}</td>
                  <td className="px-3 py-2 text-[11px]" style={{ borderRight: bd, color: 'var(--text-muted)' }}>{src.distribution}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold" style={{ borderRight: bd, color: 'var(--text-main)' }}>
                    {typeof src.standard_uncertainty === 'number' ? src.standard_uncertainty.toFixed(6) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-muted)' }}>
                    {src.degrees_of_freedom ?? '∞'}
                  </td>
                </tr>
              ))}

              {/* Divider */}
              <tr style={{ backgroundColor: 'var(--bg-app)', borderTop: bdStrong, borderBottom: bd }}>
                <td colSpan={5} className="px-3 py-0.5" />
              </tr>

              {/* u_c — show once if constant */}
              {ucConstant && (
                <tr className="td-theme" style={{ borderBottom: bd }}>
                  <td className="px-3 py-2 font-semibold italic" style={{ borderRight: bd, color: 'var(--text-muted)' }}>u_c (Combinada)</td>
                  <td className="px-3 py-2" style={{ borderRight: bd }} />
                  <td className="px-3 py-2" style={{ borderRight: bd }} />
                  <td className="px-3 py-2 text-right font-mono font-bold" style={{ borderRight: bd, color: 'var(--text-main)' }}>
                    {first.combined_uncertainty?.toFixed(6) ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-muted)' }}>—</td>
                </tr>
              )}

              {/* k — show once if constant */}
              {kConstant && (
                <tr className="td-theme" style={{ borderBottom: uConstant ? `2px solid ${COLORS.primary}` : bd }}>
                  <td className="px-3 py-2 font-semibold italic" style={{ borderRight: bd, color: 'var(--text-muted)' }}>k (Factor de cobertura, 95.45%)</td>
                  <td className="px-3 py-2" style={{ borderRight: bd }} />
                  <td className="px-3 py-2" style={{ borderRight: bd }} />
                  <td className="px-3 py-2 text-right font-mono font-bold" style={{ borderRight: bd, color: 'var(--text-main)' }}>
                    {first.k_factor?.toFixed(2) ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-muted)' }}>—</td>
                </tr>
              )}

              {/* U — show once in budget table if constant */}
              {uConstant && (
                <tr style={{ backgroundColor: 'rgba(255,165,38,0.06)', borderTop: `2px solid ${COLORS.primary}` }}>
                  <td className="px-3 py-2.5 font-bold" style={{ borderRight: bd, color: COLORS.primary }}>U (Incertidumbre Expandida)</td>
                  <td className="px-3 py-2.5" style={{ borderRight: bd }} />
                  <td className="px-3 py-2.5" style={{ borderRight: bd }} />
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-[13px]" style={{ borderRight: bd, color: COLORS.primary }}>
                    ± {first.expanded_uncertainty?.toFixed(4) ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono" style={{ color: 'var(--text-muted)' }}>—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ TABLE 2: PER-POINT RESULTS — transposed (points as columns) ══ */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Resultados por Punto Nominal
        </p>
        <div className="rounded-md overflow-hidden" style={{ border: bd }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: bdStrong }}>
                {/* Row-label header cell */}
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-left"
                  style={{ ...thMuted, borderRight: bd, width: 160 }}>Métrica</th>
                {/* One column per nominal point */}
                {points.map((pt: any, i: number) => (
                  <th key={i} className="px-3 py-2 text-[10px] font-bold text-center"
                    style={{
                      borderLeft: i > 0 ? bd : undefined,
                      color: COLORS.primary,
                      backgroundColor: 'rgba(255,165,38,0.06)',
                    }}>
                    {pt.nominal_value} <span className="text-[9px] font-normal opacity-60">{unit}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>

              {/* ── Auto-detect instrument type from data shape ── */}
              {(() => {
                // Manometer-specific: has error_ascending / error_descending / hysteresis
                const hasDescending   = points.some((p: any) => p.error_descending != null);
                const hasHysteresis   = points.some((p: any) => typeof p.hysteresis === 'number' && p.hysteresis > 0);
                const errorLabel      = hasDescending ? 'Error ↑ (Asc.)' : 'Error (E)';
                const hasVarU         = varPerPoint;

                return (
                  <>
                    {/* ROW: Error — "↑" label when descending also exists */}
                    <tr className="td-theme" style={{ borderBottom: bd }}>
                      <td className="px-3 py-2.5 font-semibold" style={{ borderRight: bd, color: 'var(--text-muted)' }}>
                        {errorLabel}
                      </td>
                      {points.map((pt: any, i: number) => (
                        <td key={i} className="px-3 py-2.5 text-center font-mono"
                          style={{ borderLeft: i > 0 ? bd : undefined, color: 'var(--text-main)' }}>
                          {typeof pt.error === 'number' ? pt.error.toFixed(4) : '0.0000'}
                          <span className="text-[9px] opacity-50 ml-0.5">{unit}</span>
                        </td>
                      ))}
                    </tr>

                    {/* ROW: Error descendente — manómetros únicamente */}
                    {hasDescending && (
                      <tr className="td-theme" style={{ borderBottom: bd }}>
                        <td className="px-3 py-2.5 font-semibold" style={{ borderRight: bd, color: 'var(--text-muted)' }}>
                          Error ↓ (Desc.)
                        </td>
                        {points.map((pt: any, i: number) => (
                          <td key={i} className="px-3 py-2.5 text-center font-mono"
                            style={{ borderLeft: i > 0 ? bd : undefined, color: 'var(--text-main)' }}>
                            {pt.error_descending != null ? Number(pt.error_descending).toFixed(4) : '—'}
                            <span className="text-[9px] opacity-50 ml-0.5">{unit}</span>
                          </td>
                        ))}
                      </tr>
                    )}

                    {/* ROW: Histéresis — manómetros únicamente, resaltada en ámbar suave */}
                    {hasHysteresis && (
                      <tr style={{ backgroundColor: 'rgba(251,191,36,0.05)', borderBottom: bd }}>
                        <td className="px-3 py-2.5 font-semibold" style={{ borderRight: bd, color: '#D97706' }}>
                          Histéresis (h)
                        </td>
                        {points.map((pt: any, i: number) => (
                          <td key={i} className="px-3 py-2.5 text-center font-mono font-semibold"
                            style={{ borderLeft: i > 0 ? bd : undefined, color: '#D97706' }}>
                            {typeof pt.hysteresis === 'number' ? pt.hysteresis.toFixed(4) : '—'}
                            <span className="text-[9px] font-normal opacity-60 ml-0.5">{unit}</span>
                          </td>
                        ))}
                      </tr>
                    )}

                    {/* ROW: u_c — only if it varies per point */}
                    {!ucConstant && (
                      <tr className="td-theme" style={{ borderBottom: bd }}>
                        <td className="px-3 py-2.5 font-semibold" style={{ borderRight: bd, color: 'var(--text-muted)' }}>u_c (Combinada)</td>
                        {points.map((pt: any, i: number) => (
                          <td key={i} className="px-3 py-2.5 text-center font-mono"
                            style={{ borderLeft: i > 0 ? bd : undefined, color: 'var(--text-main)' }}>
                            {pt.combined_uncertainty?.toFixed(6) ?? '—'}
                            <span className="text-[9px] opacity-50 ml-0.5">{unit}</span>
                          </td>
                        ))}
                      </tr>
                    )}

                    {/* ROW: k — only if it varies */}
                    {!kConstant && (
                      <tr className="td-theme" style={{ borderBottom: bd }}>
                        <td className="px-3 py-2.5 font-semibold" style={{ borderRight: bd, color: 'var(--text-muted)' }}>k (Factor)</td>
                        {points.map((pt: any, i: number) => (
                          <td key={i} className="px-3 py-2.5 text-center font-mono"
                            style={{ borderLeft: i > 0 ? bd : undefined, color: 'var(--text-main)' }}>
                            {pt.k_factor?.toFixed(2) ?? '—'}
                          </td>
                        ))}
                      </tr>
                    )}

                    {/* ROW: U expanded — only if it varies (e.g. when hysteresis differs per point) */}
                    {hasVarU && (
                      <tr style={{ backgroundColor: 'rgba(255,165,38,0.06)', borderTop: `2px solid ${COLORS.primary}` }}>
                        <td className="px-3 py-2.5 font-bold" style={{ borderRight: `1px solid ${COLORS.primary}40`, color: COLORS.primary }}>
                          U (Expandida)
                        </td>
                        {points.map((pt: any, i: number) => (
                          <td key={i} className="px-3 py-2.5 text-center font-mono font-bold"
                            style={{ borderLeft: i > 0 ? `1px solid ${COLORS.primary}40` : undefined, color: COLORS.primary }}>
                            ± {pt.expanded_uncertainty?.toFixed(4) ?? '—'}
                            <span className="text-[10px] font-normal opacity-60 ml-0.5">{unit}</span>
                          </td>
                        ))}
                      </tr>
                    )}
                  </>
                );
              })()}

            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}


/* ─── VernierFunctionTable ───────────────────────────────── */
/* Renders results for a single Vernier function (ext/int/depth). */
/* The backend returns values in µm internally; we show both µm and mm. */
function VernierFunctionTable({ points }: { points: any[] }) {
  if (!points || points.length === 0) return null;

  const first = points[0];
  const sources: any[] = first?.uncertainty_sources || [];

  const bd       = '1px solid var(--border-color)';
  const bdStrong = '2px solid var(--border-color)';
  const thMuted  = { color: 'var(--text-muted)', borderColor: 'var(--border-color)' };

  const typeBadge = (type: string) => (
    <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase"
      style={{
        backgroundColor: type === 'A' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)',
        color:           type === 'A' ? '#10B981' : '#818CF8',
        border:          `1px solid ${type === 'A' ? '#10B98130' : '#818CF830'}`,
      }}>{type}</span>
  );

  return (
    <div className="flex flex-col gap-4">

      {/* ══ TABLE 1: BUDGET — sources from first point (same structure for all) ══ */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Presupuesto de Incertidumbre (GUM) — Fuentes
        </p>
        <div className="rounded-md overflow-hidden" style={{ border: bd }}>
          <table className="w-full text-xs text-left">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: bdStrong }}>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold" style={{ ...thMuted, width: 260, borderRight: bd }}>Fuente</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-center" style={{ ...thMuted, width: 44, borderRight: bd }}>Tipo</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold" style={{ ...thMuted, borderRight: bd }}>Distribución</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-right" style={{ ...thMuted, borderRight: bd }}>u(xi) [µm]</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-right" style={thMuted}>ν (g.l.)</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((src: any, i: number) => (
                <tr key={i} className="td-theme hover-bg transition-colors" style={{ borderBottom: bd }}>
                  <td className="px-3 py-2 font-medium" style={{ borderRight: bd, color: 'var(--text-main)' }}>
                    <span className="block">{src.source_name}</span>
                    {src.note && (
                      <span className="block text-[9px] mt-0.5 opacity-50 font-normal font-mono truncate max-w-[240px]" title={src.note}>
                        {src.note}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center" style={{ borderRight: bd }}>{typeBadge(src.type)}</td>
                  <td className="px-3 py-2 text-[11px]" style={{ borderRight: bd, color: 'var(--text-muted)' }}>{src.distribution}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold" style={{ borderRight: bd, color: 'var(--text-main)' }}>
                    {typeof src.standard_uncertainty === 'number' ? src.standard_uncertainty.toFixed(4) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-muted)' }}>
                    {src.degrees_of_freedom ?? '∞'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ TABLE 2: PER-POINT RESULTS — transposed (points as columns) ══ */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Resultados por Punto Nominal
        </p>
        <div className="rounded-md overflow-hidden" style={{ border: bd }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: bdStrong }}>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-left"
                  style={{ ...thMuted, borderRight: bd, width: 160 }}>Métrica</th>
                {points.map((pt: any, i: number) => (
                  <th key={i} className="px-3 py-2 text-[10px] font-bold text-center"
                    style={{
                      borderLeft: i > 0 ? bd : undefined,
                      color: COLORS.primary,
                      backgroundColor: 'rgba(255,165,38,0.06)',
                    }}>
                    {pt.nominal_value} <span className="text-[9px] font-normal opacity-60">mm</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Long. patrón (mm) */}
              <tr className="td-theme" style={{ borderBottom: bd }}>
                <td className="px-3 py-2 font-semibold" style={{ borderRight: bd, color: 'var(--text-muted)' }}>Patrón l_p (mm)</td>
                {points.map((pt: any, i: number) => (
                  <td key={i} className="px-3 py-2 text-center font-mono" style={{ borderLeft: i > 0 ? bd : undefined, color: 'var(--text-main)' }}>
                    {pt.standard_length_mm?.toFixed(4) ?? '—'}
                  </td>
                ))}
              </tr>

              {/* Media l̄_j (mm) */}
              <tr className="td-theme" style={{ borderBottom: bd }}>
                <td className="px-3 py-2 font-semibold" style={{ borderRight: bd, color: 'var(--text-muted)' }}>Media l̄_j (mm)</td>
                {points.map((pt: any, i: number) => (
                  <td key={i} className="px-3 py-2 text-center font-mono" style={{ borderLeft: i > 0 ? bd : undefined, color: 'var(--text-main)' }}>
                    {pt.mean_mm?.toFixed(4) ?? '—'}
                  </td>
                ))}
              </tr>

              {/* Desviación D_j (µm) */}
              <tr className="td-theme" style={{ borderBottom: bd }}>
                <td className="px-3 py-2 font-semibold" style={{ borderRight: bd, color: 'var(--text-muted)' }}>Desv. D_j (µm)</td>
                {points.map((pt: any, i: number) => (
                  <td key={i} className="px-3 py-2 text-center font-mono font-semibold"
                    style={{ borderLeft: i > 0 ? bd : undefined, color: 'var(--text-main)' }}>
                    {typeof pt.deviation_um === 'number'
                      ? (pt.deviation_um >= 0 ? '+' : '') + pt.deviation_um.toFixed(2)
                      : '—'}
                    <span className="text-[9px] opacity-50 ml-0.5">µm</span>
                  </td>
                ))}
              </tr>

              {/* s_j (µm) */}
              <tr className="td-theme" style={{ borderBottom: bd }}>
                <td className="px-3 py-2 font-semibold" style={{ borderRight: bd, color: 'var(--text-muted)' }}>Desv. típica s_j (µm)</td>
                {points.map((pt: any, i: number) => (
                  <td key={i} className="px-3 py-2 text-center font-mono" style={{ borderLeft: i > 0 ? bd : undefined, color: 'var(--text-muted)' }}>
                    {pt.std_deviation_um?.toFixed(2) ?? '—'}<span className="text-[9px] opacity-50 ml-0.5">µm</span>
                  </td>
                ))}
              </tr>

              {/* n lecturas */}
              <tr className="td-theme" style={{ borderBottom: bd }}>
                <td className="px-3 py-2 font-semibold" style={{ borderRight: bd, color: 'var(--text-muted)' }}>n (lecturas)</td>
                {points.map((pt: any, i: number) => (
                  <td key={i} className="px-3 py-2 text-center font-mono" style={{ borderLeft: i > 0 ? bd : undefined, color: 'var(--text-muted)' }}>
                    {pt.n_readings ?? '—'}
                  </td>
                ))}
              </tr>

              {/* u_c */}
              <tr className="td-theme" style={{ borderBottom: bd }}>
                <td className="px-3 py-2 font-semibold italic" style={{ borderRight: bd, color: 'var(--text-muted)' }}>u_c (µm)</td>
                {points.map((pt: any, i: number) => (
                  <td key={i} className="px-3 py-2 text-center font-mono" style={{ borderLeft: i > 0 ? bd : undefined, color: 'var(--text-main)' }}>
                    {pt.combined_uncertainty_um?.toFixed(3) ?? '—'}
                  </td>
                ))}
              </tr>

              {/* k (ν_eff) */}
              <tr className="td-theme" style={{ borderBottom: bd }}>
                <td className="px-3 py-2 font-semibold italic" style={{ borderRight: bd, color: 'var(--text-muted)' }}>k (Welch-S.)</td>
                {points.map((pt: any, i: number) => (
                  <td key={i} className="px-3 py-2 text-center font-mono" style={{ borderLeft: i > 0 ? bd : undefined, color: 'var(--text-main)' }}>
                    {pt.k_factor?.toFixed(2) ?? '—'}
                  </td>
                ))}
              </tr>

              {/* U expanded — highlighted row */}
              <tr style={{ backgroundColor: 'rgba(255,165,38,0.06)', borderTop: `2px solid ${COLORS.primary}` }}>
                <td className="px-3 py-2.5 font-bold" style={{ borderRight: `1px solid ${COLORS.primary}40`, color: COLORS.primary }}>
                  U (µm) / U (mm)
                </td>
                {points.map((pt: any, i: number) => (
                  <td key={i} className="px-3 py-2.5 text-center font-mono font-bold"
                    style={{ borderLeft: i > 0 ? `1px solid ${COLORS.primary}40` : undefined, color: COLORS.primary }}>
                    ± {pt.expanded_uncertainty_um?.toFixed(2) ?? '—'} µm
                    <span className="block text-[9px] font-normal opacity-70 mt-0.5">
                      = {pt.expanded_uncertainty_mm?.toFixed(4) ?? '—'} mm
                    </span>
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



function TraceabilityAccordion() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md mt-4" style={{ border: '1px solid var(--border-color)' }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-xs font-semibold hover-bg transition-colors"
        style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-2"><BookOpen size={14} /> Trazabilidad y Fórmulas GUM</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={14} /></motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <FormulaCard t="1. Incertidumbre Tipo A" f="u_A = s / √n" d="s = desviación estándar experimental, n = número de lecturas." />
              <FormulaCard t="2. Incertidumbre Tipo B (Resolución)" f="u_B1 = a / (2 × √3)" d="Distribución rectangular. a = resolución mínima del instrumento." />
              <FormulaCard t="3. Incertidumbre Tipo B (Patrón)" f="u_B2 = U_patrón / k" d="Distribución normal, k y U del certificado del patrón." />
              <FormulaCard t="4. Welch-Satterthwaite + Expandida" f="ν_eff = u_c⁴ / Σ(u_i⁴/ν_i)  |  U = k(ν) × u_c" d="Grados de libertad efectivos → k de tabla t-Student al 95.45%." />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FormulaCard({ t, f, d }: { t: string; f: string; d: string }) {
  return (
    <div className="space-y-2">
      <h5 className="text-[11px] font-bold" style={{ color: 'var(--text-main)' }}>{t}</h5>
      <div className="p-2 rounded text-center" style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
        <p className="font-mono text-xs" style={{ color: 'var(--text-main)' }}>{f}</p>
      </div>
      <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>{d}</p>
    </div>
  );
}

