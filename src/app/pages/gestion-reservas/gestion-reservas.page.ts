import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonIcon,
  IonButtons,
  IonButton
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
 refreshOutline,
  homeOutline,
  addCircleOutline,
  documentTextOutline,
  checkmarkDoneOutline,
  barChartOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-gestion-reservas',
  templateUrl: './gestion-reservas.page.html',
  styleUrls: ['./gestion-reservas.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    IonHeader,
    IonToolbar,
    IonContent,
    IonFooter,
    IonIcon,
    IonButtons,
    IonButton
  ]
})
export class GestionReservasPage implements OnInit {
  private apiUrl = 'http://localhost:5000';

  todasLasReservas: any[] = [];
  reservasFiltradas: any[] = [];
  filtroMatricula = '';
  filtroTexto = '';
  cargando = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    addIcons({
      refreshOutline,
  homeOutline,
  addCircleOutline,
  documentTextOutline,
  checkmarkDoneOutline,
  barChartOutline
    });
  }

  ngOnInit() {
    this.cargarTodasLasReservas();
  }

  ionViewWillEnter() {
    this.cargarTodasLasReservas();
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

  private ordenarFIFO(lista: any[]) {
    lista.sort((a, b) => {
      const pendA = a.estado.toLowerCase() === 'pendiente' ? 0 : 1;
      const pendB = b.estado.toLowerCase() === 'pendiente' ? 0 : 1;
      if (pendA !== pendB) return pendA - pendB;

      const keyA = `${a.fecha} ${a.horaInicio}`;
      const keyB = `${b.fecha} ${b.horaInicio}`;
      const cmpFecha = keyA.localeCompare(keyB);
      if (cmpFecha !== 0) return cmpFecha;

      return a.ordenOriginal - b.ordenOriginal;
    });
  }

  cargarTodasLasReservas() {
    this.cargando = true;
    this.http.get<any>(`${this.apiUrl}/getReservas`).subscribe({
      next: (resp) => {
        this.zone.run(() => {
          const crudas: any[] = Array.isArray(resp) ? resp : (resp?.Respuesta || []);

          const normalizadas = crudas.map((r: any, idx: number) => ({
            _id: this.extraerId(r._id || r.reserva_id),
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
            matricula: String(r.matricula || r.strmatricula || r.solicitante || '').trim(),
            correo: String(r.correo || r.strcorreoUsuario || '').trim(),
            fecha: this.normalizarFechaISO(r.fecha || r.strfecha || r.fechaReserva),
            horaInicio: String(r.horaInicio || r.strhoraInicio || '00:00').trim(),
            horaFin: String(r.horaFin || r.strhoraFin || '').trim(),
            motivo: String(r.motivo || r.strmotivo || '').trim(),
            estado: String(r.estado || r.strestado || 'Pendiente').trim(),
            aprobadoPor: String(r.aprobadoPor || '').trim(),
            ordenOriginal: idx
          }));

          this.ordenarFIFO(normalizadas);
          this.todasLasReservas = normalizadas;
          this.aplicarFiltro();
          this.cargando = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al cargar todas las reservas:', err);
        this.zone.run(() => {
          this.todasLasReservas = [];
          this.reservasFiltradas = [];
          this.cargando = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  aplicarFiltro() {
    const mat = this.filtroMatricula.trim().toLowerCase();
    const q = this.filtroTexto.trim().toLowerCase();

    this.reservasFiltradas = this.todasLasReservas.filter((r) => {
      const coincideMatricula =
        !mat ||
        r.matricula.toLowerCase().includes(mat) ||
        r.solicitante.toLowerCase().includes(mat) ||
        r.correo.toLowerCase().includes(mat);

      const coincideTexto =
        !q ||
        r.solicitante.toLowerCase().includes(q) ||
        r.nombreRecurso.toLowerCase().includes(q) ||
        r.codigoRecurso.toLowerCase().includes(q) ||
        r.estado.toLowerCase().includes(q) ||
        r.fecha.includes(q);

      return coincideMatricula && coincideTexto;
    });
  }

  limpiarFiltros() {
    this.filtroMatricula = '';
    this.filtroTexto = '';
    this.aplicarFiltro();
  }

  private obtenerAdminActivo(): string {
    const raw = localStorage.getItem('nexora_active_user') || localStorage.getItem('usuarioNexora');
    if (!raw) return '';
    try {
      const datos = JSON.parse(raw);
      return String(
        datos.strcorreoUsuario ||
        datos.correo ||
        datos.email ||
        datos.strmatricula ||
        datos.matricula ||
        ''
      ).trim();
    } catch {
      return '';
    }
  }

  cambiarEstado(r: any, nuevoEstado: 'Aprobada' | 'Rechazada') {
    const idReal = this.extraerId(r._id);
    if (!idReal) {
      alert('No se encontró el ID de la reserva.');
      return;
    }

    const adminActual = this.obtenerAdminActivo();

    this.http.put(`${this.apiUrl}/reservas/${encodeURIComponent(idReal)}`, {
      estado: nuevoEstado,
      aprobadoPor: adminActual
    }).subscribe({
      next: () => {
        this.zone.run(() => {
          r.estado = nuevoEstado;
          r.aprobadoPor = adminActual;
          this.ordenarFIFO(this.todasLasReservas);
          this.aplicarFiltro();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al actualizar el estado:', err);
        alert('No se pudo actualizar el estado de la reserva.');
      }
    });
  }
}