'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { FlaskConical, Wrench, Shield, ClipboardList, ArrowRight, Activity } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  instruments: number;
  standards: number;
  sessions: { total: number; draft: number; pending: number; approved: number };
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [inst, std, sess] = await Promise.all([
          api.get('/instruments'),
          api.get('/standards'),
          api.get('/calibration/sessions'),
        ]);
        setStats({
          instruments: inst.data.total || inst.data.data?.length || 0,
          standards: std.data.total || std.data.data?.length || 0,
          sessions: {
            total: sess.data.total || sess.data.data?.length || 0,
            draft: 0, pending: 0, approved: 0,
          },
        });
      } catch { setStats({ instruments: 0, standards: 0, sessions: { total: 0, draft: 0, pending: 0, approved: 0 } }); }
    };
    load();
  }, []);

  const cards = [
    { title: 'Instrumentos', value: stats?.instruments ?? '—', icon: Wrench, color: '#6366f1', href: '/instruments' },
    { title: 'Patrones', value: stats?.standards ?? '—', icon: Shield, color: '#10b981', href: '/standards' },
    { title: 'Calibraciones', value: stats?.sessions?.total ?? '—', icon: FlaskConical, color: '#f59e0b', href: '/calibration' },
    { title: 'Sesiones en Revisión', value: stats?.sessions?.pending ?? '—', icon: ClipboardList, color: '#ef4444', href: '/calibration?status=pending_review' },
  ];

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Activity size={24} color="#6366f1" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            Bienvenido, {user?.name?.split(' ')[0]}
          </h1>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Panel de control del sistema LIMS — Orinoco Quality & Control
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 40 }}>
        {cards.map((card) => (
          <Link key={card.title} href={card.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer', transition: 'all 0.2s' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={24} color={card.color} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, marginBottom: 4 }}>{card.title}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{card.value}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 20 }}>Acciones Rápidas</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {user?.role === 'technician' && (
            <Link href="/calibration/new">
              <button className="btn btn-primary"><FlaskConical size={16} /> Nueva Calibración <ArrowRight size={14} /></button>
            </Link>
          )}
          <Link href="/instruments">
            <button className="btn btn-ghost"><Wrench size={16} /> Ver Instrumentos</button>
          </Link>
          <Link href="/standards">
            <button className="btn btn-ghost"><Shield size={16} /> Ver Patrones</button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '20px 0', color: '#374151', fontSize: '0.75rem' }}>
        ISO/IEC 17025:2017 · JCGM 100:2008 (ISO GUM) · Orinoco Quality & Control LIMS v1.0
      </div>
    </div>
  );
}
