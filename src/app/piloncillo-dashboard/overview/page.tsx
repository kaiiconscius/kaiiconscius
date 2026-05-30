'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface EvalLatest {
  score: number;
  desempeno_score: number;
  comportamiento_score: number;
  incidencias_score: number;
  ingresoReal: number;
  metaMensual: number;
  periodo: string;
}

const UNIDADES = [
  { id: 'la-cruz',           nombre: 'La Cruz',           emoji: '☕', color: 'from-amber-500 to-amber-400' },
  { id: 'oaxaca-manana',     nombre: 'Oaxaca Mañana',     emoji: '🌅', color: 'from-orange-500 to-orange-400' },
  { id: 'oaxaca-vespertino', nombre: 'Oaxaca Vespertino', emoji: '🌇', color: 'from-rose-500 to-rose-400' },
  { id: 'ixtlan-del-rio',    nombre: 'Ixtlán del Río',    emoji: '🏔️', color: 'from-teal-500 to-teal-400' },
  { id: 'matriz-cafe',       nombre: 'Matriz Café',       emoji: '🏠', color: 'from-stone-500 to-stone-400' },
  { id: 'panaderia',         nombre: 'Panadería',         emoji: '🥐', color: 'from-yellow-500 to-yellow-400' },
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

function scoreColor(s: number) {
  if (s >= 80) return 'text-emerald-600';
  if (s >= 60) return 'text-amber-600';
  return 'text-red-500';
}
function scoreBorder(s: number) {
  if (s >= 80) return 'border-emerald-200';
  if (s >= 60) return 'border-amber-200';
  return 'border-red-200';
}
function scoreLabel(s: number) {
  if (s >= 90) return '🌟 Excelente';
  if (s >= 80) return '✅ Muy bien';
  if (s >= 70) return '👍 Bien';
  if (s >= 60) return '⚠️ Regular';
  return '🔴 En desarrollo';
}

export default function OverviewPage() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState(PERIODOS[0]);
  const [data, setData] = useState<Record<string, EvalLatest | null>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all(
      UNIDADES.map(async u => {
        try {
          const res = await fetch(`/api/piloncillo/evaluaciones-gerencia?unidad=${u.id}&periodo=${periodo}`);
          const json = await res.json();
          return { id: u.id, eval: json.latest as EvalLatest | null };
        } catch {
          return { id: u.id, eval: null };
        }
      })
    );
    const map: Record<string, EvalLatest | null> = {};
    results.forEach(r => { map[r.id] = r.eval; });
    setData(map);
    setLoading(false);
  }, [periodo]);

  useEffect(() => { loadData(); }, [loadData]);

  const allScores = UNIDADES.map(u => data[u.id]?.score).filter((s): s is number => s != null);
  const promedio = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900 text-white px-4 pt-10 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => router.push('/piloncillo-dashboard')} className="text-amber-300/70 text-lg hover:text-white">←</button>
            <div>
              <h1 className="font-bold text-xl">Vista General</h1>
              <p className="text-amber-300/60 text-xs">6 unidades · Solo lectura</p>
            </div>
          </div>
          {allScores.length > 0 && (
            <div className="bg-white/10 rounded-2xl px-5 py-3 flex items-center justify-between">
              <div>
                <div className="text-white/60 text-xs">Promedio {allScores.length} unidades evaluadas</div>
                <div className="text-white/80 text-xs mt-0.5">{periodo}</div>
              </div>
              <span className={`text-4xl font-black ${scoreColor(promedio)}`} style={{color:'white'}}>{promedio}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-semibold text-stone-500">Período</span>
          <select
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            className="border border-amber-200 rounded-xl px-3 py-1.5 text-sm bg-white text-stone-700 font-medium"
          >
            {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-16 text-amber-400">Cargando unidades...</div>
        ) : (
          <div className="space-y-3">
            {[...UNIDADES]
              .sort((a, b) => (data[b.id]?.score ?? -1) - (data[a.id]?.score ?? -1))
              .map(u => {
                const e = data[u.id];
                return (
                  <div key={u.id} className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${e ? scoreBorder(e.score) : 'border-stone-100'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${u.color} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                        {u.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-stone-800">{u.nombre}</div>
                        {e ? (
                          <>
                            <div className="text-xs text-stone-400 mt-0.5">{scoreLabel(e.score)}</div>
                            <div className="flex gap-3 mt-2">
                              <span className="text-xs">D <strong className="text-emerald-600">{e.desempeno_score}</strong></span>
                              <span className="text-xs">C <strong className="text-blue-600">{e.comportamiento_score}</strong></span>
                              <span className="text-xs">A <strong className="text-stone-500">{e.incidencias_score}</strong></span>
                            </div>
                            {e.metaMensual > 0 && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-stone-400">Meta ingresos</span>
                                  <span className={`font-bold ${e.ingresoReal >= e.metaMensual ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {Math.round((e.ingresoReal / e.metaMensual) * 100)}%
                                  </span>
                                </div>
                                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${e.ingresoReal >= e.metaMensual ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                    style={{ width: `${Math.min(100, (e.ingresoReal / e.metaMensual) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-xs text-stone-300 mt-1">Sin evaluación este período</div>
                        )}
                      </div>
                      {e && (
                        <div className={`text-4xl font-black flex-shrink-0 ${scoreColor(e.score)}`}>{e.score}</div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
        <p className="text-center text-xs text-stone-300 mt-8 pb-8">Solo lectura · No se pueden modificar datos desde aquí</p>
      </main>
    </div>
  );
}
