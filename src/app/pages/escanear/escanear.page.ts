import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { qrCodeOutline, scanOutline, listOutline, cubeOutline, logOutOutline } from 'ionicons/icons';
import { RecursosService, Recurso } from '../../services/recursos.service';

@Component({
  selector: 'app-escanear',
  templateUrl: './escanear.page.html',
  styleUrls: ['./escanear.page.scss'],
  standalone: true,
  imports: [IonContent, IonFooter, IonIcon, FormsModule, RouterLink]
})
export class EscanearPage {
  modo = 'prestamo';            // 'prestamo' o 'devolucion'
  codigo = '';
  recurso: Recurso | null = null;
  estadoDevolucion = 'Bueno';   // 'Bueno' o 'Dañado'
  mensaje = '';

  constructor(private recursosService: RecursosService) {
    addIcons({ qrCodeOutline, scanOutline, listOutline, cubeOutline, logOutOutline });
  }

  cambiarModo(nuevoModo: string) {
    this.modo = nuevoModo;
    this.recurso = null;
    this.mensaje = '';
  }

  buscar() {
    if (this.codigo.trim() === '') {
      this.mensaje = 'Escribe o escanea un código';
      return;
    }
    this.recurso = this.recursosService.buscarPorCodigo(this.codigo.trim().toUpperCase());
    if (this.recurso === null) {
      this.mensaje = 'No se encontró ningún recurso con ese código';
    } else {
      this.mensaje = '';
    }
  }

  registrar() {
    if (this.recurso === null) { return; }

    if (this.modo === 'prestamo') {
      if (this.recurso.estado !== 'Disponible') {
        this.mensaje = 'Este recurso no está disponible para préstamo';
        return;
      }
      this.recurso.estado = 'Prestado';
      this.mensaje = 'Préstamo registrado correctamente';
    } else {
      if (this.recurso.estado !== 'Prestado') {
        this.mensaje = 'Este recurso no tiene un préstamo activo';
        return;
      }
      // Si regresa dañado, pasa a mantenimiento (RF-12)
      if (this.estadoDevolucion === 'Dañado') {
        this.recurso.estado = 'Mantenimiento';
      } else {
        this.recurso.estado = 'Disponible';
      }
      this.mensaje = 'Devolución registrada correctamente';
    }
  }

  claseEstado(estado: string): string {
    return this.recursosService.claseEstado(estado);
  }
}