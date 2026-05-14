'use client';

import * as React from 'react';
import {
  ColumnDef,
  Column,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Settings2, ListFilter, X } from 'lucide-react';

/* ════════════════════════════════════════════════════════════
   DataTable — shadcn-pattern component using project CSS tokens
   ════════════════════════════════════════════════════════════ */

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  toolbarRight?: React.ReactNode;
  pageSizeOptions?: number[];
  /** Optional id attribute for the search input — used by the tutorial system */
  searchId?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = 'Buscar…',
  toolbarRight,
  pageSizeOptions = [10, 25, 50],
  searchId,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting]                 = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters]     = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter]       = React.useState('');
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [showColMenu, setShowColMenu]         = React.useState(false);
  const colMenuRef = React.useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: { pagination: { pageSize: pageSizeOptions[0] } },
  });

  /* Close column-visibility menu on outside click */
  React.useEffect(() => {
    const close = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setShowColMenu(false);
    };
    if (showColMenu) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showColMenu]);

  const totalFiltered = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;

  /* Active filters summary chips */
  const activeFilters = columnFilters.filter(f => f.value !== undefined && f.value !== '');

  return (
    <div className="space-y-2 w-full">

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Global filter */}
          <div
            className="flex items-center rounded px-2 py-1 w-full sm:w-64 input-theme shadow-sm"
            style={{ border: '1.5px solid var(--border-color)' }}
          >
            <Search size={12} className="mr-1.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              id={searchId}
              type="text"
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-[11px] w-full"
              style={{ color: 'var(--text-main)' }}
            />
            {globalFilter && (
              <button onClick={() => setGlobalFilter('')} className="ml-1 opacity-60 hover:opacity-100" style={{ color: 'var(--text-muted)' }}>
                <X size={10} />
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {activeFilters.map(f => (
            <span key={f.id}
              className="hidden sm:flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-medium whitespace-nowrap"
              style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)', color: 'var(--brand-primary)', border: '1px solid color-mix(in srgb, var(--brand-primary) 30%, transparent)' }}>
              {f.id}: {String(f.value)}
              <button onClick={() => table.getColumn(f.id)?.setFilterValue(undefined)} className="ml-0.5 opacity-70 hover:opacity-100">
                <X size={9} />
              </button>
            </span>
          ))}
        </div>

        {/* Right slot + column visibility */}
        <div className="flex items-center gap-2">
          {toolbarRight}

          <div className="relative" ref={colMenuRef}>
            <button
              onClick={() => setShowColMenu(v => !v)}
              title="Mostrar/Ocultar columnas"
              className="h-7 px-2.5 rounded text-[11px] flex items-center gap-1.5 transition-colors hover-bg"
              style={{ border: '1.5px solid var(--border-color)', color: 'var(--text-muted)' }}
            >
              <Settings2 size={12} />
              <span className="hidden sm:inline">Columnas</span>
            </button>
            {showColMenu && (
              <div className="absolute right-0 top-full mt-1 min-w-[160px] rounded-md shadow-xl z-[70] py-1"
                style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)' }}>
                <p className="px-3 py-1.5 text-[9px] uppercase font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>Visibilidad</p>
                {table.getAllColumns().filter(c => c.getCanHide()).map(col => (
                  <label key={col.id} className="flex items-center gap-2 px-3 py-1.5 text-[11px] cursor-pointer hover-bg" style={{ color: 'var(--text-main)' }}>
                    <input type="checkbox" checked={col.getIsVisible()} onChange={col.getToggleVisibilityHandler()} className="accent-[var(--brand-primary)] h-3 w-3" />
                    <span className="capitalize">{col.id.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="panel rounded-md shadow-sm overflow-x-auto w-full">
        <table className="w-full text-left text-xs">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th key={header.id} colSpan={header.colSpan}
                    id={(header.column.columnDef.meta as { tourId?: string } | undefined)?.tourId}
                    className="px-4 py-2.5 th-theme text-[11px] whitespace-nowrap select-none"
                    style={{ width: header.column.columnDef.size ?? undefined }}>
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-1.5">
                        {/* Sort button */}
                        {header.column.getCanSort() ? (
                          <button onClick={header.column.getToggleSortingHandler()} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === 'asc'  && <ChevronUp size={10} />}
                            {header.column.getIsSorted() === 'desc' && <ChevronDown size={10} />}
                            {!header.column.getIsSorted()           && <ChevronsUpDown size={10} className="opacity-40" />}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}

                        {/* Filter icon — only for filterable columns */}
                        {header.column.getCanFilter() && (
                          <FilterPopover column={header.column} />
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  No se encontraron resultados
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="td-theme hover-bg transition-colors border-b last:border-0 border-[var(--border-color)]">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-0.5">
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Mostrando {totalFiltered === 0 ? 0 : pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, totalFiltered)} de{' '}
          <strong>{totalFiltered}</strong> registros
        </p>
        <div className="flex items-center gap-2">
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="input-theme rounded px-1.5 py-0.5 text-[10px] h-6 cursor-pointer"
            style={{ border: '1px solid var(--border-color)' }}
          >
            {pageSizeOptions.map(n => <option key={n} value={n}>{n} / página</option>)}
          </select>
          <div className="flex items-center gap-1">
            <PagBtn onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft size={12} /></PagBtn>
            {getPaginationRange(table.getPageCount(), pageIndex).map((p, i) =>
              p === '…'
                ? <span key={`e${i}`} className="px-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>…</span>
                : <PagBtn key={p} onClick={() => table.setPageIndex(p as number)} active={p === pageIndex}>{(p as number) + 1}</PagBtn>
            )}
            <PagBtn onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight size={12} /></PagBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Filter Popover ──────────────────────────────────────── */
function FilterPopover<TData, TValue>({ column }: { column: Column<TData, TValue> }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const currentValue = (column.getFilterValue() ?? '') as string;
  const faceted: Map<string, number> = column.getFacetedUniqueValues() ?? new Map();
  const options = Array.from(faceted.keys()).filter(Boolean).sort();

  React.useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const isActive = !!currentValue;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        title={`Filtrar por ${column.id}`}
        className="p-0.5 rounded transition-colors hover:opacity-80"
        style={{ color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)' }}
      >
        <ListFilter size={11} className={isActive ? 'opacity-100' : 'opacity-60'} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 min-w-[160px] rounded-md shadow-xl z-[80] py-1 overflow-hidden"
          style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <p className="text-[9px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>
              Filtrar por {column.id.replace(/_/g, ' ')}
            </p>
            {isActive && (
              <button
                onClick={() => { column.setFilterValue(undefined); setOpen(false); }}
                className="text-[9px] flex items-center gap-0.5 hover:opacity-80"
                style={{ color: 'var(--brand-primary)' }}
              >
                <X size={8} /> Limpiar
              </button>
            )}
          </div>

          {/* "All" option */}
          <button
            onClick={() => { column.setFilterValue(undefined); setOpen(false); }}
            className="w-full px-3 py-1.5 text-left text-[11px] hover-bg transition-colors flex items-center justify-between"
            style={{ color: !isActive ? 'var(--brand-primary)' : 'var(--text-main)', fontWeight: !isActive ? 600 : 400 }}
          >
            Todos
            {!isActive && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }} />}
          </button>

          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { column.setFilterValue(opt === currentValue ? undefined : opt); setOpen(false); }}
              className="w-full px-3 py-1.5 text-left text-[11px] hover-bg transition-colors capitalize flex items-center justify-between"
              style={{ color: currentValue === opt ? 'var(--brand-primary)' : 'var(--text-main)', fontWeight: currentValue === opt ? 600 : 400 }}
            >
              {opt}
              {currentValue === opt && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Pagination button ───────────────────────────────────── */
function PagBtn({ children, onClick, disabled, active }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="h-6 min-w-[24px] px-1.5 rounded text-[10px] flex items-center justify-center transition-colors disabled:opacity-30"
      style={{ backgroundColor: active ? 'var(--brand-primary)' : 'transparent', color: active ? '#fff' : 'var(--text-muted)', border: `1px solid ${active ? 'var(--brand-primary)' : 'var(--border-color)'}` }}>
      {children}
    </button>
  );
}

/* ─── Pagination range helper ────────────────────────────── */
function getPaginationRange(pageCount: number, current: number): (number | '…')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i);
  const range: (number | '…')[] = [];
  [0, current - 1, current, current + 1, pageCount - 1].forEach(p => { if (p >= 0 && p < pageCount) range.push(p); });
  const unique = [...new Set(range)].sort((a, b) => (a as number) - (b as number));
  const result: (number | '…')[] = [];
  unique.forEach((p, i) => { if (i > 0 && (p as number) - (unique[i - 1] as number) > 1) result.push('…'); result.push(p); });
  return result;
}
