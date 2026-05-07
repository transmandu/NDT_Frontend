'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sigma, Hash } from 'lucide-react';
import KaTeX, { MathBlock } from '@/components/math/KaTeX';
import type { UncertaintySource } from '@/types/calibration';

const ORANGE = '#FFA526';
const BLUE   = '#3b82f6';

interface PointResult {
  nominal_value: number;
  function?: string;
  mean_mm?: number;
  average_measured?: number;
  error?: number;
  std_deviation_um?: number;
  sj_used_um?: number;
  sj_source?: string;
  n_readings?: number;
  readings_mm?: number[];
  uncertainty_sources: UncertaintySource[];
  combined_uncertainty_um?: number;
  combined_uncertainty_mm?: number;
  combined_uncertainty?: number;
  effective_dof?: number;
  k_factor: number;
  expanded_uncertainty_um?: number;
  expanded_uncertainty_mm?: number;
  expanded_uncertainty?: number;
}

/* ─── Helpers ───────────────────────────────────────────────── */
const f = (n: number | undefined | null, p = 5): string => {
  if (n === undefined || n === null || isNaN(n as number)) return '—';
  return (n as number).toFixed(p);
};

const distLabel = (d: string) =>
  ({ normal: 'Normal', rectangular: 'Rectangular', triangular: 'Triangular' }[d] ?? d);

const funcLabel = (k?: string) =>
  ({ exterior: 'Bocas Ext.', interior: 'Bocas Int.', depth: 'Profundidad' }[k ?? ''] ?? k ?? '');

/* ─── TypeBadge ─────────────────────────────────────────────── */
function TypeBadge({ type }: { type: 'A' | 'B' }) {
  const isA = type === 'A';
  return (
    <span className="inline-flex items-center justify-center text-[9px] font-bold rounded px-1.5 py-0.5 uppercase"
      style={{
        backgroundColor: isA ? 'rgba(59,130,246,0.15)' : 'rgba(255,165,38,0.15)',
        color: isA ? BLUE : ORANGE,
        border: `1px solid ${isA ? 'rgba(59,130,246,0.3)' : 'rgba(255,165,38,0.3)'}`,
      }}>
      Tipo {type}
    </span>
  );
}

/* ─── Step ──────────────────────────────────────────────────── */
function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: number * 0.04, duration: 0.3 }} className="relative pl-10 pb-5">
      <div className="absolute left-[14px] top-8 bottom-0 w-px" style={{ backgroundColor: 'var(--border-color)' }} />
      <div className="absolute left-0 top-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
        style={{ backgroundColor: ORANGE }}>{number}</div>
      <h4 className="text-[12px] font-bold mb-2 pt-1" style={{ color: 'var(--text-main)' }}>{title}</h4>
      <div className="space-y-3">{children}</div>
    </motion.div>
  );
}

