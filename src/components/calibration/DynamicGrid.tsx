'use client';
import React from 'react';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import type { GridSchema, GridColumn } from '@/types/calibration';

export type GridData = Record<number, Record<string, string>>;

interface DynamicGridProps {
  grid: GridSchema;
  gridIndex: number;
  data: GridData;
  onChange: (gridId: string, data: GridData) => void;
  validationErrors?: Set<string>;
  instrumentInfo?: { resolution: number; unit: string; range_min: number | null; range_max: number | null };
}

const ORANGE = '#FFA526';

/* ─── Helpers ───────────────────────────────────────────── */
function parseArr(raw: string): string[] {
  if (!raw) return [];
  return raw.split(',').map(v => v.trim());
}
function numericVals(raw: string): number[] {
  return parseArr(raw).map(v => parseFloat(v)).filter(n => !isNaN(n));
}
function colAvg(rowData: Record<string, string>, colKey: string): number | null {
  const vals = numericVals(rowData[colKey] || '');
  return vals.length > 0 ? avg(vals) : null;
}
function avg(vals: number[]): number {
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}
function stddev(vals: number[]): number {
  if (vals.length < 2) return 0;
  const m = avg(vals);
  return Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / (vals.length - 1));
}
function fmt(n: number, precision: number): string {
  return isNaN(n) ? '—' : n.toFixed(precision);
}

/* ─── Computation Engine ────────────────────────────────── */
function computeValue(
  col: GridColumn, rowIdx: number,
  rowData: Record<string, string>, allRows: GridData, gridColumns: GridColumn[]
): string {
  if (!col.computed) return rowData[col.key] || '';
  const key = col.key.toLowerCase();
  const prec = col.precision || 4;

  if (key === 'reading_order' || key === 'n') return String(rowIdx + 1);
  if (key === 'position') return rowData['position'] || '';

  const mainCol   = gridColumns.find(c => c.type === 'number_array' && (c.key === 'readings' || c.key === 'reading'));
  const instrCol  = gridColumns.find(c => c.type === 'number_array' && c.key === 'instrument_reading');
  const stdCol    = gridColumns.find(c => c.type === 'number_array' && c.key === 'standard_reading');
  const primaryCol = mainCol || instrCol;

  if (key === 'average' || key === 'corrected_average') {
    if (!primaryCol) return '';
    const vals = numericVals(rowData[primaryCol.key] || '');
    return vals.length ? fmt(avg(vals), prec) : '';
  }

  if (key === 'error') {
    if (instrCol && stdCol) {
      const iA = colAvg(rowData, instrCol.key);
      const sA = colAvg(rowData, stdCol.key);
      if (iA === null || sA === null) return '';
      return fmt(iA - sA, prec);
    }
    const nomCol = gridColumns.find(c => c.key === 'nominal_value');
    if (primaryCol && nomCol) {
      const rA = colAvg(rowData, primaryCol.key);
      const nom = parseFloat(rowData[nomCol.key] || '');
      if (rA === null || isNaN(nom)) return '';
      return fmt(rA - nom, prec);
    }
    return '';
  }

  if (key === 'correction') {
    const errCol = gridColumns.find(c => c.key === 'error');
    if (!errCol) return '';
    const errStr = computeValue(errCol, rowIdx, rowData, allRows, gridColumns);
    const n = parseFloat(errStr);
    return isNaN(n) ? '' : fmt(-n, prec);
  }

  if (key === 'relative_error') {
    const nomCol = gridColumns.find(c => c.key === 'nominal_value');
    if (!primaryCol || !nomCol) return '';
    const rA  = colAvg(rowData, primaryCol.key);
    const nom = parseFloat(rowData[nomCol.key] || '');
    if (rA === null || isNaN(nom) || nom === 0) return '';
    return fmt(((rA - nom) / nom) * 100, prec);
  }

  if (key === 'std_deviation') {
    if (!primaryCol) return '';
    const vals = numericVals(rowData[primaryCol.key] || '');
    return vals.length >= 2 ? fmt(stddev(vals), prec) : '';
  }

  if (key === 'deviation') {
    const readCol = gridColumns.find(c => c.key === 'reading');
    if (!readCol) return '';
    const cur    = parseFloat(rowData[readCol.key] || '');
    const center = parseFloat(allRows[0]?.[readCol.key] || '');
    if (isNaN(cur) || isNaN(center)) return '';
    return fmt(cur - center, prec);
  }

  if (key === 'hysteresis' || key === 'percentage') return '';

  return '';
}

