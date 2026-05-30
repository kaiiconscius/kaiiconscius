# Plan Piloncillo — Implementación en 4 Computadoras

> Documento para Codex + Saúl · Última actualización: 2026-05-30
> Estado del sistema: **listo para implementación** salvo Administración y RRHH (Codex en construcción)

---

## Estado actual del sistema KAII Piloncillo

### Módulos listos ✅
| Módulo | Ruta | Acceso |
|--------|------|--------|
| Landing principal | `/piloncillo-dashboard` | Libre |
| Vista General (todas las unidades) | `/piloncillo-dashboard/overview` | Sin PIN |
| Gerencias · Evaluación + Evolución | `/piloncillo-dashboard/gerencia/[unidad]` | PIN por unidad |
| Dirección PRO · IA + Alertas + PDF | `/piloncillo-dashboard/direccion` | PIN 1122 |
| Reporte PDF mensual | `/piloncillo-dashboard/reporte` | Desde Dirección |
| Operativo · Recetas + Costeo | `/piloncillo-dashboard/operativo` | Sin PIN |
| Panel Maestro Saúl | `/kaii-master/dashboard` | PIN VIP |
| Cron semanal IA → email | `/api/cron/resumen-semanal` | Auto lunes 9am |

### Módulos en construcción 🔨 (Codex)
| Módulo | Ruta | ETA |
|--------|------|-----|
| Administración | `/piloncillo-dashboard/administracion` | Próxima entrega |
| RRHH | `/piloncillo-dashboard/rrhh` | Próxima entrega |

---

## Configuración requerida en cada máquina

### Opción A — Vercel (recomendada) ⭐
La app corre en la nube. Cada computadora solo necesita **Chrome o Safari** y la URL.
- Sin instalación de Node.js ni dependencias
- Acceso desde cualquier red o WiFi del local
- PWA instalable desde el navegador ("Agregar a pantalla de inicio")
- Variables de entorno configuradas UNA sola vez en Vercel Dashboard

### Opción B — Servidor local
Un Mac/PC corre el servidor y las demás se conectan por IP local (ej. `192.168.1.X:3000`).
- Requiere Node.js 18+ en la máquina servidor
- `.env.local` con todos los PINs y variables
- Ventaja: funciona sin internet

---

## Variables `.env.local` requeridas (para Opción B o Vercel)

```bash
# PINs Piloncillo
PILONCILLO_PIN_DIRECCION=1122
PILONCILLO_PIN_ADMINISTRACION=1133
PILONCILLO_PIN_RRHH=1002
PILONCILLO_PIN_LA_CRUZ=1004
PILONCILLO_PIN_OAXACA_MANANA=1313
PILONCILLO_PIN_OAXACA_VESPERTINO=2212
PILONCILLO_PIN_IXTLAN_DEL_RIO=3322
PILONCILLO_PIN_PANADERIA=1717

# Panel Maestro
KAII_MASTER_PIN=<PIN VIP 6 dígitos>

# Inteligencia Artificial
ANTHROPIC_API_KEY=<clave de Anthropic>

# Base de datos (Vercel KV)
KV_REST_API_URL=<url del KV>
KV_REST_API_TOKEN=<token del KV>

# Email semanal
RESEND_API_KEY=<clave de Resend>
REPORT_EMAIL=saul@kaiiconsultores.com
```

---

## Asignación de computadoras

| Computadora | Responsable | Acceso principal | PIN |
|-------------|-------------|-----------------|-----|
| PC 1 — Dirección | Efraín | Dirección PRO + Panel Maestro | 1122 / VIP |
| PC 2 — Administración | Responsable Admin | Administración | 1133 |
| PC 3 — RRHH | Responsable RRHH | RRHH | 1002 |
| PC 4 — Operaciones | Uso compartido | Vista General + Gerencias | PINs por unidad |

> Todos pueden acceder a Vista General sin PIN.

---

## Plan de Implementación — 3 Fases

### Fase 1 · Preparación (2–3 días)

**Responsable: Codex + Saúl**

- [ ] Cerrar versión local estable (`npm run build` sin errores)
- [ ] Codex termina Administración y RRHH
- [ ] Revisar las 4 laptops: Chrome actualizado, conexión WiFi estable
- [ ] Configurar `.env.local` con todos los PINs y variables
- [ ] Verificar Vercel KV conectado (o decidir servidor local)
- [ ] Instalar PWA en cada máquina desde Chrome
- [ ] Preparar carpeta local con: manual rápido por rol, lista de PINs impresa, guía de troubleshooting
- [ ] Probar resumen IA: `GET /api/cron/resumen-semanal` → confirmar llegada de email

