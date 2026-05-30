# Coordinación Claude + Codex — Piloncillo Dashboard

> Documento vivo para mantener sincronizado el trabajo entre **Claude** (sesión web, push a repo de referencia) y **Codex** (sesión Mac, push a KAII-MVP). Léelo antes de tocar archivos de piloncillo.

## Repos

- **Referencia (Claude):** `kaiiconscius/kaiiconscius` rama `claude/kaii-iphone-app-download-OKgra`
- **Producción (Codex):** `kaiiconscius/KAII-MVP` rama `main`

Claude empuja archivos al repo de referencia. Codex los copia a KAII-MVP, corre `npm run lint` y hace commit/push.

## División de responsabilidades

| Área | Dueño | Estado |
|------|-------|--------|
| Landing `/piloncillo-dashboard` | Claude | ✅ Listo |
| Vista General `/overview` | Claude | ✅ Listo |
| Gerencias `/gerencia` + `/gerencia/[unidad]` | Claude | ✅ Listo |
| Dirección `/direccion` | Claude | ✅ Listo (NO reemplazar) |
| Administración `/administracion` | **Codex** | 🔨 En construcción |
| RRHH `/rrhh` | **Codex** | 🔨 En construcción |
| Operativo / Recetas `/operativo` | Claude | 🔨 En construcción |
| API `auth` | Claude | ✅ Listo |
| API `evaluaciones-gerencia` | Claude | ✅ Listo |
| API `proveedores` | Claude | ✅ Listo |
| API `resumen-direccion` (IA) | Claude | ✅ Listo |
| API `recetas` | Claude | 🔨 En construcción |

**Regla de oro:** si un archivo tiene dueño, el otro NO lo reemplaza. Si necesitas cambiarlo, anótalo aquí primero.

## Convenciones visuales (lenguaje KAII Piloncillo)

- Fondo de página: `bg-stone-50`
- Header: `bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900 text-white`
- Cards: `bg-white rounded-2xl shadow-sm border border-stone-100`
- Tabs pegajosos: `sticky top-0 z-10`, activo `border-amber-500 text-amber-700`
- Acción primaria: `bg-amber-600 hover:bg-amber-700`
- Semáforo: verde `emerald`, amarillo `amber`, rojo `red`
- Modales: `bg-black/60 backdrop-blur-sm`, contenedor `rounded-3xl`
- Botón volver: flecha `←` arriba a la izquierda → `router.push('/piloncillo-dashboard')`
- Móvil primero: `max-w-lg mx-auto`

## Mapa de rutas

```
/piloncillo-dashboard                      Landing (Vista General + 4 secciones)
/piloncillo-dashboard/overview             Métricas todas las unidades (sin PIN, solo lectura)
/piloncillo-dashboard/direccion            Panel estratégico + IA + proveedores
/piloncillo-dashboard/administracion       [Codex]
/piloncillo-dashboard/rrhh                 [Codex]
/piloncillo-dashboard/gerencia             Hub de unidades (selección + PIN)
/piloncillo-dashboard/gerencia/[unidad]    Evaluación + historial por unidad
/piloncillo-dashboard/operativo            Recetas y costeo [Claude, en construcción]
```

## Autenticación (PINs)

Todos los PINs viven en `.env.local` (NUNCA en el repo). El endpoint `/api/piloncillo/auth` recibe `{ seccion, pin }`, normaliza guiones→guion bajo, y compara contra `process.env.PILONCILLO_PIN_*`.

Claves de sección esperadas:
```
direccion, administracion, rrhh
gerencia_la_cruz, gerencia_oaxaca_manana, gerencia_oaxaca_vespertino,
gerencia_ixtlan_del_rio, gerencia_panaderia
```

En el cliente, tras validar, se guarda `sessionStorage.setItem('pillo_<seccion>', '1')` y cada página protegida lo verifica al montar.

## Contrato de almacenamiento (Vercel KV con fallback en memoria)

Patrón usado en todas las APIs:
```ts
async function kvGet(k){ try{ const {kv}=await import('@vercel/kv'); return (await kv.get(k))||[] }catch{ return mem[k]||[] } }
async function kvSet(k,d){ try{ const {kv}=await import('@vercel/kv'); await kv.set(k,d) }catch{ mem[k]=d } }
```
Keys:
- `piloncillo:eval_gerencia:<unidad>`
- `piloncillo:proveedores`
- `piloncillo:recetas`
- `piloncillo:colaboradores:<seccion>` / `piloncillo:evaluaciones:<seccion>`

## Fórmula de evaluación de gerencias

- **Desempeño 50%** = promedio(productividad, %meta ingresos, eficiencia operativa, control insumos) × 0.5
- **Comportamiento 30%** = promedio(comunicación, seguimiento, gestión proyectos) × 0.3
- **Incidencias hasta −20** = 20 − (faltas×4 + retardos×2 + vacaciones×4 + descansos×2), mínimo 0
- **Score** = redondeo(desempeño + comportamiento + incidencias)

## Próximos pasos (backlog priorizado)

1. [Codex] Administración: tablero financiero por unidad, caja/bancos, cuentas por pagar
2. [Codex] RRHH: altas/bajas, expedientes, historial de evaluaciones por colaborador
3. [Claude] Operativo: recetas documentadas con costeo automático (food cost %, margen)
4. [Claude] Gráfica de evolución de score por unidad (últimos 6 meses)
5. [Claude] Alertas: score < 70 o proveedor en rojo → badge en Dirección
6. [Ambos] Resumen IA automático semanal (cron) → correo/WhatsApp
7. [Ambos] Multi-tenant para escalar a otras empresas
