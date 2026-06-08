export interface UsuarioSesion {
  id: string;
  nombre: string;
  rol: string;
}

const SESSION_KEY = 'pillo_usuario';

export function getUsuarioSesion(): UsuarioSesion | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as UsuarioSesion : null;
  } catch { return null; }
}

export function setUsuarioSesion(u: UsuarioSesion): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
}

export function clearUsuarioSesion(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}

export async function registrarMovimiento(opts: {
  accion: string;
  detalle?: string;
  seccion?: string;
  unidad?: string;
}): Promise<void> {
  const u = getUsuarioSesion();
  try {
    await fetch('/api/piloncillo/bitacora', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuarioId: u?.id || 'anonimo',
        usuarioNombre: u?.nombre || 'Sin identificar',
        rol: u?.rol || opts.seccion || '',
        accion: opts.accion,
        detalle: opts.detalle || '',
        seccion: opts.seccion,
        unidad: opts.unidad,
      }),
    });
  } catch { /* la bitácora nunca debe romper el flujo principal */ }
}
