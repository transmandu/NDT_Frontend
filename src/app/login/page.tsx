'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { FlaskConical, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.token, data.user);
      toast.success(`Bienvenido, ${data.user.name}`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1040 50%, #0a0e1a 100%)' }}>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1f2937', color: '#f1f5f9', border: '1px solid #2d3748' } }} />

      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '20%', left: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)' }} />
      </div>

      <form onSubmit={handleLogin} className="animate-fadeIn" style={{ width: '100%', maxWidth: 440, padding: 40, background: 'rgba(17,24,39,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 24, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', marginBottom: 16 }}>
            <FlaskConical size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>Orinoco Quality & Control</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Sistema LIMS — ISO/IEC 17025</p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: '#94a3b8' }}>Correo Electrónico</label>
          <input className="input" type="email" placeholder="tecnico@orinocoquality.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: '#94a3b8' }}>Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input className="input" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '12px 24px', fontSize: '0.95rem' }}>
          {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Ingresando...</> : 'Iniciar Sesión'}
        </button>

        <div style={{ marginTop: 24, padding: 16, background: 'rgba(99,102,241,0.06)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.1)' }}>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8, fontWeight: 600 }}>Credenciales de prueba:</p>
          <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.6 }}>
            <div>👨‍🔬 tecnico@orinocoquality.com</div>
            <div>🔍 auditor@orinocoquality.com</div>
            <div>🔑 admin@orinocoquality.com</div>
            <div style={{ marginTop: 4, color: '#4b5563' }}>Contraseña: password123</div>
          </div>
        </div>
      </form>
    </div>
  );
}
