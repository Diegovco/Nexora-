import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
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
  addCircleOutline,
  scanCircleOutline,
  documentTextOutline,
  folderOpenOutline,
  mailOutline,
  idCardOutline,
  logOutOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss'],
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
export class UsuariosPage implements OnInit {
  private apiUrl = 'http://localhost:5000';

  nombre = '';
  correo = '';
  matricula = '';
  rol = '';
  esEstudiante = true;

  historialReservas: any[] = [];
  cargando = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    addIcons({
      homeOutline,
      gridOutline,
      addCircleOutline,
      scanCircleOutline,
      documentTextOutline,
      folderOpenOutline,
      mailOutline,
      idCardOutline,
      logOutOutline
    });
  }

  ngOnInit() {
    this.cargarDatosUsuario();
  }

  ionViewWillEnter() {
    this.cargarDatosUsuario();
  }

  private extraerNombre(u: any): string {
    if (!u || typeof u !== 'object') return '';
    const base = String(
      u.strnombre ||
      u.strnombreUsuario ||
      u.nombre ||
      u.nombreCompleto ||
      u.fullName ||
      u.name ||
      ''
    ).trim();
    const apellido = String(u.strapellido || u.apellido || u.apellidos || '').trim();
    if (base && apellido && !base.toLowerCase().includes(apellido.toLowerCase())) {
      return `${base} ${apellido}`.trim();
    }
    if (base) return base;

    const mail = String(u.strcorreoUsuario || u.correo || u.email || '').trim();
    return mail ? mail.split('@')[0] : '';
  }

  cargarDatosUsuario() {
    const raw = localStorage.getItem('nexora_active_user') || localStorage.getItem('usuarioNexora');
    if (raw) {
      try {
        const datos = JSON.parse(raw);
        this.nombre = this.extraerNombre(datos);
        this.correo = String(datos.strcorreoUsuario || datos.correo || datos.email || '').trim();
        this.matricula = String(datos.strmatricula || datos.matricula || '').trim();
        this.rol = String(datos.strrol || datos.rol || '').trim();
        this.esEstudiante = !(this.rol === 'Administrativo' || this.correo.toUpperCase().startsWith('A'));
      } catch {}
    }

    if (this.correo) {
      this.http.get<any>(`${this.apiUrl}/users/email/${encodeURIComponent(this.correo)}`).subscribe({
        next: (resp) => {
          const rawResp = resp?.Respuesta ?? resp;
          const u = Array.isArray(rawResp) ? rawResp[0] : rawResp;
          this.zone.run(() => {
            if (u && typeof u === 'object') {
              const nombreSrv = this.extraerNombre(u);
              if (nombreSrv) this.nombre = nombreSrv;
              this.matricula = String(u.strmatricula || u.matricula || this.matricula).trim();
              this.rol = String(u.strrol || u.rol || this.rol).trim();
              this.esEstudiante = !(this.rol === 'Administrativo' || this.correo.toUpperCase().startsWith('A'));

              const actualizado = {
                ...u,
                nombre: this.nombre,
                correo: this.correo,
                matricula: this.matricula,
                rol: this.rol
              };
              localStorage.setItem('nexora_active_user', JSON.stringify(actualizado));
              localStorage.setItem('usuarioNexora', JSON.stringify(actualizado));
            }
            this.cdr.detectChanges();
            this.cargarHistorial();
          });
        },
        error: () => this.cargarHistorial()
      });
    } else {
      this.cargarHistorial();
    }
  }

  private normalizarFechaISO(raw: any): string {
    const s = String(raw || '').trim().slice(0, 10);
    if (!s) return '0000-00-00';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split('/');
      return `${y}-${m}-${d}`;
    }
    return s;
  }

  cargarHistorial() {
    if (!this.matricula && !this.correo) {
      this.historialReservas = [];
      return;
    }

    this.cargando = true;
    this.http.get<any>(`${this.apiUrl}/getReservas`).subscribe({
      next: (resp) => {
        this.zone.run(() => {
          const crudas: any[] = Array.isArray(resp) ? resp : (resp?.Respuesta || []);

          const matLower = this.matricula.toLowerCase();
          const mailLower = this.correo.toLowerCase();
          const numCorreo = mailLower.split('@')[0].replace(/^[ae]/i, '');

          const normalizadas = crudas.map((r: any, idx: number) => {
            const id = typeof r._id === 'object' && r._id?.$oid ? r._id.$oid : String(r._id || r.reserva_id || '');
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
              fecha,
              horaInicio: String(r.horaInicio || r.strhoraInicio || '00:00').trim(),
              horaFin: String(r.horaFin || r.strhoraFin || '').trim(),
              fechaMovimiento: String(r.fechaAprobacion || r.fechaCreacion || r.updatedAt || fecha).trim(),
              estado: String(r.estado || r.strestado || 'Pendiente').trim(),
              solicitante: String(
                r.solicitante ||
                r.matricula ||
                r.strmatricula ||
                r.correo ||
                r.strcorreoUsuario ||
                ''
              ).trim(),
              correoReserva: String(
                r.correo ||
                r.strcorreoUsuario ||
                r.usuario_email ||
                ''
              ).trim(),
              aprobadoPor: String(
                r.aprobadoPor ||
                r.straprobadoPor ||
                r.adminCorreo ||
                r.usuarioAdmin ||
                ''
              ).trim(),
              ordenOriginal: idx
            };
          });

          // 1. Solo reservas aprobadas o atendidas
          const soloAprobadas = normalizadas.filter((r) => {
            const est = r.estado.toLowerCase();
            return est === 'aprobada' || est === 'atendida';
          });

          let filtradas: any[] = [];

          if (this.esEstudiante) {
            // Estudiante: coincidencia exacta con su matrícula o correo
            filtradas = soloAprobadas.filter((r) => {
              const sol = r.solicitante.toLowerCase();
              const mail = r.correoReserva.toLowerCase();
              return (
                (matLower !== '' && (sol === matLower || mail === matLower)) ||
                (mailLower !== '' && (mail === mailLower || sol === mailLower)) ||
                (numCorreo !== '' && sol === numCorreo)
              );
            });
          } else {
            // Administrativo: solo las que aprobó este usuario exacto
            filtradas = soloAprobadas.filter((r) => {
              const apr = r.aprobadoPor.toLowerCase();
              if (!apr) return false;
              const numApr = apr.split('@')[0].replace(/^[ae]/i, '');
              return (
                (mailLower !== '' && apr === mailLower) ||
                (matLower !== '' && apr === matLower) ||
                (numCorreo !== '' && numApr === numCorreo)
              );
            });
          }

          // Pila LIFO: el movimiento más reciente va en el tope (índice 0)
          filtradas.sort((a, b) => {
            const keyA = `${a.fecha} ${a.horaInicio}`;
            const keyB = `${b.fecha} ${b.horaInicio}`;
            const cmp = keyB.localeCompare(keyA);
            return cmp !== 0 ? cmp : b.ordenOriginal - a.ordenOriginal;
          });

          this.historialReservas = filtradas;
          this.cargando = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al cargar historial del usuario:', err);
        this.zone.run(() => {
          this.historialReservas = [];
          this.cargando = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  cerrarSesion() {
    localStorage.removeItem('nexora_active_user');
    localStorage.removeItem('usuarioNexora');
    this.router.navigateByUrl('/login');
  }
}