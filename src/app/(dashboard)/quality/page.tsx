"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, FileWarning } from "lucide-react";
import qualityApi from "@/lib/qualityApi";
import { C } from "@/lib/colors";
import QualityStatusBadge from "@/components/quality/QualityStatusBadge";

export default function QualityDashboardPage() {
  const { data: ncs = [], isLoading: loadingNc } = useQuery({
    queryKey: ["quality", "nc"],
    queryFn: () => qualityApi.listNonconformities(),
  });
  const { data: acs = [], isLoading: loadingAc } = useQuery({
    queryKey: ["quality", "ac"],
    queryFn: () => qualityApi.listCorrectiveActions(),
  });

  const isLoading = loadingNc || loadingAc;
  const today = new Date();

  const ncAbiertas = ncs.filter((nc) => !["cerrada", "cancelada"].includes(nc.status)).length;
  const ncEnSeguimiento = ncs.filter((nc) => nc.status === "en_seguimiento");
  const ncVencidas = ncEnSeguimiento.filter(
    (nc) => nc.due_date_verification && new Date(nc.due_date_verification) < today,
  ).length;

  const acVerificadas = acs.filter((ac) => ac.status === "eficaz" || ac.status === "no_eficaz");
  const acEficaces = acVerificadas.filter((ac) => ac.status === "eficaz").length;
  const eficaciaPct = acVerificadas.length > 0 ? Math.round((acEficaces / acVerificadas.length) * 100) : null;

  const recentNcs = [...ncs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-4 w-full animate-fadeIn ">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-md">
        <StatCard
          label="NC Abiertas"
          value={isLoading ? "…" : ncAbiertas}
          icon={<FileWarning size={16} />}
          color={C.warning}
        />
        <StatCard
          label="En Seguimiento"
          value={isLoading ? "…" : ncEnSeguimiento.length}
          icon={<Clock size={16} />}
          color={C.info}
        />
        <StatCard
          label="Verificaciones Vencidas"
          value={isLoading ? "…" : ncVencidas}
          icon={<AlertTriangle size={16} />}
          color={C.danger}
        />
        <StatCard
          label="Eficacia de AC"
          value={isLoading ? "…" : eficaciaPct !== null ? `${eficaciaPct}%` : "—"}
          icon={<CheckCircle2 size={16} />}
          color={C.success}
        />
      </div>

      <div className="panel rounded-lg shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-md font-bold" style={{ color: "var(--text-main)" }}>
            No Conformidades Recientes
          </h2>
          <Link href="/quality/nc" className="text-[10px] font-semibold" style={{ color: C.primary }}>
            Ver todas →
          </Link>
        </div>

        {recentNcs.length === 0 ? (
          <p className="text-[11px] italic" style={{ color: "var(--text-muted)" }}>
            No hay No Conformidades registradas.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentNcs.map((nc) => (
              <Link
                key={nc.id}
                href={`/quality/nc/${nc.id}`}
                className="flex items-center justify-between px-3 py-2 rounded hover-bg transition-colors"
                style={{ border: "1px solid var(--border-color)" }}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span className="font-mono font-bold text-sm" style={{ color: C.primary }}>{nc.code}</span>
                  <span className="text-sm truncate" style={{ color: "var(--text-main)" }}>{nc.title}</span>
                </div>
                <QualityStatusBadge kind="nc" status={nc.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="panel rounded-lg shadow-sm p-4 flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-tight" style={{ color: "var(--text-main)" }}>
          {value}
        </p>
        <p className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}
