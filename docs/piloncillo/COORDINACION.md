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
| Gerencias `/gerencia` + `/gerencia/[unidad]` | Claude | ✅ Listo (gráfica evolución incluida) |
| Dirección `/direccion` | Claude | ✅ Listo (alertas + PDF incluidos) |
| Reporte PDF `/reporte` | Claude | ✅ Listo |
| Operativo / Recetas `/operativo` | Claude | ✅ Listo |
| Administración `/administracion` | **Codex** | 🔨 En construcción |
| RRHH `/rrhh` | **Codex** | 🔨 En construcción |
| Panel Maestro `/kaii-master` | Claude | ✅ Listo |
| API `auth` | Claude | ✅ Listo |
| API `evaluaciones-gerencia` | Claude | ✅ Listo |
| API `proveedores` | Claude | ✅ Listo |
| API `resumen-direccion` (IA) | Claude | ✅ Listo |
| API `recetas` | Claude | ✅ Listo |
| API `cron/resumen-semanal` | Claude | ✅ Listo |
| API `kaii-master/*` | Claude | ✅ Listo |

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

## Mapa de rutas completo

```
/piloncillo-dashboard                      Landing (Vista General + 4 secciones)
/piloncillo-dashboard/overview             Métricas todas las unidades (sin PIN, solo lectura)
/piloncillo-dashboard/direccion            Panel estratégico + IA + proveedores + alertas + PDF
/piloncillo-dashboard/reporte              Reporte PDF imprimible por período
/piloncillo-dashboard/administracion       [Codex] Tablero financiero
/piloncillo-dashboard/rrhh                 [Codex] Talento y colaboradores
/piloncillo-dashboard/gerencia             Hub de unidades (selección + PIN por unidad)
/piloncillo-dashboard/gerencia/[unidad]    Evaluación + historial + gráfica evolución
/piloncillo-dashboard/operativo            Recetas y costeo automático (food cost %)
/kaii-master                               Panel Maestro Saúl (PIN VIP 6 dígitos)
/kaii-master/dashboard                     Vista global multi-empresa + cron manual
```

## Autenticación (PINs)

Todos los PINs viven en `.env.local` (NUNCA en el repo). El endpoint `/api/piloncillo/auth` recibe `{ seccion, pin }`, normaliza guiones→guion bajo, y compara contra `process.env.PILONCILLO_PIN_*`.

Variables requeridas:
```
PILONCILLO_PIN_DIRECCION
PILONCILLO_PIN_ADMINISTRACION
PILONCILLO_PIN_RRHH
PILONCILLO_PIN_LA_CRUZ
PILONCILLO_PIN_OAXACA_MANANA
PILONCILLO_PIN_OAXACA_VESPERTINO
PILONCILLO_PIN_IXTLAN_DEL_RIO
PILONCILLO_PIN_PANADERIA
KAII_MASTER_PIN
```

## Contrato de almacenamiento (Vercel KV con fallback en memoria)

```ts
async function kvGet(k){ try{ const {kv}=await import('@vercel/kv'); return (await kv.get(k))||[] }catch{ return mem[k]||[] } }
async function kvSet(k,d){ try{ const {kv}=await import('@vercel/kv'); await kv.set(k,d) }catch{ mem[k]=d } }
```

Keys activas:
```
piloncillo:eval_gerencia:<unidad>
piloncillo:proveedores
piloncillo:recetas
piloncillo:colaboradores:<seccion>
piloncillo:evaluaciones:<seccion>
kaii:empresas
```

## Fórmula de evaluación de gerencias

- **Desempeño 50%** = promedio(productividad, %meta ingresos, eficiencia operativa, control insumos) × 0.5
- **Comportamiento 30%** = promedio(comunicación, seguimiento, gestión proyectos) × 0.3
- **Incidencias hasta −20** = 20 − (faltas×4 + retardos×2 + vacaciones×4 + descansos×2), mínimo 0
- **Score** = redondeo(desempeño + comportamiento + incidencias)

## Backlog priorizado (actualizado)

### ✅ Completados
- [x] Dashboard multi-sección con PINs
- [x] Evaluación de gerencias (fórmula 50/30/-20)
- [x] Vista General sin PIN
- [x] Dirección PRO (resumen IA, métricas, proveedores)
- [x] Gráfica de evolución de score (SVG, 6 meses)
- [x] Alertas automáticas en Dirección (score < 70, proveedor rojo)
- [x] Reporte PDF imprimible
- [x] Módulo Operativo / Recetas con costeo automático
- [x] Panel Maestro KAII multi-tenant
- [x] Cron semanal IA → email HTML (Resend)

### 🔨 En curso (Codex)
- [ ] Administración: tablero financiero por unidad, caja/bancos, cuentas por pagar
- [ ] RRHH: altas/bajas, expedientes, historial de evaluaciones por colaborador

### 📋 Backlog siguiente
- [ ] Notificaciones WhatsApp (Twilio) además de email
- [ ] Módulo de metas mensuales por unidad (configurables)
- [ ] Exportar evaluaciones a Excel/CSV
- [ ] Segundo cliente multi-tenant
