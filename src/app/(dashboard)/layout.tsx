'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Sidebar from '@/components/layout/Sidebar';
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1f2937', color: '#f1f5f9', border: '1px solid #2d3748' } }} />
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260, padding: '32px 40px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
