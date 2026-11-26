import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import type { Observable} from 'rxjs';
import { tap } from 'rxjs';

import { environment } from '../../environments/environment';
import type { CategoriaRecurso, EstadoRecurso, Horario, Recurso } from '../models/computo.model';

export interface DatosRecurso {
  nombre: string;
  categoria: CategoriaRecurso;
  ubicacion: string;
  estado: EstadoRecurso;
  equipos: number;
  horario: Horario;
  descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class RecursosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/computo/recursos`;
  private readonly cache = signal<Recurso[]>([]);

  readonly recursos = this.cache.asReadonly();

  private get encabezadosAdmin(): HttpHeaders {
    return new HttpHeaders({ 'X-Api-Key': environment.adminApiKey });
  }

  listar(categoria = 'Todos', texto = ''): Observable<Recurso[]> {
    const params: Record<string, string> = {};
    if (categoria !== 'Todos') {
      params['categoria'] = categoria;
    }
    if (texto.trim()) {
      params['texto'] = texto.trim();
    }
    return this.http.get<Recurso[]>(this.base, { params }).pipe(tap((lista) => this.cache.set(lista)));
  }

  obtenerPorCodigo(codigo: string): Observable<Recurso> {
    return this.http.get<Recurso>(`${this.base}/${codigo}`);
  }

  buscarEnCache(codigo: string): Recurso | undefined {
    return this.cache().find((recurso) => recurso.codigo === codigo);
  }

  crear(datos: DatosRecurso & { codigo?: string }): Observable<Recurso> {
    return this.http.post<Recurso>(this.base, datos, { headers: this.encabezadosAdmin });
  }

  actualizar(codigo: string, datos: Partial<DatosRecurso>): Observable<Recurso> {
    return this.http.patch<Recurso>(`${this.base}/${codigo}`, datos, {
      headers: this.encabezadosAdmin,
    });
  }

  cambiarEstado(codigo: string, estado: 'Disponible' | 'Mantenimiento'): Observable<Recurso> {
    return this.http.patch<Recurso>(`${this.base}/${codigo}/estado`, { estado }, { headers: this.encabezadosAdmin });
  }

  eliminar(codigo: string): Observable<{ eliminado: string }> {
    return this.http.delete<{ eliminado: string }>(`${this.base}/${codigo}`, {
      headers: this.encabezadosAdmin,
    });
  }

  generarCodigo(categoria: CategoriaRecurso, lista: Recurso[] = this.cache()): string {
    let prefijo = 'AV';
    if (categoria === 'Laboratorio') {
      prefijo = 'LAB';
    }
    if (categoria === 'Libro') {
      prefijo = 'LIB';
    }

    let mayor = 0;
    for (const recurso of lista) {
      const partes = recurso.codigo.split('-');
      if (partes[0] === prefijo) {
        const numero = Number(partes[1]);
        if (!Number.isNaN(numero) && numero > mayor) {
          mayor = numero;
        }
      }
    }
    return `${prefijo}-${String(mayor + 1).padStart(3, '0')}`;
  }

  claseEstado(estado: string): string {
    if (estado === 'Disponible') {
      return 'disponible';
    }
    if (estado === 'Prestado') {
      return 'prestado';
    }
    return 'mantenimiento';
  }
}
