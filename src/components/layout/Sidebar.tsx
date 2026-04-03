'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Wrench, Shield, FlaskConical,
  ClipboardList, FileText, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/instruments', label: 'Instrumentos', icon: Wrench },
  { href: '/standards', label: 'Patrones', icon: Shield },
  { href: '/calibration', label: 'Calibraciones', icon: FlaskConical },
  { href: '/audit-log', label: 'Auditoría', icon: ClipboardList, role: 'admin' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const filteredItems = navItems.filter(item => !item.role || item.role === user?.role);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        background: '#0f1420',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: collapsed ? '20px 16px' : '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ minWidth: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FlaskConical size={20} color="white" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Orinoco Q&C</div>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>LIMS v1.0</div>
          </motion.div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filteredItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '12px 16px' : '10px 16px',
                borderRadius: 10,
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#fff' : '#94a3b8',
                background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}>
                <item.icon size={20} style={{ minWidth: 20, color: isActive ? '#818cf8' : '#64748b' }} />
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User + Collapse */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--color-border)' }}>
        {!collapsed && user && (
          <div style={{ padding: '8px 16px', marginBottom: 8 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>{user.name}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{user.role}</div>
          </div>
        )}
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          padding: '10px 16px', borderRadius: 10, background: 'transparent', border: 'none',
          color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', transition: 'background 0.15s',
        }}>
          <LogOut size={18} />
          {!collapsed && 'Cerrar Sesión'}
        </button>
        <button onClick={() => setCollapsed(!collapsed)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
          padding: '8px', marginTop: 4, borderRadius: 8, background: 'transparent', border: '1px solid var(--color-border)',
          color: '#64748b', cursor: 'pointer', transition: 'background 0.15s',
        }}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  );
}
