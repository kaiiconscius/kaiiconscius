import { NextRequest, NextResponse } from 'next/server';

const PILONCILLO_UNITS = [
  { id: 'la-cruz', nombre: 'La Cruz' },
  { id: 'oaxaca-manana', nombre: 'Oaxaca Mañana' },
  { id: 'oaxaca-vespertino', nombre: 'Oaxaca Vespertino' },
  { id: 'ixtlan-del-rio', nombre: 'Ixtlán del Río' },
  { id: 'panaderia', nombre: 'Panadería' },
];

async function kvGet<T>(k: string): Promise<T[]> {
  try {
    const { kv } = await import('@vercel/kv');
    return (await kv.get<T[]>(k)) || [];
  } catch {
    return [];
  }
}

async function generateSummary(dataStr: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return 'Resumen no disponible (ANTHROPIC_API_KEY no configurada).';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Eres el asistente ejecutivo de Piloncillo (grupo restaurantero). Genera un resumen ejecutivo semanal en español, conciso y accionable (máx 400 palabras), con base en estos datos:\n\n${dataStr}\n\nEstructura exacta:\n1. PANORAMA GENERAL (2 líneas con score global y tendencia)\n2. UNIDADES DESTACADAS (la mejor y la que necesita más atención)\n3. ALERTAS CRÍTICAS (solo si las hay, si no omite esta sección)\n4. 3 ACCIONES PRIORITARIAS ESTA SEMANA (numeradas, concretas y específicas)`,
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[cron] Claude API error:', err);
    return `Error al generar resumen (${res.status}).`;
  }
  const json = await res.json();
  return (json.content?.[0]?.text as string) || 'Sin resumen disponible.';
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[cron] RESEND_API_KEY no configurada — email omitido');
    return false;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'KAII <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[cron] Resend error:', err);
  }
  return res.ok;
}

export async function GET(req: NextRequest) {
  // Vercel sets CRON_SECRET automatically; also allow manual calls with the same secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const currentPeriod = new Date().toISOString().slice(0, 7);
  const reportDate = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Gather Piloncillo data
  const unitData = await Promise.all(
    PILONCILLO_UNITS.map(async (u) => {
      const evals = await kvGet<any>(`piloncillo:eval_gerencia:${u.id}`);
      const sorted = [...evals].sort((a: any, b: any) => b.periodo.localeCompare(a.periodo));
      return { ...u, eval: sorted[0] || null };
    })
  );

  const proveedores = await kvGet<any>('piloncillo:proveedores');
  const withData = unitData.filter(u => u.eval);
  const scores = withData.map(u => u.eval.scoreTotal as number);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const ingresoReal = withData.reduce((sum, u) => sum + (u.eval?.desempeno?.ingresoReal || 0), 0);
  const ingresoMeta = withData.reduce((sum, u) => sum + (u.eval?.desempeno?.ingresoMeta || 0), 0);
  const pctMeta = ingresoMeta > 0 ? Math.round((ingresoReal / ingresoMeta) * 100) : 0;

  const dataStr = `
PERÍODO: ${currentPeriod} | FECHA: ${reportDate}
SCORE GLOBAL: ${avgScore}/100
INGRESOS: $${ingresoReal.toLocaleString('es-MX')} de $${ingresoMeta.toLocaleString('es-MX')} meta (${pctMeta}%)

UNIDADES (${withData.length}/${PILONCILLO_UNITS.length} con datos):
${withData.map(u => `  • ${u.nombre}: Score ${u.eval.scoreTotal}/100 | Ingresos $${(u.eval.desempeno?.ingresoReal || 0).toLocaleString('es-MX')}`).join('\n')}

PROVEEDORES:
${proveedores.length > 0 ? proveedores.map((p: any) => `  • ${p.nombre}: ${p.estado.toUpperCase()}`).join('\n') : '  Sin proveedores registrados'}

ALERTAS:
${withData.filter(u => u.eval.scoreTotal < 70).map(u => `  ⚠ ${u.nombre}: score ${u.eval.scoreTotal}/100`).join('\n') || '  Ninguna por score'}
${proveedores.filter((p: any) => p.estado === 'rojo').map((p: any) => `  🔴 Proveedor crítico: ${p.nombre}`).join('\n')}
`.trim();

  const summary = await generateSummary(dataStr);

  // Build HTML email
  const scoreColor = avgScore >= 80 ? '#16a34a' : avgScore >= 60 ? '#d97706' : '#dc2626';
  const metaColor = pctMeta >= 90 ? '#16a34a' : pctMeta >= 70 ? '#d97706' : '#dc2626';

  const unitsRows = withData
    .sort((a, b) => b.eval.scoreTotal - a.eval.scoreTotal)
    .map(u => {
      const s = u.eval.scoreTotal;
      const sc = s >= 80 ? '#dcfce7' : s >= 60 ? '#fef9c3' : '#fee2e2';
      const st = s >= 80 ? '#15803d' : s >= 60 ? '#854d0e' : '#b91c1c';
      const ing = (u.eval.desempeno?.ingresoReal || 0).toLocaleString('es-MX');
      return `<tr style="border-bottom:1px solid #f5f5f4">
        <td style="padding:10px 12px;color:#1c1917">${u.nombre}</td>
        <td style="padding:10px 12px;text-align:center">
          <span style="background:${sc};color:${st};padding:2px 10px;border-radius:999px;font-weight:600;font-size:13px">${s}</span>
        </td>
        <td style="padding:10px 12px;text-align:right;color:#44403c">$${ing}</td>
      </tr>`;
    }).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f4;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

  <div style="background:linear-gradient(135deg,#1c1917,#451a03,#1c1917);padding:32px 24px;text-align:center">
    <p style="color:#d97706;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px">KAII · Sistema de Gestión</p>
    <h1 style="color:white;font-size:22px;margin:0 0 4px">Resumen Semanal — Piloncillo</h1>
    <p style="color:#d6d3d1;font-size:13px;margin:0;text-transform:capitalize">${reportDate}</p>
  </div>

  <div style="display:flex;background:#fafaf9;border-bottom:1px solid #e7e5e4;padding:20px 24px;gap:0">
    <div style="text-align:center;flex:1">
      <p style="font-size:32px;font-weight:700;color:${scoreColor};margin:0">${avgScore}</p>
      <p style="font-size:11px;color:#78716c;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Score global</p>
    </div>
    <div style="text-align:center;flex:1;border-left:1px solid #e7e5e4;padding-left:20px">
      <p style="font-size:26px;font-weight:700;color:#1c1917;margin:0">$${Math.round(ingresoReal / 1000)}k</p>
      <p style="font-size:11px;color:#78716c;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Ingresos ${currentPeriod}</p>
    </div>
    <div style="text-align:center;flex:1;border-left:1px solid #e7e5e4;padding-left:20px">
      <p style="font-size:32px;font-weight:700;color:${metaColor};margin:0">${pctMeta}%</p>
      <p style="font-size:11px;color:#78716c;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">% de meta</p>
    </div>
  </div>

  <div style="padding:24px">
    <h2 style="font-size:11px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px">Análisis Ejecutivo IA</h2>
    <div style="background:#fafaf9;border-left:3px solid #d97706;border-radius:4px;padding:16px;font-size:14px;line-height:1.75;color:#292524;white-space:pre-wrap">${summary}</div>
  </div>

  <div style="padding:0 24px 24px">
    <h2 style="font-size:11px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px">Estado por Unidad</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#f5f5f4">
          <th style="text-align:left;padding:8px 12px;color:#78716c;font-weight:500">Unidad</th>
          <th style="text-align:center;padding:8px 12px;color:#78716c;font-weight:500">Score</th>
          <th style="text-align:right;padding:8px 12px;color:#78716c;font-weight:500">Ingresos</th>
        </tr>
      </thead>
      <tbody>${unitsRows}</tbody>
    </table>
  </div>

  ${proveedores.filter((p: any) => p.estado === 'rojo').length > 0 ? `
  <div style="padding:0 24px 24px">
    <h2 style="font-size:11px;font-weight:600;color:#dc2626;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px">⚠ Proveedores Críticos</h2>
    ${proveedores.filter((p: any) => p.estado === 'rojo').map((p: any) =>
      `<div style="background:#fee2e2;border-left:3px solid #dc2626;padding:10px 14px;border-radius:4px;margin-bottom:6px;font-size:13px;color:#b91c1c">🔴 ${p.nombre}</div>`
    ).join('')}
  </div>` : ''}

  <div style="background:#fafaf9;border-top:1px solid #e7e5e4;padding:16px 24px;text-align:center">
    <p style="font-size:12px;color:#a8a29e;margin:0">Generado automáticamente por <strong>KAII</strong> · Confidencial</p>
    <p style="font-size:11px;color:#d6d3d1;margin:4px 0 0">Piloncillo · Sistema de Gestión de Unidades</p>
  </div>
</div>
</body>
</html>`;

  const reportEmail = process.env.REPORT_EMAIL || 'saul@kaiiconsultores.com';
  const emailSent = await sendEmail(
    reportEmail,
    `📊 Resumen Semanal Piloncillo — ${reportDate}`,
    html
  );

  return NextResponse.json({
    ok: true,
    periodo: currentPeriod,
    reportDate,
    avgScore,
    ingresoReal,
    pctMeta,
    unidadesConDatos: withData.length,
    summaryLength: summary.length,
    emailSent,
    emailTo: reportEmail,
  });
}
