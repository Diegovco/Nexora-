import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonFooter,
  IonPopover
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOutline, personOutline, logOutOutline, homeOutline, gridOutline, alertCircleOutline, receiptOutline, documentTextOutline, checkmarkDoneOutline, addCircleOutline, ellipsisVertical, cubeOutline, scanOutline } from 'ionicons/icons';
import { Recurso } from '../../services/recursos.service';
import { environment } from '../../../environments/environment';

export interface RecursoInicio extends Recurso {
  _id?: string;
}

export interface EstadisticaCategoria {
  nombre: string;
  sigla: string;
  totalSemana: number;
  totalDia: number;
}

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonFooter,
    IonPopover
  ],
})
export class InicioPage implements OnInit {
  private apiUrl = environment.apiUrl;
  disponibles: RecursoInicio[] = [];
  esEstudiante = true;

  // Datos del usuario activo
  nombreUsuario = 'Nexora';
  matriculaUsuario = '';
  correoUsuario = '';
  fechaHoy = '';

  // Indicadores dinámicos (Estudiante)
  totalReservasProximas = 0;
  totalReservasHoy = 0;
  turnoEsperaProxima = '—';
  proximaReserva: any = null;

  // Indicadores dinámicos (Administrativo - Cantidades)
  totalSemanalGeneral = 0;
  totalDiarioGeneral = 0;
  estadisticasCategorias: EstadisticaCategoria[] = [
    { nombre: 'Libro', sigla: 'LIB', totalSemana: 0, totalDia: 0 },
    { nombre: 'Laboratorio', sigla: 'LAB', totalSemana: 0, totalDia: 0 },
    { nombre: 'Equipo AV', sigla: 'AV', totalSemana: 0, totalDia: 0 }
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    addIcons({ 'notifications-outline': notificationsOutline, 'person-outline': personOutline, 'log-out-outline': logOutOutline, 'home-outline': homeOutline, 'grid-outline': gridOutline, 'alert-circle-outline': alertCircleOutline, 'receipt-outline': receiptOutline, 'document-text-outline': documentTextOutline, 'checkmark-done-outline': checkmarkDoneOutline, 'add-circle-outline': addCircleOutline, 'ellipsis-vertical': ellipsisVertical, cubeOutline, scanOutline });
  }

  ngOnInit() {
    this.cargarVistaSegunRol();
  }

  ionViewWillEnter() {
    this.cargarVistaSegunRol();
  }

  private cargarVistaSegunRol() {
    this.fechaHoy = this.obtenerFechaHoyLocal();
    this.verificarUsuarioYRol();

    if (this.esEstudiante) {
      this.cargarDisponibles();
      this.cargarResumenEstudiante();
    } else {
      this.cargarEstadisticasAdmin();
    }
  }

  private obtenerFechaHoyLocal(): string {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private obtenerRangoSemanaActual(): { inicio: string; fin: string } {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;

    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + diffLunes);

    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    const fmt = (dt: Date) =>
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    return { inicio: fmt(lunes), fin: fmt(domingo) };
  }

  verificarUsuarioYRol() {
    const raw = localStorage.getItem('nexora_active_user') || localStorage.getItem('usuarioNexora');
    if (!raw) {
      this.esEstudiante = true;
      this.matriculaUsuario = '';
      this.correoUsuario = '';
      this.nombreUsuario = 'Nexora';
      return;
    }

    try {
      const user = JSON.parse(raw);
      const rol = (user.strrol || user.rol || '').trim();
      this.correoUsuario = (user.strcorreoUsuario || user.correo || user.email || '').trim();
      this.matriculaUsuario = (user.strmatricula || user.matricula || '').trim();
      this.esEstudiante = rol !== 'Administrativo';

      const nombreCompleto = (
        user.strnombreUsuario ||
        user.strnombre ||
        user.nombre ||
        user.name ||
        ''
      ).trim();

      if (nombreCompleto) {
        this.nombreUsuario = nombreCompleto.split(' ')[0];
      } else if (this.correoUsuario) {
        this.nombreUsuario = this.correoUsuario.split('@')[0];
      } else {
        this.nombreUsuario = this.esEstudiante ? 'Estudiante' : 'Admin';
      }
    } catch {
      this.esEstudiante = true;
      this.nombreUsuario = 'Nexora';
    }
  }

