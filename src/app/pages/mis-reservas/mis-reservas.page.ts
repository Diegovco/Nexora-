import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  gridOutline,
  homeOutline,
  receiptOutline,
  refreshOutline,
  timeOutline,
} from 'ionicons/icons';

import type { Reserva, ResumenReservas } from '../../models/computo.model';
import { mensajeDeError } from '../../services/api-errores';
import { ComputoService } from '../../services/computo.service';
import { fechaCorta } from '../../utils/fechas';

@Component({
  selector: 'app-mis-reservas',
  templateUrl: './mis-reservas.page.html',
  styleUrls: ['./mis-reservas.page.scss'],
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    IonIcon,
  ],
})
export class MisReservasPage {
  private readonly computo = inject(ComputoService);
  private readonly route = inject(ActivatedRoute);

  readonly proximas = signal<Reserva[]>([]);
  readonly historial = signal<Reserva[]>([]);
  readonly resumen = signal<ResumenReservas>({ activas: 0, limite: 3, porVencer: 0, pendientes: 0 });
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly cancelando = signal<string | null>(null);
  readonly creada = signal<string | null>(null);

  constructor() {
    addIcons({ alertCircleOutline, gridOutline, homeOutline, receiptOutline, refreshOutline, timeOutline });
    this.creada.set(this.route.snapshot.queryParamMap.get('reserva'));
  }

  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.computo.misReservas().subscribe({
      next: (respuesta) => {
        this.proximas.set(respuesta.proximas);
        this.historial.set(respuesta.historial);
        this.resumen.set(respuesta.resumen);
        this.cargando.set(false);
      },
      error: (error) => {
        this.error.set(mensajeDeError(error));
        this.cargando.set(false);
      },
    });
  }

  cancelar(reserva: Reserva): void {
    const confirmar = confirm(
      `¿Cancelar tu reserva de ${reserva.recursoNombre} el ${fechaCorta(reserva.fecha)} de ${reserva.horaInicio} a ${reserva.horaFin}?`,
    );
    if (!confirmar) {
      return;
    }

    this.cancelando.set(reserva.id);
    this.mensaje.set(null);
    this.computo.cancelar(reserva.id).subscribe({
      next: () => {
        this.cancelando.set(null);
        this.creada.set(null);
        this.mensaje.set('Reserva cancelada. El horario volvió a quedar libre.');
        this.cargar();
      },
      error: (error) => {
        this.cancelando.set(null);
        this.error.set(mensajeDeError(error));
      },
    });
  }

  fechaDe(reserva: Reserva): string {
    return fechaCorta(reserva.fecha);
  }

  claseEstado(estado: string): string {
    if (estado === 'aprobada') {
      return 'exito';
    }
    if (estado === 'pendiente') {
      return 'aviso';
    }
    if (estado === 'rechazada') {
      return 'error';
    }
    if (estado === 'cancelada') {
      return 'neutro';
    }
    return 'info';
  }
}
