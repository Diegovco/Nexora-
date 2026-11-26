import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type { Disponibilidad, Recurso, Reserva, RespuestaPendientes, RespuestaReservas } from '../models/computo.model';

@Injectable({ providedIn: 'root' })
export class ComputoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/computo`;

  /**
   * Usuario que hace las reservas. Si alguien inició sesión en la pantalla de
   * login, se usa ese usuario; si no, el usuario de prueba de environment.ts.
   */
  get usuario(): { id: string; nombre: string } {
    try {
      const raw = localStorage.getItem('nexora_active_user') || localStorage.getItem('usuarioNexora');
      if (raw) {
        const datos = JSON.parse(raw);
        const id = String(datos.strmatricula || datos.matricula || datos.strcorreoUsuario || datos.correo || '').trim();
        const nombre = String(datos.strnombre || datos.strnombreUsuario || datos.nombre || id).trim();
        if (id.length >= 3) {
          return { id, nombre };
        }
      }
    } catch {
      // Si el dato guardado no es válido, se usa el usuario de prueba.
    }
    return environment.usuario;
  }

  private get encabezadosAdmin(): HttpHeaders {
    return new HttpHeaders({ 'X-Api-Key': environment.adminApiKey });
  }

  listarRecursos(categoria?: string, texto?: string): Observable<Recurso[]> {
    const params: Record<string, string> = {};
    if (categoria) {
      params['categoria'] = categoria;
    }
    if (texto) {
      params['texto'] = texto;
    }
    return this.http.get<Recurso[]>(`${this.base}/recursos`, { params });
  }

  obtenerRecurso(codigo: string): Observable<Recurso> {
    return this.http.get<Recurso>(`${this.base}/recursos/${codigo}`);
  }

  obtenerDisponibilidad(codigo: string, fecha?: string): Observable<Disponibilidad> {
    const params: Record<string, string> = { codigo };
    if (fecha) {
      params['fecha'] = fecha;
    }
    return this.http.get<Disponibilidad>(`${this.base}/disponibilidad`, { params });
  }

  crearReserva(payload: {
    recursoCodigo: string;
    fecha: string;
    horas: string[];
    motivo: string;
    usuarioId: string;
    usuarioNombre: string;
  }): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.base}/reservas`, payload);
  }

  misReservas(): Observable<RespuestaReservas> {
    return this.http.get<RespuestaReservas>(`${this.base}/reservas`, {
      params: { usuarioId: this.usuario.id },
    });
  }

  cancelar(reservaId: string): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.base}/reservas/${reservaId}/cancelar`, {
      usuarioId: this.usuario.id,
    });
  }

  reservasPendientes(): Observable<RespuestaPendientes> {
    return this.http.get<RespuestaPendientes>(`${this.base}/reservas/pendientes`, {
      headers: this.encabezadosAdmin,
    });
  }

  aprobar(reservaId: string): Observable<Reserva> {
    return this.http.patch<Reserva>(
      `${this.base}/reservas/${reservaId}/aprobar`,
      { adminNombre: this.usuario.nombre },
      { headers: this.encabezadosAdmin },
    );
  }

  rechazar(reservaId: string, motivo: string): Observable<Reserva> {
    return this.http.patch<Reserva>(
      `${this.base}/reservas/${reservaId}/rechazar`,
      { motivo, adminNombre: this.usuario.nombre },
      { headers: this.encabezadosAdmin },
    );
  }

  cambiarEstadoLaboratorio(codigo: string, estado: 'Disponible' | 'Mantenimiento'): Observable<Recurso> {
    return this.http.patch<Recurso>(
      `${this.base}/recursos/${codigo}/estado`,
      { estado },
      { headers: this.encabezadosAdmin },
    );
  }
}
