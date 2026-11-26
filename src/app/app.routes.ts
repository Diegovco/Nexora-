import type { Routes } from '@angular/router';

import { adminGuard } from './guards/admin.guard';
import { sesionGuard } from './guards/sesion.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'crear-cuenta',
    loadComponent: () => import('./pages/crear-cuenta/crear-cuenta.page').then((m) => m.CrearCuentaPage),
  },
  {
    path: 'registro',
    // Solo administradores
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/registro/registro.page').then((m) => m.RegistroPage),
  },
  {
    path: 'registros',
    // Solo administradores
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/registro/registro.page').then((m) => m.RegistroPage),
  },
  {
    path: 'inicio',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/inicio/inicio.page').then((m) => m.InicioPage),
  },
  {
    path: 'recursos',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/recursos/recursos.page').then((m) => m.RecursosPage),
  },
  {
    path: 'detalle-recurso',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/detalle-recurso/detalle-recurso.page').then((m) => m.DetalleRecursoPage),
  },
  {
    path: 'nueva-reserva',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/nueva-reserva/nueva-reserva.page').then((m) => m.NuevaReservaPage),
  },
  {
    path: 'mis-reservas',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/mis-reservas/mis-reservas.page').then((m) => m.MisReservasPage),
  },
  {
    path: 'gestion-reservas',
    // Solo administradores
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/gestion-reservas/gestion-reservas.page').then((m) => m.GestionReservasPage),
  },
  {
    path: 'avisos',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/avisos/avisos.page').then((m) => m.AvisosPage),
  },
  {
    path: 'escanear',
    // Solo administradores
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/escanear/escanear.page').then((m) => m.EscanearPage),
  },
  {
    path: 'usuarios',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/usuarios/usuarios.page').then((m) => m.UsuariosPage),
  },
  {
    path: 'reportes',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/reportes/reportes.page').then((m) => m.ReportesPage),
  },
  {
    path: 'admin-recursos',
    // Solo administradores
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-recursos/admin-recursos.page').then((m) => m.AdminRecursosPage),
  },
  {
    path: 'nuevo-recurso',
    // Solo administradores
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/nuevo-recurso/nuevo-recurso.page').then((m) => m.NuevoRecursoPage),
  },
  {
    path: 'catalogo',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/catalogo/catalogo.page').then((m) => m.CatalogoPage),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];