import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { refreshOutline } from 'ionicons/icons';

import { NavInferiorComponent } from '../../components/nav-inferior/nav-inferior.component';
import type { Recurso } from '../../models/computo.model';
import { mensajeDeError } from '../../services/api-errores';
import { ComputoService } from '../../services/computo.service';

type Filtro = 'Todos' | 'Disponibles' | 'Mantenimiento';

@Component({
  selector: 'app-recursos',
  templateUrl: './recursos.page.html',
  styleUrls: ['./recursos.page.scss'],
  standalone: true,
  imports: [IonContent, IonFooter, IonIcon, RouterLink, NavInferiorComponent],
})
export class RecursosPage {
  private readonly computo = inject(ComputoService);

  constructor() {
    addIcons({ refreshOutline });
  }

  readonly filtros: Filtro[] = ['Todos', 'Disponibles', 'Mantenimiento'];
  readonly recursos = signal<Recurso[]>([]);
  readonly filtro = signal<Filtro>('Todos');
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly visibles = computed(() => {
    const activo = this.filtro();
    if (activo === 'Disponibles') {
      return this.recursos().filter((recurso) => recurso.estado === 'Disponible');
    }
    if (activo === 'Mantenimiento') {
      return this.recursos().filter((recurso) => recurso.estado === 'Mantenimiento');
    }
    return this.recursos();
  });

  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.computo.listarRecursos('Laboratorio').subscribe({
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

  filtrar(filtro: Filtro): void {
    this.filtro.set(filtro);
  }

  claseEstado(estado: string): string {
    if (estado === 'Disponible') {
      return 'exito';
    }
    if (estado === 'Mantenimiento') {
      return 'aviso';
    }
    return 'info';
  }
}
