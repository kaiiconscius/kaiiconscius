import { NextRequest, NextResponse } from 'next/server';

// Resumen ejecutivo semanal generado por Claude para Dirección.
// Usa la misma ANTHROPIC_API_KEY ya configurada para el SIK de costeo.

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 });
  }

  const { periodo, unidades, proveedores } = await req.json();

  const datosUnidades = (unidades || [])
    .map((u: Record<string, unknown>) => {
      if (u.score == null) return `• ${u.nombre}: sin evaluación este período`;
      const metaPct = u.metaMensual && Number(u.metaMensual) > 0
        ? Math.round((Number(u.ingresoReal) / Number(u.metaMensual)) * 100) : null;
      return `• ${u.nombre}: score ${u.score}/100 (desempeño ${u.desempeno_score}, comportamiento ${u.comportamiento_score}, asistencia ${u.incidencias_score})` +
        (metaPct != null ? ` · meta ingresos ${metaPct}% (${u.ingresoReal} de ${u.metaMensual})` : '');
    })
    .join('\n');

  const datosProveedores = (proveedores || [])
    .map((p: Record<string, unknown>) => `• ${p.nombre} (${p.categoria || 's/categoría'}): ${p.estado}`)
    .join('\n') || 'Sin proveedores registrados';

  const prompt = `Eres el consultor estratégico de KAII para el grupo restaurantero Piloncillo. Genera un RESUMEN EJECUTIVO SEMANAL para la Dirección, claro y accionable, en español de México.

PERÍODO: ${periodo}

DESEMPEÑO POR UNIDAD:
${datosUnidades}

ESTADO DE PROVEEDORES (semáforo):
${datosProveedores}

Estructura tu respuesta exactamente con estas secciones (usa estos títulos):

📊 EFICIENCIA OPERACIONAL
(2-3 líneas: qué unidades operan mejor y cuáles requieren foco)

📉 MERMAS Y CONTROL DE INSUMOS
(2-3 líneas sobre control de insumos / food cost según los scores)

💼 ADMINISTRACIÓN Y CONTABILIDAD
(2-3 líneas sobre cumplimiento de metas de ingresos y salud financiera)

🚚 PROVEEDORES EN FOCO
(menciona los que están en amarillo/rojo y qué acción tomar)

✅ 3 ACCIONES PRIORITARIAS DE LA SEMANA
(lista numerada, concreta y ejecutable)

Sé directo, profesional y orientado a decisiones. Máximo 350 palabras.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: `Error de IA: ${txt.slice(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();
    const resumen = data?.content?.[0]?.text || 'Sin respuesta de la IA.';
    return NextResponse.json({ resumen });
  } catch (e) {
    return NextResponse.json({ error: `Error: ${e instanceof Error ? e.message : 'desconocido'}` }, { status: 500 });
  }
}
