'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { isAxiosError } from 'axios';
import { motion } from 'framer-motion';
import { C } from '@/lib/colors';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, setAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => { if (isAuthenticated) router.replace('/dashboard'); }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      setAuth(res.data.token, res.data.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = isAxiosError(err) ? (err.response?.data?.message ?? 'Credenciales inválidas') : 'Credenciales inválidas';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-app)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl font-bold text-white text-xl shadow-lg mx-auto mb-4" style={{ backgroundColor: '#FFA526' }}>
            OQC
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: '#FF4712' }}>Transmandu</h1>
          <p className="text-[10px] uppercase tracking-widest font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>Lab NDT · ISO/IEC 17025</p>
        </div>

        {/* Login Card */}
        <div className="panel rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck size={18} style={{ color: '#FFA526' }} />
            <h2 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>Acceso al Sistema</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Correo electrónico
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full h-9 px-3 rounded input-theme text-xs"
                placeholder="usuario@orinocoquality.com" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Contraseña
              </label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full h-9 px-3 pr-9 rounded input-theme text-xs"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-[11px] text-center py-2 px-3 rounded font-medium"
                style={{ backgroundColor: 'rgba(255,30,18,0.1)', color: '#FF1E12', border: '1px solid rgba(255,30,18,0.2)' }}>
                {error}
              </motion.div>
            )}

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full h-9 rounded text-xs font-semibold text-white shadow-md transition-all disabled:opacity-50"
              style={{ backgroundColor: C.accent }}>
              {loading ? 'Verificando...' : 'Ingresar al Sistema'}
            </motion.button>
          </form>

          <p className="text-[9px] text-center mt-5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Acceso restringido a personal autorizado.<br />
            Todas las acciones quedan registradas en la bitácora de auditoría.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
