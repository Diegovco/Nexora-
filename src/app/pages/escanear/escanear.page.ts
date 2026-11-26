import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, gridOutline, homeOutline, qrCodeOutline, scanOutline } from 'ionicons/icons';

import type { Recurso } from '../../models/computo.model';
import { codigoDeError, mensajeDeError } from '../../services/api-errores';
import { RecursosService } from '../../services/recursos.service';

@Component({
  selector: 'app-escanear',
  templateUrl: './escanear.page.html',
  styleUrls: ['./escanear.page.scss'],
  standalone: true,
  imports: [NgClass, IonContent, IonFooter, IonIcon, FormsModule, RouterLink, RouterLinkActive],
})
export class EscanearPage {
  modo = 'prestamo';
  codigo = '';
  recurso: Recurso | null = null;
  estadoDevolucion = 'Bueno';
  mensaje = '';
  procesando = false;

  private readonly recursosService = inject(RecursosService);
  // La app no usa zone.js: hay que avisar a Angular cuando llegan datos de la API.
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    addIcons({ alertCircleOutline, gridOutline, homeOutline, qrCodeOutline, scanOutline });
  }

  cambiarModo(nuevoModo: string): void {
    this.modo = nuevoModo;
    this.recurso = null;
    this.mensaje = '';
  }

  buscar(): void {
    if (this.codigo.trim() === '') {
      this.mensaje = 'Escribe o escanea un código';
      return;
    }

    const codigo = this.codigo.trim().toUpperCase();
    this.mensaje = '';
    this.recursosService.obtenerPorCodigo(codigo).subscribe({
      next: (recurso) => {
        this.recurso = recurso;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.recurso = null;
        this.mensaje =
          codigoDeError(error) === 'RECURSO_NO_ENCONTRADO'
            ? 'No se encontró ningún recurso con ese código'
            : mensajeDeError(error);
        this.cdr.markForCheck();
      },
    });
  }

  registrar(): void {
    if (this.recurso === null || this.procesando) {
      return;
    }

    if (this.modo === 'prestamo' && this.recurso.estado !== 'Disponible') {
      this.mensaje = 'Este recurso no está disponible para préstamo';
      return;
    }
    if (this.modo === 'devolucion' && this.recurso.estado !== 'Prestado') {
      this.mensaje = 'Este recurso no tiene un préstamo activo';
      return;
    }

    const nuevoEstado =
      this.modo === 'prestamo' ? 'Prestado' : this.estadoDevolucion === 'Dañado' ? 'Mantenimiento' : 'Disponible';

    this.procesando = true;
    this.recursosService.actualizar(this.recurso.codigo, { estado: nuevoEstado }).subscribe({
      next: (recurso) => {
        this.recurso = recurso;
        this.procesando = false;
        this.mensaje =
          this.modo === 'prestamo' ? 'Préstamo registrado correctamente' : 'Devolución registrada correctamente';
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.procesando = false;
        this.mensaje = mensajeDeError(error);
        this.cdr.markForCheck();
      },
    });
  }

  claseEstado(estado: string): string {
    return this.recursosService.claseEstado(estado);
  }
}
