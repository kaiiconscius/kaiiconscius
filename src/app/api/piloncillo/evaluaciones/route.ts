import { NextRequest, NextResponse } from 'next/server';

interface Evaluacion {
  id: string;
  colaboradorId: string;
  colaboradorNombre: string;
  seccion: string;
  periodo: string;
  desempeno: number;
  comportamiento: number;
  incidencias: number;
  notas: string;
  evaluadoPor: string;
  score: number;
  createdAt: string;
}

const mem: Record<string, Evaluacion[]> = {};

async function kvGet(k: string): Promise<Evaluacion[]> {
  try {
    const { kv } = await import('@vercel/kv');
    return (await kv.get<Evaluacion[]>(k)) || [];
  } catch {
    return mem[k] || [];
  }
}

async function kvSet(k: string, data: Evaluacion[]): Promise<void> {
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set(k, data);
  } catch {
    mem[k] = data;
  }
}

function key(seccion: string) {
  return `piloncillo:evaluaciones:${seccion}`;
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
  const nueva: Evaluacion = {
    id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    colaboradorId: body.colaboradorId,
    colaboradorNombre: body.colaboradorNombre,
    seccion: body.seccion,
    periodo: body.periodo,
    desempeno: body.desempeno,
    comportamiento: body.comportamiento,
    incidencias: body.incidencias,
    notas: body.notas || '',
    evaluadoPor: body.evaluadoPor || '',
    score: body.score,
    createdAt: new Date().toISOString(),
  };
  data.push(nueva);
  await kvSet(k, data);
  return NextResponse.json({ ok: true, data: nueva });
}
