'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KaiiMasterPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('kaii_master_session')) {
      router.push('/kaii-master/dashboard');
    } else {
      setChecking(false);
    }
  }, [router]);

  async function submit(finalPin: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/kaii-master/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: finalPin }),
      });
      if (res.ok) {
        sessionStorage.setItem('kaii_master_session', '1');
        router.push('/kaii-master/dashboard');
      } else {
        setError('PIN incorrecto');
        setPin('');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  function handleKeypad(k: string) {
    if (loading) return;
    if (k === '⌫') {
      setPin(p => p.slice(0, -1));
      setError('');
      return;
    }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) setTimeout(() => submit(next), 80);
  }

  if (checking) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span className="text-slate-950 font-black text-xl">K</span>
          </div>
          <span className="text-white font-bold text-4xl tracking-tight">KAII</span>
        </div>
        <p className="text-slate-500 text-xs tracking-[4px] uppercase">Panel Maestro</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-xs bg-slate-900 rounded-3xl border border-slate-800 p-7 shadow-2xl shadow-black/40">
        <h2 className="text-slate-200 text-lg font-semibold text-center mb-1">Acceso Restringido</h2>
        <p className="text-slate-600 text-sm text-center mb-7">Solo directivos autorizados</p>

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-7">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                pin.length > i
                  ? 'bg-amber-400 scale-110 shadow-sm shadow-amber-400/40'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-5 text-center py-2 px-4 rounded-xl bg-red-950/40 border border-red-900/50">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
            k === '' ? <div key={i} /> :
            <button
              key={i}
              onClick={() => handleKeypad(k)}
              disabled={loading}
              className={`aspect-square rounded-2xl text-lg font-semibold transition-all active:scale-95 select-none ${
                k === '⌫'
                  ? 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
              } ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {k}
            </button>
          ))}
        </div>

        {loading && (
          <div className="mt-5 flex justify-center">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <p className="mt-8 text-slate-700 text-xs">KAII Platform · Kaii Consultores © {new Date().getFullYear()}</p>
    </div>
  );
}
