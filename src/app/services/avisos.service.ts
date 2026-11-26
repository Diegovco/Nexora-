import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type { RespuestaAvisos } from '../models/computo.model';

@Injectable({ providedIn: 'root' })
export class AvisosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/avisos`;

  readonly usuario = environment.usuario;

  listar(): Observable<RespuestaAvisos> {
    return this.http.get<RespuestaAvisos>(this.base, {
      params: { usuarioId: this.usuario.id },
    });
  }

  marcarLeidos(): Observable<{ actualizados: number }> {
    return this.http.patch<{ actualizados: number }>(`${this.base}/leidos`, {
      usuarioId: this.usuario.id,
    });
  }
}