/* ─── TransposedMatrix — multi_point_matrix ─────────────── */
// Rows = repetitions (grouped by number_array column), Columns = nominal points
function TransposedMatrix({ grid, data, onChange, validationErrors }: {
  grid: GridSchema; data: GridData;
  onChange: (gridId: string, data: GridData) => void;
  validationErrors?: Set<string>;
}) {
  const { columns, rows_config, settings } = grid;
  const isDynamic  = rows_config?.dynamic ?? false;
  const maxReps    = settings?.max_iterations || 15;
  const minReps    = Math.max(3, settings?.min_iterations || 3);

  const headerCols  = columns.filter(c => c.type !== 'number_array' && !c.computed);
  const arrayCols   = columns.filter(c => c.type === 'number_array');
  const computedCols = columns.filter(c => c.computed);
  const multiArray  = arrayCols.length > 1;

  const [repCount, setRepCount] = useState(minReps);
  const pts = Object.keys(data).map(Number).sort((a, b) => a - b);

  // Initialize
  useEffect(() => {
    if (Object.keys(data).length > 0) return;
    const emptyReps = Array(minReps).fill('').join(',');
    const init: GridData = {};
    const n = isDynamic ? 1 : (rows_config?.fixed_rows || 1);
    for (let i = 0; i < n; i++) {
      init[i] = {};
      for (const hc of headerCols) init[i][hc.key] = '';
      for (const ac of arrayCols)  init[i][ac.key]  = emptyReps;
    }
    onChange(grid.id, init);
  }, []);

  // Sync repCount
  useEffect(() => {
    if (!arrayCols[0]) return;
    const first = data[0];
    if (first) {
      const reps = parseArr(first[arrayCols[0].key] || '');
      if (reps.length > 0 && reps.length !== repCount) setRepCount(reps.length);
    }
  }, [data]);

  const getCell = (ptIdx: number, key: string) => data[ptIdx]?.[key] || '';
  const getReps = (ptIdx: number, key: string): string[] => {
    const arr = parseArr(getCell(ptIdx, key));
    while (arr.length < repCount) arr.push('');
    return arr.slice(0, repCount);
  };

  const updateCell = (ptIdx: number, key: string, val: string) =>
    onChange(grid.id, { ...data, [ptIdx]: { ...(data[ptIdx] || {}), [key]: val } });

  const updateRep = (ptIdx: number, key: string, repIdx: number, val: string) => {
    const reps = getReps(ptIdx, key);
    const nr = [...reps]; nr[repIdx] = val;
    updateCell(ptIdx, key, nr.join(','));
  };

  const addRepetition = () => {
    if (repCount >= maxReps) return;
    const nd: GridData = {};
    for (const k of Object.keys(data).map(Number)) {
      const row = { ...data[k] };
      for (const ac of arrayCols) row[ac.key] = [...parseArr(row[ac.key] || ''), ''].join(',');
      nd[k] = row;
    }
    setRepCount(c => c + 1); onChange(grid.id, nd);
  };

  const removeRepetition = (repIdx: number) => {
    if (repCount <= minReps) return;
    const nd: GridData = {};
    for (const k of Object.keys(data).map(Number)) {
      const row = { ...data[k] };
      for (const ac of arrayCols) row[ac.key] = parseArr(row[ac.key] || '').filter((_, i) => i !== repIdx).join(',');
      nd[k] = row;
    }
    setRepCount(c => c - 1); onChange(grid.id, nd);
  };

  const addPoint = () => {
    const nextIdx = pts.length > 0 ? Math.max(...pts) + 1 : 0;
    const row: Record<string, string> = {};
    for (const hc of headerCols) row[hc.key] = '';
    for (const ac of arrayCols)  row[ac.key]  = Array(repCount).fill('').join(',');
    onChange(grid.id, { ...data, [nextIdx]: row });
  };

  const removePoint = (ptIdx: number) => {
    if (pts.length <= 1) return;
    const nd: GridData = {};
    let ni = 0;
    for (const k of pts) { if (k !== ptIdx) nd[ni++] = data[k]; }
    onChange(grid.id, nd);
  };

  const pointStats = useMemo(() => {
    if (!arrayCols[0]) return {} as Record<number, { mean: string; std: string }>;
    const r: Record<number, { mean: string; std: string }> = {};
    for (const ptIdx of pts) {
      const vals = numericVals(getCell(ptIdx, arrayCols[0].key));
      r[ptIdx] = { mean: vals.length ? fmt(avg(vals), 3) : '—', std: vals.length > 1 ? fmt(stddev(vals), 3) : (vals.length === 1 ? '0.000' : '—') };
    }
    return r;
  }, [data, repCount]);

  const getComputed = (ptIdx: number, col: GridColumn) => computeValue(col, ptIdx, data[ptIdx] || {}, data, columns);
  const colW = 68;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-end gap-2">
        {repCount < maxReps && (
          <button onClick={addRepetition}
            className="h-7 px-2.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors"
            style={{ border: `1px solid ${ORANGE}`, color: ORANGE, backgroundColor: 'rgba(255,165,38,0.08)' }}
            title={`Agregar repetición (${repCount}/${maxReps})`}>
            <Plus size={10} /> Repetición
          </button>
        )}
        {isDynamic && (
          <button onClick={addPoint}
            className="h-7 px-2.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors"
            style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-hover)' }}>
            <Plus size={10} /> Punto
          </button>
        )}
      </div>

      <div className="rounded-md overflow-x-auto w-full" style={{ border: '1px solid var(--border-color)' }}>
        <table className="w-full text-xs" style={{ minWidth: `${170 + pts.length * colW}px` }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
              <th className="px-3 py-1.5 text-left text-[11px] align-top"
                style={{ borderRight: '1px solid var(--border-color)', color: 'var(--text-muted)', width: 170 }}>
                <div className="flex flex-col gap-0.5 items-start pt-1 pb-0.5">
                  {headerCols.map(hc => (
                    <div key={hc.key} className="h-6 flex items-center justify-start text-[10px] uppercase font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                      {hc.label} {hc.unit ? `[${hc.unit}]` : ''}
                      {hc.required && <span className="text-red-500 text-[8px] ml-1">●</span>}
                    </div>
                  ))}
                </div>
              </th>
              {pts.map((ptIdx, idx) => (
                <th key={ptIdx} className="py-1.5 px-1 text-center relative group align-top"
                  style={{ borderRight: idx < pts.length - 1 ? '1px solid var(--border-color)' : 'none', width: colW }}>
                  {isDynamic && pts.length > 1 && (
                    <button onClick={() => removePoint(ptIdx)}
                      className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity z-10"
                      style={{ backgroundColor: '#ef4444', color: '#fff' }} title="Eliminar punto">✕</button>
                  )}
                  <div className="flex flex-col gap-0.5 items-center pt-1 pb-0.5">
                    {headerCols.map(hc => (
                      <input key={hc.key} type="text" inputMode={hc.type === 'number' ? 'decimal' : 'text'}
                        value={getCell(ptIdx, hc.key)}
                        onChange={e => updateCell(ptIdx, hc.key, e.target.value)}
                        placeholder={hc.type === 'number' ? '0.0' : '...'}
                        title={hc.label}
                        className="h-6 px-0 text-center font-mono font-bold text-[11px] rounded focus:outline-none"
                        style={{ width: colW - 8, color: ORANGE, backgroundColor: 'transparent', border: '1px dashed rgba(255,165,38,0.4)' }} />
                    ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {arrayCols.map((ac, acIdx) => (
              <React.Fragment key={ac.key}>
                {multiArray && (
                  <tr style={{ backgroundColor: 'rgba(255,165,38,0.06)' }}>
                    <td colSpan={pts.length + 1} className="px-3 py-1 text-[10px] font-bold tracking-wide"
                      style={{ borderTop: acIdx > 0 ? '2px solid var(--border-color)' : undefined, color: ORANGE }}>
                      ▸ {ac.label}{ac.unit && <span className="ml-1 font-normal opacity-60 text-[9px]">({ac.unit})</span>}
                    </td>
                  </tr>
                )}

                {Array.from({ length: repCount }).map((_, repIdx) => (
                  <motion.tr key={`${ac.key}-r${repIdx}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="hover-bg transition-colors group"
                    style={{ backgroundColor: 'var(--bg-panel)' }}>
                    <td className="px-3 py-1.5 text-[11px]"
                      style={{ borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Rep {repIdx + 1}</span>
                        {acIdx === 0 && repCount > minReps && (
                          <button onClick={() => removeRepetition(repIdx)}
                            className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                            style={{ backgroundColor: '#ef4444', color: '#fff' }} title={`Eliminar Rep ${repIdx + 1}`}>✕</button>
                        )}
                      </div>
                    </td>
                    {pts.map((ptIdx, colIdx) => (
                      <td key={ptIdx} className="px-0.5 py-1 text-center"
                        style={{ borderRight: colIdx < pts.length - 1 ? '1px solid var(--border-color)' : 'none', borderBottom: '1px solid var(--border-color)', width: colW }}>
                        <input type="text" inputMode="decimal"
                          value={getReps(ptIdx, ac.key)[repIdx] || ''}
                          onChange={e => updateRep(ptIdx, ac.key, repIdx, e.target.value)}
                          placeholder="—"
                          className="w-full h-7 px-1 text-center font-mono text-[11px] bg-transparent focus:outline-none rounded"
                          style={{ color: 'var(--text-main)', border: '1px solid transparent' }}
                          onFocus={e => (e.target.style.borderColor = ORANGE)}
                          onBlur={e => (e.target.style.borderColor = 'transparent')} />
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </React.Fragment>
            ))}

            {/* Computed rows */}
            {computedCols.map(col => (
              <tr key={col.key} style={{ backgroundColor: 'var(--bg-result-row)' }}>
                <td className="px-3 py-2 text-[11px] font-semibold"
                  style={{ borderRight: '1px solid var(--border-color)', borderTop: '2px solid var(--border-color)', color: ORANGE, whiteSpace: 'nowrap' }}>
                  {col.label}{col.unit && <span className="text-[9px] opacity-60 ml-1">({col.unit})</span>}
                  <span className="ml-1 text-amber-400 text-[8px]">⚡</span>
                </td>
                {pts.map((ptIdx, idx) => {
                  const val = getComputed(ptIdx, col);
                  return (
                    <td key={ptIdx} className="px-2 py-2 text-center font-mono text-[12px] font-bold"
                      style={{ borderRight: idx < pts.length - 1 ? '1px solid var(--border-color)' : 'none', borderTop: '2px solid var(--border-color)', color: ORANGE }}>
                      {val || '—'}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Stats footer */}
            {settings?.show_statistics && arrayCols.length > 0 && (
              <>
                <tr style={{ backgroundColor: 'var(--bg-result-row)' }}>
                  <td className="px-3 py-2 text-[11px] font-bold"
                    style={{ borderRight: '1px solid var(--border-color)', borderTop: computedCols.length === 0 ? '2px solid var(--border-color)' : '1px solid var(--border-color)', color: ORANGE }}>
                    Media (x̄){multiArray && <span className="font-normal opacity-50 text-[9px] ml-1">— {arrayCols[0].label}</span>}
                  </td>
                  {pts.map((ptIdx, idx) => (
                    <td key={ptIdx} className="px-2 py-2 text-center font-mono text-[12px] font-bold"
                      style={{ borderRight: idx < pts.length - 1 ? '1px solid var(--border-color)' : 'none', borderTop: computedCols.length === 0 ? '2px solid var(--border-color)' : '1px solid var(--border-color)', color: ORANGE }}>
                      {pointStats[ptIdx]?.mean ?? '—'}
                    </td>
                  ))}
                </tr>
                <tr style={{ backgroundColor: 'var(--bg-result-row)' }}>
                  <td className="px-3 py-2 text-[11px] font-bold"
                    style={{ borderRight: '1px solid var(--border-color)', color: ORANGE }}>Desv. Est (s)</td>
                  {pts.map((ptIdx, idx) => (
                    <td key={ptIdx} className="px-2 py-2 text-center font-mono text-[12px] font-bold"
                      style={{ borderRight: idx < pts.length - 1 ? '1px solid var(--border-color)' : 'none', color: ORANGE }}>
                      {pointStats[ptIdx]?.std ?? '—'}
                    </td>
                  ))}
                </tr>
              </>
            )}
          </tbody>


        </table>
      </div>
    </div>
  );
}

/* ─── StandardGrid — vertical layout ────────────────────── */
// Used for custom_function_grid, positional_grid, etc.
function StandardGrid({ grid, data, onChange, validationErrors }: {
  grid: GridSchema; data: GridData;
  onChange: (gridId: string, data: GridData) => void;
  validationErrors?: Set<string>;
}) {
  const { columns, rows_config, settings } = grid;
  const isDynamic  = rows_config?.dynamic ?? false;
  const fixedRows  = rows_config?.fixed_rows ?? null;
  const rowLabels  = rows_config?.row_labels ?? null;
  const minIter    = Math.max(3, settings?.min_iterations || 1);
  const maxIter    = settings?.max_iterations || 15;

  const rowCount = useMemo(() => {
    const n = Object.keys(data).length;
    if (n > 0) return n;
    if (fixedRows) return fixedRows;
    if (rowLabels) return rowLabels.length;
    return minIter;
  }, [data, fixedRows, rowLabels, minIter]);

  useEffect(() => {
    if (Object.keys(data).length > 0) return;
    const init: GridData = {};
    for (let i = 0; i < rowCount; i++) {
      init[i] = {};
      if (rowLabels?.[i]) {
        const pc = columns.find(c => c.key === 'position');
        if (pc) init[i]['position'] = rowLabels[i];
      }
      const oc = columns.find(c => c.key === 'reading_order');
      if (oc) init[i]['reading_order'] = String(i + 1);
      for (const col of columns) {
        if (col.type === 'number_array') init[i][col.key] = Array(minIter).fill('').join(',');
      }
    }
    onChange(grid.id, init);
  }, [rowCount]);

  const update = (rowIdx: number, colKey: string, val: string) =>
    onChange(grid.id, { ...data, [rowIdx]: { ...(data[rowIdx] || {}), [colKey]: val } });

  const addRow = () => {
    const nextIdx = Object.keys(data).length;
    const newRow: Record<string, string> = {};
    for (const col of columns) {
      if (col.type === 'number_array') newRow[col.key] = Array(minIter).fill('').join(',');
    }
    onChange(grid.id, { ...data, [nextIdx]: newRow });
  };

  const removeRow = (rowIdx: number) => {
    const keys = Object.keys(data).map(Number).sort((a, b) => a - b);
    if (keys.length <= 1) return;
    const nd: GridData = {};
    let ni = 0;
    for (const k of keys) { if (k !== rowIdx) nd[ni++] = data[k]; }
    onChange(grid.id, nd);
  };

  const getReps = (rowIdx: number, colKey: string) => parseArr(data[rowIdx]?.[colKey] || '');
  const updateRep = (rowIdx: number, colKey: string, repIdx: number, val: string) => {
    const reps = getReps(rowIdx, colKey);
    reps[repIdx] = val;
    update(rowIdx, colKey, reps.join(','));
  };
  const addRep = (rowIdx: number, colKey: string) => {
    const reps = getReps(rowIdx, colKey);
    if (reps.length >= maxIter) return;
    update(rowIdx, colKey, [...reps, ''].join(','));
  };
  const removeRep = (rowIdx: number, colKey: string, repIdx: number) => {
    const reps = getReps(rowIdx, colKey);
    if (reps.length <= minIter) return;
    update(rowIdx, colKey, reps.filter((_, i) => i !== repIdx).join(','));
  };

  const numericCols = columns.filter(c => (c.type === 'number' || c.type === 'number_array') && c.key !== 'reading_order' && c.key !== 'nominal_value');

  const computeStats = (colKey: string) => {
    const col = columns.find(c => c.key === colKey)!;
    const vals: number[] = [];
    for (const rIdx of Object.keys(data).map(Number)) {
      const row = data[rIdx]; let val: string;
      if (col.computed) val = computeValue(col, rIdx, row, data, columns); else val = row[colKey] || '';
      if (col.type === 'number_array') parseArr(val).forEach(v => { const n = parseFloat(v); if (!isNaN(n)) vals.push(n); });
      else { const n = parseFloat(val); if (!isNaN(n)) vals.push(n); }
    }
    if (!vals.length) return { mean: '—', std: '—' };
    return { mean: fmt(avg(vals), 4), std: vals.length > 1 ? fmt(stddev(vals), 4) : '0.0000' };
  };

  const curRows = Object.keys(data).length || rowCount;

  return (
    <div className="flex flex-col gap-2 w-full">
      {isDynamic && (
        <div className="flex justify-end">
          <button onClick={addRow}
            className="h-7 px-3 rounded text-[10px] font-semibold flex items-center gap-1.5 transition-colors"
            style={{ border: `1px dashed var(--border-color)`, color: 'var(--text-muted)', backgroundColor: 'var(--bg-hover)' }}>
            <Plus size={11} style={{ color: ORANGE }} /> Agregar fila
          </button>
        </div>
      )}
      <div className="rounded-md overflow-x-auto w-full" style={{ border: '1px solid var(--border-color)' }}>
      <table className="w-full text-left text-xs" style={{ minWidth: `${Math.max(columns.length * 90, 500)}px` }}>
        <thead>
          <tr>
            <th className="px-2 py-2 th-theme text-center w-9 text-[10px]"
              style={{ borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>#</th>
            {columns.map(col => (
              <th key={col.key} className="px-1.5 py-2 th-theme text-[9px] uppercase tracking-wider font-semibold leading-tight"
                style={{ borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.required && <span className="text-red-500 text-[8px]">●</span>}
                    {col.computed && <span className="text-amber-400 text-[8px]" title="Calculado">⚡</span>}
                  </span>
                  {col.unit && <span className="text-[9px] font-mono font-normal opacity-50">{col.unit}</span>}
                </div>
              </th>
            ))}
            {isDynamic && <th className="w-8 th-theme" style={{ borderBottom: '1px solid var(--border-color)' }} />}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {Array.from({ length: curRows }).map((_, rIdx) => {
              const rowData = data[rIdx] || {};
              return (
                <motion.tr key={rIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ backgroundColor: 'var(--bg-panel)' }} className="hover-bg transition-colors">
                  <td className="px-2 py-1 text-center text-[10px] font-mono"
                    style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                    {rowLabels?.[rIdx] ? <span className="text-[9px] font-medium" title={rowLabels[rIdx]}>{rowLabels[rIdx].substring(0, 6)}</span> : rIdx + 1}
                  </td>
                  {columns.map(col => {
                    const cellKey = `${rIdx}-${col.key}`;
                    const hasError = validationErrors?.has(cellKey);

                    if (col.computed || (!col.editable && col.key !== 'position')) {
                      const val = computeValue(col, rIdx, rowData, data, columns);
                      return (
                        <td key={col.key} className="px-3 py-1"
                          style={{ borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-result-row)' }}>
                          <div className="h-7 flex items-center">
                            <span className="text-[11px] font-mono font-semibold"
                              style={{ color: val ? 'var(--text-result-val)' : 'var(--text-muted)' }}>{val || '—'}</span>
                          </div>
                        </td>
                      );
                    }

                    if (col.type === 'select' && col.options) {
                      return (
                        <td key={col.key} className="px-2 py-1"
                          style={{ borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                          <select value={rowData[col.key] || ''} onChange={e => update(rIdx, col.key, e.target.value)}
                            className="w-full h-7 px-1 bg-transparent text-[11px] input-theme rounded">
                            <option value="">—</option>
                            {col.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                      );
                    }

                    if (col.type === 'number_array') {
                      const reps = getReps(rIdx, col.key);
                      const curMin = Math.max(1, settings?.min_iterations || 1);
                      return (
                        <td key={col.key} className="px-1.5 py-1"
                          style={{ borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                          <div className="flex items-center gap-1 flex-wrap">
                            {reps.map((rep, repIdx) => (
                              <div key={repIdx} className="relative group/rep">
                                <input type="text" inputMode="decimal" value={rep}
                                  onChange={e => updateRep(rIdx, col.key, repIdx, e.target.value)}
                                  placeholder={`R${repIdx + 1}`}
                                  className={`w-14 h-7 px-1 text-center bg-transparent focus:outline-none text-[11px] font-mono rounded transition-shadow ${hasError && !rep ? 'ring-1 ring-red-500' : ''}`}
                                  style={{ color: 'var(--text-main)', border: '1px dashed var(--border-color)' }} />
                                {reps.length > curMin && (
                                  <button onClick={() => removeRep(rIdx, col.key, repIdx)}
                                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white items-center justify-center text-[8px] hidden group-hover/rep:flex shadow-sm">✕</button>
                                )}
                              </div>
                            ))}
                            {reps.length < maxIter && (
                              <button onClick={() => addRep(rIdx, col.key)}
                                className="w-7 h-7 rounded flex items-center justify-center hover-bg shrink-0"
                                style={{ border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}
                                title={`Agregar repetición (${reps.length}/${maxIter})`}>
                                <Plus size={10} />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={col.key} className="px-1 py-1"
                        style={{ borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                        <input type="text" inputMode={col.type === 'number' ? 'decimal' : 'text'}
                          value={rowData[col.key] || ''}
                          onChange={e => update(rIdx, col.key, e.target.value)}
                          placeholder={col.type === 'number' ? (0).toFixed(col.precision || 2) : '...'}
                          className={`w-full h-7 px-2 bg-transparent focus:outline-none text-[11px] font-mono rounded ${hasError ? 'ring-1 ring-red-500' : ''}`}
                          style={{ color: 'var(--text-main)' }} />
                      </td>
                    );
                  })}
                  {isDynamic && (
                    <td className="px-1 py-1 text-center" style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {curRows > 1 && (
                        <button onClick={() => removeRow(rIdx)} title="Eliminar"
                          className="text-red-400 hover:text-red-600 p-1 rounded opacity-40 hover:opacity-100 transition-opacity">
                          <X size={12} />
                        </button>
                      )}
                    </td>
                  )}
                </motion.tr>
              );
            })}
          </AnimatePresence>

          {/* Stats footer */}
          {settings?.show_statistics && numericCols.length > 0 && (() => {
            const fb = '2px solid var(--border-color)';
            return (
              <>
                <tr style={{ backgroundColor: 'var(--bg-result-row)' }}>
                  <td className="px-2 py-2 text-[10px] font-bold text-center"
                    style={{ color: 'var(--text-highlight)', borderRight: '1px solid var(--border-color)', borderTop: fb }}>x̄</td>
                  {columns.map(col => (
                    <td key={col.key} className="px-3 py-2 font-mono text-[11px] font-bold"
                      style={{ color: 'var(--text-result-val)', borderRight: '1px solid var(--border-color)', borderTop: fb }}>
                      {numericCols.some(nc => nc.key === col.key) ? computeStats(col.key).mean : ''}
                    </td>
                  ))}
                  {isDynamic && <td style={{ borderTop: fb }} />}
                </tr>
                <tr style={{ backgroundColor: 'var(--bg-result-row)' }}>
                  <td className="px-2 py-2 text-[10px] font-bold text-center"
                    style={{ color: 'var(--text-highlight)', borderRight: '1px solid var(--border-color)' }}>σ</td>
                  {columns.map(col => (
                    <td key={col.key} className="px-3 py-2 font-mono text-[11px]"
                      style={{ color: 'var(--text-highlight)', borderRight: '1px solid var(--border-color)' }}>
                      {numericCols.some(nc => nc.key === col.key) ? computeStats(col.key).std : ''}
                    </td>
                  ))}
                  {isDynamic && <td />}
                </tr>
              </>
            );
          })()}
        </tbody>
      </table>
      </div>
    </div>
  );
}

/* ─── HorizontalIterationsGrid — single_column_iterations ─ */
function HorizontalIterationsGrid({ grid, data, onChange, validationErrors }: DynamicGridProps) {
  const { columns, settings } = grid;
  const editableCol = columns.find(c => c.editable);
  if (!editableCol) return null;

  const rowCount = Math.max(1, settings?.min_iterations || 10);

  useEffect(() => {
    if (Object.keys(data).length > 0) return;
    const init: GridData = {};
    for (let i = 0; i < rowCount; i++) {
      init[i] = { [editableCol.key]: '' };
      const hc = columns.find(c => c.key === 'reading_order');
      if (hc) init[i][hc.key] = String(i + 1);
    }
    onChange(grid.id, init);
  }, [rowCount]);

  const rowKeys = Object.keys(data).map(Number).sort((a, b) => a - b);

  const updateCell = (rIdx: number, val: string) =>
    onChange(grid.id, { ...data, [rIdx]: { ...(data[rIdx] || {}), [editableCol.key]: val } });

  const computeStats = (colKey: string) => {
    const vals = Object.values(data).map((r: any) => parseFloat(r[colKey])).filter(n => !isNaN(n));
    if (vals.length === 0) return { mean: '—', std: '—' };
    return { mean: fmt(avg(vals), 4), std: vals.length > 1 ? fmt(stddev(vals), 4) : '0.0000' };
  };

  const stats = computeStats(editableCol.key);

  return (
    <div className="rounded-md overflow-x-auto w-full" style={{ border: '1px solid var(--border-color)' }}>
      <table className="w-full text-xs" style={{ minWidth: `${100 + rowKeys.length * 60}px` }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
            <th className="px-2 py-2 text-left text-[11px] font-semibold"
              style={{ borderRight: '1px solid var(--border-color)', color: 'var(--text-main)', width: 90 }}>
              {editableCol.label} {editableCol.unit && <span className="font-mono opacity-50 text-[9px]">({editableCol.unit})</span>}
            </th>
            {rowKeys.map(rIdx => (
              <th key={rIdx} className="py-2 px-1 text-center font-mono text-[11px]"
                style={{ borderRight: '1px solid var(--border-color)', width: 60, color: 'var(--text-muted)' }}>
                R{rIdx + 1}
              </th>
            ))}
            {settings?.show_statistics && (
              <>
                <th className="px-2 py-2 text-center text-[10px]" style={{ borderRight: '1px solid var(--border-color)', color: ORANGE }}>x̄</th>
                <th className="px-2 py-2 text-center text-[10px]" style={{ color: ORANGE }}>σ</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          <tr style={{ backgroundColor: 'var(--bg-panel)' }}>
            <td className="px-2 py-2 text-[11px] font-semibold"
              style={{ borderRight: '1px solid var(--border-color)', color: 'var(--text-main)' }}>Lecturas</td>
            {rowKeys.map(rIdx => {
              const val = data[rIdx]?.[editableCol.key] || '';
              const hasError = validationErrors?.has(`${rIdx}-${editableCol.key}`);
              return (
                <td key={rIdx} className="px-0.5 py-1.5 text-center"
                  style={{ borderRight: '1px solid var(--border-color)', width: 60 }}>
                  <input type="text" inputMode="decimal" value={val}
                    onChange={e => updateCell(rIdx, e.target.value)} placeholder="—"
                    className="w-[50px] mx-auto h-7 px-0 text-center font-mono text-[11px] bg-transparent focus:outline-none rounded"
                    style={{ color: hasError ? '#ef4444' : 'var(--text-main)', border: '1px solid transparent', backgroundColor: hasError ? 'rgba(239,68,68,0.1)' : 'transparent' }}
                    onFocus={e => (e.target.style.borderColor = ORANGE)}
                    onBlur={e => (e.target.style.borderColor = 'transparent')} />
                </td>
              );
            })}
            {settings?.show_statistics && (
              <>
                <td className="px-2 py-2 text-center font-mono text-[12px] font-bold"
                  style={{ borderRight: '1px solid var(--border-color)', color: ORANGE }}>{stats.mean}</td>
                <td className="px-2 py-2 text-center font-mono text-[12px] font-bold"
                  style={{ color: ORANGE }}>{stats.std}</td>
              </>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ─── Main Export ────────────────────────────────────────── */
export default function DynamicGrid({ grid, gridIndex, data, onChange, validationErrors, instrumentInfo }: DynamicGridProps) {
  if (!grid?.columns) return null;

  const isTransposed = grid.type === 'multi_point_matrix';
  const isHorizontal = grid.type === 'single_column_iterations';
  const { settings } = grid;

  return (
    <div className="w-full">
      <div className="mb-3 flex items-start gap-3">
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
          style={{ backgroundColor: ORANGE }}>{gridIndex + 1}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-[12px] font-bold" style={{ color: 'var(--text-main)' }}>{grid.title}</h4>
          {grid.description && (
            <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{grid.description}</p>
          )}
        </div>
        {isTransposed && (
          <span className="text-[9px] px-2 py-0.5 rounded font-mono shrink-0 mt-0.5"
            style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
            Puntos × Repeticiones
          </span>
        )}
      </div>

      {isTransposed ? (
        <TransposedMatrix grid={grid} data={data} onChange={onChange} validationErrors={validationErrors} />
      ) : isHorizontal ? (
        <HorizontalIterationsGrid grid={grid} gridIndex={gridIndex} data={data} onChange={onChange} validationErrors={validationErrors} />
      ) : (
        <StandardGrid grid={grid} data={data} onChange={onChange} validationErrors={validationErrors} />
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {grid.type} · {Object.keys(data).length} punto{Object.keys(data).length !== 1 ? 's' : ''}
        </span>
        {settings?.min_iterations && settings?.max_iterations && (
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
            Reps: {settings.min_iterations}–{settings.max_iterations}
          </span>
        )}
      </div>
    </div>
  );
}
