'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Wrench, Plus, Search } from 'lucide-react';
import type { Instrument } from '@/types/calibration';

export default function InstrumentsPage() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/instruments').then(r => { setInstruments(r.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = instruments.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) || i.internal_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wrench size={24} color="#6366f1" /> Instrumentos
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>Gestión de instrumentos bajo calibración</p>
        </div>
      </div>

      <div style={{ marginBottom: 20, position: 'relative', maxWidth: 400 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        <input className="input" placeholder="Buscar por nombre o código..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Marca / Modelo</th>
              <th>Categoría</th>
              <th className="numeric">Resolución</th>
              <th>Unidad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="skeleton" style={{ height: 20, width: '100%' }} /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No se encontraron instrumentos</td></tr>
            ) : (
              filtered.map(inst => (
                <tr key={inst.id}>
                  <td><span style={{ fontWeight: 600, color: '#818cf8' }}>{inst.internal_code}</span></td>
                  <td>{inst.name}</td>
                  <td style={{ color: '#94a3b8' }}>{inst.brand} {inst.model}</td>
                  <td><span className="badge badge-draft">{inst.category}</span></td>
                  <td className="numeric">{inst.resolution}</td>
                  <td>{inst.unit}</td>
                  <td><span className={`badge badge-${inst.status === 'active' ? 'approved' : 'draft'}`}>{inst.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
