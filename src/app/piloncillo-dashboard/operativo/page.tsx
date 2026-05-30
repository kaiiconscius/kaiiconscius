'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Ingrediente {
  nombre: string;
  cantidad: number;
  unidad: string;
  costoUnitario: number; // costo por unidad de medida
}

interface Receta {
  id: string;
  nombre: string;
  categoria: string;
  rendimiento: number;        // porciones que rinde
  precioVenta: number;        // precio de venta por porción
  ingredientes: Ingrediente[];
  notas: string;
  createdAt: string;
}

const CATEGORIAS = ['Bebidas', 'Alimentos', 'Panadería', 'Postres', 'Otros'];
const UNIDADES = ['g', 'kg', 'ml', 'L', 'pza', 'taza', 'cda', 'cdta'];

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(n || 0);
}

function costoReceta(r: { ingredientes: Ingrediente[] }) {
  return r.ingredientes.reduce((a, i) => a + i.cantidad * i.costoUnitario, 0);
}

function foodCostPct(costoPorcion: number, precioVenta: number) {
  if (!precioVenta) return 0;
  return Math.round((costoPorcion / precioVenta) * 100);
}

function fcColor(pct: number) {
  if (pct === 0) return 'text-stone-400';
  if (pct <= 30) return 'text-emerald-600';
  if (pct <= 38) return 'text-amber-600';
  return 'text-red-500';
}
function fcLabel(pct: number) {
  if (pct === 0) return 'Sin precio';
  if (pct <= 30) return '✅ Saludable';
  if (pct <= 38) return '⚠️ Ajustable';
  return '🔴 Alto';
}

const EMPTY: Omit<Receta, 'id' | 'createdAt'> = {
  nombre: '', categoria: 'Bebidas', rendimiento: 1, precioVenta: 0, ingredientes: [], notas: '',
};

