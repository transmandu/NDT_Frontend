import React from 'react';
import { formatUncertainty } from '@/lib/metrologyFormat';

/**
 * Lightweight inline formatter for metrology notes coming from the backend.
 *
 * The backend's `UncertaintySource.note` field carries ASCII strings like
 *   "s_j = 20.655911179772 µm, n = 2 (n≥10)"
 *   "U_cert(L_max=150 mm) = a+b×L = 0.1+0.15 = 0.25 µm → u=U/k(2)=0.125 µm"
 *
 * Rendered as-is, those look like raw code instead of a calibration note. This
 * component does two passes:
 *
 *   1. Round numbers that carry more than 5 fractional digits to 2 significant
 *      figures (GUM §7.2.6 — measurement notes never need 12 decimals).
 *   2. Replace `X_y` patterns (where X is a single letter/greek symbol and `y`
 *      is a short alphanumeric token) with `X<sub>y</sub>` so subscripts read
 *      like proper math.
 *
 * Anything not matched is rendered verbatim, including characters that already
 * render correctly (±, ×, ÷, →, ≥, ≤, √, µ, δ, γ, ∞).
 */
export function MathText({ children }: { children: string | null | undefined }) {
  if (!children) return null;

  // ── Pass 1: round long decimal numbers ──────────────────────────────────
  // Match a decimal with 6+ fractional digits (the noisy backend output).
  const rounded = children.replace(/(-?\d+\.\d{6,})/g, (m) => {
    const n = parseFloat(m);
    if (!Number.isFinite(n)) return m;
    return formatUncertainty(n, 3);
  });

  // ── Pass 2: build JSX with subscripts ───────────────────────────────────
  // Single letter or greek symbol, underscore, 1-8 alphanumeric chars.
  const SUBSCRIPT_RE = /([A-Za-zµδγνσΔΩ])_([A-Za-z0-9]{1,8})/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = SUBSCRIPT_RE.exec(rounded)) !== null) {
    if (match.index > lastIndex) {
      parts.push(rounded.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={key++}>
        <em>{match[1]}</em>
        <sub style={{ fontSize: '0.78em' }}>{match[2]}</sub>
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < rounded.length) {
    parts.push(rounded.slice(lastIndex));
  }
  return <>{parts}</>;
}

/**
 * Renders effective degrees of freedom (ν). Type B sources usually have
 * ν = ∞, which we surface with a slightly larger serif glyph so it stands out
 * from the numeric Type A values around it.
 */
export function DegreesOfFreedom({ dof }: { dof: number | null | undefined }) {
  if (dof === null || dof === undefined) {
    return (
      <span style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '1.05em' }}>
        ∞
      </span>
    );
  }
  return <>{dof}</>;
}
