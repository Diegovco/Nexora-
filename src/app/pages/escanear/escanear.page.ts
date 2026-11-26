import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { qrCodeOutline, scanOutline, listOutline, cubeOutline, logOutOutline } from 'ionicons/icons';

import type { Recurso } from '../../models/computo.model';
import { codigoDeError, mensajeDeError } from '../../services/api-errores';
import { RecursosService } from '../../services/recursos.service';

@Component({
  selector: 'app-escanear',
  templateUrl: './escanear.page.html',
  styleUrls: ['./escanear.page.scss'],
  standalone: true,
  imports: [IonContent, IonFooter, IonIcon, FormsModule, RouterLink],
})
export class EscanearPage {
  modo = 'prestamo';
  codigo = '';
  recurso: Recurso | null = null;
  estadoDevolucion = 'Bueno';
  mensaje = '';
  procesando = false;

  private readonly recursosService = inject(RecursosService);

  constructor() {
    addIcons({ qrCodeOutline, scanOutline, listOutline, cubeOutline, logOutOutline });
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
      },
      error: (error) => {
        this.recurso = null;
        this.mensaje =
          codigoDeError(error) === 'RECURSO_NO_ENCONTRADO'
            ? 'No se encontró ningún recurso con ese código'
            : mensajeDeError(error);
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
      },
      error: (error) => {
        this.procesando = false;
        this.mensaje = mensajeDeError(error);
      },
    });
  }

  claseEstado(estado: string): string {
    return this.recursosService.claseEstado(estado);
  }
}
