'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Sigma, Hash, ArrowRight } from 'lucide-react';
import KaTeX, { MathBlock } from '@/components/math/KaTeX';

/* ─── Constants ────────────────────────────────────────────── */
const ORANGE = '#FFA526';
const BLUE   = '#3b82f6';
const GREEN  = '#10B981';

/* ─── Types ────────────────────────────────────────────────── */
interface UncertaintySource {
  source_name: string;
  type: 'A' | 'B';
  distribution: string;
  value: number;
  divisor: number;
  sensitivity_coefficient: number;
  standard_uncertainty: number;
  degrees_of_freedom: number | null;
  note?: string;
  certificate_ref?: string;
}

interface PointResult {
  nominal_value: number;
  function?: string;
  mean_mm?: number;
  average_measured?: number;
  deviation_mm?: number;
  deviation_um?: number;
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

interface AuditMathBreakdownProps {
  results: PointResult[];
  instrumentUnit?: string;
}

/* ─── Helpers ──────────────────────────────────────────────── */
function fmt(n: number | undefined | null, p = 4): string {
  if (n === undefined || n === null || isNaN(n)) return '—';
  return n.toFixed(p);
}

function funcLabel(key?: string): string {
  const map: Record<string, string> = {
    exterior: 'Bocas Exteriores',
    interior: 'Bocas Interiores',
    depth: 'Sonda de Profundidad',
  };
  return key ? (map[key] || key) : '';
}

function distLabel(d: string): string {
  const map: Record<string, string> = {
    normal: 'Normal',
    rectangular: 'Rectangular',
    triangular: 'Triangular',
  };
  return map[d] || d;
}

function escTex(s: string): string {
  return s.replace(/_/g, '\\_').replace(/&/g, '\\&').replace(/%/g, '\\%');
}

/* ─── Step Sub-Component ───────────────────────────────────── */
function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: number * 0.04, duration: 0.3 }}
      className="relative pl-10 pb-6"
    >
      {/* Vertical connector line */}
      <div
        className="absolute left-[14px] top-8 bottom-0 w-px"
        style={{ backgroundColor: 'var(--border-color)' }}
      />
      {/* Step number badge */}
      <div
        className="absolute left-0 top-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
        style={{ backgroundColor: ORANGE }}
      >
        {number}
      </div>
      {/* Content */}
      <h4
        className="text-[12px] font-bold mb-2 pt-1"
        style={{ color: 'var(--text-main)' }}
      >
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </motion.div>
  );
}

/* ─── Badge ────────────────────────────────────────────────── */
function TypeBadge({ type }: { type: 'A' | 'B' }) {
  const isA = type === 'A';
  return (
    <span
      className="inline-flex items-center justify-center text-[9px] font-bold rounded px-1.5 py-0.5 uppercase tracking-wider"
      style={{
        backgroundColor: isA ? 'rgba(59,130,246,0.15)' : 'rgba(255,165,38,0.15)',
        color: isA ? BLUE : ORANGE,
        border: `1px solid ${isA ? 'rgba(59,130,246,0.3)' : 'rgba(255,165,38,0.3)'}`,
      }}
    >
      Tipo {type}
    </span>
  );
}

