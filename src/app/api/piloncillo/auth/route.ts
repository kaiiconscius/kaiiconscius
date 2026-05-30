import { NextRequest, NextResponse } from 'next/server';

const PINS: Record<string, string> = {
  direccion:      process.env.PILONCILLO_PIN_DIRECCION      || '1111',
  gerencia:       process.env.PILONCILLO_PIN_GERENCIA       || '2222',
  administracion: process.env.PILONCILLO_PIN_ADMINISTRACION || '3333',
  rrhh:           process.env.PILONCILLO_PIN_RRHH           || '4444',
};

export async function POST(req: NextRequest) {
  const { seccion, pin } = await req.json();
  if (!PINS[seccion]) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  return NextResponse.json({ ok: PINS[seccion] === pin });
}
