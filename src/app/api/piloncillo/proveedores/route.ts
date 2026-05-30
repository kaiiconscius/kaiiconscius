import { NextRequest, NextResponse } from 'next/server';

interface Proveedor {
  id: string;
  nombre: string;
  categoria: string;
  estado: 'verde' | 'amarillo' | 'rojo';
  nota: string;
  createdAt: string;
}

const KEY = 'piloncillo:proveedores';
let mem: Proveedor[] = [];

async function kvGet(): Promise<Proveedor[]> {
  try {
    const { kv } = await import('@vercel/kv');
    return (await kv.get<Proveedor[]>(KEY)) || [];
  } catch {
    return mem;
  }
}

async function kvSet(data: Proveedor[]): Promise<void> {
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
  const nuevo: Proveedor = {
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nombre: body.nombre,
    categoria: body.categoria || '',
    estado: body.estado || 'verde',
    nota: body.nota || '',
    createdAt: new Date().toISOString(),
  };
  data.push(nuevo);
  await kvSet(data);
  return NextResponse.json({ ok: true, data: nuevo });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || '';
  const data = await kvGet();
  await kvSet(data.filter(p => p.id !== id));
  return NextResponse.json({ ok: true });
}
