import { NextRequest, NextResponse } from 'next/server';

interface ChecklistEntry {
  fecha: string;
  apertura: boolean[];
  cierre: boolean[];
  apertPct: number;
  cierrePct: number;
  savedAt: string;
}

const mem: Record<string, ChecklistEntry[]> = {};

async function kvGet(k: string): Promise<ChecklistEntry[]> {
  try {
    const { kv } = await import('@vercel/kv');
    return (await kv.get<ChecklistEntry[]>(k)) || [];
  } catch {
    return mem[k] || [];
  }
}

async function kvSet(k: string, data: ChecklistEntry[]): Promise<void> {
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set(k, data);
  } catch {
    mem[k] = data;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const unidad = searchParams.get('unidad');
  const fecha = searchParams.get('fecha') || new Date().toISOString().slice(0, 10);
  if (!unidad) return NextResponse.json({ error: 'unidad requerida' }, { status: 400 });

  const entries = await kvGet(`piloncillo:checklists:${unidad}`);
  const today = entries.find(e => e.fecha === fecha);
  const historial = [...entries]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 30);

  return NextResponse.json({
    apertura: today?.apertura || null,
    cierre: today?.cierre || null,
    apertPct: today?.apertPct ?? 0,
    cierrePct: today?.cierrePct ?? 0,
    historial,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { unidad, fecha, apertura, cierre, apertPct, cierrePct } = body;
  if (!unidad || !fecha) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

  const entries = await kvGet(`piloncillo:checklists:${unidad}`);
  const idx = entries.findIndex(e => e.fecha === fecha);
  const entry: ChecklistEntry = { fecha, apertura, cierre, apertPct, cierrePct, savedAt: new Date().toISOString() };

  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);

  // Keep last 90 days
  const pruned = [...entries]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 90);

  await kvSet(`piloncillo:checklists:${unidad}`, pruned);
  return NextResponse.json(entry);
}