  obtenerSiglaRecurso(r: RecursoInicio): string {
    const cat = (r.categoria || '').toLowerCase();
    const cod = (r.codigo || '').toUpperCase();
    if (cat.includes('libro') || cod.startsWith('LIB')) return 'LIB';
    if (cat.includes('lab') || cod.startsWith('LAB')) return 'LAB';
    if (cat.includes('equipo') || cat.includes('av') || cod.startsWith('AV') || cod.startsWith('EQ')) return 'AV';
    return (r.codigo || 'REC').slice(0, 3).toUpperCase();
  }

  // NORMALIZADORES DE CAMPOS MONGODB

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

  private normalizarReserva(r: any) {
    return {
      _id: this.extraerId(r._id || r.reserva_id),
      recursoId: this.extraerId(r.recursoId || r.recurso_id) || String(r.codigoRecurso || r.strcodigo || '').trim(),
      codigoRecurso: String(r.codigoRecurso || r.codigo || r.strcodigo || '').trim(),
      nombreRecurso:
        r.nombreRecurso ||
        r.strnombreRecurso ||
        r.recurso ||
        r.nombre ||
        r.strnombre ||
        'Recurso reservado',
      categoria: r.categoria || r.strcategoria || r.categoriaRecurso || '',
      ubicacion: r.ubicacion || r.strubicacion || 'Campus UTC',
      fecha: this.normalizarFechaISO(r.fecha || r.strfecha || r.fechaReserva),
      horaInicio: r.horaInicio || r.strhoraInicio || r.hora_inicio || '00:00',
      horaFin: r.horaFin || r.strhoraFin || r.hora_fin || '',
      estado: r.estado || r.strestado || 'Pendiente',
      solicitante: String(
        r.solicitante ||
        r.matricula ||
        r.strmatricula ||
        r.correo ||
        r.strcorreoUsuario ||
        r.usuario_email ||
        ''
      ).trim(),
      correo: String(
        r.correo ||
        r.strcorreoUsuario ||
        r.usuario_email ||
        r.email ||
        ''
      ).trim()
    };
  }

  // LÓGICA ESTUDIANTE: toma el recurso más reciente de cada tipo sin importar su estado

  cargarDisponibles() {
    this.http.get<any>(`${this.apiUrl}/getRecursos?t=${Date.now()}`).pipe(
      catchError(() => of({ Respuesta: [] }))
    ).subscribe((recursosResp) => {
      this.zone.run(() => {
        const lista: any[] = Array.isArray(recursosResp)
          ? recursosResp
          : (recursosResp?.Respuesta || []);

        const todos: Array<RecursoInicio & { orden: number; fechaRegistro: string }> = lista.map(
          (item: any, idx: number) => {
            const id = this.extraerId(item._id);
            const codigo = String(item.codigo || item.strcodigo || '').trim();
            const rawCantidad = item.cantidad ?? item.intcantidad;
            const cantidad = rawCantidad !== undefined && rawCantidad !== null ? Number(rawCantidad) : 1;

            return {
              _id: id,
              codigo,
              nombre: item.nombre || item.strnombre || '',
              categoria: item.categoria || item.strcategoria || '',
              ubicacion: item.ubicacion || item.strubicacion || '',
              estado: item.estado || item.strestado || 'Disponible',
              cantidad,
              descripcion: item.descripcion || item.strdescripcion || '',
              orden: idx,
              fechaRegistro: String(item.fechaCreacion || item.createdAt || item.fecha || '').trim()
            };
          }
        );

        // Ordenar del más reciente al más antiguo
        todos.sort((a, b) => {
          if (a.fechaRegistro && b.fechaRegistro && a.fechaRegistro !== b.fechaRegistro) {
            return b.fechaRegistro.localeCompare(a.fechaRegistro);
          }
          if (a._id && b._id && a._id.length === 24 && b._id.length === 24 && a._id !== b._id) {
            return b._id.localeCompare(a._id);
          }
          return b.orden - a.orden;
        });

        const categoriasObjetivo: Array<'Libro' | 'Laboratorio' | 'Equipo AV'> = [
          'Libro',
          'Laboratorio',
          'Equipo AV'
        ];

        const masRecientePorTipo: RecursoInicio[] = [];
        for (const catObj of categoriasObjetivo) {
          const encontrado = todos.find(
            (r) => this.normalizarCategoria(r.categoria, r.codigo) === catObj
          );
          if (encontrado) {
            masRecientePorTipo.push(encontrado);
          }
        }

        this.disponibles = masRecientePorTipo;
        this.cdr.detectChanges();
      });
    });
  }

