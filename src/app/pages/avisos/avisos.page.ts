import { Component, computed, inject, signal } from '@angular/core';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  informationCircleOutline,
} from 'ionicons/icons';

import { NavInferiorComponent } from '../../components/nav-inferior/nav-inferior.component';
import type { Aviso } from '../../models/computo.model';
import { mensajeDeError } from '../../services/api-errores';
import { AvisosService } from '../../services/avisos.service';
import { esHoy, horaDeSello } from '../../utils/fechas';

@Component({
  selector: 'app-avisos',
  templateUrl: './avisos.page.html',
  styleUrls: ['./avisos.page.scss'],
  standalone: true,
  imports: [IonContent, IonFooter, IonIcon, NavInferiorComponent],
})
export class AvisosPage {
  private readonly servicio = inject(AvisosService);

  readonly avisos = signal<Aviso[]>([]);
  readonly sinLeer = signal(0);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly marcando = signal(false);

  readonly hoy = computed(() => this.avisos().filter((aviso) => esHoy(aviso.creadoEn)));
  readonly anteriores = computed(() => this.avisos().filter((aviso) => !esHoy(aviso.creadoEn)));

  constructor() {
    addIcons({
      alertCircleOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      informationCircleOutline,
    });
  }

  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar().subscribe({
      next: (respuesta) => {
        this.avisos.set(respuesta.avisos);
        this.sinLeer.set(respuesta.sinLeer);
        this.cargando.set(false);
      },
      error: (error) => {
        this.error.set(mensajeDeError(error));
        this.cargando.set(false);
      },
    });
  }

  marcarLeidas(): void {
    if (this.sinLeer() === 0 || this.marcando()) {
      return;
    }
    this.marcando.set(true);
    this.servicio.marcarLeidos().subscribe({
      next: () => {
        this.avisos.update((lista) => lista.map((aviso) => ({ ...aviso, leido: true })));
        this.sinLeer.set(0);
        this.marcando.set(false);
      },
      error: (error) => {
        this.error.set(mensajeDeError(error));
        this.marcando.set(false);
      },
    });
  }

  icono(tipo: string): string {
    if (tipo === 'exito') {
      return 'checkmark-circle-outline';
    }
    if (tipo === 'error') {
      return 'close-circle-outline';
    }
    if (tipo === 'alerta') {
      return 'alert-circle-outline';
    }
    return 'information-circle-outline';
  }

  hora(aviso: Aviso): string {
    return horaDeSello(aviso.creadoEn);
  }
}
