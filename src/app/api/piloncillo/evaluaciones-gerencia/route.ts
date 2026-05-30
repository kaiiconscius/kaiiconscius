import { NextRequest, NextResponse } from 'next/server';

interface EvalGerencia {
  id: string;
  unidad: string;
  periodo: string;
  desempeno: {
    productividad: number;
    ingresoReal: number;
    metaMensual: number;
    eficienciaOperativa: number;
    controlInsumos: number;
  };
  comportamiento: {
    comunicacion: number;
    seguimiento: number;
    gestionProyectos: number;
  };
  incidencias: {
    faltasInjustificadas: number;
    retardosSinAvisar: number;
    vacacionesSinComunicar: number;
    descansosSinComunicar: number;
  };
  notas: string;
  evaluadoPor: string;
  score: number;
  desempeno_score: number;
  comportamiento_score: number;
  incidencias_score: number;
  createdAt: string;
}

const mem: Record<string, EvalGerencia[]> = {};

async function kvGet(k: string): Promise<EvalGerencia[]> {
  try {
    const { kv } = await import('@vercel/kv');
    return (await kv.get<EvalGerencia[]>(k)) || [];
  } catch {
    return mem[k] || [];
  }
}

async function kvSet(k: string, data: EvalGerencia[]): Promise<void> {
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set(k, data);
  } catch {
    mem[k] = data;
  }
}

export async function GET(req: NextRequest) {
  const unidad  = req.nextUrl.searchParams.get('unidad')  || '';
  const periodo = req.nextUrl.searchParams.get('periodo') || '';
  const k = `piloncillo:eval_gerencia:${unidad}`;
  const data = await kvGet(k);

  if (periodo) {
    // Return latest eval for that period (for overview)
    const inPeriod = data.filter(e => e.periodo === periodo);
    const latest = inPeriod.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
    return NextResponse.json({ latest });
  }

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const k = `piloncillo:eval_gerencia:${body.unidad}`;
  const data = await kvGet(k);
  const nueva: EvalGerencia = {
    id:                   `eg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    unidad:               body.unidad,
    periodo:              body.periodo,
    desempeno:            body.desempeno,
    comportamiento:       body.comportamiento,
    incidencias:          body.incidencias,
    notas:                body.notas        || '',
    evaluadoPor:          body.evaluadoPor  || '',
    score:                body.score,
    desempeno_score:      body.desempeno_score,
    comportamiento_score: body.comportamiento_score,
    incidencias_score:    body.incidencias_score,
    createdAt:            new Date().toISOString(),
  };
  data.push(nueva);
  await kvSet(k, data);
  return NextResponse.json({ ok: true, data: nueva });
}
