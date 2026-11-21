import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  homeOutline,
  gridOutline,
  receiptOutline,
  alertCircleOutline,
  refreshOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-mis-reservas',
  templateUrl: './mis-reservas.page.html',
  styleUrls: ['./mis-reservas.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
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
export class MisReservasPage implements OnInit {
  private apiUrl = 'http://localhost:5000';

  matricula = '';
  correoUsuario = '';
  nombreUsuario = '';

  reservas: any[] = [];
  cargando = false;

  reservasSemanaPasada = 0;
  reservasEstaSemana = 0;
  reservasSiguienteSemana = 0;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    addIcons({
      homeOutline,
      gridOutline,
      receiptOutline,
      alertCircleOutline,
      refreshOutline
    });
  }

  ngOnInit() {
    this.cargarUsuarioActivo();
    this.cargarReservasUsuario();
  }

  ionViewWillEnter() {
    this.cargarUsuarioActivo();
    this.cargarReservasUsuario();
  }

  private cargarUsuarioActivo() {
    const raw = localStorage.getItem('nexora_active_user') || localStorage.getItem('usuarioNexora');
    if (!raw) return;

    try {
      const datos = JSON.parse(raw);
      this.matricula = String(datos.strmatricula || datos.matricula || '').trim();
      this.correoUsuario = String(datos.strcorreoUsuario || datos.correo || datos.email || '').trim();
      this.nombreUsuario = String(datos.strnombre || datos.strnombreUsuario || datos.nombre || '').trim();
    } catch {}
  }

  private extraerId(rawId: any): string {
    if (!rawId) return '';
    if (typeof rawId === 'object' && rawId.$oid) return String(rawId.$oid).trim();
    return String(rawId).trim();
  }

  private normalizarFechaISO(raw: any): string {
    const s = String(raw || '').trim().slice(0, 10);
    if (!s) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split('/');
      return `${y}-${m}-${d}`;
    }
    return s;
  }

  private parsearFechaLocal(fechaISO: string): Date | null {
    const match = fechaISO.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
  }

  private calcularContadoresSemanales(lista: any[]) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diaSemana = hoy.getDay();
    const diffALunes = diaSemana === 0 ? -6 : 1 - diaSemana;

    const inicioEstaSemana = new Date(hoy);
    inicioEstaSemana.setDate(hoy.getDate() + diffALunes);

    const inicioSemanaPasada = new Date(inicioEstaSemana);
    inicioSemanaPasada.setDate(inicioEstaSemana.getDate() - 7);

    const inicioSiguienteSemana = new Date(inicioEstaSemana);
    inicioSiguienteSemana.setDate(inicioEstaSemana.getDate() + 7);

    const finSiguienteSemana = new Date(inicioSiguienteSemana);
    finSiguienteSemana.setDate(inicioSiguienteSemana.getDate() + 7);

    let pasada = 0;
    let actual = 0;
    let siguiente = 0;

    for (const r of lista) {
      const fechaObj = this.parsearFechaLocal(r.fecha);
      if (!fechaObj) continue;

      if (fechaObj >= inicioSemanaPasada && fechaObj < inicioEstaSemana) {
        pasada++;
      } else if (fechaObj >= inicioEstaSemana && fechaObj < inicioSiguienteSemana) {
        actual++;
      } else if (fechaObj >= inicioSiguienteSemana && fechaObj < finSiguienteSemana) {
        siguiente++;
      }
    }

    this.reservasSemanaPasada = pasada;
    this.reservasEstaSemana = actual;
    this.reservasSiguienteSemana = siguiente;
  }

  cargarReservasUsuario() {
    const matQ = this.matricula.trim().toLowerCase();
    const mailQ = this.correoUsuario.trim().toLowerCase();
    const nomQ = this.nombreUsuario.trim().toLowerCase();
    const prefijoCorreo = mailQ.includes('@') ? mailQ.split('@')[0] : mailQ;
    const digitosCorreo = prefijoCorreo.replace(/^[ae]/i, '');

    if (!matQ && !mailQ && !nomQ) {
      this.reservas = [];
      this.reservasSemanaPasada = 0;
      this.reservasEstaSemana = 0;
      this.reservasSiguienteSemana = 0;
      return;
    }

    this.cargando = true;
    this.http.get<any>(`${this.apiUrl}/getReservas?t=${Date.now()}`).subscribe({
      next: (resp) => {
        this.zone.run(() => {
          const crudas: any[] = Array.isArray(resp) ? resp : (resp?.Respuesta || []);

          const normalizadas = crudas.map((r: any, idx: number) => ({
            _id: this.extraerId(r._id || r.reserva_id),
            turno: r.turno || 0,
            codigoRecurso: String(r.codigoRecurso || r.codigo || 'S/C').trim(),
            nombreRecurso: String(r.nombreRecurso || r.recurso || 'Recurso').trim(),
            ubicacion: String(r.ubicacion || 'Campus UTC').trim(),
            solicitante: String(r.solicitante || r.matricula || '').trim(),
            matricula: String(r.matricula || r.strmatricula || '').trim(),
            correo: String(r.correo || r.strcorreoUsuario || '').trim(),
            fecha: this.normalizarFechaISO(r.fecha || r.strfecha),
            horaInicio: String(r.horaInicio || '00:00').trim(),
            horaFin: String(r.horaFin || '').trim(),
            motivo: String(r.motivo || '').trim(),
            estado: String(r.estado || 'Pendiente').trim(),
            ordenOriginal: idx
          }));

          const filtradas = normalizadas.filter((r) => {
            const sol = r.solicitante.toLowerCase();
            const mat = r.matricula.toLowerCase();
            const mail = r.correo.toLowerCase();

            return (
              (matQ !== '' && (mat === matQ || sol === matQ || sol.includes(matQ))) ||
              (mailQ !== '' && (mail === mailQ || sol === mailQ || sol.includes(mailQ))) ||
              (prefijoCorreo.length >= 4 && (sol.includes(prefijoCorreo) || mail.includes(prefijoCorreo))) ||
              (digitosCorreo.length >= 4 && (sol.includes(digitosCorreo) || mat.includes(digitosCorreo))) ||
              (nomQ.length >= 4 && sol.includes(nomQ))
            );
          });

          filtradas.sort((a, b) => {
            const cmpFecha = b.fecha.localeCompare(a.fecha);
            if (cmpFecha !== 0) return cmpFecha;
            return b.ordenOriginal - a.ordenOriginal;
          });

          this.reservas = filtradas;
          this.calcularContadoresSemanales(filtradas);
          this.cargando = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al consultar reservas en MongoDB:', err);
        this.zone.run(() => {
          this.reservas = [];
          this.reservasSemanaPasada = 0;
          this.reservasEstaSemana = 0;
          this.reservasSiguienteSemana = 0;
          this.cargando = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  cambiarEstado(r: any, nuevoEstado: 'Aprobada' | 'Rechazada') {
    const idReal = this.extraerId(r._id);
    if (!idReal) return;

    this.http.put(`${this.apiUrl}/reservas/${encodeURIComponent(idReal)}`, { estado: nuevoEstado }).subscribe({
      next: () => {
        this.zone.run(() => {
          r.estado = nuevoEstado;
          this.calcularContadoresSemanales(this.reservas);
          this.cdr.detectChanges();
        });
      },
      error: () => alert('No se pudo actualizar el estado de la reserva.')
    });
  }
}