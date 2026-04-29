'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, FileBarChart, Wrench, ShieldCheck, ClipboardCheck,
  ChevronDown, ChevronLeft, ChevronRight, User, Users, FileCode2
} from 'lucide-react';
import { useState } from 'react';

export default function Sidebar({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const [isCalMenuOpen, setIsCalMenuOpen] = useState(true);
  const pathname = usePathname();
  const { user } = useAuthStore();

  const NavItem = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => {
    let isActive = pathname === href;
    if (!isActive && href !== '/dashboard' && pathname.startsWith(href)) {
      if (href === '/calibration' && pathname.startsWith('/calibration/new')) {
        isActive = false;
      } else {
        isActive = true;
      }
    }

    return (
      <Link href={href} style={{ textDecoration: 'none' }}>
        <button className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors text-xs ${
          isActive
            ? 'nav-item-active'
            : 'text-[var(--text-muted)] hover-bg'
        }`}>
          {icon}
          <span>{label}</span>
        </button>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="w-60 h-full flex flex-col" style={{ backgroundColor: 'var(--bg-panel)' }}>

      {/* ── Logo ── */}
      <div className="px-4 flex items-center justify-between shrink-0 h-16" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2.5">
          {/* Logo real del laboratorio */}
          <div className="shrink-0 w-12 h-12 relative rounded-full overflow-hidden border border-gray-200 dark:border-gray-800 bg-white">
            <Image
              src="/logo.jpg"
              alt="Orinoco Quality & Control"
              fill
              sizes="256px"
              quality={100}
              className="object-contain scale-[1.25]"
              priority
            />
          </div>
          <div className="whitespace-nowrap overflow-hidden">
            <h1 className="font-bold text-[11px] tracking-tight leading-tight" style={{ color: 'var(--text-main)' }}>
              Orinoco Q&amp;C
            </h1>
            <p className="text-[9px] uppercase tracking-wider font-semibold truncate" style={{ color: 'var(--text-muted)' }}>
              LAB NDT - TRANSMANDU, C.A.
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <div className="flex-1 overflow-y-auto py-3">
        <div className="px-3 space-y-0.5">
          <NavItem href="/dashboard" icon={<Home size={16} />} label="Dashboard" />

          <div className="pt-3 pb-1">
            <button
              onClick={() => setIsCalMenuOpen(!isCalMenuOpen)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider hover-bg rounded-md transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <span className="flex items-center gap-1.5 whitespace-nowrap">Calibraciones</span>
              <ChevronDown size={14} className={`transform transition-transform ${isCalMenuOpen ? '' : '-rotate-90'} shrink-0`} />
            </button>

            <AnimatePresence>
              {isCalMenuOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden mt-1 ml-1.5 pl-1.5 space-y-0.5"
                  style={{ borderLeft: '1px solid var(--border-color)' }}
                >
                  <NavItem href="/calibration/new"  icon={<FileBarChart size={14} />}   label="Nueva Calibración" />
                  <NavItem href="/instruments"      icon={<Wrench size={14} />}         label="Instrumentos" />
                  <NavItem href="/standards"        icon={<ShieldCheck size={14} />}    label="Patrones" />
                  <NavItem href="/calibration"      icon={<ClipboardCheck size={14} />} label="Revisión y Emisión" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

          {/* ── Admin section ── */}
          {(user?.role === 'admin') && (
            <div className="px-3 mt-1">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Administración</p>
              <div className="space-y-0.5">
                <NavItem href="/admin/users" icon={<Users size={14} />} label="Usuarios" />
                <NavItem href="/schemas"      icon={<FileCode2 size={14} />} label="Esquemas" />
              </div>
            </div>
          )}
      </div>
    

      {/* ── Usuario ── */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover-bg cursor-pointer transition-colors">
          <User size={24} className="p-1 panel rounded-full shadow-sm shrink-0" style={{ color: 'var(--text-muted)' }} />
          <div className="whitespace-nowrap overflow-hidden">
            <p className="text-[11px] font-semibold truncate">{user?.name || 'Usuario'}</p>
            <p className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>{user?.role || 'Rol'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <motion.aside
      id="tour-sidebar"
      initial={false}
      animate={{ width: isOpen ? 240 : 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="hidden md:flex relative inset-y-0 left-0 z-40 flex-col panel shadow-sm overflow-visible shrink-0"
      style={{
        borderRightWidth: isOpen ? '1px' : '0px',
        borderRightStyle: 'solid',
        borderRightColor: 'var(--border-color)',
      }}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className={`absolute -right-3 top-4 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 z-50 border cursor-pointer ${
          isOpen
            ? 'bg-[var(--bg-panel)] border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-orange-50 shadow-md'
            : 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white neon-glow hover:scale-110'
        }`}
      >
        {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <div className="absolute top-0 right-0 h-full overflow-hidden">
        <SidebarContent />
      </div>
    </motion.aside>
  );
}
