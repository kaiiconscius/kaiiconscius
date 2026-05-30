'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SECCIONES = [
  {
    id: 'direccion',
    nombre: 'Dirección',
    descripcion: 'Panel estratégico · Reportes globales',
    emoji: '🏛️',
    bg: 'from-amber-900 to-amber-800',
  },
  {
    id: 'gerencia',
    nombre: 'Gerencias',
    descripcion: 'Equipos · Sucursales · Evaluaciones',
    emoji: '🏪',
    bg: 'from-amber-700 to-amber-600',
  },
  {
    id: 'administracion',
    nombre: 'Administración',
    descripcion: 'Finanzas · Operaciones',
    emoji: '📊',
    bg: 'from-stone-700 to-stone-600',
  },
  {
    id: 'rrhh',
    nombre: 'RRHH',
    descripcion: 'Talento humano · Colaboradores',
    emoji: '👥',
    bg: 'from-orange-700 to-orange-600',
  },
];

export default function PiloncilloDashboardPage() {
  const router = useRouter();
  const [modal, setModal] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelect = (id: string) => {
    setModal(id);
    setPin('');
    setError('');
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
        sessionStorage.setItem(`pillo_${modal}`, '1');
        router.push(`/piloncillo-dashboard/${modal}`);
      } else {
        setError('PIN incorrecto. Intenta de nuevo.');
        setPin('');
      }
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const seccionActual = SECCIONES.find(s => s.id === modal);

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-gradient-to-r from-amber-900 to-amber-800 text-white px-6 pt-12 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="text-4xl mb-2">🍬</div>
          <h1 className="text-3xl font-bold">Piloncillo</h1>
          <p className="text-amber-200 text-sm mt-1">Selecciona tu área de acceso</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 grid grid-cols-2 gap-4">
        {SECCIONES.map(s => (
          <button
            key={s.id}
            onClick={() => handleSelect(s.id)}
            className={`bg-gradient-to-br ${s.bg} text-white rounded-2xl p-5 text-left hover:scale-105 transition-transform shadow-lg active:scale-95`}
          >
            <div className="text-3xl mb-3">{s.emoji}</div>
            <div className="font-bold text-base leading-tight">{s.nombre}</div>
            <div className="text-white/70 text-xs mt-1 leading-snug">{s.descripcion}</div>
          </button>
        ))}
      </main>

      {modal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">{seccionActual?.emoji}</div>
              <h2 className="text-xl font-bold text-gray-800">{seccionActual?.nombre}</h2>
              <p className="text-gray-400 text-sm mt-1">Ingresa tu PIN de acceso</p>
            </div>

            <div className="flex justify-center gap-3 mb-4">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-colors ${
                    pin.length > i ? 'bg-amber-700' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleValidar()}
              className="w-full border-2 border-amber-200 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-[0.5em] focus:outline-none focus:border-amber-500 bg-amber-50"
              autoFocus
            />

            {error && (
              <p className="text-red-500 text-sm text-center mt-3 font-medium">{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleValidar}
                disabled={pin.length < 4 || loading}
                className="flex-1 py-3 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800 disabled:opacity-40 transition-colors"
              >
                {loading ? '...' : 'Entrar →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
