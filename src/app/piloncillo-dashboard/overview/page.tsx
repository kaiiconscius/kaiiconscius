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

function prevPeriodo(p: string) {
  const [y, m] = p.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function sc(s: number) { return s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-600' : 'text-red-500'; }
function bg(s: number) { return s >= 80 ? 'bg-emerald-50 border-emerald-200' : s >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'; }
function bar(s: number) { return s >= 80 ? 'bg-emerald-400' : s >= 60 ? 'bg-amber-400' : 'bg-red-400'; }
function badge(s: number) { return s >= 90 ? '🌟 Excelente' : s >= 80 ? '✅ Muy bien' : s >= 70 ? '👍 Bien' : s >= 60 ? '⚠️ Regular' : '🔴 Atención'; }

const MEDALS = ['🥇', '🥈', '🥉'];
const RANK_STYLES = [
  { ring: 'ring-2 ring-amber-400/60',  header: 'bg-gradient-to-r from-amber-50 to-yellow-50', numBg: 'bg-amber-400', label: 'Líder del período' },
  { ring: 'ring-2 ring-stone-300/60',  header: 'bg-gradient-to-r from-stone-50 to-gray-50',   numBg: 'bg-stone-400', label: '2° lugar' },
  { ring: 'ring-2 ring-yellow-600/40', header: 'bg-gradient-to-r from-yellow-50 to-amber-50', numBg: 'bg-yellow-600', label: '3° lugar' },
];

export default function OverviewPage() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState(PERIODOS[0]);
  const [data, setData] = useState<Record<string, EvalLatest | null>>({});
  const [prevData, setPrevData] = useState<Record<string, EvalLatest | null>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const prev = prevPeriodo(periodo);
    const [cur, ant] = await Promise.all([
      Promise.all(UNIDADES.map(async u => {
        try { const r = await fetch(`/api/piloncillo/evaluaciones-gerencia?unidad=${u.id}&periodo=${periodo}`); const j = await r.json(); return { id: u.id, e: j.latest as EvalLatest | null }; }
        catch { return { id: u.id, e: null }; }
      })),
      Promise.all(UNIDADES.map(async u => {
        try { const r = await fetch(`/api/piloncillo/evaluaciones-gerencia?unidad=${u.id}&periodo=${prev}`); const j = await r.json(); return { id: u.id, e: j.latest as EvalLatest | null }; }
        catch { return { id: u.id, e: null }; }
      })),
    ]);
    const m: Record<string, EvalLatest | null> = {};
    cur.forEach(r => { m[r.id] = r.e; });
    const pm: Record<string, EvalLatest | null> = {};
    ant.forEach(r => { pm[r.id] = r.e; });
    setData(m); setPrevData(pm); setLoading(false);
  }, [periodo]);

  useEffect(() => { loadData(); }, [loadData]);

  const sorted = [...UNIDADES]
    .map(u => ({ u, e: data[u.id] }))
    .sort((a, b) => (b.e?.score ?? -1) - (a.e?.score ?? -1));

  const withData = sorted.filter(x => x.e);
  const noData = sorted.filter(x => !x.e);
  const scores = withData.map(x => x.e!.score);
  const promedio = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const ingresoTotal = withData.reduce((sum, x) => sum + (x.e?.ingresoReal || 0), 0);
  const metaTotal = withData.reduce((sum, x) => sum + (x.e?.metaMensual || 0), 0);
  const pctMeta = metaTotal > 0 ? Math.round((ingresoTotal / metaTotal) * 100) : 0;

  function trend(id: string) {
    const cur = data[id]?.score;
    const pre = prevData[id]?.score;
    if (cur == null || pre == null) return null;
    const diff = cur - pre;
    return { diff, up: diff > 0, same: diff === 0 };
  }

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900 text-white px-4 pt-10 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => router.push('/piloncillo-dashboard')} className="text-amber-300/70 text-lg hover:text-white">←</button>
            <div className="flex-1">
              <h1 className="font-bold text-xl">Vista General</h1>
              <p className="text-amber-300/60 text-xs">Ranking · {withData.length} unidades evaluadas</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-white">{promedio || '—'}</div>
              <div className="text-white/50 text-xs mt-0.5">Promedio</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-white">{metaTotal > 0 ? `${pctMeta}%` : '—'}</div>
              <div className="text-white/50 text-xs mt-0.5">Meta global</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-white">{withData.length}/{UNIDADES.length}</div>
              <div className="text-white/50 text-xs mt-0.5">Con datos</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 pb-16">
        {/* Período */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-semibold text-stone-500">Período</span>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)}
            className="border border-amber-200 rounded-xl px-3 py-1.5 text-sm bg-white text-stone-700 font-medium">
            {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-16 text-amber-400">
            <div className="text-4xl mb-3 animate-bounce">📊</div>
            <p className="text-sm">Cargando ranking...</p>
          </div>
        ) : withData.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <div className="text-5xl mb-3">📋</div>
            <p className="font-medium">Sin evaluaciones este período</p>
            <p className="text-sm mt-1">Los gerentes aún no han capturado datos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Ingresos resumen */}
            {ingresoTotal > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex items-center gap-4 mb-5">
                <div className="text-2xl">💰</div>
                <div className="flex-1">
                  <div className="font-bold text-stone-800 text-base">{fmt(ingresoTotal)}</div>
                  <div className="text-xs text-stone-400">Ingresos totales · {periodo}</div>
                </div>
                {metaTotal > 0 && (
                  <div className={`text-xl font-black ${pctMeta >= 100 ? 'text-emerald-600' : pctMeta >= 80 ? 'text-amber-600' : 'text-red-500'}`}>
                    {pctMeta}%
                  </div>
                )}
              </div>
            )}

            {/* Ranking */}
            {withData.map(({ u, e }, idx) => {
              const t = trend(u.id);
              const isTop3 = idx < 3;
              const rs = isTop3 ? RANK_STYLES[idx] : null;
              const metaPct = e!.metaMensual > 0 ? Math.round((e!.ingresoReal / e!.metaMensual) * 100) : null;

              return (
                <div key={u.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${isTop3 ? rs!.ring : 'border-stone-100'}`}>
                  {/* Top 3 header strip */}
                  {isTop3 && (
                    <div className={`${rs!.header} px-4 py-2 flex items-center justify-between`}>
                      <span className="text-xs font-semibold text-stone-500">{MEDALS[idx]} {rs!.label}</span>
                      {t && (
                        <span className={`text-xs font-bold ${t.up ? 'text-emerald-600' : t.same ? 'text-stone-400' : 'text-red-500'}`}>
                          {t.up ? '↑' : t.same ? '→' : '↓'} {Math.abs(t.diff)} pts vs mes anterior
                        </span>
                      )}
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Rank badge / emoji */}
                      <div className="flex-shrink-0">
                        {isTop3 ? (
                          <div className={`w-12 h-12 bg-gradient-to-br ${u.color} rounded-xl flex items-center justify-center text-xl`}>
                            {u.emoji}
                          </div>
                        ) : (
                          <div className="w-12 h-12 flex items-center justify-center">
                            <div className="w-8 h-8 bg-stone-100 rounded-xl flex items-center justify-center">
                              <span className="text-stone-400 font-black text-sm">{idx + 1}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-800">{isTop3 ? '' : u.emoji} {u.nombre}</span>
                        </div>
                        <div className={`text-xs mt-0.5 font-medium ${sc(e!.score)}`}>{badge(e!.score)}</div>

                        {/* Sub-scores */}
                        <div className="flex gap-3 mt-2">
                          <span className="text-xs text-stone-400">D <strong className="text-emerald-600">{e!.desempeno_score}</strong></span>
                          <span className="text-xs text-stone-400">C <strong className="text-blue-600">{e!.comportamiento_score}</strong></span>
                          <span className="text-xs text-stone-400">A <strong className="text-stone-500">{e!.incidencias_score}</strong></span>
                          {!isTop3 && t && (
                            <span className={`text-xs font-bold ml-auto ${t.up ? 'text-emerald-500' : t.same ? 'text-stone-300' : 'text-red-400'}`}>
                              {t.up ? '↑' : t.same ? '→' : '↓'}{Math.abs(t.diff)}
                            </span>
                          )}
                        </div>

                        {/* Meta bar */}
                        {metaPct !== null && (
                          <div className="mt-2.5">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-stone-300">Meta ingresos</span>
                              <span className={`font-bold ${metaPct >= 100 ? 'text-emerald-600' : metaPct >= 80 ? 'text-amber-600' : 'text-red-500'}`}>{metaPct}%</span>
                            </div>
                            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${bar(e!.score)}`} style={{ width: `${Math.min(100, metaPct)}%` }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Score */}
                      <div className={`text-4xl font-black flex-shrink-0 ${sc(e!.score)}`}>{e!.score}</div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Sin datos */}
            {noData.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider mb-2 px-1">Sin evaluación este período</p>
                {noData.map(({ u }) => (
                  <div key={u.id} className="bg-white/60 rounded-xl p-3 flex items-center gap-3 mb-2 border border-stone-100">
                    <span className="text-lg">{u.emoji}</span>
                    <span className="text-sm text-stone-400">{u.nombre}</span>
                    <span className="ml-auto text-xs text-stone-300">Pendiente</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-stone-300 mt-8 pb-4">Solo lectura · Sin PIN requerido</p>
      </main>
    </div>
  );
}
