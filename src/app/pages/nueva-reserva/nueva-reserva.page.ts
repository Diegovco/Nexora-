import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline } from 'ionicons/icons';

import type { Bloque, Dia, Recurso } from '../../models/computo.model';
import { codigoDeError, mensajeDeError } from '../../services/api-errores';
import { ComputoService } from '../../services/computo.service';
import { fechaLarga, sumarMinutos } from '../../utils/fechas';

@Component({
  selector: 'app-nueva-reserva',
  templateUrl: './nueva-reserva.page.html',
  styleUrls: ['./nueva-reserva.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonButtons, IonButton, IonContent, IonFooter, IonIcon],
})
export class NuevaReservaPage {
  private readonly computo = inject(ComputoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly recurso = signal<Recurso | null>(null);
  readonly dias = signal<Dia[]>([]);
  readonly fecha = signal('');
  readonly slots = signal<Bloque[]>([]);
  readonly seleccion = signal<string[]>([]);
  readonly motivo = signal('');
  readonly cargando = signal(true);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly motivoBloqueo = signal<string | null>(null);

  private codigo = '';

  get solicitante(): string {
    return this.computo.usuario.nombre;
  }

  readonly duracion = computed(() => this.recurso()?.horario.duracionBloque ?? 60);
  readonly etiquetaFecha = computed(() => (this.fecha() ? fechaLarga(this.fecha()) : ''));
  readonly horaInicio = computed(() => this.seleccion()[0] ?? '');
  readonly horaFin = computed(() => {
    const horas = this.seleccion();
    if (horas.length === 0) {
      return '';
    }
    return sumarMinutos(horas[horas.length - 1], this.duracion());
  });
  readonly puedeEnviar = computed(
    () =>
      !this.enviando() && this.fecha().length > 0 && this.seleccion().length > 0 && this.motivo().trim().length >= 5,
  );

  constructor() {
    addIcons({ chevronBackOutline });
    const codigo = this.route.snapshot.queryParamMap.get('codigo');
    if (codigo) {
      this.codigo = codigo;
      this.cargar(codigo);
      return;
    }
    this.elegirPrimerLaboratorio();
  }

  private elegirPrimerLaboratorio(): void {
    this.computo.listarRecursos('Laboratorio').subscribe({
      next: (recursos) => {
        const elegido = recursos.find((recurso) => recurso.estado === 'Disponible') ?? recursos[0];
        if (!elegido) {
          this.cargando.set(false);
          this.error.set('No hay laboratorios de cómputo registrados. Ejecuta seed.py en la API.');
          return;
        }
        this.codigo = elegido.codigo;
        this.cargar(elegido.codigo);
      },
      error: (error) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(error));
      },
    });
  }

  cargar(codigo: string, fecha?: string): void {
    this.cargando.set(true);
    this.error.set(null);
    this.computo.obtenerDisponibilidad(codigo, fecha).subscribe({
      next: (disponibilidad) => {
        this.recurso.set(disponibilidad.recurso);
        this.dias.set(disponibilidad.dias);
        this.fecha.set(disponibilidad.fecha);
        this.slots.set(disponibilidad.slots);
        this.motivoBloqueo.set(disponibilidad.motivoBloqueo);
        this.seleccion.set([]);
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(error));
      },
    });
  }

  cambiarDia(dia: Dia): void {
    if (!dia.disponible || dia.fecha === this.fecha()) {
      return;
    }
    this.cargar(this.codigo, dia.fecha);
  }

  cambiarMotivo(evento: Event): void {
    this.motivo.set((evento.target as HTMLTextAreaElement).value);
  }

  alternar(slot: Bloque): void {
    if (slot.estado !== 'libre') {
      this.aviso.set('Ese horario no está disponible.');
      return;
    }

    const actuales = this.seleccion();
    if (actuales.includes(slot.hora)) {
      this.seleccion.set(actuales.filter((hora) => hora !== slot.hora));
      this.aviso.set(null);
      return;
    }

    const aMinutos = (hora: string): number => {
      const [horas, minutos] = hora.split(':').map(Number);
      return horas * 60 + minutos;
    };

    const ordenadas = [...actuales, slot.hora].sort((a, b) => aMinutos(a) - aMinutos(b));
    if (ordenadas.length > 4) {
      this.aviso.set('Puedes elegir como máximo 4 horas por solicitud.');
      return;
    }

    const consecutivas = ordenadas.every(
      (hora, indice) => indice === 0 || aMinutos(hora) - aMinutos(ordenadas[indice - 1]) === this.duracion(),
    );

    this.seleccion.set(consecutivas ? ordenadas : [slot.hora]);
    this.aviso.set(null);
  }

  claseSlot(slot: Bloque): string {
    return this.seleccion().includes(slot.hora) ? 'seleccionado' : slot.estado;
  }

  deshabilitado(slot: Bloque): boolean {
    return slot.estado !== 'libre';
  }

  volver(): void {
    this.router.navigateByUrl('/catalogo');
  }

  enviar(): void {
    if (!this.puedeEnviar()) {
      this.aviso.set('Elige un horario libre y escribe el motivo (mínimo 5 caracteres).');
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    this.aviso.set(null);

    this.computo
      .crearReserva({
        recursoCodigo: this.codigo,
        fecha: this.fecha(),
        horas: this.seleccion(),
        motivo: this.motivo().trim(),
        usuarioId: this.computo.usuario.id,
        usuarioNombre: this.computo.usuario.nombre,
      })
      .subscribe({
        next: (reserva) => {
          this.enviando.set(false);
          this.router.navigate(['/mis-reservas'], { queryParams: { reserva: reserva.folio } });
        },
        error: (error) => {
          this.enviando.set(false);
          const mensaje = mensajeDeError(error);
          if (codigoDeError(error) === 'BLOQUE_OCUPADO') {
            this.cargar(this.codigo, this.fecha());
          }
          this.error.set(mensaje);
        },
      });
  }
}