  cargarResumenEstudiante() {
    if (!this.matriculaUsuario && !this.correoUsuario) {
      this.totalReservasProximas = 0;
      this.totalReservasHoy = 0;
      this.turnoEsperaProxima = '—';
      this.proximaReserva = null;
      return;
    }

    this.http.get<any>(`${this.apiUrl}/getReservas`).pipe(
      catchError(() => of({ Respuesta: [] }))
    ).subscribe((resp) => {
      this.zone.run(() => {
        const crudas: any[] = Array.isArray(resp) ? resp : (resp?.Respuesta || []);
        const todas = crudas.map((item) => this.normalizarReserva(item));

        const matLower = this.matriculaUsuario.toLowerCase();
        const mailLower = this.correoUsuario.toLowerCase();
        const numCorreo = mailLower.split('@')[0].replace(/^[ae]/i, '');

        const misReservas = todas.filter((r) => {
          const sol = r.solicitante.toLowerCase();
          const mail = r.correo.toLowerCase();
          return (
            (matLower && (sol === matLower || mail === matLower)) ||
            (mailLower && (mail === mailLower || sol === mailLower)) ||
            (numCorreo && (sol === numCorreo || sol.endsWith(numCorreo)))
          );
        });

        const vigentes = misReservas.filter((r) => {
          const estado = r.estado.toLowerCase();
          if (estado === 'rechazada' || estado === 'cancelada') return false;
          return !r.fecha || r.fecha >= this.fechaHoy;
        });

        vigentes.sort((a, b) => {
          const keyA = `${a.fecha || '9999-12-31'} ${a.horaInicio || '23:59'}`;
          const keyB = `${b.fecha || '9999-12-31'} ${b.horaInicio || '23:59'}`;
          return keyA.localeCompare(keyB);
        });

        this.totalReservasProximas = vigentes.length;
        this.totalReservasHoy = vigentes.filter((r) => r.fecha === this.fechaHoy).length;
        this.proximaReserva = vigentes.length > 0 ? vigentes[0] : null;

        if (!this.proximaReserva) {
          this.turnoEsperaProxima = '—';
          this.cdr.detectChanges();
          return;
        }

        const recursoId = String(this.proximaReserva.recursoId || '').trim();
        if (!recursoId) {
          this.turnoEsperaProxima = '#1';
          this.cdr.detectChanges();
          return;
        }

        this.http.get<any>(`${this.apiUrl}/cola/${encodeURIComponent(recursoId)}`).pipe(
          catchError(() => of({ cola: [] }))
        ).subscribe((colaResp) => {
          this.zone.run(() => {
            const listaCola: any[] = Array.isArray(colaResp)
              ? colaResp
              : (colaResp?.cola || colaResp?.Respuesta || colaResp?.en_espera || []);

            const idx = listaCola.findIndex((item: any) => {
              if (typeof item === 'string') {
                const s = item.trim().toLowerCase();
                return (
                  (mailLower && s === mailLower) ||
                  (matLower && s === matLower) ||
                  (numCorreo && s === numCorreo)
                );
              }
              const emailItem = String(item.usuario_email || item.correo || item.email || '').trim().toLowerCase();
              const matItem = String(item.matricula || item.solicitante || '').trim().toLowerCase();
              return (
                (mailLower && emailItem === mailLower) ||
                (matLower && matItem === matLower) ||
                (numCorreo && matItem === numCorreo)
              );
            });

            if (idx !== -1) {
              this.turnoEsperaProxima = `#${idx + 1}`;
            } else {
              const posVigente = vigentes.findIndex((v) => v._id === this.proximaReserva._id);
              this.turnoEsperaProxima = posVigente !== -1 ? `#${posVigente + 1}` : '#1';
            }

            this.cdr.detectChanges();
          });
        });
      });
    });
  }

  // LÓGICA ADMINISTRATIVO

