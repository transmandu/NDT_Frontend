'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { FlaskConical, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Instrument, Standard } from '@/types/calibration';

export default function NewCalibrationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [schemas, setSchemas] = useState<any[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSchema, setSelectedSchema] = useState<any>(null);
  const [selectedInstrument, setSelectedInstrument] = useState<number | null>(null);
  const [selectedStandards, setSelectedStandards] = useState<number[]>([]);
  const [ambientTemp, setAmbientTemp] = useState('22');
  const [ambientHum, setAmbientHum] = useState('50');
  const [ambientPres, setAmbientPres] = useState('1013');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/calibration/schemas'),
      api.get('/instruments'),
      api.get('/standards'),
    ]).then(([s, i, st]) => {
      setSchemas(s.data.schemas || []);
      setInstruments(i.data.data || []);
      setStandards(st.data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!selectedSchema || !selectedInstrument || selectedStandards.length === 0) {
      toast.error('Complete todos los campos');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/calibration/sessions', {
        instrument_id: selectedInstrument,
        procedure_schema_id: selectedSchema.id,
        category: selectedSchema.category,
        ambient_temperature: parseFloat(ambientTemp),
        ambient_humidity: parseFloat(ambientHum),
        ambient_pressure: parseFloat(ambientPres),
        standard_ids: selectedStandards,
      });
      toast.success('Sesión creada exitosamente');
      router.push(`/calibration/${data.session_id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear sesión');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStandard = (id: number) => {
    setSelectedStandards(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (loading) return <div style={{ padding: 40 }}><div className="skeleton" style={{ height: 200, width: '100%' }} /></div>;

  return (
    <div className="animate-fadeIn">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <FlaskConical size={24} color="#f59e0b" /> Nueva Sesión de Calibración
      </h1>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 32 }}>Asistente paso a paso</p>

      {/* Stepper */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? '#6366f1' : '#1f2937', transition: 'background 0.3s' }} />
        ))}
      </div>

      {/* Step 1: Select Procedure */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>1. Seleccione el Procedimiento</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {schemas.map((s: any) => (
              <div key={s.id} className="card card-hover" onClick={() => { setSelectedSchema(s); setStep(2); }}
                style={{ cursor: 'pointer', border: selectedSchema?.id === s.id ? '2px solid #6366f1' : undefined }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Código: {s.code}</div>
                <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: 4 }}>{s.category}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select Instrument + Standards */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>2. Instrumento y Patrones</h2>

          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: '#94a3b8' }}>Instrumento a calibrar</label>
          <select className="input" value={selectedInstrument || ''} onChange={e => setSelectedInstrument(Number(e.target.value))} style={{ marginBottom: 20 }}>
            <option value="">Seleccionar...</option>
            {instruments.filter(i => i.category === selectedSchema?.category).map(i => (
              <option key={i.id} value={i.id}>{i.internal_code} — {i.name}</option>
            ))}
          </select>

          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: '#94a3b8' }}>Patrones de referencia</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {standards.filter(s => s.category === selectedSchema?.category || true).map(s => (
              <div key={s.id} className="card" onClick={() => toggleStandard(s.id)}
                style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, border: selectedStandards.includes(s.id) ? '2px solid #10b981' : undefined }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, border: '2px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedStandards.includes(s.id) ? '#10b981' : 'transparent' }}>
                  {selectedStandards.includes(s.id) && <Check size={12} color="white" />}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{s.internal_code} — {s.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Cert: {s.certificate_number} | U={s.uncertainty_u}, k={s.k_factor}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>Atrás</button>
            <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!selectedInstrument || selectedStandards.length === 0}>
              Siguiente <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Ambient Conditions */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>3. Condiciones Ambientales</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: '#94a3b8' }}>Temperatura (°C)</label>
              <input className="input" type="number" step="0.1" value={ambientTemp} onChange={e => setAmbientTemp(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: '#94a3b8' }}>Humedad (%)</label>
              <input className="input" type="number" step="0.1" value={ambientHum} onChange={e => setAmbientHum(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: '#94a3b8' }}>Presión (hPa)</label>
              <input className="input" type="number" step="0.1" value={ambientPres} onChange={e => setAmbientPres(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>Atrás</button>
            <button className="btn btn-success" onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creando...' : <><FlaskConical size={16} /> Crear Sesión</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