**Entregables de Fase 1:**
- App corriendo y accesible desde las 4 máquinas
- Manual de usuario (1 página por rol)
- Hoja de PINs impresa (guardada en sobre sellado)

---

### Fase 2 · Instalación inicial (1 día presencial)

**Responsable: Saúl + equipo Piloncillo**

**Mañana (9am–1pm) — Setup técnico:**
- [ ] Instalar y probar en PC 1 (Dirección) → login, alertas, resumen IA
- [ ] Instalar y probar en PC 2 (Administración) → login, tablero
- [ ] Instalar y probar en PC 3 (RRHH) → login, expedientes
- [ ] Instalar y probar en PC 4 (Operaciones) → gerencias, costeo
- [ ] Probar Vista General desde cualquier máquina
- [ ] Confirmar que Panel Maestro abre solo en PC de Saúl

**Tarde (2pm–6pm) — Capacitación:**
- [ ] Capacitar a Efraín/Dirección: cómo leer alertas, generar reporte PDF, interpretar resumen IA
- [ ] Capacitar a Administración: registro financiero, caja, proveedores
- [ ] Capacitar a RRHH: alta de colaboradores, expedientes, evaluaciones
- [ ] Capacitar a Gerencias: autoevaluación mensual, registro de ingresos, gráfica de evolución
- [ ] Simulacro completo: gerencia captura evaluación → Dirección la ve en alertas

---

### Fase 3 · Acompañamiento (4 semanas)

**Responsable: Saúl + KAII (Claude/Codex en soporte remoto)**

#### Semana 1 — Captura base de datos
- Alta de colaboradores por unidad (RRHH)
- Configurar unidades y datos históricos
- Registro primer período de evaluaciones (aunque sea retroactivo)
- Objetivo: que cada gerencia tenga al menos 1 evaluación cargada

#### Semana 2 — Costeo y recetas
- Documentar primeras 10 recetas por unidad
- Calcular food cost real vs objetivo (≤30% óptimo)
- Identificar recetas con food cost >38% (rojo) → acción inmediata
- Registrar primeros 5 proveedores con estado semáforo

#### Semana 3 — Evaluación de gerencias
- Primera evaluación formal del mes con la herramienta
- Cada gerente captura su autoevaluación
- Dirección revisa scores y genera primer reporte PDF
- Primer resumen IA enviado por email (disparar manualmente desde Panel Maestro)

#### Semana 4 — Primer reporte operativo
- Revisar gráficas de evolución (con 2–3 períodos ya)
- Hallazgos: ¿qué unidades mejoraron? ¿cuáles necesitan atención?
- Ajustes de PINs, permisos o funciones según retroalimentación
- Presentación a Dirección: valor generado vs estado anterior

---

## Propuesta comercial

| Concepto | Monto |
|----------|-------|
| Implementación inicial (fase 1 + 2) | **$12,000** |
| Mensualidad por unidad (soporte + ajustes + actualizaciones) | **$2,700/unidad** |
| Piloncillo (4 unidades activas) | **$10,800/mes** |
| Ixtlán del Río (nueva, en arranque) | **$2,700/mes** |
| **Total mensual Piloncillo** | **$13,500/mes** |

> **Nota Saúl:** No bajar de $2,700 por unidad. La mensualidad incluye:
> - Soporte técnico remoto ilimitado
> - Actualizaciones de plataforma
> - Nuevas funciones según roadmap
> - Respaldo de datos en Vercel KV
> - Resumen semanal IA automatizado

---

## Troubleshooting rápido (para capacitación)

| Problema | Solución |
|----------|----------|
| PIN no funciona | Verificar que `.env.local` esté configurado y servidor reiniciado |
| App no carga | Revisar conexión a internet / recargar Chrome |
| Datos no se guardan | Verificar `KV_REST_API_TOKEN` en variables de entorno |
| Resumen IA no genera | Verificar `ANTHROPIC_API_KEY` válida |
| Email no llega | Verificar `RESEND_API_KEY` y revisar carpeta de spam |
| Sesión expirada | El sessionStorage se limpia al cerrar pestaña — volver a ingresar PIN |

---

## Notas para Obsidian

Copiar este documento a la bóveda Piloncillo en Obsidian bajo:
```
Piloncillo/
  ├── 01-Estado-Sistema.md
  ├── 02-Plan-Implementacion.md  ← este archivo
  ├── 03-PINs-Acceso.md          ← guardar offline, no en repo
  ├── 04-Manuales/
  │     ├── Manual-Direccion.md
  │     ├── Manual-Administracion.md
  │     ├── Manual-RRHH.md
  │     └── Manual-Gerencias.md
  └── 05-Reportes/               ← reportes mensuales PDF
```
