import { NextRequest, NextResponse } from 'next/server';

export interface Usuario {
  id: string;
  nombre: string;
  rol: 'direccion' | 'gerencia' | 'administracion' | 'rrhh';
  unidades: string[];
  activo: boolean;
  creadoEn: string;
}

const mem: { data: Usuario[] } = { data: [] };
const KEY = 'piloncillo:usuarios';

async function kvGet(): Promise<Usuario[]> {
  try { const { kv } = await import('@vercel/kv'); return (await kv.get<Usuario[]>(KEY)) || []; }
  catch { return mem.data; }
}
async function kvSet(d: Usuario[]): Promise<void> {
  try { const { kv } = await import('@vercel/kv'); await kv.set(KEY, d); }
  catch { mem.data = d; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rol = searchParams.get('rol');
  const unidad = searchParams.get('unidad');

  let data = await kvGet();
  if (rol) data = data.filter(u => u.rol === rol);
  if (unidad) data = data.filter(u => u.unidades.includes(unidad));

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { nombre, rol, unidades } = await req.json();
  if (!nombre || !rol) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

  const all = await kvGet();
  const usuario: Usuario = {
    id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    nombre,
    rol,
    unidades: Array.isArray(unidades) ? unidades : [],
    activo: true,
    creadoEn: new Date().toISOString(),
  };
  all.push(usuario);
  await kvSet(all);
  return NextResponse.json(usuario, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, activo, nombre, unidades } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const all = await kvGet();
  const idx = all.findIndex(u => u.id === id);
  if (idx < 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  if (activo !== undefined) all[idx].activo = !!activo;
  if (nombre !== undefined) all[idx].nombre = nombre;
  if (unidades !== undefined) all[idx].unidades = Array.isArray(unidades) ? unidades : all[idx].unidades;

  await kvSet(all);
  return NextResponse.json(all[idx]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const all = await kvGet();
  await kvSet(all.filter(u => u.id !== id));
  return NextResponse.json({ ok: true });
}