export default function OperativoPage() {
  const router = useRouter();
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Receta, 'id' | 'createdAt'>>(EMPTY);
  const [filtro, setFiltro] = useState('Todas');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/piloncillo/recetas');
      const json = await res.json();
      setRecetas(json.data || []);
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditId(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (r: Receta) => {
    setEditId(r.id);
    setForm({ nombre: r.nombre, categoria: r.categoria, rendimiento: r.rendimiento, precioVenta: r.precioVenta, ingredientes: r.ingredientes, notas: r.notas });
    setShowForm(true);
  };

  const addIngrediente = () => setForm(f => ({ ...f, ingredientes: [...f.ingredientes, { nombre: '', cantidad: 0, unidad: 'g', costoUnitario: 0 }] }));
  const updIngrediente = (idx: number, patch: Partial<Ingrediente>) =>
    setForm(f => ({ ...f, ingredientes: f.ingredientes.map((ing, i) => i === idx ? { ...ing, ...patch } : ing) }));
  const delIngrediente = (idx: number) =>
    setForm(f => ({ ...f, ingredientes: f.ingredientes.filter((_, i) => i !== idx) }));

  const save = async () => {
    const body = editId ? { ...form, id: editId } : form;
    await fetch('/api/piloncillo/recetas', {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setShowForm(false);
    setForm(EMPTY);
    setEditId(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta receta?')) return;
    await fetch(`/api/piloncillo/recetas?id=${id}`, { method: 'DELETE' });
    load();
  };

  // Cálculos en vivo del formulario
  const costoTotal = costoReceta(form);
  const costoPorcion = form.rendimiento > 0 ? costoTotal / form.rendimiento : costoTotal;
  const fcPct = foodCostPct(costoPorcion, form.precioVenta);
  const margen = form.precioVenta - costoPorcion;

  const categorias = ['Todas', ...CATEGORIAS];
  const recetasFiltradas = filtro === 'Todas' ? recetas : recetas.filter(r => r.categoria === filtro);

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900 text-white px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => router.push('/piloncillo-dashboard')} className="text-amber-300/70 text-lg hover:text-white">←</button>
            <div className="text-2xl">📖</div>
            <div>
              <h1 className="font-bold text-xl">Recetas & Costeo</h1>
              <p className="text-amber-300/60 text-xs">Documenta, mide y mejora el food cost</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-white">{recetas.length}</div>
              <div className="text-white/50 text-xs">Recetas documentadas</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-white">
                {recetas.length ? Math.round(recetas.reduce((a, r) => {
                  const cp = r.rendimiento > 0 ? costoReceta(r) / r.rendimiento : 0;
                  return a + foodCostPct(cp, r.precioVenta);
                }, 0) / recetas.length) : 0}%
              </div>
              <div className="text-white/50 text-xs">Food cost promedio</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 pb-20">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categorias.map(c => (
              <button key={c} onClick={() => setFiltro(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  filtro === c ? 'bg-amber-600 text-white' : 'bg-white text-stone-500 border border-stone-200'
                }`}>{c}</button>
            ))}
          </div>
          <button onClick={openNew} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-700 whitespace-nowrap flex-shrink-0">+ Receta</button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-amber-400">Cargando...</div>
        ) : recetasFiltradas.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <div className="text-5xl mb-3">📖</div>
            <p className="font-medium">Sin recetas aún</p>
            <p className="text-sm mt-1">Documenta tu primera receta</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recetasFiltradas.map(r => {
              const ct = costoReceta(r);
              const cp = r.rendimiento > 0 ? ct / r.rendimiento : ct;
              const pct = foodCostPct(cp, r.precioVenta);
              const margen = r.precioVenta - cp;
              return (
                <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-stone-800">{r.nombre}</div>
                      <div className="text-xs text-stone-400 mt-0.5">{r.categoria} · rinde {r.rendimiento} {r.rendimiento === 1 ? 'porción' : 'porciones'}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-black ${fcColor(pct)}`}>{pct}%</div>
                      <div className="text-xs text-stone-400">{fcLabel(pct)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="bg-stone-50 rounded-lg py-2">
                      <div className="text-sm font-bold text-stone-700">{fmt(cp)}</div>
                      <div className="text-xs text-stone-400">Costo/porción</div>
                    </div>
                    <div className="bg-stone-50 rounded-lg py-2">
                      <div className="text-sm font-bold text-stone-700">{fmt(r.precioVenta)}</div>
                      <div className="text-xs text-stone-400">Precio venta</div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg py-2">
                      <div className={`text-sm font-bold ${margen >= 0 ? 'text-emerald-700' : 'text-red-500'}`}>{fmt(margen)}</div>
                      <div className="text-xs text-stone-400">Margen</div>
                    </div>
                  </div>
                  <div className="text-xs text-stone-400 mb-3">
                    {r.ingredientes.length} ingredientes · costo total receta {fmt(ct)}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => openEdit(r)} className="text-amber-600 text-sm font-medium hover:underline">Editar</button>
                    <button onClick={() => remove(r.id)} className="text-red-400 text-sm hover:underline">Eliminar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal receta */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl my-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-stone-800 mb-5">{editId ? 'Editar receta' : 'Nueva receta'}</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-stone-500 font-medium">Nombre de la receta</label>
                  <input className="w-full border border-stone-200 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-amber-400"
                    value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Latte de piloncillo" />
                </div>
                <div>
                  <label className="text-xs text-stone-500 font-medium">Categoría</label>
                  <select className="w-full border border-stone-200 rounded-xl px-3 py-2 mt-1 text-sm bg-white focus:outline-none focus:border-amber-400"
                    value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-stone-500 font-medium">Rinde (porciones)</label>
                  <input type="number" min={1} className="w-full border border-stone-200 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-amber-400"
                    value={form.rendimiento || ''} onChange={e => setForm(f => ({ ...f, rendimiento: Number(e.target.value) }))} placeholder="1" />
                </div>
              </div>

              {/* Ingredientes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-stone-500 font-medium">Ingredientes</label>
                  <button onClick={addIngrediente} className="text-amber-600 text-xs font-semibold">+ Agregar</button>
                </div>
                <div className="space-y-2">
                  {form.ingredientes.map((ing, idx) => (
                    <div key={idx} className="bg-stone-50 rounded-xl p-3">
                      <div className="flex gap-2 mb-2">
                        <input className="flex-1 border border-stone-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-amber-400"
                          value={ing.nombre} onChange={e => updIngrediente(idx, { nombre: e.target.value })} placeholder="Ingrediente" />
                        <button onClick={() => delIngrediente(idx)} className="text-stone-300 hover:text-red-400 px-1">✕</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <input type="number" className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-amber-400"
                            value={ing.cantidad || ''} onChange={e => updIngrediente(idx, { cantidad: Number(e.target.value) })} placeholder="Cant." />
                        </div>
                        <div>
                          <select className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-amber-400"
                            value={ing.unidad} onChange={e => updIngrediente(idx, { unidad: e.target.value })}>
                            {UNIDADES.map(u => <option key={u}>{u}</option>)}
                          </select>
                        </div>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-stone-400 text-xs">$</span>
                          <input type="number" className="w-full border border-stone-200 rounded-lg pl-5 pr-2 py-1.5 text-sm bg-white focus:outline-none focus:border-amber-400"
                            value={ing.costoUnitario || ''} onChange={e => updIngrediente(idx, { costoUnitario: Number(e.target.value) })} placeholder="x/u" />
                        </div>
                      </div>
                      <div className="text-right text-xs text-stone-400 mt-1">= {fmt(ing.cantidad * ing.costoUnitario)}</div>
                    </div>
                  ))}
                  {form.ingredientes.length === 0 && (
                    <p className="text-xs text-stone-400 text-center py-3">Agrega ingredientes para calcular el costo</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-stone-500 font-medium">Precio de venta por porción</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-stone-400 text-sm">$</span>
                  <input type="number" className="w-full border border-stone-200 rounded-xl pl-7 pr-3 py-2 text-sm font-bold focus:outline-none focus:border-amber-400"
                    value={form.precioVenta || ''} onChange={e => setForm(f => ({ ...f, precioVenta: Number(e.target.value) }))} placeholder="0.00" />
                </div>
              </div>

              {/* Resumen en vivo */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="text-center">
                    <div className="text-xs text-stone-500">Costo por porción</div>
                    <div className="text-lg font-black text-stone-700">{fmt(costoPorcion)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-stone-500">Margen por porción</div>
                    <div className={`text-lg font-black ${margen >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(margen)}</div>
                  </div>
                </div>
                <div className="bg-white/60 rounded-xl p-3 text-center">
                  <div className="text-xs text-stone-500 mb-1">Food cost</div>
                  <div className={`text-3xl font-black ${fcColor(fcPct)}`}>{fcPct}%</div>
                  <div className="text-xs text-stone-400 mt-0.5">{fcLabel(fcPct)} · ideal ≤ 30%</div>
                </div>
              </div>

              <div>
                <label className="text-xs text-stone-500 font-medium">Notas de preparación (opcional)</label>
                <textarea className="w-full border border-stone-200 rounded-xl px-3 py-2 mt-1 text-sm resize-none focus:outline-none focus:border-amber-400" rows={2}
                  value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Pasos, tips, presentación..." />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border-2 border-stone-200 text-stone-500 font-medium">Cancelar</button>
              <button onClick={save} disabled={!form.nombre}
                className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-40">Guardar receta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
