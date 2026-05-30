import { NextRequest, NextResponse } from 'next/server';

const PINS: Record<string, string> = {
  // Secciones principales
  direccion:      process.env.PILONCILLO_PIN_DIRECCION      || '1111',
  administracion: process.env.PILONCILLO_PIN_ADMINISTRACION || '3333',
  rrhh:           process.env.PILONCILLO_PIN_RRHH           || '4444',

  // Gerencias — cada unidad tiene su propio PIN
  gerencia_la_cruz:            process.env.PILONCILLO_PIN_LA_CRUZ           || '1001',
  gerencia_oaxaca_manana:      process.env.PILONCILLO_PIN_OAXACA_MANANA     || '1002',
  gerencia_oaxaca_vespertino:  process.env.PILONCILLO_PIN_OAXACA_VESPERTINO || '1003',
  gerencia_matriz_cafe:        process.env.PILONCILLO_PIN_MATRIZ_CAFE       || '1004',
  gerencia_panaderia:          process.env.PILONCILLO_PIN_PANADERIA         || '1005',
};

export async function POST(req: NextRequest) {
  const { seccion, pin } = await req.json();
  // Normalize hyphens → underscores (gerencia_la-cruz → gerencia_la_cruz)
  const key = (seccion as string).replace(/-/g, '_');
  if (!PINS[key]) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  return NextResponse.json({ ok: PINS[key] === pin });
}
