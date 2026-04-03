'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, Settings, Sun, Moon, Info, Menu, MapPin, CloudSun, Droplets, Save, LogOut } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  showAutoSave?: boolean;
  onMenuClick: () => void;
}

export default function Header({ title, subtitle, showAutoSave, onMenuClick }: HeaderProps) {
  const { isDarkMode, toggleTheme } = useTheme();
  const { clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

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

      {/* Center: Weather */}
      <div className="flex-1 justify-center items-center hidden lg:flex">
        <div className="flex items-center gap-2.5 px-3 py-1 rounded-full shadow-sm"
          style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
          <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <MapPin size={12} /> Guayana
          </span>
          <div className="w-px h-3" style={{ backgroundColor: 'var(--border-color)' }} />
          <div className="flex items-center gap-1.5">
            <CloudSun size={14} style={{ color: '#FFB812' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>32°C</span>
          </div>
          <div className="w-px h-3" style={{ backgroundColor: 'var(--border-color)' }} />
          <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Droplets size={12} className="text-blue-400" />
            <span className="text-[10px] font-medium">Hum: 60%</span>
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex-1 flex items-center justify-end gap-1 md:gap-2">
        <button onClick={toggleTheme} className="p-1.5 rounded-md hover-bg transition-colors" style={{ color: 'var(--text-muted)' }}>
          <motion.div whileTap={{ rotate: 180 }} transition={{ duration: 0.15 }}>
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </motion.div>
        </button>
        <button className="relative p-1.5 rounded-md hover-bg transition-colors" style={{ color: 'var(--text-muted)' }}>
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FF1E12' }} />
        </button>
        <button onClick={handleLogout} className="p-1.5 rounded-md hover-bg transition-colors hidden sm:block" style={{ color: 'var(--text-muted)' }} title="Cerrar sesión">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
