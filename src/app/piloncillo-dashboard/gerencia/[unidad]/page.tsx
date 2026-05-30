'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────────────
interface EvalDesempeno {
  productividad: number;
  ingresoReal: number;
  metaMensual: number;
  eficienciaOperativa: number;
  controlInsumos: number;
}
interface EvalComportamiento {
  comunicacion: number;
  seguimiento: number;
  gestionProyectos: number;
}
interface EvalIncidencias {
  faltasInjustificadas: number;
  retardosSinAvisar: number;
  vacacionesSinComunicar: number;
  descansosSinComunicar: number;
}
interface EvalGerencia {
  id: string;
  unidad: string;
  periodo: string;
  desempeno: EvalDesempeno;
  comportamiento: EvalComportamiento;
  incidencias: EvalIncidencias;
  notas: string;
  evaluadoPor: string;
  score: number;
  desempeno_score: number;
  comportamiento_score: number;
  incidencias_score: number;
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const UNIDADES: Record<string, { nombre: string; emoji: string; bg: string }> = {
  'la-cruz':            { nombre: 'La Cruz',           emoji: '☕', bg: 'from-amber-600 to-amber-500' },
  'oaxaca-manana':      { nombre: 'Oaxaca Mañana',     emoji: '🌅', bg: 'from-orange-500 to-orange-400' },
  'oaxaca-vespertino':  { nombre: 'Oaxaca Vespertino', emoji: '🌇', bg: 'from-rose-600 to-rose-500' },
  'matriz-cafe':        { nombre: 'Matriz Café',       emoji: '🏠', bg: 'from-stone-600 to-stone-500' },
  'panaderia':          { nombre: 'Panadería',         emoji: '🥐', bg: 'from-yellow-600 to-yellow-500' },
};

const PERIODOS = (() => {
  const p: string[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    p.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return p;
})();

const D0: EvalDesempeno     = { productividad: 75, ingresoReal: 0, metaMensual: 0, eficienciaOperativa: 75, controlInsumos: 75 };
const C0: EvalComportamiento = { comunicacion: 75, seguimiento: 75, gestionProyectos: 75 };
const I0: EvalIncidencias    = { faltasInjustificadas: 0, retardosSinAvisar: 0, vacacionesSinComunicar: 0, descansosSinComunicar: 0 };

// ─── Score calculation ───────────────────────────────────────────────────────
function calcScores(d: EvalDesempeno, c: EvalComportamiento, i: EvalIncidencias) {
  const meta_pct = d.metaMensual > 0 ? Math.min(100, (d.ingresoReal / d.metaMensual) * 100) : d.productividad;
  const d_avg = (d.productividad + meta_pct + d.eficienciaOperativa + d.controlInsumos) / 4;
  const desempeno_score = d_avg * 0.5;
  const c_avg = (c.comunicacion + c.seguimiento + c.gestionProyectos) / 3;
  const comportamiento_score = c_avg * 0.3;
  const deductions = i.faltasInjustificadas * 4 + i.retardosSinAvisar * 2 + i.vacacionesSinComunicar * 4 + i.descansosSinComunicar * 2;
  const incidencias_score = Math.max(0, 20 - deductions);
  const score = Math.round(desempeno_score + comportamiento_score + incidencias_score);
  return {
    score,
    desempeno_score:      Math.round(desempeno_score * 10) / 10,
    comportamiento_score: Math.round(comportamiento_score * 10) / 10,
    incidencias_score:    Math.round(incidencias_score * 10) / 10,
    deductions,
  };
}

function sc(s: number) {
  if (s >= 80) return 'text-emerald-600';
  if (s >= 60) return 'text-amber-600';
  return 'text-red-500';
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function Slider({
  label, desc, value, onChange,
}: { label: string; desc: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-3">
          <div className="font-semibold text-stone-700 text-sm">{label}</div>
          <div className="text-xs text-stone-400 mt-0.5 leading-snug">{desc}</div>
        </div>
        <div className={`text-2xl font-black flex-shrink-0 ${sc(value)}`}>{value}</div>
      </div>
      <div className="relative">
        <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden mb-1">
          <div
            className={`h-full rounded-full transition-all ${value >= 80 ? 'bg-emerald-400' : value >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
            style={{ width: `${value}%` }}
          />
        </div>
        <input
          type="range" min={0} max={100} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-2.5 absolute top-0 opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-xs text-stone-300 mt-0.5">
        <span>Bajo</span><span>Medio</span><span>Alto</span>
      </div>
    </div>
  );
}

function Counter({
  label, desc, value, onChange, pts,
}: { label: string; desc: string; value: number; onChange: (v: number) => void; pts: number }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-stone-700 text-sm">{label}</div>
          <div className="text-xs text-stone-400 mt-0.5">{desc}</div>
          <div className="text-xs text-red-400 font-medium mt-1">−{pts} pts por ocurrencia</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => onChange(Math.max(0, value - 1))}
            className="w-9 h-9 rounded-xl bg-stone-100 text-stone-500 font-bold text-lg hover:bg-stone-200 flex items-center justify-center">−</button>
          <span className={`text-xl font-black w-7 text-center ${value > 0 ? 'text-red-500' : 'text-stone-300'}`}>{value}</span>
          <button onClick={() => onChange(value + 1)}
            className="w-9 h-9 rounded-xl bg-red-50 text-red-500 font-bold text-lg hover:bg-red-100 flex items-center justify-center">+</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function UnidadPage() {
  const router = useRouter();
  const params = useParams();
  const unidad = params.unidad as string;
  const info = UNIDADES[unidad];

  const [tab, setTab] = useState<'evaluar' | 'historial'>('evaluar');
  const [historial, setHistorial] = useState<EvalGerencia[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [periodo, setPeriodo] = useState(PERIODOS[0]);
  const [d, setD] = useState<EvalDesempeno>(D0);
  const [c, setC] = useState<EvalComportamiento>(C0);
  const [i, setI] = useState<EvalIncidencias>(I0);
  const [evaluadoPor, setEvaluadoPor] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem(`pillo_gerencia_${unidad}`)) {
      router.push('/piloncillo-dashboard/gerencia');
    }
  }, [unidad, router]);

  const fetchHistorial = useCallback(async () => {
    const res = await fetch(`/api/piloncillo/evaluaciones-gerencia?unidad=${unidad}`);
    const json = await res.json();
    setHistorial(json.data || []);
  }, [unidad]);

  useEffect(() => {
    if (tab === 'historial') fetchHistorial();
  }, [tab, fetchHistorial]);

  const scores = calcScores(d, c, i);
  const meta_pct = d.metaMensual > 0 ? Math.round((d.ingresoReal / d.metaMensual) * 100) : 0;

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/piloncillo/evaluaciones-gerencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unidad, periodo, desempeno: d, comportamiento: c, incidencias: i, evaluadoPor, notas, ...scores }),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 4000); }
    setSaving(false);
  };

  if (!info) return null;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className={`bg-gradient-to-br ${info.bg} text-white px-4 pt-10 pb-6`}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => router.push('/piloncillo-dashboard/gerencia')} className="text-white/60 text-lg hover:text-white">←</button>
            <div className="text-2xl">{info.emoji}</div>
            <div>
              <h1 className="font-bold text-xl">{info.nombre}</h1>
              <p className="text-white/60 text-xs">Panel de gestión</p>
            </div>
          </div>
          {/* Live score */}
          <div className="bg-black/20 rounded-2xl p-4">
            <div className="flex items-end justify-between mb-2">
              <div className="text-white/70 text-xs font-medium">Puntuación en tiempo real</div>
              <div className="text-5xl font-black text-white leading-none">{scores.score}</div>
            </div>
            <div className="flex gap-1">
              <div className="flex-1 bg-white/10 rounded-lg p-2 text-center">
                <div className="text-white text-base font-bold">{scores.desempeno_score}</div>
                <div className="text-white/50 text-xs">Desemp.</div>
              </div>
              <div className="flex-1 bg-white/10 rounded-lg p-2 text-center">
                <div className="text-white text-base font-bold">{scores.comportamiento_score}</div>
                <div className="text-white/50 text-xs">Comport.</div>
              </div>
              <div className="flex-1 bg-white/10 rounded-lg p-2 text-center">
                <div className={`text-base font-bold ${scores.incidencias_score < 20 ? 'text-red-300' : 'text-white'}`}>{scores.incidencias_score}</div>
                <div className="text-white/50 text-xs">Asist.</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-stone-100 px-4 flex gap-1 sticky top-0 z-10">
        {(['evaluar', 'historial'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === t ? 'border-amber-500 text-amber-700' : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}>
            {t === 'evaluar' ? '📝 Evaluar' : '📋 Historial'}
          </button>
        ))}
      </div>

      <main className="max-w-lg mx-auto px-4 py-5 pb-20">
        {/* ── EVALUAR ── */}
        {tab === 'evaluar' && (
          <div className="space-y-6">
            {/* Periodo */}
            <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
              <div className="text-xl">📅</div>
              <div className="flex-1">
                <div className="text-xs text-stone-400 font-medium">Período de evaluación</div>
                <select value={periodo} onChange={e => setPeriodo(e.target.value)}
                  className="font-bold text-stone-700 bg-transparent focus:outline-none mt-0.5 text-sm">
                  {PERIODOS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* DESEMPEÑO */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-stone-700 text-sm flex items-center gap-2">
                  <span className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-black text-xs">D</span>
                  DESEMPEÑO
                </h2>
                <span className="text-sm font-bold text-emerald-600">{scores.desempeno_score} / 50</span>
              </div>
              <div className="space-y-3">
                <Slider label="Productividad general" desc="Rendimiento y output global de la unidad"
                  value={d.productividad} onChange={v => setD(x => ({ ...x, productividad: v }))} />

                {/* Meta ingresos */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
                  <div className="font-semibold text-stone-700 text-sm mb-4">Meta de ingresos del mes</div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <div className="text-xs text-stone-400 mb-1.5 font-medium">Ingreso real</div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-stone-400 text-sm">$</span>
                        <input type="number" value={d.ingresoReal || ''}
                          onChange={e => setD(x => ({ ...x, ingresoReal: Number(e.target.value) }))}
                          className="w-full border border-stone-200 rounded-xl pl-7 pr-3 py-2.5 text-sm font-bold text-stone-700 focus:outline-none focus:border-amber-400"
                          placeholder="0" />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-stone-400 mb-1.5 font-medium">Meta mensual</div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-stone-400 text-sm">$</span>
                        <input type="number" value={d.metaMensual || ''}
                          onChange={e => setD(x => ({ ...x, metaMensual: Number(e.target.value) }))}
                          className="w-full border border-stone-200 rounded-xl pl-7 pr-3 py-2.5 text-sm font-bold text-stone-700 focus:outline-none focus:border-amber-400"
                          placeholder="0" />
                      </div>
                    </div>
                  </div>
                  {d.metaMensual > 0 && (
                    <>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-stone-400">{fmt(d.ingresoReal)} de {fmt(d.metaMensual)}</span>
                        <span className={`font-bold ${meta_pct >= 100 ? 'text-emerald-600' : meta_pct >= 80 ? 'text-amber-600' : 'text-red-500'}`}>
                          {meta_pct}% logrado
                        </span>
                      </div>
                      <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${meta_pct >= 100 ? 'bg-emerald-400' : meta_pct >= 80 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(100, meta_pct)}%` }} />
                      </div>
                    </>
                  )}
                </div>

                <Slider label="Eficiencia operativa" desc="Control del gasto operativo vs presupuesto mensual"
                  value={d.eficienciaOperativa} onChange={v => setD(x => ({ ...x, eficienciaOperativa: v }))} />
                <Slider label="Control de insumos" desc="Food cost real vs objetivo · Merma y desperdicios"
                  value={d.controlInsumos} onChange={v => setD(x => ({ ...x, controlInsumos: v }))} />
              </div>
            </section>

            {/* COMPORTAMIENTO */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-stone-700 text-sm flex items-center gap-2">
                  <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-black text-xs">C</span>
                  COMPORTAMIENTO
                </h2>
                <span className="text-sm font-bold text-blue-600">{scores.comportamiento_score} / 30</span>
              </div>
              <div className="space-y-3">
                <Slider label="Comunicación efectiva" desc="Claridad, oportunidad y calidad de la comunicación con el equipo y dirección"
                  value={c.comunicacion} onChange={v => setC(x => ({ ...x, comunicacion: v }))} />
                <Slider label="Seguimiento y ejecución" desc="Cumple lo que dice · Da seguimiento a acuerdos · Cierra pendientes"
                  value={c.seguimiento} onChange={v => setC(x => ({ ...x, seguimiento: v }))} />
                <Slider label="Gestión de proyectos" desc="Inicia, supervisa y cierra proyectos en tiempo · Delega con claridad"
                  value={c.gestionProyectos} onChange={v => setC(x => ({ ...x, gestionProyectos: v }))} />
              </div>
            </section>

            {/* INCIDENCIAS */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-stone-700 text-sm flex items-center gap-2">
                  <span className="w-7 h-7 bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-black text-xs">I</span>
                  INCIDENCIAS
                </h2>
                <span className={`text-sm font-bold ${scores.deductions > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {scores.incidencias_score} / 20
                  {scores.deductions > 0 && <span className="text-xs font-normal"> (−{scores.deductions})</span>}
                </span>
              </div>
              <div className="space-y-3">
                <Counter label="Faltas injustificadas" desc="Ausencias sin aviso ni justificación"
                  value={i.faltasInjustificadas} onChange={v => setI(x => ({ ...x, faltasInjustificadas: v }))} pts={4} />
                <Counter label="Retardos sin avisar" desc="Llegadas tarde sin comunicación previa"
                  value={i.retardosSinAvisar} onChange={v => setI(x => ({ ...x, retardosSinAvisar: v }))} pts={2} />
                <Counter label="Vacaciones sin coordinar" desc="Días de descanso no coordinados con dirección"
                  value={i.vacacionesSinComunicar} onChange={v => setI(x => ({ ...x, vacacionesSinComunicar: v }))} pts={4} />
                <Counter label="Descansos no comunicados" desc="Descansos tomados sin avisar al equipo o dirección"
                  value={i.descansosSinComunicar} onChange={v => setI(x => ({ ...x, descansosSinComunicar: v }))} pts={2} />
              </div>
            </section>

            {/* Evaluador y notas */}
            <section className="space-y-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
                <label className="text-xs text-stone-400 font-medium block mb-1.5">Evaluado por</label>
                <input className="w-full text-sm font-semibold text-stone-700 bg-transparent focus:outline-none border-b border-stone-100 pb-1"
                  value={evaluadoPor} onChange={e => setEvaluadoPor(e.target.value)} placeholder="Tu nombre" />
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
                <label className="text-xs text-stone-400 font-medium block mb-1.5">Reflexión y notas del período</label>
                <textarea className="w-full text-sm text-stone-600 bg-transparent focus:outline-none resize-none" rows={3}
                  value={notas} onChange={e => setNotas(e.target.value)}
                  placeholder="¿Qué destacó este período? ¿Qué oportunidades de mejora ves?" />
              </div>
            </section>

            <button onClick={handleSave} disabled={saving}
              className={`w-full py-4 rounded-2xl font-bold text-white text-base shadow-lg transition-all ${
                saved ? 'bg-emerald-500' : `bg-gradient-to-r ${info.bg} hover:scale-[1.02] active:scale-95`
              } disabled:opacity-50`}>
              {saved ? '✓ Evaluación guardada' : saving ? 'Guardando...' : `Guardar · ${scores.score} puntos`}
            </button>
          </div>
        )}

        {/* ── HISTORIAL ── */}
        {tab === 'historial' && (
          <div>
            {historial.length === 0 ? (
              <div className="text-center py-16 text-stone-400">
                <div className="text-5xl mb-3">📋</div>
                <p className="font-medium">Sin evaluaciones aún</p>
                <p className="text-sm mt-1">Completa tu primera evaluación</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...historial].sort((a, b) => b.periodo.localeCompare(a.periodo)).map(e => (
                  <div key={e.id} className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-stone-800 text-base">{e.periodo}</div>
                        <div className="text-xs text-stone-400 mt-0.5">{e.evaluadoPor ? `Por: ${e.evaluadoPor}` : '—'}</div>
                      </div>
                      <div className={`text-4xl font-black ${sc(e.score)}`}>{e.score}</div>
                    </div>
                    <div className="flex gap-4 text-xs text-stone-500 pt-3 border-t border-stone-50">
                      <span>Desemp. <strong className="text-emerald-600">{e.desempeno_score}</strong></span>
                      <span>Comport. <strong className="text-blue-600">{e.comportamiento_score}</strong></span>
                      <span>Asist. <strong className={e.incidencias_score < 20 ? 'text-red-500' : 'text-stone-600'}>{e.incidencias_score}</strong></span>
                    </div>
                    {e.desempeno.metaMensual > 0 && (
                      <div className="mt-3 text-xs text-stone-400">
                        Ingreso: {fmt(e.desempeno.ingresoReal)} / Meta: {fmt(e.desempeno.metaMensual)} ({Math.round((e.desempeno.ingresoReal / e.desempeno.metaMensual) * 100)}%)
                      </div>
                    )}
                    {e.notas && <p className="text-xs text-stone-400 italic mt-2">&ldquo;{e.notas}&rdquo;</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
