"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import qualityApi from "@/lib/qualityApi";
import { C } from "@/lib/colors";
import { DataTable } from "@/components/ui/data-table";
import QualityStatusBadge from "@/components/quality/QualityStatusBadge";
import type { CorrectiveAction } from "@/types/quality";

function buildColumns(): ColumnDef<CorrectiveAction>[] {
  return [
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
      accessorKey: "title",
      header: "Título",
      cell: ({ row }) => (
        <p className="font-medium text-sm" style={{ color: "var(--text-main)" }}>
          {row.original.title}
        </p>
      ),
    },
    {
      id: "nonconformity",
      header: "NC vinculada",
      accessorFn: (row) => row.nonconformity_id,
      cell: ({ row }) => (
        <Link
          href={`/quality/nc/${row.original.nonconformity_id}`}
          className="text-sm font-mono font-semibold"
          style={{ color: C.accent }}
        >
          NC-{row.original.nonconformity_id}
        </Link>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      meta: { tourId: "tour-ac-col-status" },
      enableColumnFilter: true,
      cell: ({ row }) => <QualityStatusBadge kind="ac" status={row.original.status} />,
    },
    {
      id: "assignee",
      header: "Responsable",
      accessorFn: (row) => row.assignee?.name ?? "",
      cell: ({ row }) => (
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {row.original.assignee?.name ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "target_date",
      header: "Fecha objetivo",
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return (
          <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
            {v ? new Date(v + "T00:00:00").toLocaleDateString("es-ES") : "—"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableColumnFilter: false,
      size: 60,
      cell: ({ row }) => (
        <Link href={`/quality/ac/${row.original.id}`} className="text-sm font-semibold" style={{ color: C.primary }}>
          Ver →
        </Link>
      ),
    },
  ];
}

export default function CorrectiveActionListPage() {
  const { data: list = [], isLoading } = useQuery({
    queryKey: ["quality", "ac"],
    queryFn: () => qualityApi.listCorrectiveActions(),
  });

  const columns = useMemo(() => buildColumns(), []);

  return (
    <div className="space-y-3 w-full animate-fadeIn">
      {isLoading ? (
        <div className="panel rounded-md shadow-sm p-8 text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: C.primary }} />
          Cargando Acciones Correctivas…
        </div>
      ) : (
        <div id="tour-ac-table">
          <DataTable
            columns={columns}
            data={list}
            searchPlaceholder="Buscar por código o título…"
            searchId="tour-ac-search"
          />
        </div>
      )}
      <p className="text-xs font-bold px-1" style={{ color: "var(--text-muted)" }}>
        Las Acciones Correctivas se crean desde el detalle de una No Conformidad.
      </p>
    </div>
  );
}
