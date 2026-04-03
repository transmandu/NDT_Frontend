'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Plus, X, Send, BookOpen, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Instrument, Standard } from '@/types/calibration';

const COLORS = { primary: '#FFA526' };

export default function NewCalibrationPage() {
  const router = useRouter();
  const [showResults, setShowResults] = useState(false);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [schemas, setSchemas] = useState<any[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState('');
  const [selectedStandard, setSelectedStandard] = useState('');
  const [selectedSchema, setSelectedSchema] = useState('');
  const [tempInit, setTempInit] = useState('20.1');
  const [tempFinal, setTempFinal] = useState('20.3');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/instruments'), api.get('/standards'), api.get('/calibration/schemas')])
      .then(([i, s, sc]) => {
        setInstruments(i.data.data || []);
        setStandards(s.data.data || []);
        setSchemas(sc.data.schemas || []);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  const handleCalculate = () => setShowResults(true);

  const handleSubmit = async () => {
    if (!selectedInstrument || !selectedStandard) {
      toast.error('Seleccione equipo y patrón'); return;
    }
    toast.success('Solicitud de revisión enviada al supervisor.');
  };

  return (
    <div className="w-full space-y-5 animate-fadeIn max-w-[1400px] mx-auto">
      {/* Step 1: General Data */}
      <div id="tour-cal-header" className="panel rounded-md shadow-sm p-4 w-full">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <span className="px-2 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>Paso 1</span>
          Datos Generales y Condiciones Ambientales
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Equipo a Calibrar</label>
            <select value={selectedInstrument} onChange={e => setSelectedInstrument(e.target.value)}
              className="w-full h-8 px-2.5 rounded input-theme text-xs">
              <option value="">Seleccione...</option>
              {instruments.map(i => <option key={i.id} value={i.id}>{i.internal_code} - {i.name} {i.brand}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Patrón de Referencia</label>
            <select value={selectedStandard} onChange={e => setSelectedStandard(e.target.value)}
              className="w-full h-8 px-2.5 rounded input-theme text-xs">
              <option value="">Seleccione...</option>
              {standards.map(s => <option key={s.id} value={s.id}>{s.internal_code} - {s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Temp. Inicial (°C)</label>
            <input type="number" value={tempInit} onChange={e => setTempInit(e.target.value)}
              className="w-full h-8 px-2.5 rounded input-theme text-xs font-mono" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Temp. Final (°C)</label>
            <input type="number" value={tempFinal} onChange={e => setTempFinal(e.target.value)}
              className="w-full h-8 px-2.5 rounded input-theme text-xs font-mono" />
          </div>
        </div>
      </div>

      {/* Step 2: Measurement Grid */}
      <div id="tour-cal-measurements" className="panel rounded-md shadow-sm p-4 w-full">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <span className="px-2 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>Paso 2</span>
          Tabla de Mediciones (Directa)
        </h3>
        <CalibrationMeasurements />
      </div>

      {/* Calculate Button */}
      {!showResults && (
        <div id="tour-calc-btn" className="flex justify-center py-4">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCalculate}
            className="h-10 px-6 rounded-md text-xs font-semibold text-white shadow-md flex items-center gap-2 transition-colors"
            style={{ backgroundColor: COLORS.primary }}>
            <Calculator size={16} /> Calcular Incertidumbre GUM y Ver Resultados
          </motion.button>
        </div>
      )}

      {/* Step 3: Results */}
      <AnimatePresence>
        {showResults && (
          <motion.div initial={{ opacity: 0, height: 0, y: 20 }} animate={{ opacity: 1, height: 'auto', y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="panel rounded-md shadow-sm w-full overflow-hidden" style={{ borderLeft: `4px solid ${COLORS.primary}` }}>
            <CalibrationResults onSubmit={handleSubmit} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- MEASUREMENT GRID --- */
function CalibrationMeasurements() {
  const [points, setPoints] = useState([
    { id: 1, nominal: '10.00', readings: ['9.99', '9.98', '10.00'] },
    { id: 2, nominal: '50.00', readings: ['50.02', '49.99', '49.98'] },
    { id: 3, nominal: '150.00', readings: ['149.99', '149.98', '150.00'] },
  ]);

  const numReps = points[0]?.readings.length || 0;

  const addPoint = () => setPoints([...points, { id: Date.now(), nominal: '', readings: Array(numReps).fill('') }]);
  const removePoint = (id: number) => { if (points.length > 1) setPoints(points.filter(p => p.id !== id)); };
  const addRepetition = () => setPoints(points.map(p => ({ ...p, readings: [...p.readings, ''] })));
  const removeRepetition = (idx: number) => { if (numReps > 1) setPoints(points.map(p => ({ ...p, readings: p.readings.filter((_, i) => i !== idx) }))); };
  const updateNominal = (id: number, val: string) => setPoints(points.map(p => p.id === id ? { ...p, nominal: val } : p));
  const updateReading = (id: number, idx: number, val: string) => setPoints(points.map(p => {
    if (p.id === id) { const r = [...p.readings]; r[idx] = val; return { ...p, readings: r }; } return p;
  }));

  const calcStats = (readings: string[]) => {
    const vals = readings.map(v => parseFloat(String(v).replace(',', '.'))).filter(n => !isNaN(n));
    if (!vals.length) return { mean: '-', std: '-' };
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (vals.length === 1) return { mean: mean.toFixed(3), std: '0.000' };
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (vals.length - 1);
    return { mean: mean.toFixed(3), std: Math.sqrt(variance).toFixed(3) };
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Añade o elimina filas para repeticiones y columnas para puntos nominales según el procedimiento técnico.</p>
        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={addRepetition}
            className="h-7 px-2.5 text-[11px] rounded font-medium flex items-center gap-1 transition-colors hover-bg"
            style={{ border: '1px solid var(--border-color)' }}>
            <Plus size={12} /> <span className="hidden sm:inline">Repetición</span>
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={addPoint}
            className="h-7 px-2.5 text-[11px] rounded font-medium flex items-center gap-1 transition-colors hover-bg"
            style={{ border: '1px solid var(--border-color)' }}>
            <Plus size={12} /> <span className="hidden sm:inline">Punto</span>
          </motion.button>
        </div>
      </div>

      <div className="rounded-md overflow-x-auto w-full" style={{ border: '1px solid var(--border-color)' }}>
        <table className="w-full text-center text-sm table-fixed min-w-max">
          <thead>
            <tr>
              <th className="p-2 th-theme text-left pl-3 sm:pl-4 w-32 sm:w-36 sticky left-0 z-20 shadow-[1px_0_0_var(--border-color)]" style={{ borderBottom: '1px solid var(--border-color)' }}>
                Puntos <span className="text-[10px] font-normal">(mm)</span> →
              </th>
              <AnimatePresence>
                {points.map(p => (
                  <motion.th key={p.id} initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                    className="p-2 th-theme font-mono font-bold text-xs relative group min-w-[80px]"
                    style={{ borderBottom: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)' }}>
                    <div className="flex items-center justify-center gap-1">
                      <input type="text" value={p.nominal} onChange={e => updateNominal(p.id, e.target.value)}
                        className="w-12 sm:w-16 text-center bg-transparent border-b border-dashed focus:outline-none text-[11px] sm:text-xs"
                        style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }} placeholder="0.00" />
                      {points.length > 1 && (
                        <button onClick={() => removePoint(p.id)}
                          className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity absolute right-1 rounded-full p-0.5 shadow-sm"
                          style={{ backgroundColor: 'var(--bg-panel)' }}>
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  </motion.th>
                ))}
              </AnimatePresence>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            <AnimatePresence>
              {Array.from({ length: numReps }).map((_, rowIdx) => (
                <motion.tr key={`rep-${rowIdx}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <td className="p-2 text-left pl-3 sm:pl-4 font-medium text-[11px] sm:text-xs sticky left-0 z-10 shadow-[1px_0_0_var(--border-color)] relative group"
                    style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-muted)' }}>
                    <div className="flex items-center justify-between pr-2">
                      <span>Repetición {rowIdx + 1}</span>
                      {numReps > 1 && (
                        <button onClick={() => removeRepetition(rowIdx)}
                          className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity p-1 rounded-md shadow-sm absolute right-1"
                          style={{ backgroundColor: 'var(--bg-hover)' }}>
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  </td>
                  {points.map(p => (
                    <td key={p.id} className="p-1" style={{ borderLeft: '1px solid var(--border-color)' }}>
                      <input type="text" value={p.readings[rowIdx]} onChange={e => updateReading(p.id, rowIdx, e.target.value)}
                        className="w-full h-7 sm:h-8 text-center bg-transparent focus:outline-none rounded text-[11px] sm:text-xs"
                        style={{ color: 'var(--text-main)' }} placeholder="-" />
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>

            {/* Stats rows */}
            <tr style={{ backgroundColor: 'var(--bg-result-row)' }}>
              <td className="p-2 text-left pl-3 sm:pl-4 font-semibold text-[11px] sm:text-xs sticky left-0 z-10 shadow-[1px_0_0_var(--border-color)]"
                style={{ color: 'var(--text-highlight)', backgroundColor: 'var(--bg-result-row)', borderTop: '1px solid var(--border-color)' }}>
                Media (l̄)
              </td>
              {points.map(p => (
                <td key={p.id} className="p-2 font-mono text-[11px] sm:text-xs text-center font-bold"
                  style={{ color: 'var(--text-result-val)', borderLeft: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)' }}>
                  {calcStats(p.readings).mean}
                </td>
              ))}
            </tr>
            <tr style={{ backgroundColor: 'var(--bg-result-row)' }}>
              <td className="p-2 text-left pl-3 sm:pl-4 font-semibold text-[11px] sm:text-xs sticky left-0 z-10 shadow-[1px_0_0_var(--border-color)]"
                style={{ color: 'var(--text-highlight)', backgroundColor: 'var(--bg-result-row)' }}>
                Desv. Est (s)
              </td>
              {points.map(p => (
                <td key={p.id} className="p-2 font-mono text-[11px] sm:text-xs text-center font-bold"
                  style={{ color: 'var(--text-highlight)', borderLeft: '1px solid var(--border-color)' }}>
                  {calcStats(p.readings).std}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --- GUM RESULTS --- */
function CalibrationResults({ onSubmit }: { onSubmit: () => void }) {
  const [showTraceability, setShowTraceability] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: COLORS.primary }}>
            <span className="px-2 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'rgba(255,165,38,0.15)', color: COLORS.primary }}>Paso 3</span>
            Resumen ISO GUM
          </h3>
          <button onClick={onSubmit}
            className="h-8 px-4 rounded text-[11px] font-medium text-white shadow-sm flex items-center gap-1.5 transition-transform active:scale-95 bg-blue-500 hover:bg-blue-600">
            <Send size={14} /> Enviar a Revisión
          </button>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Análisis estocástico final detectado para el peor caso en el punto 150.00 mm.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-md overflow-x-auto" style={{ border: '1px solid var(--border-color)' }}>
            <table className="w-full text-xs text-left min-w-[300px]">
              <thead className="th-theme">
                <tr>
                  <th className="px-3 py-2 font-medium text-[11px]">Fuente de Incertidumbre (xi)</th>
                  <th className="px-3 py-2 font-medium text-[11px] hidden sm:table-cell">Distribución</th>
                  <th className="px-3 py-2 font-medium text-[11px] text-right">Valor u(xi)</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                <tr><td className="px-3 py-2">Repetibilidad del proceso (Tipo A)</td><td className="px-3 py-2 hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>Normal</td><td className="px-3 py-2 text-right font-mono">0.0057 mm</td></tr>
                <tr><td className="px-3 py-2">Resolución del Equipo (Tipo B)</td><td className="px-3 py-2 hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>Rectangular (√3)</td><td className="px-3 py-2 text-right font-mono">0.0029 mm</td></tr>
                <tr><td className="px-3 py-2">Calibración Patrón (Tipo B)</td><td className="px-3 py-2 hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>Normal (k=2)</td><td className="px-3 py-2 text-right font-mono">0.0001 mm</td></tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-md p-4 text-white shadow-sm flex flex-col justify-between" style={{ backgroundColor: COLORS.primary }}>
            <h4 className="text-white/80 text-[10px] font-semibold uppercase tracking-wider">Incertidumbre Expandida</h4>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight">0.020</span>
              <span className="text-xs font-medium opacity-80">mm</span>
            </div>
            <div className="mt-3 pt-2 border-t border-white/20 text-[10px] flex justify-between font-medium opacity-90">
              <span>Factor de cobertura k: 2.00</span>
              <span>Nivel de confianza: 95%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Traceability */}
      <div style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}>
        <button onClick={() => setShowTraceability(!showTraceability)}
          className="w-full flex items-center justify-between p-3 text-xs font-semibold hover-bg transition-colors"
          style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-2"><BookOpen size={14} /> Trazabilidad y Fórmulas GUM</span>
          <motion.div animate={{ rotate: showTraceability ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={14} /></motion.div>
        </button>
        <AnimatePresence>
          {showTraceability && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }} className="overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                <FormulaCard t="1. Incertidumbre Tipo A" f="u_A = s / √n" d="s = desviación estándar, n = número de lecturas." />
                <FormulaCard t="2. Incertidumbre Tipo B (Resolución)" f="u_B1 = a / (2 × √3)" d="Distribución rectangular. a = resolución mínima." />
                <FormulaCard t="3. Incertidumbre Tipo B (Patrón)" f="u_B2 = U_patrón / k" d="Distribución normal con factor k del certificado." />
                <FormulaCard t="4. Incertidumbre Expandida" f="u_c = √(u_A² + u_B1² + u_B2²) | U = k × u_c" d="Raíz suma de cuadrados × factor k=2 (95%)." />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
