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
import { homeOutline, gridOutline, addCircleOutline, scanOutline, receiptOutline, alertCircleOutline, documentTextOutline, checkmarkDoneOutline, shieldCheckmarkOutline, cardOutline, atOutline, logOutOutline, cubeOutline } from 'ionicons/icons';
import { environment } from '../../../environments/environment';

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
  private apiUrl = environment.apiUrl;

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
    addIcons({ homeOutline, gridOutline, addCircleOutline, scanOutline, receiptOutline, alertCircleOutline, documentTextOutline, checkmarkDoneOutline, shieldCheckmarkOutline, cardOutline, atOutline, logOutOutline, cubeOutline });
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
        this.esEstudiante = this.rol !== 'Administrativo';
      } catch {}
    }

    if (this.correo) {
      this.http
        .get<any>(`${this.apiUrl}/users/email/${encodeURIComponent(this.correo)}?t=${Date.now()}`)
        .subscribe({
          next: (resp) => {
            const rawResp = resp?.Respuesta ?? resp;
            const u = Array.isArray(rawResp) ? rawResp[0] : rawResp;
            this.zone.run(() => {
              if (u && typeof u === 'object') {
                const nombreSrv = this.extraerNombre(u);
                if (nombreSrv) this.nombre = nombreSrv;
                this.matricula = String(u.strmatricula || u.matricula || this.matricula).trim();
                this.rol = String(u.strrol || u.rol || this.rol).trim();
                this.esEstudiante = this.rol !== 'Administrativo';

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
    if (!this.matricula && !this.correo && !this.nombre) {
      this.historialReservas = [];
      return;
    }

    this.cargando = true;
    this.http.get<any>(`${this.apiUrl}/getReservas?t=${Date.now()}`).subscribe({
      next: (resp) => {
        this.zone.run(() => {
          const crudas: any[] = Array.isArray(resp) ? resp : (resp?.Respuesta || []);

          const matLower = this.matricula.toLowerCase().trim();
          const mailLower = this.correo.toLowerCase().trim();
          const nombreLower = this.nombre.toLowerCase().trim();
          const prefijoCorreo = mailLower.includes('@') ? mailLower.split('@')[0] : mailLower;
          const soloDigitosCorreo = prefijoCorreo.replace(/^[ae]/i, '');

          // Filtrar todas las reservas con estado Aprobada o Atendida
          const aprobadas = crudas.filter((r: any) => {
            const est = String(r.estado || r.strestado || '').trim().toLowerCase();
            return est === 'aprobada' || est === 'atendida';
          });

          let filtradas: any[] = [];

          if (this.esEstudiante) {
            filtradas = aprobadas.filter((r: any) => {
              const sol = String(r.solicitante || '').toLowerCase();
              const mat = String(r.matricula || r.strmatricula || '').toLowerCase();
              const mail = String(r.correo || r.strcorreoUsuario || '').toLowerCase();

              return (
                (matLower !== '' && (mat === matLower || sol.includes(matLower))) ||
                (mailLower !== '' && (mail === mailLower || sol.includes(mailLower))) ||
                (prefijoCorreo.length >= 4 && (sol.includes(prefijoCorreo) || mail.includes(prefijoCorreo))) ||
                (soloDigitosCorreo.length >= 4 && (sol.includes(soloDigitosCorreo) || mat.includes(soloDigitosCorreo))) ||
                (nombreLower.length >= 4 && sol.includes(nombreLower))
              );
            });
          } else {
            filtradas = aprobadas.filter((r: any) => {
              const apr = String(r.aprobadoPor || r.straprobadoPor || '').toLowerCase().trim();
              if (!apr) return false;
              const prefijoApr = apr.includes('@') ? apr.split('@')[0] : apr;
              const digitosApr = prefijoApr.replace(/^[ae]/i, '');

              return (
                (mailLower !== '' && (apr === mailLower || apr.includes(mailLower))) ||
                (matLower !== '' && (apr === matLower || apr.includes(matLower))) ||
                (nombreLower.length >= 4 && apr.includes(nombreLower)) ||
                (prefijoCorreo.length >= 4 && prefijoApr === prefijoCorreo) ||
                (soloDigitosCorreo.length >= 4 && digitosApr === soloDigitosCorreo)
              );
            });
          }

          this.historialReservas = filtradas.map((r: any) => {
            const id = typeof r._id === 'object' && r._id?.$oid ? r._id.$oid : String(r._id || '');
            const fecha = this.normalizarFechaISO(r.fecha);
            return {
              _id: id,
              reserva_id: id,
              codigoRecurso: String(r.codigoRecurso || 'S/C').trim(),
              nombreRecurso: String(r.nombreRecurso || 'Recurso').trim(),
              ubicacion: String(r.ubicacion || 'Campus UTC').trim(),
              fecha,
              horaInicio: String(r.horaInicio || '00:00').trim(),
              horaFin: String(r.horaFin || '').trim(),
              fechaMovimiento: String(r.fechaAprobacion || r.fechaCreacion || fecha).trim(),
              estado: String(r.estado || 'Aprobada').trim(),
              solicitante: String(r.solicitante || r.matricula || '').trim()
            };
          });

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

  irAEscanear(res: any) {
    this.router.navigate(['/escanear'], {
      queryParams: {
        reservaId: res.reserva_id || res._id || '',
        codigo: res.codigoRecurso || ''
      }
    });
  }

  cerrarSesion() {
    localStorage.removeItem('nexora_active_user');
    localStorage.removeItem('usuarioNexora');
    this.router.navigateByUrl('/login');
  }
}