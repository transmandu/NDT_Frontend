'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, CheckCircle2, MoreHorizontal } from 'lucide-react';

const COLORS = { primary: '#FFA526', danger: '#FF1E12', warning: '#FFB812', success: '#10B981' };

export default function DashboardPage() {
  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ['calibrationSessions'],
    queryFn: () => api.get('/calibration/sessions').then(r => r.data.data || []),
  });

  const recentSessions = sessions.slice(0, 5);
  const stats = {
    pending:  sessions.filter((s: any) => s.status === 'pending_review').length,
    expiring: 1,
    total:    sessions.filter((s: any) => s.status === 'approved').length,
  };

  return (
    <div className="space-y-4 w-full animate-fadeIn">
      {/* KPI Cards */}
      <div id="tour-kpi" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Pendientes de Aprobación" value={String(stats.pending)} icon={<Clock size={16} style={{ color: 'var(--text-muted)' }} />} />
        <StatCard title="Patrones por Vencer" value={String(stats.expiring)} icon={<AlertTriangle size={16} style={{ color: COLORS.danger }} />} trend="-1 de la semana pasada" />
        <StatCard title="Certificados Emitidos" value={String(stats.total)} icon={<CheckCircle2 size={16} style={{ color: 'var(--text-muted)' }} />} trend="+12% este mes" />
      </div>

      {/* Recent Activity */}
      <div id="tour-recent-activity" className="panel rounded-md shadow-sm overflow-hidden mt-4">
        <div className="px-4 py-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}>
          <div>
            <h3 className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>Actividad Reciente</h3>
            <p className="text-[10px] hidden sm:block" style={{ color: 'var(--text-muted)' }}>Últimas sesiones de calibración registradas.</p>
          </div>
          <Link href="/calibration" className="text-[10px] font-medium hover:underline" style={{ color: COLORS.primary }}>Ver todo</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead>
              <tr>
                <th className="px-4 py-2 th-theme text-[11px] whitespace-nowrap">ID Sesión</th>
                <th className="px-4 py-2 th-theme text-[11px] whitespace-nowrap">Instrumento</th>
                <th className="px-4 py-2 th-theme text-[11px] whitespace-nowrap">Fecha</th>
                <th className="px-4 py-2 th-theme text-[11px] whitespace-nowrap">Estado</th>
                <th className="px-4 py-2 th-theme text-[11px] text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    No hay sesiones de calibración registradas.
                  </td>
                </tr>
              ) : (
                recentSessions.map((s: any) => (
                  <ActivityRow
                    key={s.id}
                    id={`CS-${s.id}`}
                    inst={s.instrument?.name || `Inst #${s.instrument_id}`}
                    date={new Date(s.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                    status={s.status === 'approved' ? 'Aprobado' : s.status === 'pending_review' ? 'En Revisión' : 'Borrador'}
                    color={s.status === 'approved' ? COLORS.success : s.status === 'pending_review' ? COLORS.primary : COLORS.warning}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string; value: string; icon: React.ReactNode; trend?: string }) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="panel p-4 rounded-md shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start mb-1.5">
        <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{title}</p>
        {icon}
      </div>
      <h3 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>{value}</h3>
      {trend && <p className="text-[9px] mt-1.5" style={{ color: 'var(--text-muted)' }}>{trend}</p>}
    </motion.div>
  );
}

function ActivityRow({ id, inst, date, status, color }: { id: string; inst: string; date: string; status: string; color: string }) {
  return (
    <tr className="td-theme hover-bg transition-colors">
      <td className="px-4 py-2.5 font-mono text-[11px] whitespace-nowrap">{id}</td>
      <td className="px-4 py-2.5 font-medium whitespace-nowrap">{inst}</td>
      <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{date}</td>
      <td className="px-4 py-2.5">
        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap"
          style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}>
          {status}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right">
        <button style={{ color: 'var(--text-muted)' }}><MoreHorizontal size={14} /></button>
      </td>
    </tr>
  );
}
