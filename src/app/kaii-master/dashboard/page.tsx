'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Empresa {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  color: string;
  activo: boolean;
  unidades: { id: string; nombre: string }[];
}

interface EmpresaMetrics {
  empresa: Empresa;
  scoreGlobal: number | null;
  tendencia: number | null;
  ingresoReal: number;
  ingresoMeta: number;
  totalAlertas: number;
  alertasScore: number;
  alertasProveedores: number;
  estado: 'saludable' | 'atencion' | 'critico';
  unidadesConDatos: number;
  totalUnidades: number;
  periodo: string;
}

const ESTADO_STYLE = {
  saludable: {
    border: 'border-slate-800',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
    label: 'Saludable',
  },
  atencion: {
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
    label: 'Atención',
  },
  critico: {
    border: 'border-red-500/40',
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
    dot: 'bg-red-500 animate-pulse',
    label: 'Crítico',
  },
};

function AddEmpresaModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ nombre: '', tipo: 'restaurante', descripcion: '', email: '', telefono: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSave() {
    if (!form.nombre.trim() || !form.email.trim()) { setErr('Nombre y email son requeridos'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/kaii-master/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { onSave(); onClose(); }
      else setErr('Error al guardar');
    } catch { setErr('Error de conexión'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md">
        <h3 className="text-white font-semibold text-lg mb-1">Nueva Empresa</h3>
        <p className="text-slate-500 text-sm mb-6">Registrar nuevo cliente en KAII</p>

        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block uppercase tracking-wider">Nombre</label>
            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500/50 border border-slate-700 text-sm"
              placeholder="Nombre de la empresa" />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block uppercase tracking-wider">Tipo</label>
            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none border border-slate-700 text-sm">
              <option value="restaurante">Restaurante</option>
              <option value="cafeteria">Cafetería</option>
              <option value="panaderia">Panadería</option>
              <option value="retail">Retail</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block uppercase tracking-wider">Descripción</label>
            <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500/50 border border-slate-700 text-sm"
              placeholder="Breve descripción" />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block uppercase tracking-wider">Email de reportes</label>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              type="email"
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500/50 border border-slate-700 text-sm"
              placeholder="contacto@empresa.com" />
          </div>
        </div>

        {err && <p className="mt-3 text-red-400 text-sm bg-red-950/30 rounded-xl py-2 text-center">{err}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50 text-sm transition-colors">
            {saving ? 'Guardando...' : 'Crear empresa'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreCircle({ score }: { score: number | null }) {
  if (score === null) return <span className="text-3xl font-bold text-slate-600">—</span>;
  const color = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
  return <span className={`text-3xl font-bold ${color}`}>{score}</span>;
}

export default function KaiiMasterDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<EmpresaMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kaii-master/overview');
      if (res.ok) setMetrics(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('kaii_master_session')) {
      router.push('/kaii-master');
      return;
    }
    loadMetrics();
  }, [router, loadMetrics]);

  function logout() {
    sessionStorage.removeItem('kaii_master_session');
    router.push('/kaii-master');
  }

  async function triggerCron() {
    setCronRunning(true);
    setCronResult(null);
    try {
      const res = await fetch('/api/cron/resumen-semanal');
      const data = await res.json();
      if (data.ok) {
        setCronResult(data.emailSent
          ? `✅ Resumen enviado a ${data.emailTo} · Score ${data.avgScore}/100`
          : `✅ Resumen generado (configura RESEND_API_KEY para envío) · Score ${data.avgScore}/100`
        );
      } else {
        setCronResult('❌ Error al generar resumen');
      }
    } catch {
      setCronResult('❌ Error de conexión');
    } finally {
      setCronRunning(false);
    }
  }

  const totalAlertas = metrics.reduce((sum, m) => sum + m.totalAlertas, 0);
  const allScores = metrics.filter(m => m.scoreGlobal !== null);
  const promedioGlobal = allScores.length > 0
    ? Math.round(allScores.reduce((sum, m) => sum + (m.scoreGlobal || 0), 0) / allScores.length)
    : null;
  const totalUnidades = metrics.reduce((sum, m) => sum + m.totalUnidades, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Sticky header */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
              <span className="text-slate-950 font-black text-sm">K</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-none">KAII Master</h1>
              <p className="text-slate-500 text-xs">Panel Directivo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalAlertas > 0 && (
              <span className="bg-red-500/20 text-red-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-red-500/30 animate-pulse">
                {totalAlertas} alerta{totalAlertas !== 1 ? 's' : ''}
              </span>
            )}
            <button onClick={() => router.push('/kaii-master/usuarios')} className="text-slate-500 hover:text-amber-400 text-sm transition-colors px-2 py-1" title="Usuarios y Bitácora">
              👤
            </button>
            <button onClick={logout} className="text-slate-500 hover:text-slate-300 text-sm transition-colors px-2 py-1">
              Salir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Global KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-white">{metrics.length}</p>
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider">Empresas</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <ScoreCircle score={promedioGlobal} />
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider">Score prom.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className={`text-3xl font-bold ${totalAlertas > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {totalAlertas}
            </p>
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider">Alertas</p>
          </div>
        </div>

        {/* Cron / email section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-slate-200 font-semibold text-sm">Resumen Semanal IA</h3>
              <p className="text-slate-500 text-xs mt-0.5">Auto: lunes 9am · Manual ahora</p>
            </div>
            <button
              onClick={triggerCron}
              disabled={cronRunning}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
            >
              {cronRunning ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Generando...</>
              ) : '📧 Enviar ahora'}
            </button>
          </div>
          {cronResult && (
            <div className={`text-sm rounded-xl px-4 py-2.5 ${cronResult.startsWith('✅') ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' : 'bg-red-950/40 text-red-400 border border-red-900/50'}`}>
              {cronResult}
            </div>
          )}
        </div>

        {/* Empresa cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-slate-500 text-xs uppercase tracking-widest px-1">
              Empresas · {metrics.length} activa{metrics.length !== 1 ? 's' : ''} · {totalUnidades} unidades
            </h2>
            {metrics.map(m => {
              const es = ESTADO_STYLE[m.estado];
              const pctMeta = m.ingresoMeta > 0 ? Math.round((m.ingresoReal / m.ingresoMeta) * 100) : null;

              return (
                <div key={m.empresa.id} className={`bg-slate-900 border ${es.border} rounded-2xl overflow-hidden`}>
                  <div className="p-4 pb-3">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-bold text-xl">{m.empresa.nombre}</h3>
                        <p className="text-slate-500 text-sm capitalize mt-0.5">
                          {m.empresa.tipo} · {m.empresa.totalUnidades} unidades
                        </p>
                      </div>
                      <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${es.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${es.dot}`} />
                        {es.label}
                      </span>
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                        <ScoreCircle score={m.scoreGlobal} />
                        <p className="text-slate-500 text-xs mt-1">Score</p>
                        {m.tendencia !== null && (
                          <p className={`text-xs font-semibold mt-0.5 ${m.tendencia > 0 ? 'text-emerald-400' : m.tendencia < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                            {m.tendencia > 0 ? '↑' : m.tendencia < 0 ? '↓' : '→'}{Math.abs(m.tendencia)}pt
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-slate-200">
                          {m.ingresoReal > 0 ? `$${Math.round(m.ingresoReal / 1000)}k` : '—'}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">Ingresos</p>
                        {pctMeta !== null && (
                          <p className={`text-xs font-semibold mt-0.5 ${pctMeta >= 90 ? 'text-emerald-400' : pctMeta >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                            {pctMeta}% meta
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                        <p className={`text-3xl font-bold ${m.totalAlertas > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {m.totalAlertas}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">Alertas</p>
                        <p className="text-slate-600 text-xs mt-0.5">{m.unidadesConDatos}/{m.totalUnidades} datos</p>
                      </div>
                    </div>
                  </div>

                  {/* Action bar */}
                  <div className="px-4 pb-4 flex gap-2">
                    {m.empresa.id === 'piloncillo' ? (
                      <>
                        <button
                          onClick={() => router.push('/piloncillo-dashboard/direccion')}
                          className="flex-1 py-2.5 rounded-xl bg-amber-600/20 text-amber-400 text-sm font-medium hover:bg-amber-600/30 border border-amber-600/30 transition-colors"
                        >
                          Dirección PRO
                        </button>
                        <button
                          onClick={() => router.push('/piloncillo-dashboard')}
                          className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
                        >
                          Dashboard
                        </button>
                      </>
                    ) : (
                      <button className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-500 text-sm cursor-not-allowed">
                        Próximamente
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add empresa */}
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-800 text-slate-600 hover:text-slate-400 hover:border-slate-700 transition-colors text-sm font-medium"
        >
          + Registrar nueva empresa
        </button>

        <p className="text-center text-slate-700 text-xs pb-4">
          KAII Platform · Escalando liderazgo operativo · {new Date().getFullYear()}
        </p>
      </div>

      {showAdd && (
        <AddEmpresaModal
          onClose={() => setShowAdd(false)}
          onSave={() => { setShowAdd(false); loadMetrics(); }}
        />
      )}
    </div>
  );
}