  private normalizarCategoria(rawCat: string, codigo: string): 'Libro' | 'Laboratorio' | 'Equipo AV' | '' {
    const c = (rawCat || '').toLowerCase().trim();
    const cod = (codigo || '').toUpperCase().trim();

    if (c.includes('libro') || cod.startsWith('LIB')) return 'Libro';
    if (c.includes('lab') || cod.startsWith('LAB')) return 'Laboratorio';
    if (c.includes('equipo') || c.includes('av') || c.includes('audio') || cod.startsWith('AV') || cod.startsWith('EQ')) {
      return 'Equipo AV';
    }
    return '';
  }

  cargarEstadisticasAdmin() {
    forkJoin({
      reservasResp: this.http.get<any>(`${this.apiUrl}/getReservas`).pipe(
        catchError(() => of({ Respuesta: [] }))
      ),
      recursosResp: this.http.get<any>(`${this.apiUrl}/getRecursos`).pipe(
        catchError(() => of({ Respuesta: [] }))
      )
    }).subscribe(({ reservasResp, recursosResp }) => {
      this.zone.run(() => {
        const reservasCrudas: any[] = Array.isArray(reservasResp)
          ? reservasResp
          : (reservasResp?.Respuesta || []);
        const recursos: any[] = Array.isArray(recursosResp)
          ? recursosResp
          : (recursosResp?.Respuesta || []);

        const reservas = reservasCrudas.map((item) => this.normalizarReserva(item));

        const mapaCatPorCodigo = new Map<string, string>();
        for (const rec of recursos) {
          const cod = String(rec.codigo || rec.strcodigo || '').trim().toUpperCase();
          const id = String(rec._id || '').trim();
          const cat = String(rec.categoria || rec.strcategoria || '').trim();
          if (cod) mapaCatPorCodigo.set(cod, cat);
          if (id) mapaCatPorCodigo.set(id, cat);
        }

        const { inicio, fin } = this.obtenerRangoSemanaActual();

        const conteoSemana: Record<'Libro' | 'Laboratorio' | 'Equipo AV', number> = {
          Libro: 0,
          Laboratorio: 0,
          'Equipo AV': 0
        };
        const conteoDia: Record<'Libro' | 'Laboratorio' | 'Equipo AV', number> = {
          Libro: 0,
          Laboratorio: 0,
          'Equipo AV': 0
        };

        for (const r of reservas) {
          const estado = r.estado.toLowerCase();
          if (estado === 'rechazada' || estado === 'cancelada') continue;
          if (!r.fecha) continue;

          const cod = r.codigoRecurso.toUpperCase();
          const rawCat = r.categoria || mapaCatPorCodigo.get(cod) || mapaCatPorCodigo.get(r.recursoId) || '';
          const categoria = this.normalizarCategoria(rawCat, cod);
          if (!categoria) continue;

          if (r.fecha >= inicio && r.fecha <= fin) {
            conteoSemana[categoria]++;
          }
          if (r.fecha === this.fechaHoy) {
            conteoDia[categoria]++;
          }
        }

        this.totalSemanalGeneral = conteoSemana.Libro + conteoSemana.Laboratorio + conteoSemana['Equipo AV'];
        this.totalDiarioGeneral = conteoDia.Libro + conteoDia.Laboratorio + conteoDia['Equipo AV'];

        const defs: Array<{ nombre: 'Libro' | 'Laboratorio' | 'Equipo AV'; sigla: string }> = [
          { nombre: 'Libro', sigla: 'LIB' },
          { nombre: 'Laboratorio', sigla: 'LAB' },
          { nombre: 'Equipo AV', sigla: 'AV' }
        ];

        this.estadisticasCategorias = defs.map((d) => ({
          nombre: d.nombre,
          sigla: d.sigla,
          totalSemana: conteoSemana[d.nombre],
          totalDia: conteoDia[d.nombre]
        }));

        this.cdr.detectChanges();
      });
    });
  }

  reservar(r: RecursoInicio) {
    this.router.navigate(['/nueva-reserva'], {
      queryParams: {
        id: r._id || '',
        codigo: r.codigo
      }
    });
  }

  cerrarSesion() {
    localStorage.removeItem('nexora_active_user');
    localStorage.removeItem('usuarioNexora');
    this.router.navigateByUrl('/login');
  }
}