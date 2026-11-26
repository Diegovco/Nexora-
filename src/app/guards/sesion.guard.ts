import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

/**
 * Deja entrar a una pantalla solo si alguien inició sesión.
 * El login guarda el usuario en localStorage con la clave 'nexora_active_user'.
 * Si no hay usuario guardado, manda a la pantalla de login.
 */
export const sesionGuard: CanActivateFn = () => {
  const router = inject(Router);

  let usuario: string | null = null;
  try {
    usuario = localStorage.getItem('nexora_active_user') || localStorage.getItem('usuarioNexora');
  } catch {
    usuario = null;
  }

  if (usuario) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
