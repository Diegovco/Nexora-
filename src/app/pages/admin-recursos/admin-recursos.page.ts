import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  addOutline,
  checkmarkDoneOutline,
  createOutline,
  documentTextOutline,
  homeOutline,
  refreshOutline,
  trashOutline,
} from 'ionicons/icons';

import type { Recurso } from '../../models/computo.model';
import { mensajeDeError } from '../../services/api-errores';
import { RecursosService } from '../../services/recursos.service';

@Component({
  selector: 'app-admin-recursos',
  templateUrl: './admin-recursos.page.html',
  styleUrls: ['./admin-recursos.page.scss'],
  standalone: true,
  imports: [IonContent, IonFooter, IonIcon, RouterLink, RouterLinkActive],
})
export class AdminRecursosPage {
  private readonly recursosService = inject(RecursosService);
  private readonly router = inject(Router);

  readonly recursos = signal<Recurso[]>([]);
  readonly texto = signal('');
  readonly categoria = signal('Todos');
  readonly categorias = ['Todos', 'Laboratorio', 'Libro', 'Equipo AV'];
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);

  constructor() {
    addIcons({
      addCircleOutline,
      addOutline,
      checkmarkDoneOutline,
      createOutline,
      documentTextOutline,
      homeOutline,
      refreshOutline,
      trashOutline,
    });
  }

  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.recursosService.listar(this.categoria(), this.texto()).subscribe({
      next: (recursos) => {
        this.recursos.set(recursos);
        this.cargando.set(false);
      },
      error: (error) => {
        this.error.set(mensajeDeError(error));
        this.cargando.set(false);
      },
    });
  }

  cambiarTexto(evento: Event): void {
    this.texto.set((evento.target as HTMLInputElement).value);
    this.cargar();
  }

  elegirCategoria(categoria: string): void {
    this.categoria.set(categoria);
    this.cargar();
  }

  editar(recurso: Recurso): void {
    this.router.navigate(['/nuevo-recurso'], { queryParams: { codigo: recurso.codigo } });
  }

  eliminar(recurso: Recurso): void {
    if (recurso.estado === 'Prestado') {
      this.error.set('No se puede eliminar: tiene un préstamo activo.');
      return;
    }
    if (!confirm(`¿Seguro que quieres eliminar "${recurso.nombre}"?`)) {
      return;
    }

    this.mensaje.set(null);
    this.recursosService.eliminar(recurso.codigo).subscribe({
      next: () => {
        this.mensaje.set('Recurso eliminado.');
        this.cargar();
      },
      error: (error) => {
        this.error.set(mensajeDeError(error));
      },
    });
  }

  claseEstado(estado: string): string {
    return this.recursosService.claseEstado(estado);
  }
}
