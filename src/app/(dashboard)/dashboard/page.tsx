'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, CheckCircle2, MoreHorizontal, PieChart as PieChartIcon, Activity, Zap } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

import { C } from '@/lib/colors';
const COLORS = { primary: C.primary, danger: C.danger, warning: C.warning, success: C.success, draft: C.statusDraft };

export default function DashboardPage() {
  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ['calibrationSessions'],
    queryFn: () => api.get('/calibration/sessions').then(r => r.data.data || []),
  });

  const { data: standards = [] } = useQuery<any[]>({
    queryKey: ['standards'],
    queryFn: () => api.get('/standards').then(r => r.data.data || []),
  });

  const recentSessions = sessions.slice(0, 7); 
  
  const stats = {
    pending:  sessions.filter((s: any) => s.status === 'pending_review').length,
    approved: sessions.filter((s: any) => s.status === 'approved').length,
    drafts:   sessions.filter((s: any) => s.status === 'draft').length,
    rejected: sessions.filter((s: any) => s.status === 'rejected').length,
  };

  const today = new Date();
  const in30Days = new Date();
  in30Days.setDate(today.getDate() + 30);

  let stdValid = 0, stdWarning = 0, stdExpired = 0;
  standards.forEach((s: any) => {
    if(!s.expiry_date) return;
    const exp = new Date(s.expiry_date);
    if(exp < today) stdExpired++;
    else if(exp <= in30Days) stdWarning++;
    else stdValid++;
  });

  const chartData = [
    { name: 'Aprobados', value: stats.approved, fill: COLORS.success },
    { name: 'En Revisión', value: stats.pending, fill: COLORS.primary },
    { name: 'Borradores', value: stats.drafts, fill: COLORS.draft },
    { name: 'Rechazados', value: stats.rejected, fill: COLORS.danger },
  ].filter(item => item.value > 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const activityData = last7Days.map(dateStr => {
    const daySessions = sessions.filter((s: any) => s.created_at.startsWith(dateStr));
    const dayName = new Date(dateStr + 'T12:00:00').toLocaleDateString('es', { weekday: 'short' });
    return {
      name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      Calibraciones: daySessions.length
    };
  });

  const totalConcluded = stats.approved + stats.rejected;
  const conformityRatio = totalConcluded > 0 ? ((stats.approved / totalConcluded) * 100).toFixed(0) : '0';

  const conformityData = [
    { name: 'Éxito (Aprobados)', value: stats.approved, fill: COLORS.success },
    { name: 'Errores (Rechazados)', value: stats.rejected, fill: COLORS.danger }
  ].filter(item => item.value > 0);

  return (
    <div id="tour-dashboard-welcome" className="w-full flex flex-col gap-4 animate-fadeIn">
      
      {/* Administrative Compact Metrics Ribbon */}
      <div id="tour-dashboard-kpis" className="flex flex-wrap items-center gap-3">
        <CompactMetric label="Total Calibraciones" value={sessions.length} />
        <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-2 hidden sm:block" />
        <CompactMetric label="Pendientes" value={stats.pending} icon={<Clock size={12} className="text-orange-500" />} />
        <CompactMetric label="Aprobados este mes" value={stats.approved} icon={<CheckCircle2 size={12} className="text-emerald-500" />} />
        <CompactMetric label="Patrones por vencer" value={stdWarning + stdExpired} icon={<AlertTriangle size={12} className="text-red-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Chart 1: Sessions */}
        <div className="lg:col-span-1 panel rounded-md shadow-sm overflow-hidden flex flex-col h-[280px]">
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}>
            <PieChartIcon size={14} style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>Estado de Sesiones</h3>
          </div>
          
          <div className="flex-1 p-4 flex flex-col justify-center">
            {sessions.length === 0 ? (
              <div className="text-center text-[11px] text-gray-500">Sin datos para graficar</div>
            ) : (
              <div className="w-full h-full min-h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="45%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', fontSize: '11px', borderRadius: '6px', padding: '4px 8px' }}
                      itemStyle={{ color: 'var(--text-main)', padding: 0 }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={24}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '10px', paddingTop: '0px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Recent Activity (Bar Chart) */}
        <div className="lg:col-span-1 panel rounded-md shadow-sm overflow-hidden flex flex-col h-[280px]">
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}>
            <Activity size={14} style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>Actividad de la Semana</h3>
          </div>
          
          <div className="flex-1 p-4 flex flex-col justify-center">
            <div className="w-full h-full min-h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 9, fill: 'var(--text-muted)' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 9, fill: 'var(--text-muted)' }} 
                    axisLine={false} 
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'var(--bg-hover)' }}
                    contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', fontSize: '11px', borderRadius: '6px', padding: '4px 8px' }}
                    itemStyle={{ color: COLORS.primary, padding: 0 }}
                  />
                  <Bar dataKey="Calibraciones" fill={COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 3: Conformidad */}
        <div className="lg:col-span-1 panel rounded-md shadow-sm overflow-hidden flex flex-col h-[280px]">
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}>
            <Zap size={14} style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>Tasa de Conformidad</h3>
          </div>
          
          <div className="flex-1 p-4 flex flex-col justify-center">
            {totalConcluded === 0 ? (
              <div className="text-center text-[11px] text-gray-500">Sin equipos concluidos</div>
            ) : (
              <div className="w-full h-full min-h-[160px] relative flex items-center justify-center">
                <div className="absolute inset-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={conformityData}
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {conformityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', fontSize: '11px', borderRadius: '6px', padding: '4px 8px' }}
                        itemStyle={{ color: 'var(--text-main)', padding: 0 }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={24}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '10px', paddingTop: '0px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Center text manually */}
                <div className="absolute text-center" style={{ top: '42%', transform: 'translateY(-50%)' }}>
                  <p className="text-2xl font-bold leading-none" style={{ color: 'var(--text-main)' }}>{conformityRatio}%</p>
                  <p className="text-[8px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Satisfacción</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity Table */}
      <div className="w-full lg:w-[65%]">
        <div id="tour-dashboard-recent" className="panel rounded-md shadow-sm overflow-hidden flex flex-col min-h-[280px] w-full">
          <div className="px-4 py-3 flex justify-between items-center bg-[var(--bg-panel)] shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <h3 className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>Seguimiento Administrativo</h3>
              <p className="text-[10px] hidden sm:block" style={{ color: 'var(--text-muted)' }}>Flujo de trabajo de las últimas sesiones registradas en el laboratorio.</p>
            </div>
            <Link href="/calibration" className="text-[10px] font-medium hover:underline flex-shrink-0" style={{ color: COLORS.primary }}>
              Abrir Registro Visual →
            </Link>
          </div>
          
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="sticky top-0 z-10 bg-[var(--bg-panel)] shadow-sm">
                <tr>
                  <th className="px-4 py-2 th-theme text-[10px] uppercase tracking-wider whitespace-nowrap">Expediente</th>
                  <th className="px-4 py-2 th-theme text-[10px] uppercase tracking-wider whitespace-nowrap">Equipo</th>
                  <th className="px-4 py-2 th-theme text-[10px] uppercase tracking-wider whitespace-nowrap">Ingreso</th>
                  <th className="px-4 py-2 th-theme text-[10px] uppercase tracking-wider whitespace-nowrap">Estado del Trámite</th>
                  <th className="px-4 py-2 th-theme text-[10px] uppercase tracking-wider text-right">Opciones</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      No se han ingresado expedientes de calibración recientes.
                    </td>
                  </tr>
                ) : (
                  recentSessions.map((s: any) => (
                    <ActivityRow
                      key={s.id}
                      id={`EXT-${new Date(s.created_at).getFullYear()}-${String(s.id).padStart(4, '0')}`}
                      inst={s.instrument?.name || `Inst #${s.instrument_id}`}
                      date={new Date(s.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                      status={
                        s.status === 'approved' ? 'Aprobado y Certificado' : 
                        s.status === 'pending_review' ? 'Auditoría Pendiente' : 
                        s.status === 'rejected' ? 'Devuelto p/ Corrección' : 'Toma de Datos (Borrador)'
                      }
                      color={s.status === 'approved' ? COLORS.success : s.status === 'pending_review' ? COLORS.primary : s.status === 'rejected' ? COLORS.danger : COLORS.draft}
                      rawId={s.id}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Micro-component for the top ribbon
function CompactMetric({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm transition-colors cursor-default" 
      style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)' }}>
      {icon}
      <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{label}:</span>
      <span className="text-[11px] font-bold" style={{ color: 'var(--text-main)' }}>{value}</span>
    </div>
  );
}

function ActivityRow({ id, inst, date, status, color, rawId }: { id: string; inst: string; date: string; status: string; color: string; rawId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <tr className="td-theme hover-bg transition-colors border-b last:border-0 border-[var(--border-color)]">
      <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-blue-600 dark:text-blue-400 font-medium">{id}</td>
      <td className="px-4 py-3 font-medium whitespace-nowrap truncate max-w-[200px] text-[11px] text-[var(--text-main)]">{inst}</td>
      <td className="px-4 py-3 whitespace-nowrap text-[10px]" style={{ color: 'var(--text-muted)' }}>{date}</td>
      <td className="px-4 py-3">
        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
          style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}>
          {status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="relative inline-block text-left" ref={menuRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors focus:outline-none" 
            style={{ color: 'var(--text-muted)' }}
          >
            <MoreHorizontal size={16} />
          </button>
          
          <AnimatePresence>
            {isOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1E232B] border border-gray-200 dark:border-gray-700 shadow-xl rounded-md z-[60] flex flex-col py-1"
              >
                <p className="px-3 py-1.5 text-[9px] uppercase font-semibold border-b border-gray-100 dark:border-gray-800" style={{ color: 'var(--text-muted)' }}>Opciones de Trámite</p>
                <Link href={`/calibration?review=${rawId}`} className="px-3 py-2 text-xs text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" style={{ color: 'var(--text-main)' }}>
                  Visualizar Expediente...
                </Link>
                <button className="px-3 py-2 text-xs text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-red-500 font-medium">
                  Anular y Borrar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </td>
    </tr>
  );
}
