import { NextRequest, NextResponse } from 'next/server';

interface VentaDia {
  fecha: string;      // YYYY-MM-DD
  monto: number;
  turno: 'completo' | 'manana' | 'tarde' | 'noche';
  notas: string;
  savedAt: string;
}

const mem: Record<string, VentaDia[]> = {};

async function kvGet(k: string): Promise<VentaDia[]> {
  try { const { kv } = await import('@vercel/kv'); return (await kv.get<VentaDia[]>(k)) || []; }
  catch { return mem[k] || []; }
}
async function kvSet(k: string, d: VentaDia[]): Promise<void> {
  try { const { kv } = await import('@vercel/kv'); await kv.set(k, d); }
  catch { mem[k] = d; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const unidad = searchParams.get('unidad');
  const periodo = searchParams.get('periodo'); // YYYY-MM, returns that month's entries
  if (!unidad) return NextResponse.json({ error: 'unidad requerida' }, { status: 400 });

  const all = await kvGet(`piloncillo:ventas:${unidad}`);

  if (periodo) {
    const filtered = all.filter(v => v.fecha.startsWith(periodo));
    const total = filtered.reduce((s, v) => s + v.monto, 0);
    return NextResponse.json({ data: filtered, total, count: filtered.length });
  }

  // Default: last 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recent = all
    .filter(v => v.fecha >= cutoff.toISOString().slice(0, 10))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const total = recent.reduce((s, v) => s + v.monto, 0);
  return NextResponse.json({ data: recent, total, count: recent.length });
}

export async function POST(req: NextRequest) {
  const { unidad, fecha, monto, turno, notas } = await req.json();
  if (!unidad || !fecha || monto == null) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

  const all = await kvGet(`piloncillo:ventas:${unidad}`);
  // Replace if same fecha+turno exists
  const key = `${fecha}-${turno || 'completo'}`;
  const entry: VentaDia = { fecha, monto: Number(monto), turno: turno || 'completo', notas: notas || '', savedAt: new Date().toISOString() };
  const filtered = all.filter(v => `${v.fecha}-${v.turno}` !== key);
  filtered.push(entry);
  // Keep last 90 days
  const pruned = filtered.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 270);
  await kvSet(`piloncillo:ventas:${unidad}`, pruned);
  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const unidad = searchParams.get('unidad');
  const fecha = searchParams.get('fecha');
  const turno = searchParams.get('turno') || 'completo';
  if (!unidad || !fecha) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

  const all = await kvGet(`piloncillo:ventas:${unidad}`);
  await kvSet(`piloncillo:ventas:${unidad}`, all.filter(v => !(v.fecha === fecha && v.turno === turno)));
  return NextResponse.json({ ok: true });
}
