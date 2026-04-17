'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

const viewInfo: Record<string, { title: string; subtitle: string; autoSave?: boolean }> = {
  '/dashboard':        { title: 'Dashboard',   subtitle: 'Resumen operativo Orinoko Quality & Control' },
  '/calibration/new':  { title: 'Hoja de Calibración', subtitle: 'Registro directo de lecturas y evaluación', autoSave: true },
  '/instruments':      { title: 'Instrumentos',  subtitle: 'Inventario de equipos de medición' },
  '/standards':        { title: 'Patrones',       subtitle: 'Estándares de trazabilidad metrológica' },
  '/calibration':      { title: 'Centro de Aprobación', subtitle: 'Gestión y emisión de certificados oficiales' },
  '/audit-log':        { title: 'Auditoría',     subtitle: 'Registro de trazabilidad ISO 17025' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const currentView = Object.keys(viewInfo).reverse().find(k => pathname.startsWith(k)) || '/dashboard';
  const info = viewInfo[currentView] || viewInfo['/dashboard'];

  return (
    <ThemeProvider>
      <Toaster position="top-right" toastOptions={{ style: { backgroundColor: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border-color)' } }} />
      <div className="flex h-screen w-full font-sans app-container overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 flex flex-col min-w-0 relative" style={{ backgroundColor: 'var(--bg-app)' }}>
          <Header title={info.title} subtitle={info.subtitle} showAutoSave={info.autoSave} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="w-full min-h-full p-4 md:p-6"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
