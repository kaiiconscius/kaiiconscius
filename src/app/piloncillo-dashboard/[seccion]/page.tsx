'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Colaborador {
  id: string;
  nombre: string;
  puesto: string;
  sucursal: string;
  seccion: string;
  activo: boolean;
  createdAt: string;
}

interface Evaluacion {
  id: string;
  colaboradorId: string;
  colaboradorNombre: string;
  periodo: string;
  desempeno: number;
  comportamiento: number;
  incidencias: number;
  notas: string;
  evaluadoPor: string;
  score: number;
  createdAt: string;
}

type TabType = 'colaboradores' | 'evaluaciones' | 'metricas';

const SECCION_INFO: Record<string, { nombre: string; emoji: string }> = {
  direccion:     { nombre: 'Dirección',      emoji: '🏛️' },
  gerencia:      { nombre: 'Gerencias',      emoji: '🏪' },
  administracion:{ nombre: 'Administración', emoji: '📊' },
  rrhh:          { nombre: 'RRHH',           emoji: '👥' },
};

const SUCURSALES = [
  'Matriz Café',
  'La Cruz',
  'Oaxaca Mañana',
  'Oaxaca Vespertino',
  'Panadería',
  'Corporativo',
];

const PERIODOS = (() => {
  const p: string[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    p.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return p;
})();

function calcScore(d: number, c: number, i: number): number {
  const base = d * 0.5 + c * 0.3;
  const asistencia = Math.max(0, 20 - i * 5);
  return Math.round(Math.min(100, base + asistencia));
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-green-600';
  if (s >= 60) return 'text-amber-600';
  return 'text-red-500';
}

const EMPTY_COLAB = { nombre: '', puesto: '', sucursal: SUCURSALES[0], activo: true };

export default function SeccionPage() {
  const router = useRouter();
  const params = useParams();
  const seccion = params.seccion as string;
  const info = SECCION_INFO[seccion];

  const [tab, setTab] = useState<TabType>('colaboradores');
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodoFiltro, setPeriodoFiltro] = useState(PERIODOS[0]);

  const [showColabForm, setShowColabForm] = useState(false);
  const [editColab, setEditColab] = useState<Colaborador | null>(null);
  const [formColab, setFormColab] = useState(EMPTY_COLAB);

  const [showEvalForm, setShowEvalForm] = useState(false);
  const [formEval, setFormEval] = useState({
    colaboradorId: '',
    periodo: PERIODOS[0],
    desempeno: 80,
    comportamiento: 80,
    incidencias: 0,
    notas: '',
    evaluadoPor: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem(`pillo_${seccion}`)) {
      router.push('/piloncillo-dashboard');
    }
  }, [seccion, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, er] = await Promise.all([
        fetch(`/api/piloncillo/colaboradores?seccion=${seccion}`),
        fetch(`/api/piloncillo/evaluaciones?seccion=${seccion}`),
      ]);
      const cd = await cr.json();
      const ed = await er.json();
      setColaboradores(cd.data || []);
      setEvaluaciones(ed.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [seccion]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveColab = async () => {
    const body = editColab ? { ...formColab, id: editColab.id, seccion } : { ...formColab, seccion };
    const res = await fetch('/api/piloncillo/colaboradores', {
      method: editColab ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowColabForm(false);
      setEditColab(null);
      setFormColab(EMPTY_COLAB);
      fetchData();
    }
  };

  const deleteColab = async (id: string) => {
    if (!confirm('¿Eliminar este colaborador?')) return;
    await fetch(`/api/piloncillo/colaboradores?id=${id}&seccion=${seccion}`, { method: 'DELETE' });
    fetchData();
  };

  const openEdit = (c: Colaborador) => {
    setEditColab(c);
    setFormColab({ nombre: c.nombre, puesto: c.puesto, sucursal: c.sucursal, activo: c.activo });
    setShowColabForm(true);
  };

  const saveEval = async () => {
    const score = calcScore(formEval.desempeno, formEval.comportamiento, formEval.incidencias);
    const colab = colaboradores.find(c => c.id === formEval.colaboradorId);
    const res = await fetch('/api/piloncillo/evaluaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formEval, seccion, score, colaboradorNombre: colab?.nombre || '' }),
    });
    if (res.ok) {
      setShowEvalForm(false);
      setFormEval({ colaboradorId: '', periodo: PERIODOS[0], desempeno: 80, comportamiento: 80, incidencias: 0, notas: '', evaluadoPor: '' });
      fetchData();
    }
  };

  const colabsActivos = colaboradores.filter(c => c.activo);
  const evalsFiltradas = evaluaciones.filter(e => e.periodo === periodoFiltro);
  const promedio = evalsFiltradas.length
    ? Math.round(evalsFiltradas.reduce((a, e) => a + e.score, 0) / evalsFiltradas.length)
    : 0;
  const top3 = [...evalsFiltradas].sort((a, b) => b.score - a.score).slice(0, 3);
  const previewScore = calcScore(formEval.desempeno, formEval.comportamiento, formEval.incidencias);

  if (!info) return null;

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-amber-900 text-white px-4 py-5 flex items-center gap-3">
        <button onClick={() => router.push('/piloncillo-dashboard')} className="text-amber-300 hover:text-white text-lg">←</button>
        <div className="text-2xl">{info.emoji}</div>
        <div>
          <h1 className="font-bold text-lg leading-tight">{info.nombre}</h1>
          <p className="text-amber-300 text-xs">Piloncillo · Panel de gestión</p>
        </div>
      </header>

      <div className="bg-white border-b border-amber-100 px-4 flex gap-1">
        {(['colaboradores', 'evaluaciones', 'metricas'] as TabType[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-amber-700 text-amber-700' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t === 'colaboradores' ? 'Colaboradores' : t === 'evaluaciones' ? 'Evaluaciones' : 'Métricas'}
          </button>
        ))}
      </div>

      <main className="p-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-16 text-amber-400">Cargando...</div>
        ) : (
          <>
            {/* ── COLABORADORES ── */}
            {tab === 'colaboradores' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">{colabsActivos.length} activos</p>
                  <button
                    onClick={() => { setEditColab(null); setFormColab(EMPTY_COLAB); setShowColabForm(true); }}
                    className="bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-800"
                  >
                    + Agregar
                  </button>
                </div>
                <div className="space-y-3">
                  {colaboradores.map(c => (
                    <div key={c.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${
                      c.activo ? 'border-amber-100' : 'border-gray-100 opacity-60'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-gray-800">{c.nombre}</div>
                          <div className="text-sm text-amber-700">{c.puesto}</div>
                          <div className="text-xs text-gray-400 mt-1">📍 {c.sucursal}</div>
                          {!c.activo && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mt-1 inline-block">Inactivo</span>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => openEdit(c)} className="text-amber-600 text-sm hover:underline">Editar</button>
                          <button onClick={() => deleteColab(c.id)} className="text-red-400 text-sm hover:underline">Eliminar</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {colaboradores.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-4xl mb-2">👥</div>
                      <p>Sin colaboradores aún</p>
                      <p className="text-sm mt-1">Agrega el primer colaborador</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── EVALUACIONES ── */}
            {tab === 'evaluaciones' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <select
                    value={periodoFiltro}
                    onChange={e => setPeriodoFiltro(e.target.value)}
                    className="border border-amber-200 rounded-lg px-3 py-1.5 text-sm bg-white"
                  >
                    {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button
                    onClick={() => {
                      setFormEval({
                        colaboradorId: colabsActivos[0]?.id || '',
                        periodo: PERIODOS[0],
                        desempeno: 80,
                        comportamiento: 80,
                        incidencias: 0,
                        notas: '',
                        evaluadoPor: '',
                      });
                      setShowEvalForm(true);
                    }}
                    disabled={colabsActivos.length === 0}
                    className="bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-800 disabled:opacity-40"
                  >
                    + Nueva evaluación
                  </button>
                </div>
                <div className="space-y-3">
                  {evalsFiltradas.map(e => (
                    <div key={e.id} className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">{e.colaboradorNombre}</div>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                            <span>Desempeño: <strong className="text-gray-700">{e.desempeno}</strong></span>
                            <span>Comportamiento: <strong className="text-gray-700">{e.comportamiento}</strong></span>
                            <span>Incidencias: <strong className="text-red-500">{e.incidencias}</strong></span>
                          </div>
                          {e.evaluadoPor && <div className="text-xs text-gray-400 mt-1">Por: {e.evaluadoPor}</div>}
                          {e.notas && <p className="text-xs text-gray-400 mt-1 italic">&ldquo;{e.notas}&rdquo;</p>}
                        </div>
                        <div className={`text-3xl font-bold ml-4 ${scoreColor(e.score)}`}>{e.score}</div>
                      </div>
                    </div>
                  ))}
                  {evalsFiltradas.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-4xl mb-2">📋</div>
                      <p>Sin evaluaciones en {periodoFiltro}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── MÉTRICAS ── */}
            {tab === 'metricas' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-700">Métricas del período</h2>
                  <select
                    value={periodoFiltro}
                    onChange={e => setPeriodoFiltro(e.target.value)}
                    className="border border-amber-200 rounded-lg px-3 py-1.5 text-sm bg-white"
                  >
                    {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 text-center">
                    <div className={`text-4xl font-bold ${scoreColor(promedio)}`}>{promedio}</div>
                    <div className="text-xs text-gray-400 mt-1">Promedio equipo</div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 text-center">
                    <div className="text-4xl font-bold text-amber-700">{evalsFiltradas.length}</div>
                    <div className="text-xs text-gray-400 mt-1">Evaluaciones</div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                  <h3 className="text-xs font-bold text-amber-800 mb-3 uppercase tracking-wide">Fórmula de evaluación</h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Desempeño</span>
                      <span className="font-bold text-green-700">50 pts</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Comportamiento</span>
                      <span className="font-bold text-blue-700">30 pts</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Asistencia / Incidencias</span>
                      <span className="font-bold text-red-600">±20 pts</span>
                    </div>
                    <div className="border-t border-amber-200 pt-2 flex justify-between font-bold text-gray-800">
                      <span>Total</span>
                      <span>100 pts</span>
                    </div>
                  </div>
                </div>

                {top3.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-700 mb-3">🏆 Top colaboradores</h3>
                    <div className="space-y-2">
                      {top3.map((e, idx) => (
                        <div key={e.id} className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 flex items-center gap-3">
                          <div className="text-2xl">{['🥇', '🥈', '🥉'][idx]}</div>
                          <div className="flex-1 font-semibold text-gray-800">{e.colaboradorNombre}</div>
                          <div className={`text-2xl font-bold ${scoreColor(e.score)}`}>{e.score}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {evalsFiltradas.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Todos los resultados</h3>
                    <div className="space-y-2">
                      {[...evalsFiltradas].sort((a, b) => b.score - a.score).map(e => (
                        <div key={e.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-amber-50 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-800">{e.colaboradorNombre}</div>
                            <div className="text-xs text-gray-400">D:{e.desempeno} · C:{e.comportamiento} · I:{e.incidencias}</div>
                          </div>
                          <div className={`font-bold ${scoreColor(e.score)}`}>{e.score} pts</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── MODAL: Colaborador ── */}
      {showColabForm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setShowColabForm(false)}
        >
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-5">
              {editColab ? 'Editar colaborador' : 'Agregar colaborador'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium">Nombre completo</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-amber-400"
                  value={formColab.nombre}
                  onChange={e => setFormColab(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej. María García"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Puesto</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-amber-400"
                  value={formColab.puesto}
                  onChange={e => setFormColab(f => ({ ...f, puesto: e.target.value }))}
                  placeholder="Ej. Barista, Cajero..."
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Sucursal</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-amber-400 bg-white"
                  value={formColab.sucursal}
                  onChange={e => setFormColab(f => ({ ...f, sucursal: e.target.value }))}
                >
                  {SUCURSALES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formColab.activo}
                  onChange={e => setFormColab(f => ({ ...f, activo: e.target.checked }))}
                  className="w-4 h-4 accent-amber-700"
                />
                <label htmlFor="activo" className="text-sm text-gray-600">Colaborador activo</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowColabForm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-medium">Cancelar</button>
              <button
                onClick={saveColab}
                disabled={!formColab.nombre || !formColab.puesto}
                className="flex-1 py-3 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800 disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Evaluación ── */}
      {showEvalForm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setShowEvalForm(false)}
        >
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl my-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-5">Nueva evaluación</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium">Colaborador</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-amber-400 bg-white"
                  value={formEval.colaboradorId}
                  onChange={e => setFormEval(f => ({ ...f, colaboradorId: e.target.value }))}
                >
                  {colabsActivos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} · {c.puesto}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">Período</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-amber-400 bg-white"
                  value={formEval.periodo}
                  onChange={e => setFormEval(f => ({ ...f, periodo: e.target.value }))}
                >
                  {PERIODOS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-500 font-medium">Desempeño (50%)</label>
                  <span className="text-sm font-bold text-green-700">{formEval.desempeno}/100</span>
                </div>
                <input
                  type="range" min={0} max={100}
                  value={formEval.desempeno}
                  onChange={e => setFormEval(f => ({ ...f, desempeno: Number(e.target.value) }))}
                  className="w-full accent-green-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-500 font-medium">Comportamiento (30%)</label>
                  <span className="text-sm font-bold text-blue-700">{formEval.comportamiento}/100</span>
                </div>
                <input
                  type="range" min={0} max={100}
                  value={formEval.comportamiento}
                  onChange={e => setFormEval(f => ({ ...f, comportamiento: Number(e.target.value) }))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-500 font-medium">Incidencias (-5 pts c/u)</label>
                  <span className="text-sm font-bold text-red-600">{formEval.incidencias}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFormEval(f => ({ ...f, incidencias: Math.max(0, f.incidencias - 1) }))}
                    className="w-9 h-9 rounded-full bg-red-100 text-red-600 font-bold text-lg hover:bg-red-200 flex items-center justify-center"
                  >−</button>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-red-400 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, formEval.incidencias * 25)}%` }}
                    />
                  </div>
                  <button
                    onClick={() => setFormEval(f => ({ ...f, incidencias: f.incidencias + 1 }))}
                    className="w-9 h-9 rounded-full bg-red-100 text-red-600 font-bold text-lg hover:bg-red-200 flex items-center justify-center"
                  >+</button>
                </div>
              </div>

              <div className="bg-amber-50 rounded-2xl p-4 text-center border border-amber-200">
                <div className="text-xs text-amber-600 font-medium mb-1">Puntuación estimada</div>
                <div className={`text-5xl font-bold ${scoreColor(previewScore)}`}>{previewScore}</div>
                <div className="text-xs text-gray-400 mt-1">de 100 puntos</div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">Evaluado por</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-amber-400"
                  value={formEval.evaluadoPor}
                  onChange={e => setFormEval(f => ({ ...f, evaluadoPor: e.target.value }))}
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">Notas (opcional)</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-amber-400 resize-none"
                  rows={2}
                  value={formEval.notas}
                  onChange={e => setFormEval(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Observaciones..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEvalForm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-medium">Cancelar</button>
              <button
                onClick={saveEval}
                disabled={!formEval.colaboradorId}
                className="flex-1 py-3 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800 disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
