import { NextRequest, NextResponse } from 'next/server';

interface Colaborador {
  id: string;
  nombre: string;
  puesto: string;
  sucursal: string;
  seccion: string;
  activo: boolean;
  createdAt: string;
}

// In-memory fallback when KV is not configured
const mem: Record<string, Colaborador[]> = {};

async function kvGet(key: string): Promise<Colaborador[]> {
  try {
    const { kv } = await import('@vercel/kv');
    return (await kv.get<Colaborador[]>(key)) || [];
  } catch {
    return mem[key] || [];
  }
}

async function kvSet(key: string, data: Colaborador[]): Promise<void> {
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set(key, data);
  } catch {
    mem[key] = data;
  }
}

function key(seccion: string) {
  return `piloncillo:colaboradores:${seccion}`;
}

export async function GET(req: NextRequest) {
  const seccion = req.nextUrl.searchParams.get('seccion') || '';
  const data = await kvGet(key(seccion));
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const k = key(body.seccion);
  const data = await kvGet(k);
  const nuevo: Colaborador = {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    nombre: body.nombre,
    puesto: body.puesto,
    sucursal: body.sucursal,
    seccion: body.seccion,
    activo: body.activo ?? true,
    createdAt: new Date().toISOString(),
  };
  data.push(nuevo);
  await kvSet(k, data);
  return NextResponse.json({ ok: true, data: nuevo });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const k = key(body.seccion);
  const data = await kvGet(k);
  const idx = data.findIndex(c => c.id === body.id);
  if (idx === -1) return NextResponse.json({ ok: false }, { status: 404 });
  data[idx] = { ...data[idx], ...body };
  await kvSet(k, data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || '';
  const seccion = req.nextUrl.searchParams.get('seccion') || '';
  const k = key(seccion);
  const data = await kvGet(k);
  await kvSet(k, data.filter(c => c.id !== id));
  return NextResponse.json({ ok: true });
}
