import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, gridOutline, homeOutline, qrCodeOutline, scanOutline, cubeOutline, documentTextOutline, checkmarkDoneOutline, cameraOutline } from 'ionicons/icons';

import { environment } from '../../../environments/environment';
import { RecursosService } from '../../services/recursos.service';

/** Recurso tal como lo devuelve la API Flask (/getRecursos). */
interface RecursoEscaneado {
  _id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  ubicacion: string;
  estado: string;
  cantidad: number;
  descripcion: string;
  foto: string;
}

@Component({
  selector: 'app-escanear',
  templateUrl: './escanear.page.html',
  styleUrls: ['./escanear.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonFooter, IonIcon, FormsModule, RouterLink, RouterLinkActive],
})
export class EscanearPage {
  private apiUrl = environment.apiUrl;

  modo = 'prestamo'; // 'prestamo' o 'devolucion'
  codigo = '';
  recurso: RecursoEscaneado | null = null;
  estadoDevolucion = 'Bueno'; // 'Bueno' o 'Dañado'
  mensaje = '';
  procesando = false;
  escaneando = false;

  constructor(
    private http: HttpClient,
    private recursosService: RecursosService,
    // La app no usa zone.js: hay que avisar a Angular cuando llegan datos de la API.
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({ alertCircleOutline, gridOutline, homeOutline, qrCodeOutline, scanOutline, cubeOutline, documentTextOutline, checkmarkDoneOutline, cameraOutline });
  }

  cambiarModo(nuevoModo: string): void {
    this.modo = nuevoModo;
    this.recurso = null;
    this.mensaje = '';
  }

  // Abre la cámara del celular, lee el QR y busca el recurso
  async escanearConCamara(): Promise<void> {
    if (this.escaneando) {
      return;
    }

    // En la computadora (navegador) no hay escáner: se escribe el código a mano
    if (!Capacitor.isNativePlatform()) {
      this.mensaje = 'La cámara funciona en la app del celular. Aquí escribe el código y presiona Buscar.';
      return;
    }

    this.escaneando = true;
    this.mensaje = '';
    try {
      // En Android, el lector de QR de Google se descarga la primera vez
      if (Capacitor.getPlatform() === 'android') {
        const modulo = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
        if (!modulo.available) {
          await BarcodeScanner.installGoogleBarcodeScannerModule();
          this.mensaje = 'Preparando el lector de QR por primera vez. Espera unos segundos e intenta de nuevo.';
          this.escaneando = false;
          this.cdr.detectChanges();
          return;
        }
      }

      const resultado = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
      this.escaneando = false;

      if (resultado.barcodes.length === 0) {
        this.cdr.detectChanges();
        return; // cerró la cámara sin escanear
      }

      // El QR de la etiqueta contiene el código del recurso (ej. LAB-006)
      this.codigo = String(resultado.barcodes[0].rawValue || '').trim();
      this.buscar();
    } catch {
      this.escaneando = false;
      this.mensaje = 'No se pudo abrir la cámara. Revisa el permiso o escribe el código.';
      this.cdr.detectChanges();
    }
  }

  // Busca el código en la lista de recursos de la base de datos
  buscar(): void {
    if (this.codigo.trim() === '') {
      this.mensaje = 'Escribe o escanea un código';
      return;
    }

    const codigoBuscado = this.codigo.trim().toUpperCase();
    this.mensaje = 'Buscando...';
    this.recurso = null;

    this.http.get<any>(`${this.apiUrl}/getRecursos`).subscribe({
      next: (resp) => {
        const lista = Array.isArray(resp) ? resp : resp?.Respuesta || [];

        let encontrado: RecursoEscaneado | null = null;
        for (let i = 0; i < lista.length; i++) {
          if (String(lista[i].codigo || '').toUpperCase() === codigoBuscado) {
            encontrado = {
              _id: lista[i]._id,
              codigo: lista[i].codigo,
              nombre: lista[i].nombre,
              categoria: lista[i].categoria,
              ubicacion: lista[i].ubicacion,
              estado: lista[i].estado || 'Disponible',
              cantidad: Number(lista[i].cantidad) || 1,
              descripcion: lista[i].descripcion || '',
              foto: lista[i].foto || '',
            };
            break;
          }
        }

        if (encontrado === null) {
          this.mensaje = 'No se encontró ningún recurso con ese código';
        } else {
          this.recurso = encontrado;
          this.mensaje = '';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.mensaje = 'No se pudo conectar con el servidor';
        this.cdr.detectChanges();
      },
    });
  }

  // Registra el préstamo o la devolución cambiando el estado en la base de datos
  registrar(): void {
    if (this.recurso === null || this.procesando) {
      return;
    }

    let nuevoEstado = '';
    if (this.modo === 'prestamo') {
      if (this.recurso.estado !== 'Disponible') {
        this.mensaje = 'Este recurso no está disponible para préstamo';
        return;
      }
      nuevoEstado = 'Prestado';
    } else {
      if (this.recurso.estado !== 'Prestado') {
        this.mensaje = 'Este recurso no tiene un préstamo activo';
        return;
      }
      // Si regresa dañado, pasa a mantenimiento (RF-12)
      nuevoEstado = this.estadoDevolucion === 'Dañado' ? 'Mantenimiento' : 'Disponible';
    }

    this.procesando = true;
    const identificador = this.recurso._id || this.recurso.codigo;

    this.http
      .put(`${this.apiUrl}/recursos/${encodeURIComponent(identificador)}`, { estado: nuevoEstado })
      .subscribe({
        next: () => {
          if (this.recurso !== null) {
            this.recurso.estado = nuevoEstado;
          }
          this.procesando = false;
          this.mensaje =
            this.modo === 'prestamo' ? 'Préstamo registrado correctamente' : 'Devolución registrada correctamente';
          this.cdr.detectChanges();
        },
        error: () => {
          this.procesando = false;
          this.mensaje = 'No se pudo guardar el cambio en la base de datos';
          this.cdr.detectChanges();
        },
      });
  }

  claseEstado(estado: string): string {
    return this.recursosService.claseEstado(estado);
  }
}
