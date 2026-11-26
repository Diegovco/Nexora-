import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonHeader, IonToolbar, IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, addCircleOutline, documentTextOutline, folderOpenOutline, checkmarkDoneOutline, cubeOutline, scanOutline } from 'ionicons/icons';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonHeader,
    IonToolbar,
    IonContent,
    IonFooter,
    IonIcon
  ]
})
export class RegistroPage implements OnInit {
  private apiUrl = environment.apiUrl;
  colaAprobadas: any[] = [];
  cargando = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    addIcons({ homeOutline, addCircleOutline, documentTextOutline, folderOpenOutline, checkmarkDoneOutline, cubeOutline, scanOutline });
  }

  ngOnInit() {
    this.cargarColaAprobadas();
  }

  ionViewWillEnter() {
    this.cargarColaAprobadas();
  }

  private extraerId(rawId: any): string {
    if (!rawId) return '';
    if (typeof rawId === 'object' && rawId.$oid) return String(rawId.$oid).trim();
    return String(rawId).trim();
  }

  private normalizarFechaISO(raw: any): string {
    const s = String(raw || '').trim().slice(0, 10);
    if (!s) return '9999-12-31';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split('/');
      return `${y}-${m}-${d}`;
    }
    return s;
  }

  cargarColaAprobadas() {
    this.cargando = true;
    this.http.get<any>(`${this.apiUrl}/getReservas`).subscribe({
      next: (resp) => {
        this.zone.run(() => {
          const crudas: any[] = Array.isArray(resp) ? resp : (resp?.Respuesta || []);

          const aprobadas = crudas
            .map((r: any, idx: number) => {
              const id = this.extraerId(r._id || r.reserva_id);
              const fecha = this.normalizarFechaISO(r.fecha || r.strfecha || r.fechaReserva);
              return {
                _id: id,
                reserva_id: id,
                codigoRecurso: String(r.codigoRecurso || r.codigo || r.strcodigo || 'S/C').trim(),
                nombreRecurso: String(
                  r.nombreRecurso ||
                  r.strnombreRecurso ||
                  r.recurso ||
                  r.nombre ||
                  'Recurso'
                ).trim(),
                ubicacion: String(r.ubicacion || r.strubicacion || 'Campus UTC').trim(),
                solicitante: String(
                  r.solicitante ||
                  r.matricula ||
                  r.strmatricula ||
                  r.correo ||
                  r.strcorreoUsuario ||
                  'Sin matrícula'
                ).trim(),
                fecha,
                horaInicio: String(r.horaInicio || r.strhoraInicio || '00:00').trim(),
                horaFin: String(r.horaFin || r.strhoraFin || '').trim(),
                fechaAprobacion: String(r.fechaAprobacion || r.updatedAt || fecha).trim(),
                estado: String(r.estado || r.strestado || 'Pendiente').trim(),
                ordenOriginal: idx
              };
            })
            .filter((r) => r.estado.toLowerCase() === 'aprobada');

          // Orden FIFO: las reservas aprobadas más antiguas quedan primero (#1)
          aprobadas.sort((a, b) => {
            const keyA = `${a.fecha} ${a.horaInicio}`;
            const keyB = `${b.fecha} ${b.horaInicio}`;
            const cmp = keyA.localeCompare(keyB);
            return cmp !== 0 ? cmp : a.ordenOriginal - b.ordenOriginal;
          });

          this.colaAprobadas = aprobadas;
          this.cargando = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al cargar reservas aprobadas desde MongoDB:', err);
        this.zone.run(() => {
          this.colaAprobadas = [];
          this.cargando = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  atenderSiguiente() {
    if (this.colaAprobadas.length === 0) return;

    const primeroEnCola = this.colaAprobadas[0];
    const idReal = this.extraerId(primeroEnCola._id);

    if (!idReal) {
      alert('No se encontró el ID de la reserva en turno.');
      return;
    }

    this.http.put<any>(`${this.apiUrl}/reservas/${encodeURIComponent(idReal)}`, { estado: 'Atendida' }).subscribe({
      next: () => {
        this.zone.run(() => {
          this.colaAprobadas.shift();
          this.cdr.detectChanges();
        });
      },
      error: () => alert('No se pudo atender el siguiente turno en cola.')
    });
  }
}