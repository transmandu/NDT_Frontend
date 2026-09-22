"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { Quote, QuoteStatus } from "@/types/quotes";
import { fmtDate } from "@/utils/formatters";
import { Plus, Loader2, FileBarChart } from "lucide-react";
import { C } from "@/lib/colors";

const STATUS_LABELS: Record<QuoteStatus, { label: string; color: string }> = {
  draft: { label: "Borrador", color: C.statusDraft },
  issued: { label: "Emitida", color: C.info },
  won: { label: "Ganada", color: C.success },
  lost: { label: "Perdida", color: C.danger },
};

const CURRENCY_LABELS: Record<string, string> = {
  usd: "USD",
  bs: "Bs",
  both: "USD / Bs",
};

export default function QuotesListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canCreate = role === "admin" || role === "supervisor";

  const { data: quotes = [], isLoading } = useQuery<Quote[]>({
    queryKey: ["quotes"],
    queryFn: () => api.get("/quotes").then((r) => r.data.data || []),
  });

  const columns: ColumnDef<Quote>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Código",
        cell: ({ getValue }) => (
          <span className="font-mono font-bold text-sm" style={{ color: C.primary }}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        id: "client",
        header: "Cliente",
        accessorFn: (row) => row.client?.company_name ?? "",
        cell: ({ row }) => (
          <span className="text-sm" style={{ color: "var(--text-main)" }}>
            {row.original.client?.company_name ?? "—"}
          </span>
        ),
      },
      {
        id: "project_name",
        header: "Proyecto",
        accessorFn: (row) => row.project_name ?? "",
        enableColumnFilter: false,
        cell: ({ row }) => (
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            {row.original.project_name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        enableColumnFilter: true,
        cell: ({ getValue }) => {
          const s = STATUS_LABELS[getValue<QuoteStatus>()];
          return (
            <span
              className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider whitespace-nowrap"
              style={{ backgroundColor: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}
            >
              {s.label}
            </span>
          );
        },
      },
      {
        accessorKey: "currency_display",
        header: "Moneda",
        enableColumnFilter: true,
        cell: ({ getValue }) => (
          <span className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>
            {CURRENCY_LABELS[getValue<string>()] ?? getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "total_usd",
        header: "Total",
        enableColumnFilter: false,
        cell: ({ getValue }) => {
          const v = getValue<string | null>();
          return (
            <span className="font-mono text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              {v ? `$${Number(v).toFixed(2)}` : "—"}
            </span>
          );
        },
      },
      {
        id: "issued_at",
        header: "Emitida",
        accessorFn: (row) => row.issued_at ?? "",
        enableColumnFilter: false,
        cell: ({ row }) => (
          <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
            {row.original.issued_at ? fmtDate(row.original.issued_at) : "—"}
          </span>
        ),
      },
      {
        id: "created_at",
        header: "Creada",
        accessorFn: (row) => row.created_at ?? "",
        enableColumnFilter: false,
        cell: ({ row }) => (
          <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
            {row.original.created_at ? fmtDate(row.original.created_at) : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableColumnFilter: false,
        size: 60,
        cell: ({ row }) => (
          <Link href={`/quotes/${row.original.id}`} className="text-xs font-semibold" style={{ color: C.primary }}>
            Ver →
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-3 w-full animate-fadeIn">
      {isLoading ? (
        <div className="panel rounded-md shadow-sm p-8 text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: C.primary }} />
          Cargando cotizaciones…
        </div>
      ) : quotes.length === 0 ? (
        <div
          className="panel rounded-md shadow-sm p-8 text-center text-[11px] flex flex-col items-center gap-2"
          style={{ color: "var(--text-muted)" }}
        >
          <FileBarChart size={20} />
          Todavía no hay cotizaciones registradas.
          {canCreate && (
            <Link href="/quotes/new" className="text-[11px] font-semibold mt-1" style={{ color: C.primary }}>
              Crear la primera →
            </Link>
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={quotes}
          searchPlaceholder="Buscar por código, cliente o proyecto…"
          toolbarRight={
            canCreate && (
              <Link
                href="/quotes/new"
                className="h-7 px-3 text-xs rounded font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 hover:opacity-90 whitespace-nowrap"
                style={{ backgroundColor: C.accent, color: "#fff" }}
              >
                <Plus size={15} /> Nueva Cotización
              </Link>
            )
          }
        />
      )}
    </div>
  );
}
