import { Component, inject, signal } from '@angular/core';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeCircleOutline, refreshOutline } from 'ionicons/icons';
import { forkJoin } from 'rxjs';

import { NavInferiorComponent } from '../../components/nav-inferior/nav-inferior.component';
import type { Recurso, Reserva } from '../../models/computo.model';
import { mensajeDeError } from '../../services/api-errores';
import { ComputoService } from '../../services/computo.service';
import { fechaCorta } from '../../utils/fechas';

@Component({
  selector: 'app-gestion-reservas',
  templateUrl: './gestion-reservas.page.html',
  styleUrls: ['./gestion-reservas.page.scss'],
  standalone: true,
  imports: [IonContent, IonFooter, IonIcon, NavInferiorComponent],
})
export class GestionReservasPage {
  private readonly computo = inject(ComputoService);

  readonly pendientes = signal<Reserva[]>([]);
  readonly laboratorios = signal<Recurso[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly procesando = signal<string | null>(null);

  constructor() {
    addIcons({ checkmarkCircleOutline, closeCircleOutline, refreshOutline });
  }

  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      pendientes: this.computo.reservasPendientes(),
      laboratorios: this.computo.listarRecursos('Laboratorio'),
    }).subscribe({
      next: ({ pendientes, laboratorios }) => {
        this.pendientes.set(pendientes.reservas);
        this.laboratorios.set(laboratorios);
        this.cargando.set(false);
      },
      error: (error) => {
        this.error.set(mensajeDeError(error));
        this.cargando.set(false);
      },
    });
  }

  aprobar(reserva: Reserva): void {
    this.procesando.set(reserva.id);
    this.mensaje.set(null);
    this.computo.aprobar(reserva.id).subscribe({
      next: () => {
        this.procesando.set(null);
        this.mensaje.set(`Reserva ${reserva.folio} aprobada. Se avisó a ${reserva.usuarioNombre}.`);
        this.cargar();
      },
      error: (error) => {
        this.procesando.set(null);
        this.error.set(mensajeDeError(error));
      },
    });
  }

  rechazar(reserva: Reserva): void {
    const motivo = prompt(`Motivo del rechazo para ${reserva.folio}:`);
    if (!motivo || motivo.trim().length < 3) {
      return;
    }

    this.procesando.set(reserva.id);
    this.mensaje.set(null);
    this.computo.rechazar(reserva.id, motivo.trim()).subscribe({
      next: () => {
        this.procesando.set(null);
        this.mensaje.set(`Reserva ${reserva.folio} rechazada. El horario quedó libre.`);
        this.cargar();
      },
      error: (error) => {
        this.procesando.set(null);
        this.error.set(mensajeDeError(error));
      },
    });
  }

  alternarEstado(laboratorio: Recurso): void {
    const nuevo = laboratorio.estado === 'Disponible' ? 'Mantenimiento' : 'Disponible';
    if (!confirm(`¿Cambiar ${laboratorio.nombre} a ${nuevo}? Se avisará a las reservas afectadas.`)) {
      return;
    }

    this.procesando.set(laboratorio.codigo);
    this.mensaje.set(null);
    this.computo.cambiarEstadoLaboratorio(laboratorio.codigo, nuevo).subscribe({
      next: () => {
        this.procesando.set(null);
        this.mensaje.set(`${laboratorio.nombre} ahora está en ${nuevo}.`);
        this.cargar();
      },
      error: (error) => {
        this.procesando.set(null);
        this.error.set(mensajeDeError(error));
      },
    });
  }

  fechaDe(reserva: Reserva): string {
    return fechaCorta(reserva.fecha);
  }
}
