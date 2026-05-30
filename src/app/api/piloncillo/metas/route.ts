import { NextRequest, NextResponse } from 'next/server';

interface MetasPeriodo {
  periodo: string;
  unidades: Record<string, number>;
  actualizadoEn: string;
}

const mem: Record<string, MetasPeriodo> = {};

async function kvGet(k: string): Promise<MetasPeriodo | null> {
  try {
    const { kv } = await import('@vercel/kv');
    return await kv.get<MetasPeriodo>(k);
  } catch {
    return mem[k] || null;
  }
}

async function kvSet(k: string, data: MetasPeriodo): Promise<void> {
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set(k, data);
  } catch {
    mem[k] = data;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const periodo = searchParams.get('periodo') || new Date().toISOString().slice(0, 7);
  const unidad = searchParams.get('unidad');

  const data = await kvGet(`piloncillo:metas:${periodo}`);

  if (unidad) {
    return NextResponse.json({ meta: data?.unidades[unidad] ?? null });
  }

  return NextResponse.json(data || { periodo, unidades: {}, actualizadoEn: null });
}

export async function POST(req: NextRequest) {
  const { periodo, unidades } = await req.json();
  if (!periodo || !unidades) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }
  const data: MetasPeriodo = { periodo, unidades, actualizadoEn: new Date().toISOString() };
  await kvSet(`piloncillo:metas:${periodo}`, data);
  return NextResponse.json(data);
}
