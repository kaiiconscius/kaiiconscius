'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const UNIDADES = [
  { id: 'la-cruz',            nombre: 'La Cruz',           emoji: '☕', bg: 'from-amber-600 to-amber-500' },
  { id: 'oaxaca-manana',      nombre: 'Oaxaca Mañana',     emoji: '🌅', bg: 'from-orange-500 to-orange-400' },
  { id: 'oaxaca-vespertino',  nombre: 'Oaxaca Vespertino', emoji: '🌇', bg: 'from-rose-600 to-rose-500' },
  { id: 'matriz-cafe',        nombre: 'Matriz Café',       emoji: '🏠', bg: 'from-stone-600 to-stone-500' },
  { id: 'panaderia',          nombre: 'Panadería',         emoji: '🥐', bg: 'from-yellow-600 to-yellow-500' },
];

export default function GerenciaHubPage() {
  const router = useRouter();
  const [modal, setModal] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const actual = UNIDADES.find(u => u.id === modal);

  const handleValidar = async () => {
    if (!modal || pin.length < 4) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/piloncillo/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seccion: `gerencia_${modal}`, pin }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem(`pillo_gerencia_${modal}`, '1');
        router.push(`/piloncillo-dashboard/gerencia/${modal}`);
      } else {
        setError('PIN incorrecto. Intenta de nuevo.');
        setPin('');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900 text-white px-4 pt-10 pb-8">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/piloncillo-dashboard')} className="text-amber-300/70 text-lg hover:text-white">←</button>
          <div>
            <h1 className="font-bold text-xl">Gerencias</h1>
            <p className="text-amber-300/60 text-xs">Selecciona tu unidad e ingresa tu PIN</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {UNIDADES.map(u => (
          <button
            key={u.id}
            onClick={() => { setModal(u.id); setPin(''); setError(''); }}
            className="w-full bg-white border border-stone-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:border-amber-300 hover:shadow-md transition-all text-left"
          >
            <div className={`w-14 h-14 bg-gradient-to-br ${u.bg} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
              {u.emoji}
            </div>
            <div className="flex-1">
              <div className="font-bold text-stone-800">{u.nombre}</div>
              <div className="text-xs text-stone-400 mt-0.5">Acceso con PIN de gerente</div>
            </div>
            <div className="text-stone-300 text-xl">→</div>
          </button>
        ))}
      </main>

      {modal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setModal(null)}
        >
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">{actual?.emoji}</div>
              <h2 className="text-xl font-bold text-stone-800">{actual?.nombre}</h2>
              <p className="text-stone-400 text-sm mt-1">PIN de gerente</p>
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
                className={`flex-1 py-3 rounded-xl text-white font-bold bg-gradient-to-r ${actual?.bg} disabled:opacity-40`}
              >{loading ? '...' : 'Entrar →'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