/* ─── Single Point Breakdown ───────────────────────────────── */
function PointBreakdown({ point, index }: { point: PointResult; index: number }) {
  const n   = point.n_readings || 0;
  const src = point.uncertainty_sources || [];
  const uc_um  = point.combined_uncertainty_um;
  const uc_mm  = point.combined_uncertainty_mm ?? point.combined_uncertainty;
  const U_um   = point.expanded_uncertainty_um;
  const U_mm   = point.expanded_uncertainty_mm ?? point.expanded_uncertainty;
  const dof    = point.effective_dof;
  const k      = point.k_factor;

  // Build readings string for LaTeX
  const readings = point.readings_mm || [];
  const readingsStr = readings.map(r => fmt(r, 4)).join(',\\; ');

  return (
    <div className="space-y-1">
      {/* ── Point Header ── */}
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-t-md"
        style={{ backgroundColor: 'rgba(255,165,38,0.08)', border: '1px solid rgba(255,165,38,0.2)' }}
      >
        <Hash size={14} style={{ color: ORANGE }} />
        <span className="text-[12px] font-bold" style={{ color: ORANGE }}>
          Punto {index + 1}: {point.nominal_value} mm
        </span>
        {point.function && (
          <span
            className="text-[9px] px-2 py-0.5 rounded font-medium"
            style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
          >
            {funcLabel(point.function)}
          </span>
        )}
        <span className="text-[10px] font-mono ml-auto" style={{ color: 'var(--text-muted)' }}>
          n = {n} lecturas
        </span>
      </div>

      <div
        className="px-4 py-4 rounded-b-md space-y-0"
        style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderTop: 'none' }}
      >
        {/* ── Step 1: Raw Data ── */}
        {readings.length > 0 && (
          <Step number={1} title="Datos de Entrada (Lecturas)">
            <MathBlock
              tex={`x_i = \\{${readingsStr}\\} \\quad [\\text{mm}]`}
              label="Lecturas registradas"
            />
          </Step>
        )}

        {/* ── Step 2: Mean ── */}
        {(point.mean_mm !== undefined || point.average_measured !== undefined) && (
          <Step number={2} title="Media Aritmética">
            <MathBlock
              tex={`\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i = \\frac{1}{${n}} \\sum x_i`}
              label="Fórmula general"
            />
            <MathBlock
              tex={`\\boxed{\\bar{x} = ${fmt(point.mean_mm ?? point.average_measured, 4)} \\; \\text{mm}}`}
              label="Resultado"
              style={{ borderColor: 'rgba(255,165,38,0.3)', backgroundColor: 'rgba(255,165,38,0.04)' }}
            />
          </Step>
        )}

        {/* ── Step 3: Standard Deviation ── */}
        {point.std_deviation_um !== undefined && (
          <Step number={3} title="Desviación Estándar Muestral">
            <MathBlock
              tex={`s = \\sqrt{\\frac{1}{n-1}\\sum_{i=1}^{n}(x_i - \\bar{x})^2}`}
              label="Fórmula (corrección de Bessel)"
            />
            <MathBlock
              tex={`s_j = ${fmt(point.std_deviation_um, 3)} \\; \\mu\\text{m}`}
              label="Resultado (del punto)"
            />
            {point.sj_used_um !== undefined && point.sj_source && (
              <div
                className="text-[10px] px-3 py-2 rounded"
                style={{ backgroundColor: 'var(--bg-app)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}
              >
                <strong style={{ color: ORANGE }}>s_j usado:</strong> {fmt(point.sj_used_um, 3)} µm — <em>{point.sj_source}</em>
              </div>
            )}
          </Step>
        )}

        {/* ── Step 4: Uncertainty Budget ── */}
        <Step number={4} title="Presupuesto de Incertidumbre">
          <div
            className="rounded-md overflow-x-auto"
            style={{ border: '1px solid var(--border-color)' }}
          >
            <table className="w-full text-xs" style={{ minWidth: 600 }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-app)' }}>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold" style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    Fuente
                  </th>
                  <th className="px-2 py-2 text-center text-[10px]" style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Tipo</th>
                  <th className="px-2 py-2 text-center text-[10px]" style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Distribución</th>
                  <th className="px-2 py-2 text-center text-[10px]" style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Valor</th>
                  <th className="px-2 py-2 text-center text-[10px]" style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Divisor</th>
                  <th className="px-2 py-2 text-center text-[10px]" style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <KaTeX tex="c_i" />
                  </th>
                  <th className="px-2 py-2 text-center text-[10px] font-bold" style={{ borderBottom: '1px solid var(--border-color)', color: ORANGE }}>
                    <KaTeX tex="u_i" />
                  </th>
                  <th className="px-2 py-2 text-center text-[10px]" style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <KaTeX tex="\\nu_i" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {src.map((s, i) => (
                  <tr
                    key={i}
                    className="hover-bg transition-colors"
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                  >
                    <td className="px-3 py-2 text-[10px] font-medium" style={{ color: 'var(--text-main)', maxWidth: 200 }}>
                      <div className="leading-tight">{s.source_name}</div>
                      {s.note && (
                        <div className="text-[9px] mt-0.5 leading-tight" style={{ color: 'var(--text-muted)' }}>
                          {s.note}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center"><TypeBadge type={s.type} /></td>
                    <td className="px-2 py-2 text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>{distLabel(s.distribution)}</td>
                    <td className="px-2 py-2 text-center font-mono text-[10px]">{fmt(s.value, 4)}</td>
                    <td className="px-2 py-2 text-center font-mono text-[10px]">{fmt(s.divisor, 3)}</td>
                    <td className="px-2 py-2 text-center font-mono text-[10px]">{fmt(s.sensitivity_coefficient, 2)}</td>
                    <td className="px-2 py-2 text-center font-mono text-[11px] font-bold" style={{ color: ORANGE }}>
                      {fmt(s.standard_uncertainty, 4)}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {s.degrees_of_freedom !== null ? s.degrees_of_freedom : '∞'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Formula per source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {src.map((s, i) => {
              let formula = '';
              if (s.type === 'A') {
                formula = `u_A = \\frac{s_j}{\\sqrt{n}} = \\frac{${fmt(s.value, 3)}}{${fmt(s.divisor, 3)}} = ${fmt(s.standard_uncertainty, 4)}`;
              } else {
                const divLabel = s.divisor.toFixed(3);
                formula = `u_{B${i}} = \\frac{${fmt(s.value, 4)}}{${divLabel}} \\times ${fmt(s.sensitivity_coefficient, 2)} = ${fmt(s.standard_uncertainty, 4)}`;
              }
              return (
                <div
                  key={i}
                  className="px-3 py-2 rounded"
                  style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <TypeBadge type={s.type} />
                    <span className="text-[9px] font-medium truncate" style={{ color: 'var(--text-muted)' }}>
                      {s.source_name.substring(0, 40)}
                    </span>
                  </div>
                  <KaTeX tex={formula} block className="text-[11px]" />
                </div>
              );
            })}
          </div>
        </Step>

        {/* ── Step 5: Combined Uncertainty ── */}
        <Step number={5} title="Incertidumbre Combinada">
          <MathBlock
            tex={`u_c = \\sqrt{\\sum_{i=1}^{N} (c_i \\cdot u_i)^2} = \\sqrt{${src.map((s, i) => `${fmt(s.standard_uncertainty, 4)}^2`).join(' + ')}}`}
            label="Suma en cuadratura"
          />
          <MathBlock
            tex={`\\boxed{u_c = ${uc_um !== undefined ? `${fmt(uc_um, 3)} \\; \\mu\\text{m}` : `${fmt(uc_mm, 6)} \\; \\text{mm}`}}`}
            label="Resultado"
            style={{ borderColor: 'rgba(255,165,38,0.3)', backgroundColor: 'rgba(255,165,38,0.04)' }}
          />
        </Step>

        {/* ── Step 6: Welch-Satterthwaite ── */}
        {dof !== undefined && (
          <Step number={6} title="Grados de Libertad Efectivos (Welch-Satterthwaite)">
            <MathBlock
              tex={`\\nu_{\\text{eff}} = \\frac{u_c^4}{\\displaystyle\\sum_{i=1}^{N} \\frac{u_i^4}{\\nu_i}}`}
              label="Ecuación GUM G.2b"
            />
            <MathBlock
              tex={`\\boxed{\\nu_{\\text{eff}} = ${fmt(dof, 1)}}`}
              label="Resultado"
              style={{ borderColor: 'rgba(59,130,246,0.3)', backgroundColor: 'rgba(59,130,246,0.04)' }}
            />
            <div
              className="text-[10px] px-3 py-2 rounded"
              style={{ backgroundColor: 'var(--bg-app)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}
            >
              Fuentes con <KaTeX tex="\nu_i = \infty" /> (Tipo B) no contribuyen al denominador.
            </div>
          </Step>
        )}

        {/* ── Step 7: t-Student / k factor ── */}
        <Step number={7} title="Factor de Cobertura k (t-Student 95.45%)">
          <MathBlock
            tex={`k = t_{95.45\\%}(\\nu_{\\text{eff}}) = t_{95.45\\%}(${fmt(dof, 0)})`}
            label="Tabla GUM G.2"
          />
          <MathBlock
            tex={`\\boxed{k = ${fmt(k, 2)}}`}
            label="Resultado"
            style={{ borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.04)' }}
          />
        </Step>

        {/* ── Step 8: Expanded Uncertainty ── */}
        <Step number={8} title="Incertidumbre Expandida">
          <MathBlock
            tex={`U = k \\times u_c = ${fmt(k, 2)} \\times ${uc_um !== undefined ? fmt(uc_um, 3) : fmt(uc_mm, 6)}`}
            label="Ecuación GUM (13)"
          />
          <div
            className="p-4 rounded-md text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(255,165,38,0.08), rgba(255,165,38,0.02))',
              border: '2px solid rgba(255,165,38,0.3)',
            }}
          >
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
              Resultado Final — Punto {point.nominal_value} mm
            </p>
            <KaTeX
              tex={`\\LARGE U = \\pm\\; ${U_um !== undefined ? `${fmt(U_um, 3)} \\; \\mu\\text{m}` : `${fmt(U_mm, 5)} \\; \\text{mm}`} \\quad (k=${fmt(k, 2)},\\; p \\approx 95\\%)`}
              block
            />
          </div>
        </Step>
      </div>
    </div>
  );
}

/* ─── Main Export ──────────────────────────────────────────── */
export default function AuditMathBreakdown({ results, instrumentUnit }: AuditMathBreakdownProps) {
  const [expandedPoints, setExpandedPoints] = useState<Set<number>>(new Set());

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-8 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        No se encontraron resultados con detalle de incertidumbre.
      </div>
    );
  }

  const togglePoint = (idx: number) => {
    setExpandedPoints(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const expandAll = () => setExpandedPoints(new Set(results.map((_, i) => i)));
  const collapseAll = () => setExpandedPoints(new Set());

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
          {results.length} punto{results.length !== 1 ? 's' : ''} de calibración
        </p>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-[10px] px-2 py-1 rounded transition-colors hover-bg"
            style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
          >
            Expandir todos
          </button>
          <button
            onClick={collapseAll}
            className="text-[10px] px-2 py-1 rounded transition-colors hover-bg"
            style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
          >
            Colapsar todos
          </button>
        </div>
      </div>

      {/* Points */}
      {results.map((point, idx) => {
        const isOpen = expandedPoints.has(idx);
        const U_display = point.expanded_uncertainty_um !== undefined
          ? `± ${fmt(point.expanded_uncertainty_um, 3)} µm`
          : `± ${fmt(point.expanded_uncertainty_mm ?? point.expanded_uncertainty, 5)} mm`;

        return (
          <div key={idx}>
            {/* Collapsible header */}
            <button
              onClick={() => togglePoint(idx)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-md text-left transition-colors hover-bg group"
              style={{
                border: `1px solid ${isOpen ? 'rgba(255,165,38,0.3)' : 'var(--border-color)'}`,
                backgroundColor: isOpen ? 'rgba(255,165,38,0.04)' : 'var(--bg-panel)',
              }}
            >
              <div className="flex items-center gap-3">
                <Sigma size={16} style={{ color: isOpen ? ORANGE : 'var(--text-muted)' }} />
                <span className="text-[12px] font-bold" style={{ color: 'var(--text-main)' }}>
                  Punto: {point.nominal_value} mm
                </span>
                {point.function && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                    {funcLabel(point.function)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] font-bold" style={{ color: ORANGE }}>
                  {U_display}
                </span>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                </motion.div>
              </div>
            </button>

            {/* Expandable content */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="pt-3">
                    <PointBreakdown point={point} index={idx} />
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
