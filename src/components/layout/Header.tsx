'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Sun, Moon, Menu, MapPin, CloudSun, Droplets, Save, LogOut,
         ClipboardCheck, AlertCircle, Clock, X, CheckCircle2,
         Cloud, CloudRain, CloudLightning, CloudSnow, CloudFog, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { useWeather } from '@/lib/useWeather';

interface Notification {
  id: string;
  type: 'pending_review' | 'rejected' | 'stale_draft';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  session_id: number;
  age: string;
  technician?: string;
  reason?: string;
}

interface NotificationsResponse {
  unread_count: number;
  total: number;
  items: Notification[];
}

interface HeaderProps {
  title: string;
  subtitle: string;
  showAutoSave?: boolean;
  onMenuClick: () => void;
}

const PRIORITY_STYLES = {
  high:   { dot: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',  icon: AlertCircle,    iconColor: '#EF4444' },
  medium: { dot: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)', icon: Clock,          iconColor: '#F59E0B' },
  low:    { dot: '#6B7280', bg: 'rgba(107,114,128,0.06)', border: 'rgba(107,114,128,0.15)',icon: ClipboardCheck, iconColor: '#6B7280' },
};

export default function Header({ title, subtitle, showAutoSave, onMenuClick }: HeaderProps) {
  const { isDarkMode, toggleTheme } = useTheme();
  const { clearAuth } = useAuthStore();
  const router = useRouter();
  const { weather, loading: weatherLoading } = useWeather();

  const [isOpen, setIsOpen]   = useState(false);
  const [data, setData]       = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const panelRef              = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<NotificationsResponse>('/notifications');
      setData(res.data);
    } catch {
      // silently ignore — no mostrar errores en el bell
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch al montar y luego cada 60 segundos
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { clearAuth(); router.push('/login'); };
  const goToSession  = (id: number) => { setIsOpen(false); router.push(`/calibration/${id}`); };

  const unread = data?.unread_count ?? 0;

  return (
    <header
      className="h-14 flex items-center justify-between px-4 md:px-6 panel z-20 relative shadow-sm shrink-0"
      style={{ borderBottom: '1px solid var(--border-color)' }}
    >
      {/* Left */}
      <div className="flex-1 flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden p-1.5 rounded-md hover-bg transition-colors" style={{ color: 'var(--text-muted)' }}>
          <Menu size={20} />
        </button>
        <div className="flex flex-col justify-center overflow-hidden">
          <div className="flex items-center gap-2">
            <h2 className="text-sm md:text-base font-bold tracking-tight leading-tight truncate" style={{ color: 'var(--text-main)' }}>
              {title}
            </h2>
            {showAutoSave && (
              <span id="tour-autoguardado" className="hidden sm:inline-flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded"
                style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                <Save size={10} /> Autoguardado
              </span>
            )}
          </div>
          <p className="text-[8px] md:text-[9px] font-semibold uppercase tracking-wider mt-0.5 truncate hidden sm:block" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        </div>
      </div>

      {/* Center: Ciudad Guayana Weather */}
      <div className="flex-1 justify-center items-center hidden lg:flex">
        <div className="flex items-center gap-2.5 px-3 py-1 rounded-full shadow-sm"
          style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}
          title={weather?.description || 'Cargando clima...'}
        >
          <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <MapPin size={12} /> Guayana
          </span>
          <div className="w-px h-3" style={{ backgroundColor: 'var(--border-color)' }} />
          
          {weatherLoading ? (
            <div className="flex items-center gap-1.5 px-2">
              <Loader2 size={12} className="animate-spin text-gray-400" />
              <span className="text-[10px] text-gray-400">Cargando...</span>
            </div>
          ) : weather ? (
            <>
              <div className="flex items-center gap-1.5">
                {weather.icon === 'sun' && <Sun size={14} style={{ color: '#FFB812' }} />}
                {weather.icon === 'cloud-sun' && <CloudSun size={14} style={{ color: '#FFB812' }} />}
                {weather.icon === 'cloud' && <Cloud size={14} className="text-gray-400" />}
                {weather.icon === 'rain' && <CloudRain size={14} className="text-blue-400" />}
                {weather.icon === 'storm' && <CloudLightning size={14} className="text-purple-500" />}
                {weather.icon === 'snow' && <CloudSnow size={14} className="text-cyan-300" />}
                {weather.icon === 'fog' && <CloudFog size={14} className="text-gray-400" />}
                <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{weather.temperature}°C</span>
              </div>
              <div className="w-px h-3" style={{ backgroundColor: 'var(--border-color)' }} />
              <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Droplets size={12} className="text-blue-400" />
                <span className="text-[10px] font-medium">Hum: {weather.humidity}%</span>
              </div>
            </>
          ) : (
             <span className="text-[10px] text-gray-400">Clima no disponible</span>
          )}
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex-1 flex items-center justify-end gap-1 md:gap-2">

        {/* 🌙 Tema */}
        <button onClick={toggleTheme} className="p-1.5 rounded-md hover-bg transition-colors" style={{ color: 'var(--text-muted)' }}>
          <motion.div whileTap={{ rotate: 180 }} transition={{ duration: 0.15 }}>
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </motion.div>
        </button>

        {/* 🔔 Notificaciones */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => { setIsOpen(v => !v); if (!isOpen) fetchNotifications(); }}
            className="relative p-1.5 rounded-md hover-bg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Notificaciones"
          >
            <Bell size={16} />
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center text-white font-bold"
                style={{ fontSize: '9px', backgroundColor: '#EF4444' }}
              >
                {unread > 9 ? '9+' : unread}
              </motion.span>
            )}
            {unread === 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#6B7280' }} />
            )}
          </button>

          {/* Panel de notificaciones */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl z-50 overflow-hidden"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {/* Header del panel */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Notificaciones</p>
                    {data && (
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {unread > 0 ? `${unread} requieren atención` : 'Todo al día'}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setIsOpen(false)} className="p-1 rounded hover-bg" style={{ color: 'var(--text-muted)' }}>
                    <X size={14} />
                  </button>
                </div>

                {/* Lista */}
                <div className="max-h-80 overflow-y-auto">
                  {loading && (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                    </div>
                  )}

                  {!loading && (!data || data.items.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <CheckCircle2 size={28} style={{ color: '#10B981' }} />
                      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        Sin notificaciones pendientes
                      </p>
                    </div>
                  )}

                  {!loading && data?.items.map((n) => {
                    const style = PRIORITY_STYLES[n.priority];
                    const Icon  = style.icon;
                    return (
                      <button
                        key={n.id}
                        onClick={() => goToSession(n.session_id)}
                        className="w-full text-left px-4 py-3 transition-colors hover-bg flex items-start gap-3"
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                      >
                        <div className="shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: style.bg, border: `1px solid ${style.border}` }}>
                          <Icon size={13} style={{ color: style.iconColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-main)' }}>{n.title}</p>
                          <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{n.message}</p>
                          {n.reason && (
                            <p className="text-[9px] mt-0.5 italic truncate" style={{ color: '#F59E0B' }}>
                              Motivo: {n.reason}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{n.age}</span>
                            {n.technician && (
                              <>
                                <span className="text-[9px]" style={{ color: 'var(--border-color)' }}>·</span>
                                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{n.technician}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: style.dot }} />
                      </button>
                    );
                  })}
                </div>

                {/* Footer */}
                {data && data.total > 0 && (
                  <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => { setIsOpen(false); router.push('/calibration'); }}
                      className="w-full text-center text-[10px] font-semibold transition-colors"
                      style={{ color: 'var(--brand-primary)' }}
                    >
                      Ver todas en Revisión y Emisión →
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 🚪 Logout */}
        <button onClick={handleLogout} className="p-1.5 rounded-md hover-bg transition-colors hidden sm:block" style={{ color: 'var(--text-muted)' }} title="Cerrar sesión">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