/* ─── BudgetTable ───────────────────────────────────────────── */
function BudgetTable({ src }: { src: UncertaintySource[] }) {
  if (!src.length) return null;
  const thStyle = { borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' };
  return (
    <div className="rounded-md overflow-x-auto" style={{ border: '1px solid var(--border-color)' }}>
      <table className="w-full text-xs" style={{ minWidth: 560 }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-app)' }}>
            {['Fuente', 'Tipo', 'Distribución', 'Valor', 'Divisor', 'cᵢ', 'uᵢ', 'νᵢ'].map((h, i) => (
              <th key={i} className={`px-2 py-2 text-[10px] font-semibold ${i === 0 ? 'text-left' : 'text-center'}`}
                style={{ ...thStyle, ...(i === 6 ? { color: ORANGE } : {}) }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {src.map((s, i) => (
            <tr key={i} className="hover-bg transition-colors" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td className="px-3 py-2 text-[10px] font-medium" style={{ color: 'var(--text-main)' }}>
                <div>{s.source_name}</div>
                {s.note && <div className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.note}</div>}
              </td>
              <td className="px-2 py-2 text-center"><TypeBadge type={s.type} /></td>
              <td className="px-2 py-2 text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>{distLabel(s.distribution)}</td>
              <td className="px-2 py-2 text-center font-mono text-[10px]">{f(s.value)}</td>
              <td className="px-2 py-2 text-center font-mono text-[10px]">{f(s.divisor, 3)}</td>
              <td className="px-2 py-2 text-center font-mono text-[10px]">{f(s.sensitivity_coefficient, 2)}</td>
              <td className="px-2 py-2 text-center font-mono text-[11px] font-bold" style={{ color: ORANGE }}>{f(s.standard_uncertainty)}</td>
              <td className="px-2 py-2 text-center font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {s.degrees_of_freedom !== null ? s.degrees_of_freedom : '∞'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── BudgetFormulas ────────────────────────────────────────── */
function BudgetFormulas({ src }: { src: UncertaintySource[] }) {
  if (!src.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {src.map((s, i) => {
        const formula = s.type === 'A'
          ? `u_A = \\frac{s_j}{\\sqrt{n}} = \\frac{${f(s.value, 5)}}{${f(s.divisor, 3)}} = ${f(s.standard_uncertainty)}`
          : `u_{B${i + 1}} = \\frac{${f(s.value, 5)}}{${f(s.divisor, 3)}} \\times ${f(s.sensitivity_coefficient, 2)} = ${f(s.standard_uncertainty)}`;
        return (
          <div key={i} className="px-3 py-2 rounded" style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <TypeBadge type={s.type} />
              <span className="text-[9px] font-medium truncate" style={{ color: 'var(--text-muted)' }}>{s.source_name.substring(0, 45)}</span>
            </div>
            <KaTeX tex={formula} block className="text-[11px]" />
          </div>
        );
      })}
    </div>
  );
}

/* ─── Shared Budget — always shown once above all point accordions ─ */
function SharedBudgetSection({ point, unit }: { point: PointResult; unit: string }) {
  const src = point.uncertainty_sources || [];
  const uc_um = point.combined_uncertainty_um;
  const uc_mm = point.combined_uncertainty_mm ?? point.combined_uncertainty;
  const dof   = point.effective_dof;
  const k     = point.k_factor;
  const U_um  = point.expanded_uncertainty_um;
  const U_mm  = point.expanded_uncertainty_mm ?? point.expanded_uncertainty;
  const texUnit = unit.replace(/μ/g, '\\mu ');

  const ucTex = uc_um !== undefined
    ? `${f(uc_um)} \\;\\mu\\text{m}`
    : `${f(uc_mm)} \\;\\text{${texUnit}}`;
  const UTex = U_um !== undefined
    ? `${f(U_um)} \\;\\mu\\text{m}`
    : `${f(U_mm)} \\;\\text{${texUnit}}`;

  return (
    <div className="rounded-md p-4 space-y-4 mb-6"
      style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderLeft: `3px solid ${ORANGE}` }}>

      <div>
        <p className="text-[10px] uppercase font-bold tracking-wider mb-0.5" style={{ color: ORANGE }}>
          Presupuesto de Incertidumbre (GUM) — Compartido
        </p>
        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          El presupuesto es una propiedad del instrumento — idéntico para todos los puntos nominales.
          Se muestra una sola vez con los valores reales sustituidos.
        </p>
      </div>

      <BudgetTable src={src} />
      <BudgetFormulas src={src} />

      {/* Combined uncertainty */}
      <MathBlock
        tex={`u_c = \\sqrt{${src.map(s => `${f(s.standard_uncertainty)}^2`).join(' + ')}} = ${ucTex}`}
        label="Incertidumbre combinada (suma en cuadratura)"
      />

      {/* Welch-Satterthwaite + k */}
      {dof !== undefined && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <MathBlock
            tex={`\\nu_{\\text{eff}} = \\frac{u_c^4}{\\displaystyle\\sum_i \\frac{u_i^4}{\\nu_i}} = ${f(dof, 1)}`}
            label="Welch-Satterthwaite (GUM G.2b)"
          />
          <MathBlock
            tex={`k = t_{95.45\\%}(\\nu_{\\text{eff}} = ${f(dof, 1)}) = ${f(k, 2)}`}
            label="Factor de cobertura"
            style={{ borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.04)' }}
          />
        </div>
      )}

      {/* U expandida */}
      <div className="p-4 rounded-md text-center"
        style={{ background: 'linear-gradient(135deg,rgba(255,165,38,0.08),rgba(255,165,38,0.02))', border: '2px solid rgba(255,165,38,0.3)' }}>
        <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
          Incertidumbre Expandida — Aplica a todos los puntos nominales
        </p>
        <KaTeX
          tex={`\\Large U = \\pm\\; ${UTex} \\quad (k=${f(k, 2)},\\; p \\approx 95\\%)`}
          block
        />
      </div>
    </div>
  );
}

/* ─── Point Header ──────────────────────────────────────────── */
function PointHeader({ point, index, n, unit }: { point: PointResult; index: number; n: number; unit: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-t-md"
      style={{ backgroundColor: 'rgba(255,165,38,0.08)', border: '1px solid rgba(255,165,38,0.2)' }}>
      <Hash size={14} style={{ color: ORANGE }} />
      <span className="text-[12px] font-bold" style={{ color: ORANGE }}>
        Punto {index + 1}: {point.nominal_value} {unit}
      </span>
      {point.function && (
        <span className="text-[9px] px-2 py-0.5 rounded font-medium"
          style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
          {funcLabel(point.function)}
        </span>
      )}
      <span className="text-[10px] font-mono ml-auto" style={{ color: 'var(--text-muted)' }}>n = {n} lecturas</span>
    </div>
  );
}

/* ─── Final Result Box ──────────────────────────────────────── */
function FinalResultBox({ U_um, U_mm, k, nominal, unit }: { U_um?: number; U_mm?: number; k: number; nominal: number; unit: string }) {
  const texUnit = unit.replace(/μ/g, '\\mu ');
  const UTex = U_um !== undefined
    ? `${f(U_um)} \\;\\mu\\text{m}`
    : `${f(U_mm)} \\;\\text{${texUnit}}`;
  return (
    <div className="p-4 rounded-md text-center"
      style={{ background: 'linear-gradient(135deg,rgba(255,165,38,0.08),rgba(255,165,38,0.02))', border: '2px solid rgba(255,165,38,0.3)' }}>
      <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
        Resultado Final — {nominal} {unit}
      </p>
      <KaTeX tex={`\\LARGE U = \\pm\\; ${UTex} \\quad (k=${f(k, 2)},\\; p \\approx 95\\%)`} block />
    </div>
  );
}

/* ─── Per-point accordion content ───────────────────────────── */
function PointBreakdown({ point, index, unit }: { point: PointResult; index: number; unit: string }) {
  const n = point.n_readings || 0;
  const k = point.k_factor;
  const U_um = point.expanded_uncertainty_um;
  const U_mm = point.expanded_uncertainty_mm ?? point.expanded_uncertainty;
  const readings = point.readings_mm || [];
  const texUnit = unit.replace(/μ/g, '\\mu ');
  const readingsStr = readings.map(r => f(r, 5)).join(',\\; ');
  const mean = point.mean_mm ?? point.average_measured;
  let sn = 1;

  return (
    <div className="space-y-1">
      <PointHeader point={point} index={index} n={n} unit={unit} />
      <div className="px-4 py-4 rounded-b-md space-y-0"
        style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderTop: 'none' }}>

        {readings.length > 0 && (
          <Step number={sn++} title="Lecturas Registradas">
            <MathBlock tex={`x_i = \\{${readingsStr}\\} \\quad [\\text{${texUnit}}]`} label="Lecturas registradas" />
          </Step>
        )}

        {mean !== undefined && (
          <Step number={sn++} title="Media Aritmética">
            <MathBlock
              tex={`\\bar{x} = \\frac{1}{${n}}\\sum_{i=1}^{${n}} x_i = ${f(mean)} \\;\\text{${texUnit}}`}
              label="Resultado"
              style={{ borderColor: 'rgba(255,165,38,0.3)', backgroundColor: 'rgba(255,165,38,0.04)' }}
            />
          </Step>
        )}

        {point.error !== undefined && (
          <Step number={sn++} title="Error de Indicación">
            <MathBlock
              tex={`E = \\bar{x} - P = ${f(mean)} - ${f(point.nominal_value)} = ${f(point.error)} \\;\\text{${texUnit}}`}
              label="Diferencia instrumento − patrón"
            />
          </Step>
        )}

        {point.std_deviation_um !== undefined && (
          <Step number={sn++} title="Desviación Estándar (Tipo A)">
            <MathBlock tex={`s_j = ${f(point.std_deviation_um)} \\;\\mu\\text{m}`} label="Repetibilidad del punto" />
            {point.sj_used_um !== undefined && point.sj_source && (
              <div className="text-[10px] px-3 py-2 rounded"
                style={{ backgroundColor: 'var(--bg-app)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                <strong style={{ color: ORANGE }}>s_j utilizado:</strong> {f(point.sj_used_um)} µm — <em>{point.sj_source}</em>
              </div>
            )}
          </Step>
        )}

        <div className="mt-2">
          <FinalResultBox U_um={U_um} U_mm={U_mm} k={k} nominal={point.nominal_value} unit={unit} />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────── */
export default function AuditMathBreakdown({ results, instrumentUnit }: { results: PointResult[]; instrumentUnit?: string }) {
  const unit = instrumentUnit || 'mm';
  const [expandedPoints, setExpandedPoints] = useState<Set<number>>(new Set());

  if (!results?.length) {
    return (
      <div className="text-center py-8 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        No se encontraron resultados con detalle de incertidumbre.
      </div>
    );
  }

  const toggle = (idx: number) =>
    setExpandedPoints(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });

  return (
    <div className="space-y-4">

      {/* Budget table — always shown once outside accordions */}
      <SharedBudgetSection point={results[0]} unit={unit} />

      {/* Controls */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
          {results.length} punto{results.length !== 1 ? 's' : ''} de calibración
        </p>
        <div className="flex gap-2">
          <button onClick={() => setExpandedPoints(new Set(results.map((_, i) => i)))}
            className="text-[10px] px-2 py-1 rounded transition-colors hover-bg"
            style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
            Expandir todos
          </button>
          <button onClick={() => setExpandedPoints(new Set())}
            className="text-[10px] px-2 py-1 rounded transition-colors hover-bg"
            style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
            Colapsar todos
          </button>
        </div>
      </div>

      {/* Per-point accordions — readings, mean, error, std dev, final result */}
      {results.map((point, idx) => {
        const isOpen = expandedPoints.has(idx);
        // Use per-point unit if backend provided it (EL-001: V, A, Ω); else fall back to global unit
        const ptUnit = (point as any).unit ?? unit;
        const U_display = point.expanded_uncertainty_um !== undefined
          ? `± ${f(point.expanded_uncertainty_um)} µm`
          : `± ${f(point.expanded_uncertainty_mm ?? point.expanded_uncertainty)} ${ptUnit}`;

        return (
          <div key={idx}>
            <button onClick={() => toggle(idx)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-md text-left transition-colors hover-bg"
              style={{
                border: `1px solid ${isOpen ? 'rgba(255,165,38,0.3)' : 'var(--border-color)'}`,
                backgroundColor: isOpen ? 'rgba(255,165,38,0.04)' : 'var(--bg-panel)',
              }}>
              <div className="flex items-center gap-3">
                <Sigma size={16} style={{ color: isOpen ? ORANGE : 'var(--text-muted)' }} />
                <span className="text-[12px] font-bold" style={{ color: 'var(--text-main)' }}>
                  {point.nominal_value} {ptUnit}
                </span>
                {point.function && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                    {funcLabel(point.function)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] font-bold" style={{ color: ORANGE }}>{U_display}</span>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                </motion.div>
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="overflow-hidden">
                  <div className="pt-3">
                    <PointBreakdown point={point} index={idx} unit={ptUnit} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
