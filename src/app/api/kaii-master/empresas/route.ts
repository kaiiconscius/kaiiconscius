import { NextRequest, NextResponse } from 'next/server';

export interface Empresa {
  id: string;
  nombre: string;
  tipo: 'restaurante' | 'cafeteria' | 'panaderia' | 'retail' | 'otro';
  descripcion: string;
  color: string;
  kvPrefix: string;
  email: string;
  telefono?: string;
  activo: boolean;
  creadoEn: string;
  unidades: { id: string; nombre: string }[];
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

const mem: Empresa[] = [];
const KV_KEY = 'kaii:empresas';

async function getEmpresas(): Promise<Empresa[]> {
  try {
    const { kv } = await import('@vercel/kv');
    const stored = await kv.get<Empresa[]>(KV_KEY);
    return stored && stored.length > 0 ? stored : DEFAULT_EMPRESAS;
  } catch {
    return mem.length > 0 ? mem : DEFAULT_EMPRESAS;
  }
}

async function setEmpresas(data: Empresa[]): Promise<void> {
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set(KV_KEY, data);
  } catch {
    mem.splice(0, mem.length, ...data);
  }
}

export async function GET() {
  const empresas = await getEmpresas();
  return NextResponse.json(empresas);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const empresas = await getEmpresas();
  const id = (body.nombre as string)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const nueva: Empresa = {
    nombre: body.nombre,
    tipo: body.tipo || 'otro',
    descripcion: body.descripcion || '',
    color: body.color || 'blue',
    kvPrefix: id,
    email: body.email || '',
    telefono: body.telefono,
    activo: true,
    creadoEn: new Date().toISOString().slice(0, 10),
    unidades: body.unidades || [],
    id,
  };
  await setEmpresas([...empresas, nueva]);
  return NextResponse.json(nueva, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const empresas = await getEmpresas();
  if (id === 'piloncillo') {
    return NextResponse.json({ ok: false, error: 'No se puede eliminar Piloncillo' }, { status: 400 });
  }
  await setEmpresas(empresas.filter(e => e.id !== id));
  return NextResponse.json({ ok: true });
}
