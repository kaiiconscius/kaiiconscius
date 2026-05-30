import { NextRequest, NextResponse } from 'next/server';

// PINs se configuran en .env.local — nunca en el repo
const PINS: Record<string, string> = {
  direccion:                   process.env.PILONCILLO_PIN_DIRECCION          || '',
  administracion:              process.env.PILONCILLO_PIN_ADMINISTRACION     || '',
  rrhh:                        process.env.PILONCILLO_PIN_RRHH               || '',
  gerencia_la_cruz:            process.env.PILONCILLO_PIN_LA_CRUZ            || '',
  gerencia_oaxaca_manana:      process.env.PILONCILLO_PIN_OAXACA_MANANA      || '',
  gerencia_oaxaca_vespertino:  process.env.PILONCILLO_PIN_OAXACA_VESPERTINO  || '',
  gerencia_ixtlan_del_rio:     process.env.PILONCILLO_PIN_IXTLAN_DEL_RIO     || '',
  gerencia_panaderia:          process.env.PILONCILLO_PIN_PANADERIA           || '',
};

export async function POST(req: NextRequest) {
  const { seccion, pin } = await req.json();
  const key = (seccion as string).replace(/-/g, '_');
  if (!(key in PINS)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!PINS[key]) {
    return NextResponse.json({ ok: false, error: 'PIN no configurado en servidor' }, { status: 500 });
  }
  return NextResponse.json({ ok: PINS[key] === pin });
}
