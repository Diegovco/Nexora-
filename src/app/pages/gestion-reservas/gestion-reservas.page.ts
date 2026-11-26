import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  barChartOutline,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  closeCircleOutline,
  documentTextOutline,
  homeOutline,
  refreshOutline,
} from 'ionicons/icons';
import { forkJoin } from 'rxjs';

import type { Recurso, Reserva } from '../../models/computo.model';
import { mensajeDeError } from '../../services/api-errores';
import { ComputoService } from '../../services/computo.service';
import { fechaCorta } from '../../utils/fechas';

@Component({
  selector: 'app-gestion-reservas',
  templateUrl: './gestion-reservas.page.html',
  styleUrls: ['./gestion-reservas.page.scss'],
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
export class GestionReservasPage {
  private readonly computo = inject(ComputoService);

  readonly pendientes = signal<Reserva[]>([]);
  readonly laboratorios = signal<Recurso[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly procesando = signal<string | null>(null);
  readonly filtroTexto = signal('');

  readonly pendientesFiltradas = computed(() => {
    const texto = this.filtroTexto().trim().toLowerCase();
    if (!texto) {
      return this.pendientes();
    }
    return this.pendientes().filter((reserva) =>
      [reserva.usuarioNombre, reserva.recursoNombre, reserva.folio, reserva.estado]
        .join(' ')
        .toLowerCase()
        .includes(texto),
    );
  });

  constructor() {
    addIcons({
      addCircleOutline,
      barChartOutline,
      checkmarkCircleOutline,
      checkmarkDoneOutline,
      closeCircleOutline,
      documentTextOutline,
      homeOutline,
      refreshOutline,
    });
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

  cambiarFiltro(evento: Event): void {
    this.filtroTexto.set((evento.target as HTMLInputElement).value);
  }

  fechaDe(reserva: Reserva): string {
    return fechaCorta(reserva.fecha);
  }
}
