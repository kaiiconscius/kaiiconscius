'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Usuario { id: string; nombre: string; rol: string; unidades: string[]; activo: boolean; creadoEn: string; }
interface BitacoraEntry { id: string; timestamp: string; usuarioNombre: string; rol: string; accion: string; detalle: string; seccion?: string; unidad?: string; }

const ROLES = [
  { id: 'direccion', label: 'Dirección', emoji: '🧭' },
  { id: 'gerencia', label: 'Gerencia', emoji: '🏪' },
  { id: 'administracion', label: 'Administración', emoji: '📊' },
  { id: 'rrhh', label: 'RRHH', emoji: '👥' },
];

const UNIDADES = [
  { id: 'la-cruz', nombre: 'La Cruz' },
  { id: 'oaxaca-manana', nombre: 'Oaxaca Mañana' },
  { id: 'oaxaca-vespertino', nombre: 'Oaxaca Vespertino' },
  { id: 'ixtlan-del-rio', nombre: 'Ixtlán del Río' },
  { id: 'panaderia', nombre: 'Panadería' },
];

function rolLabel(id: string) { return ROLES.find(r => r.id === id)?.label || id; }
function rolEmoji(id: string) { return ROLES.find(r => r.id === id)?.emoji || '👤'; }
function tiempoRelativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const d = Math.floor(hr / 24);
  return `hace ${d} d`;
}

export default function UsuariosPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'usuarios' | 'bitacora'>('usuarios');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [bitacora, setBitacora] = useState<BitacoraEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ nombre: '', rol: 'gerencia', unidades: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [filtroRol, setFiltroRol] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('kaii_master_session')) {
      router.push('/kaii-master');
    }
  }, [router]);

  const loadUsuarios = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch('/api/piloncillo/usuarios'); const j = await r.json(); setUsuarios(j.data || []); }
    finally { setLoading(false); }
  }, []);

  const loadBitacora = useCallback(async () => {
    try { const r = await fetch('/api/piloncillo/bitacora?limit=80'); const j = await r.json(); setBitacora(j.data || []); } catch {}
  }, []);

  useEffect(() => { loadUsuarios(); }, [loadUsuarios]);
  useEffect(() => { if (tab === 'bitacora') loadBitacora(); }, [tab, loadBitacora]);

  const guardar = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const r = await fetch('/api/piloncillo/usuarios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (r.ok) { setShowAdd(false); setForm({ nombre: '', rol: 'gerencia', unidades: [] }); loadUsuarios(); }
    } finally { setSaving(false); }
  };

  const toggleActivo = async (u: Usuario) => {
    await fetch('/api/piloncillo/usuarios', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, activo: !u.activo }),
    });
    loadUsuarios();
  };

  const eliminar = async (id: string) => {
    await fetch(`/api/piloncillo/usuarios?id=${id}`, { method: 'DELETE' });
    loadUsuarios();
  };

  const toggleUnidadForm = (id: string) => {
    setForm(f => ({ ...f, unidades: f.unidades.includes(id) ? f.unidades.filter(x => x !== id) : [...f.unidades, id] }));
  };

  const usuariosFiltrados = filtroRol ? usuarios.filter(u => u.rol === filtroRol) : usuarios;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => router.push('/kaii-master/dashboard')} className="text-slate-500 hover:text-slate-300 text-lg">←</button>
          <div className="flex-1">
            <h1 className="text-white font-bold text-base leading-none">Usuarios y Bitácora</h1>
            <p className="text-slate-500 text-xs mt-0.5">Identidades nominales · Registro de actividad</p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 flex gap-1">
          {([['usuarios', '👤 Usuarios'], ['bitacora', '📜 Bitácora']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === t ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-20">
        {tab === 'usuarios' && (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5 overflow-x-auto">
                <button onClick={() => setFiltroRol('')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filtroRol === '' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                  Todos
                </button>
                {ROLES.map(r => (
                  <button key={r.id} onClick={() => setFiltroRol(r.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filtroRol === r.id ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                    {r.emoji} {r.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAdd(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-xl whitespace-nowrap transition-colors">+ Usuario</button>
            </div>

            {loading ? (
              <div className="text-center py-16 text-slate-600">Cargando...</div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="text-center py-16 text-slate-600">
                <div className="text-4xl mb-2">👤</div>
                <p className="text-sm">Sin usuarios registrados</p>
                <p className="text-xs mt-1 text-slate-700">Se agregan automáticamente cuando alguien entra por primera vez, o aquí manualmente</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {usuariosFiltrados.map(u => (
                  <div key={u.id} className={`bg-slate-900 border rounded-2xl p-4 ${u.activo ? 'border-slate-800' : 'border-slate-800/50 opacity-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-lg">{rolEmoji(u.rol)}</div>
                        <div>
                          <div className="font-semibold text-white text-sm">{u.nombre}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{rolLabel(u.rol)}{u.unidades.length > 0 && ` · ${u.unidades.map(id => UNIDADES.find(x => x.id === id)?.nombre || id).join(', ')}`}</div>
                          <div className="text-xs text-slate-700 mt-1">Registrado {tiempoRelativo(u.creadoEn)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleActivo(u)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${u.activo ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </button>
                        <button onClick={() => eliminar(u.id)} className="text-slate-600 hover:text-red-400 text-sm">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'bitacora' && (
          <>
            <p className="text-slate-500 text-xs">Últimos {bitacora.length} movimientos registrados en el sistema</p>
            {bitacora.length === 0 ? (
              <div className="text-center py-16 text-slate-600">
                <div className="text-4xl mb-2">📜</div>
                <p className="text-sm">Sin actividad registrada todavía</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bitacora.map(e => (
                  <div key={e.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-sm shrink-0">{rolEmoji(e.rol)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium">{e.usuarioNombre} <span className="text-slate-500 font-normal">· {e.accion}</span></div>
                      {e.detalle && <div className="text-xs text-slate-500 mt-0.5 truncate">{e.detalle}</div>}
                    </div>
                    <div className="text-xs text-slate-600 whitespace-nowrap">{tiempoRelativo(e.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-lg mb-1">Nuevo usuario</h3>
            <p className="text-slate-500 text-sm mb-6">Identidad nominal para la bitácora de movimientos</p>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block uppercase tracking-wider">Nombre</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500/50 border border-slate-700 text-sm"
                  placeholder="Nombre completo" />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block uppercase tracking-wider">Rol</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <button key={r.id} onClick={() => setForm(f => ({ ...f, rol: r.id, unidades: r.id === 'gerencia' ? f.unidades : [] }))}
                      className={`py-2.5 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${form.rol === r.id ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-slate-700 text-slate-500'}`}>
                      {r.emoji} {r.label}
                    </button>
                  ))}
                </div>
              </div>
              {form.rol === 'gerencia' && (
                <div>
                  <label className="text-slate-400 text-xs mb-1.5 block uppercase tracking-wider">Unidades a cargo</label>
                  <div className="flex flex-wrap gap-2">
                    {UNIDADES.map(u => (
                      <button key={u.id} onClick={() => toggleUnidadForm(u.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${form.unidades.includes(u.id) ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                        {u.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-700 text-slate-400 font-medium">Cancelar</button>
              <button onClick={guardar} disabled={!form.nombre.trim() || saving} className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold disabled:opacity-40">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
