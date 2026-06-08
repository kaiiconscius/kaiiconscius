'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setUsuarioSesion, registrarMovimiento } from '../../lib/bitacora';

interface UsuarioReg { id: string; nombre: string; rol: string; activo: boolean; }

const SECCIONES = [
  { id: 'gerencia',       nombre: 'Gerencias',       desc: 'Mis unidades · Evaluación',   emoji: '🏪', bg: 'from-amber-600 to-orange-600',  href: '/piloncillo-dashboard/gerencia' },
  { id: 'direccion',     nombre: 'Dirección',       desc: 'Panel estratégico',            emoji: '🧭', bg: 'from-stone-800 to-stone-700',   href: null },
  { id: 'administracion',nombre: 'Administración',  desc: 'Finanzas · Operaciones',       emoji: '📊', bg: 'from-teal-700 to-teal-600',     href: null },
  { id: 'rrhh',          nombre: 'RRHH',            desc: 'Talento · Colaboradores',      emoji: '👥', bg: 'from-rose-700 to-rose-600',     href: null },
];

export default function PiloncilloDashboardPage() {
  const router = useRouter();
  const [modal, setModal] = useState<string | null>(null);
  const [step, setStep] = useState<'pin' | 'identidad'>('pin');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioReg[]>([]);
  const [usuarioSel, setUsuarioSel] = useState('');
  const [nombreNuevo, setNombreNuevo] = useState('');

  const handleSelect = (s: typeof SECCIONES[0]) => {
    if (s.href) { router.push(s.href); return; }
    setModal(s.id);
    setStep('pin');
    setPin('');
    setError('');
    setUsuarioSel('');
    setNombreNuevo('');
  };

  const continuarSeccion = (id: string) => {
    sessionStorage.setItem(`pillo_${id}`, '1');
    router.push(`/piloncillo-dashboard/${id}`);
  };

  const handleValidar = async () => {
    if (!modal || pin.length < 4) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/piloncillo/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seccion: modal, pin }),
      });
      const data = await res.json();
      if (data.ok) {
        try {
          const r = await fetch(`/api/piloncillo/usuarios?rol=${modal}`);
          const j = await r.json();
          setUsuarios((j.data || []).filter((u: UsuarioReg) => u.activo));
        } catch { setUsuarios([]); }
        setStep('identidad');
      } else {
        setError('PIN incorrecto');
        setPin('');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarIdentidad = async () => {
    if (!modal) return;
    let usuario = usuarios.find(u => u.id === usuarioSel);
    if (!usuario && nombreNuevo.trim()) {
      try {
        const r = await fetch('/api/piloncillo/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: nombreNuevo.trim(), rol: modal, unidades: [] }),
        });
        if (r.ok) usuario = await r.json();
      } catch { /* continúa sin registrar */ }
    }
    if (usuario) setUsuarioSesion({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol });
    await registrarMovimiento({ accion: 'login', detalle: `Acceso a ${SECCIONES.find(s => s.id === modal)?.nombre || modal}`, seccion: modal });
    continuarSeccion(modal);
  };

  const actual = SECCIONES.find(s => s.id === modal);

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900 text-white px-6 pt-12 pb-10">
        <div className="max-w-lg mx-auto">
          <div className="text-5xl mb-3">🍬</div>
          <h1 className="text-3xl font-bold tracking-tight">Piloncillo</h1>
          <p className="text-amber-300/70 text-sm mt-1">Sistema de gestión de equipos</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 -mt-4 mb-4">
        <Link
          href="/piloncillo-dashboard/overview"
          className="flex items-center gap-4 bg-white border-2 border-amber-100 rounded-2xl p-4 shadow-sm hover:border-amber-300 hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-2xl">📈</div>
          <div className="flex-1">
            <div className="font-bold text-stone-800">Vista General</div>
            <div className="text-xs text-stone-400 mt-0.5">Todas las unidades · Solo lectura · Sin PIN</div>
          </div>
          <div className="text-amber-400 text-xl">→</div>
        </Link>
      </div>

      <main className="max-w-lg mx-auto px-4 pb-8 grid grid-cols-2 gap-3">
        {SECCIONES.map(s => (
          <button
            key={s.id}
            onClick={() => handleSelect(s)}
            className={`bg-gradient-to-br ${s.bg} text-white rounded-2xl p-5 text-left hover:scale-[1.03] active:scale-95 transition-all shadow-md`}
          >
            <div className="text-3xl mb-3">{s.emoji}</div>
            <div className="font-bold text-base leading-tight">{s.nombre}</div>
            <div className="text-white/60 text-xs mt-1">{s.desc}</div>
          </button>
        ))}
      </main>

      {modal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setModal(null)}
        >
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            {step === 'pin' ? (
              <>
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">{actual?.emoji}</div>
                  <h2 className="text-xl font-bold text-stone-800">{actual?.nombre}</h2>
                  <p className="text-stone-400 text-sm mt-1">PIN de acceso</p>
                </div>
                <div className="flex justify-center gap-3 mb-5">
                  {[0,1,2,3].map(i => (
                    <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all ${pin.length > i ? 'bg-amber-600 scale-110' : 'bg-stone-200'}`} />
                  ))}
                </div>
                <input
                  type="password" inputMode="numeric" maxLength={6}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleValidar()}
                  className="w-full border-2 border-stone-200 rounded-2xl px-4 py-3.5 text-center text-xl font-mono tracking-[0.6em] focus:outline-none focus:border-amber-400 bg-stone-50"
                  autoFocus
                />
                {error && <p className="text-red-500 text-sm text-center mt-3">{error}</p>}
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl border-2 border-stone-200 text-stone-500 font-medium">Cancelar</button>
                  <button
                    onClick={handleValidar}
                    disabled={pin.length < 4 || loading}
                    className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-40"
                  >{loading ? '...' : 'Entrar →'}</button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-5">
                  <div className="text-4xl mb-2">👋</div>
                  <h2 className="text-xl font-bold text-stone-800">¿Quién eres?</h2>
                  <p className="text-stone-400 text-sm mt-1">Para registrar tu actividad en la bitácora</p>
                </div>
                {usuarios.length > 0 && (
                  <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                    {usuarios.map(u => (
                      <button key={u.id} onClick={() => { setUsuarioSel(u.id); setNombreNuevo(''); }}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 font-medium text-sm transition-colors ${usuarioSel === u.id ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-stone-200 text-stone-600 hover:border-stone-300'}`}>
                        {u.nombre}
                      </button>
                    ))}
                  </div>
                )}
                <div>
                  <label className="text-xs text-stone-400 font-medium mb-1.5 block">{usuarios.length > 0 ? 'O escribe tu nombre si no apareces en la lista' : 'Escribe tu nombre'}</label>
                  <input
                    value={nombreNuevo}
                    onChange={e => { setNombreNuevo(e.target.value); setUsuarioSel(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleConfirmarIdentidad()}
                    placeholder="Tu nombre completo"
                    className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 bg-stone-50"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep('pin')} className="flex-1 py-3 rounded-xl border-2 border-stone-200 text-stone-500 font-medium">← Atrás</button>
                  <button
                    onClick={handleConfirmarIdentidad}
                    disabled={!usuarioSel && !nombreNuevo.trim()}
                    className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-40"
                  >Continuar →</button>
                </div>
                <button onClick={() => continuarSeccion(modal!)} className="w-full text-center text-xs text-stone-400 hover:text-stone-600 mt-4">
                  Omitir e ingresar sin identificarme
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
