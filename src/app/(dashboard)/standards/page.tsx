'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Shield, Search } from 'lucide-react';
import type { Standard } from '@/types/calibration';

export default function StandardsPage() {
  const [standards, setStandards] = useState<Standard[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/standards').then(r => { setStandards(r.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = standards.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.internal_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={24} color="#10b981" /> Patrones de Referencia
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>Patrones con trazabilidad al SI</p>
      </div>

      <div style={{ marginBottom: 20, position: 'relative', maxWidth: 400 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        <input className="input" placeholder="Buscar patrón..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Certificado</th>
              <th className="numeric">U (incert.)</th>
              <th className="numeric">k</th>
              <th>Vencimiento</th>
              <th>Laboratorio</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="skeleton" style={{ height: 20, width: '100%' }} /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No se encontraron patrones</td></tr>
            ) : (
              filtered.map(std => (
                <tr key={std.id}>
                  <td><span style={{ fontWeight: 600, color: '#34d399' }}>{std.internal_code}</span></td>
                  <td>{std.name}</td>
                  <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{std.certificate_number}</td>
                  <td className="numeric" style={{ color: '#fbbf24', fontWeight: 600 }}>{std.uncertainty_u}</td>
                  <td className="numeric">{std.k_factor}</td>
                  <td style={{ fontSize: '0.8rem' }}>{std.expiry_date}</td>
                  <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{std.calibrated_by_lab}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
