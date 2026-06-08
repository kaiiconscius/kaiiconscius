import { NextRequest, NextResponse } from 'next/server';

export interface BitacoraEntry {
  id: string;
  timestamp: string;
  usuarioId: string;
  usuarioNombre: string;
  rol: string;
  accion: string;
  detalle: string;
  seccion?: string;
  unidad?: string;
}

const mem: { data: BitacoraEntry[] } = { data: [] };
const KEY = 'piloncillo:bitacora';
const MAX_ENTRIES = 500;

async function kvGet(): Promise<BitacoraEntry[]> {
  try { const { kv } = await import('@vercel/kv'); return (await kv.get<BitacoraEntry[]>(KEY)) || []; }
  catch { return mem.data; }
}
async function kvSet(d: BitacoraEntry[]): Promise<void> {
  try { const { kv } = await import('@vercel/kv'); await kv.set(KEY, d); }
  catch { mem.data = d; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const seccion = searchParams.get('seccion');
  const unidad = searchParams.get('unidad');
  const usuarioId = searchParams.get('usuarioId');
  const limit = Math.min(Number(searchParams.get('limit')) || 50, MAX_ENTRIES);

  let data = await kvGet();
  if (seccion) data = data.filter(e => e.seccion === seccion);
  if (unidad) data = data.filter(e => e.unidad === unidad);
  if (usuarioId) data = data.filter(e => e.usuarioId === usuarioId);

  const ordered = [...data].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  return NextResponse.json({ data: ordered, total: data.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { usuarioId, usuarioNombre, rol, accion, detalle, seccion, unidad } = body;
  if (!usuarioNombre || !accion) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

  const all = await kvGet();
  const entry: BitacoraEntry = {
    id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    usuarioId: usuarioId || 'anonimo',
    usuarioNombre,
    rol: rol || '',
    accion,
    detalle: detalle || '',
    seccion,
    unidad,
  };
  all.push(entry);
  const pruned = [...all].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, MAX_ENTRIES);
  await kvSet(pruned);
  return NextResponse.json(entry, { status: 201 });
}
