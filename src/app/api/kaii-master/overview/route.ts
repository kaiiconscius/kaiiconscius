import { NextResponse } from 'next/server';

interface Unidad {
  id: string;
  nombre: string;
}

interface Empresa {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  color: string;
  kvPrefix: string;
  email: string;
  activo: boolean;
  creadoEn: string;
  unidades: Unidad[];
}

interface EvalGerencia {
  scoreTotal: number;
  scoreDesempeno: number;
  scoreComportamiento: number;
  scoreIncidencias: number;
  periodo: string;
  desempeno: { ingresoReal: number; ingresoMeta: number };
}

interface Proveedor {
  id: string;
  nombre: string;
  estado: 'verde' | 'amarillo' | 'rojo';
}

const DEFAULT_EMPRESAS: Empresa[] = [
  {
    id: 'piloncillo',
    nombre: 'Piloncillo',
    tipo: 'restaurante',
    descripcion: 'Grupo restaurantero Piloncillo — Oaxaca y Nayarit',
    color: 'amber',
    kvPrefix: 'piloncillo',
    email: 'saul@kaiiconsultores.com',
    activo: true,
    creadoEn: '2024-01-01',
    unidades: [
      { id: 'la-cruz', nombre: 'La Cruz' },
      { id: 'oaxaca-manana', nombre: 'Oaxaca Mañana' },
      { id: 'oaxaca-vespertino', nombre: 'Oaxaca Vespertino' },
      { id: 'ixtlan-del-rio', nombre: 'Ixtlán del Río' },
      { id: 'panaderia', nombre: 'Panadería' },
    ],
  },
];

async function kvGet<T>(k: string): Promise<T[]> {
  try {
    const { kv } = await import('@vercel/kv');
    return (await kv.get<T[]>(k)) || [];
  } catch {
    return [];
  }
}

async function getEmpresaMetrics(empresa: Empresa) {
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const prevDate = new Date();
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevPeriod = prevDate.toISOString().slice(0, 7);

  const unitData = await Promise.all(
    empresa.unidades.map(async (u) => {
      const evals = await kvGet<EvalGerencia>(`${empresa.kvPrefix}:eval_gerencia:${u.id}`);
      const sorted = [...evals].sort((a, b) => b.periodo.localeCompare(a.periodo));
      return {
        unidad: u,
        current: sorted.find(e => e.periodo === currentPeriod) || sorted[0] || null,
        prev: sorted.find(e => e.periodo === prevPeriod) || null,
      };
    })
  );

  const withEvals = unitData.filter(u => u.current);
  const scores = withEvals.map(u => u.current!.scoreTotal);
  const scoreGlobal = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  const prevScores = withEvals.filter(u => u.prev).map(u => u.prev!.scoreTotal);
  const prevGlobal = prevScores.length > 0
    ? Math.round(prevScores.reduce((a, b) => a + b, 0) / prevScores.length)
    : null;
  const tendencia = scoreGlobal !== null && prevGlobal !== null ? scoreGlobal - prevGlobal : null;

  const ingresoReal = withEvals.reduce((sum, u) => sum + (u.current?.desempeno?.ingresoReal || 0), 0);
  const ingresoMeta = withEvals.reduce((sum, u) => sum + (u.current?.desempeno?.ingresoMeta || 0), 0);

  const alertasScore = withEvals.filter(u => (u.current?.scoreTotal ?? 100) < 70).length;
  const proveedores = await kvGet<Proveedor>(`${empresa.kvPrefix}:proveedores`);
  const alertasProveedores = proveedores.filter(p => p.estado === 'rojo').length;
  const totalAlertas = alertasScore + alertasProveedores;

  let estado: 'saludable' | 'atencion' | 'critico' = 'saludable';
  if (totalAlertas > 0 || (scoreGlobal !== null && scoreGlobal < 70)) estado = 'atencion';
  if (totalAlertas >= 3 || (scoreGlobal !== null && scoreGlobal < 55)) estado = 'critico';

  return {
    empresa,
    scoreGlobal,
    tendencia,
    ingresoReal,
    ingresoMeta,
    totalAlertas,
    alertasScore,
    alertasProveedores,
    estado,
    unidadesConDatos: withEvals.length,
    totalUnidades: empresa.unidades.length,
    periodo: currentPeriod,
  };
}

export async function GET() {
  let empresas: Empresa[] = DEFAULT_EMPRESAS;
  try {
    const { kv } = await import('@vercel/kv');
    const stored = await kv.get<Empresa[]>('kaii:empresas');
    if (stored && stored.length > 0) empresas = stored;
  } catch {
    // use defaults
  }

  const metrics = await Promise.all(empresas.filter(e => e.activo).map(getEmpresaMetrics));
  return NextResponse.json(metrics);
}
