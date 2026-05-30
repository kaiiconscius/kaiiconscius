import { NextRequest, NextResponse } from 'next/server';

interface Ingrediente {
  nombre: string;
  cantidad: number;
  unidad: string;
  costoUnitario: number;
}
interface Receta {
  id: string;
  nombre: string;
  categoria: string;
  rendimiento: number;
  precioVenta: number;
  ingredientes: Ingrediente[];
  notas: string;
  createdAt: string;
}

const KEY = 'piloncillo:recetas';
let mem: Receta[] = [];

async function kvGet(): Promise<Receta[]> {
  try {
    const { kv } = await import('@vercel/kv');
    return (await kv.get<Receta[]>(KEY)) || [];
  } catch {
    return mem;
  }
}
async function kvSet(data: Receta[]): Promise<void> {
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set(KEY, data);
  } catch {
    mem = data;
  }
}

export async function GET() {
  const data = await kvGet();
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = await kvGet();
  const nueva: Receta = {
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nombre: body.nombre,
    categoria: body.categoria || 'Otros',
    rendimiento: body.rendimiento || 1,
    precioVenta: body.precioVenta || 0,
    ingredientes: body.ingredientes || [],
    notas: body.notas || '',
    createdAt: new Date().toISOString(),
  };
  data.push(nueva);
  await kvSet(data);
  return NextResponse.json({ ok: true, data: nueva });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const data = await kvGet();
  const idx = data.findIndex(r => r.id === body.id);
  if (idx === -1) return NextResponse.json({ ok: false }, { status: 404 });
  data[idx] = { ...data[idx], ...body };
  await kvSet(data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || '';
  const data = await kvGet();
  await kvSet(data.filter(r => r.id !== id));
  return NextResponse.json({ ok: true });
}
