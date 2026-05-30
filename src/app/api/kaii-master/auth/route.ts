import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    const masterPin = process.env.KAII_MASTER_PIN || '';
    if (!masterPin) {
      return NextResponse.json({ ok: false, error: 'Panel no configurado' }, { status: 503 });
    }
    if (pin !== masterPin) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
