import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

/**
 * Deja entrar solo a usuarios con rol "Administrativo".
 * - Sin sesión: manda al login.
 * - Estudiante: lo regresa a inicio.
 * El rol lo decide la API al registrarse (con la clave de administrador).
 */
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  let usuario: any = null;
  try {
    const raw = localStorage.getItem('nexora_active_user') || localStorage.getItem('usuarioNexora');
    if (raw) {
      usuario = JSON.parse(raw);
    }
  } catch {
    usuario = null;
  }

  if (usuario === null) {
    return router.createUrlTree(['/login']);
  }

  const rol = String(usuario.strrol || usuario.rol || '').trim();
  if (rol === 'Administrativo') {
    return true;
  }

  alert('Esta sección es solo para administradores.');
  return router.createUrlTree(['/inicio']);
};
