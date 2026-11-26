import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'catalogo',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro.page').then((m) => m.RegistroPage),
  },
  {
    path: 'registros',
    loadComponent: () => import('./pages/registro/registro.page').then((m) => m.RegistroPage),
  },
  {
    path: 'inicio',
    loadComponent: () => import('./pages/inicio/inicio.page').then((m) => m.InicioPage),
  },
  {
    path: 'recursos',
    loadComponent: () => import('./pages/recursos/recursos.page').then((m) => m.RecursosPage),
  },
  {
    path: 'detalle-recurso',
    loadComponent: () => import('./pages/detalle-recurso/detalle-recurso.page').then((m) => m.DetalleRecursoPage),
  },
  {
    path: 'nueva-reserva',
    loadComponent: () => import('./pages/nueva-reserva/nueva-reserva.page').then((m) => m.NuevaReservaPage),
  },
  {
    path: 'mis-reservas',
    loadComponent: () => import('./pages/mis-reservas/mis-reservas.page').then((m) => m.MisReservasPage),
  },
  {
    path: 'gestion-reservas',
    loadComponent: () => import('./pages/gestion-reservas/gestion-reservas.page').then((m) => m.GestionReservasPage),
  },
  {
    path: 'avisos',
    loadComponent: () => import('./pages/avisos/avisos.page').then((m) => m.AvisosPage),
  },
  {
    path: 'escanear',
    loadComponent: () => import('./pages/escanear/escanear.page').then((m) => m.EscanearPage),
  },
  {
    path: 'usuarios',
    loadComponent: () => import('./pages/usuarios/usuarios.page').then((m) => m.UsuariosPage),
  },
  {
    path: 'reportes',
    loadComponent: () => import('./pages/reportes/reportes.page').then((m) => m.ReportesPage),
  },
  {
    path: 'admin-recursos',
    loadComponent: () => import('./pages/admin-recursos/admin-recursos.page').then((m) => m.AdminRecursosPage),
  },
  {
    path: 'nuevo-recurso',
    loadComponent: () => import('./pages/nuevo-recurso/nuevo-recurso.page').then((m) => m.NuevoRecursoPage),
  },
  {
    path: 'catalogo',
    loadComponent: () => import('./pages/catalogo/catalogo.page').then((m) => m.CatalogoPage),
  },
  {
    path: '**',
    redirectTo: 'catalogo',
  },
];
