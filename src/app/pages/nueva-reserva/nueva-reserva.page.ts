import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
  IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline } from 'ionicons/icons';
import { environment } from '../../../environments/environment';

interface DiaEscolar {
  fechaISO: string;
  diaCorto: string;
  numeroDia: string;
  fechaLarga: string;
}

interface SlotHorario {
  hora: string;
  horaSiguiente: string;
  ocupado: boolean;
  seleccionado: boolean;
}

@Component({
  selector: 'app-nueva-reserva',
  templateUrl: './nueva-reserva.page.html',
  styleUrls: ['./nueva-reserva.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    IonIcon
  ]
})
export class NuevaReservaPage implements OnInit {
  private apiUrl = environment.apiUrl;

  recurso: any = {
    _id: '',
    codigo: '',
    nombre: '',
    categoria: '',
    ubicacion: '',
    estado: 'Disponible'
  };

  solicitante = '';
  solicitanteBloqueado = false;
  usuarioCorreo = '';
  usuarioMatricula = '';

  diasDisponibles: DiaEscolar[] = [];
  fecha = '';
  fechaLargaSeleccionada = '';

  // Horario escolar de 07:00 a 15:00 (bloques de 1 hora hasta las 16:00)
  private readonly horasEscolares = [
    '07:00',
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00'
  ];

  slotsHorario: SlotHorario[] = [];
  reservasExistentes: any[] = [];

  horaInicio = '';
  horaFin = '';
  motivo = '';
  enviando = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    addIcons({ chevronBackOutline });
  }

  ngOnInit() {
    this.cargarDatosSolicitante();
    this.generarDiasEscolares();

    this.route.queryParamMap.subscribe((params) => {
      const id = params.get('id');
      const codigo = params.get('codigo');
      if (id || codigo) {
        this.cargarRecurso(id, codigo);
      } else {
        this.cargarReservasOcupadas();
      }
    });
  }

  private cargarDatosSolicitante() {
    const raw = localStorage.getItem('nexora_active_user') || localStorage.getItem('usuarioNexora');
    if (!raw) return;

    try {
      const u = JSON.parse(raw);
      const nombre = String(u.strnombre || u.nombre || '').trim();
      const apellido = String(u.strapellido || u.apellido || '').trim();
      const nombreCompleto = apellido && !nombre.toLowerCase().includes(apellido.toLowerCase())
        ? `${nombre} ${apellido}`.trim()
        : nombre;

      this.usuarioMatricula = String(u.strmatricula || u.matricula || '').trim();
      this.usuarioCorreo = String(u.strcorreoUsuario || u.correo || u.email || '').trim();

      if (nombreCompleto && this.usuarioMatricula) {
        this.solicitante = `${nombreCompleto} - ${this.usuarioMatricula}`;
        this.solicitanteBloqueado = true;
      } else if (this.usuarioMatricula || nombreCompleto || this.usuarioCorreo) {
        this.solicitante = this.usuarioMatricula || nombreCompleto || this.usuarioCorreo;
        this.solicitanteBloqueado = true;
      }
    } catch {}
  }

  private generarDiasEscolares() {
    const diasCortos = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const diasLargos = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const lista: DiaEscolar[] = [];
    const cursor = new Date();

    while (lista.length < 5) {
      const diaSemana = cursor.getDay();
      // Solo días escolares: Lunes (1) a Viernes (5)
      if (diaSemana >= 1 && diaSemana <= 5) {
        const yyyy = cursor.getFullYear();
        const mm = String(cursor.getMonth() + 1).padStart(2, '0');
        const dd = String(cursor.getDate()).padStart(2, '0');

        lista.push({
          fechaISO: `${yyyy}-${mm}-${dd}`,
          diaCorto: diasCortos[diaSemana],
          numeroDia: String(cursor.getDate()),
          fechaLarga: `${diasLargos[diaSemana]} ${cursor.getDate()} de ${meses[cursor.getMonth()]}`
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    this.diasDisponibles = lista;
    if (this.diasDisponibles.length > 0) {
      this.fecha = this.diasDisponibles[0].fechaISO;
      this.fechaLargaSeleccionada = this.diasDisponibles[0].fechaLarga;
    }
  }

  cargarRecurso(id: string | null, codigo: string | null) {
    this.http.get<any>(`${this.apiUrl}/getRecursos`).subscribe({
      next: (resp) => {
        this.zone.run(() => {
          const lista = Array.isArray(resp) ? resp : (resp?.Respuesta || []);
          const encontrado = lista.find((item: any) =>
            (id && String(item._id) === String(id)) ||
            (codigo && String(item.codigo || item.strcodigo) === String(codigo))
          );

          if (encontrado) {
            this.recurso = {
              _id: encontrado._id || '',
              codigo: encontrado.codigo || encontrado.strcodigo || '',
              nombre: encontrado.nombre || encontrado.strnombre || '',
              categoria: encontrado.categoria || encontrado.strcategoria || '',
              ubicacion: encontrado.ubicacion || encontrado.strubicacion || '',
              estado: encontrado.estado || encontrado.strestado || 'Disponible'
            };
          }
          this.cargarReservasOcupadas();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al cargar el recurso:', err);
        this.cargarReservasOcupadas();
      }
    });
  }

  cargarReservasOcupadas() {
    this.http.get<any>(`${this.apiUrl}/getReservas`).subscribe({
      next: (resp) => {
        this.zone.run(() => {
          this.reservasExistentes = Array.isArray(resp) ? resp : (resp?.Respuesta || []);
          this.actualizarSlotsDisponibles();
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.reservasExistentes = [];
        this.actualizarSlotsDisponibles();
      }
    });
  }

  seleccionarDia(dia: DiaEscolar) {
    this.fecha = dia.fechaISO;
    this.fechaLargaSeleccionada = dia.fechaLarga;
    this.horaInicio = '';
    this.horaFin = '';
    this.actualizarSlotsDisponibles();
  }

  private aMinutos(hhmm: string): number {
    const [h, m] = (hhmm || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  private sumarUnaHora(hhmm: string): string {
    const [h, m] = hhmm.split(':').map(Number);
    return `${String(h + 1).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
  }

  actualizarSlotsDisponibles() {
    const codActual = String(this.recurso.codigo || '').trim().toLowerCase();
    const idActual = String(this.recurso._id || '').trim();

    // Filtrar reservas activas del mismo recurso en la fecha elegida
    const delDia = this.reservasExistentes.filter((r: any) => {
      const estado = String(r.estado || r.strestado || '').toLowerCase();
      if (estado === 'rechazada' || estado === 'cancelada' || estado === 'atendida') {
        return false;
      }

      const fechaRes = String(r.fecha || r.strfecha || '').slice(0, 10);
      if (fechaRes !== this.fecha) return false;

      const codRes = String(r.codigoRecurso || r.codigo || '').trim().toLowerCase();
      const idRes = String(r.recursoId || '').trim();

      return (codActual && codRes === codActual) || (idActual && idRes === idActual);
    });

    this.slotsHorario = this.horasEscolares.map((hora) => {
      const horaSig = this.sumarUnaHora(hora);
      const iniSlot = this.aMinutos(hora);
      const finSlot = this.aMinutos(horaSig);

      const ocupado = delDia.some((r: any) => {
        const iniRes = this.aMinutos(String(r.horaInicio || r.strhoraInicio || '00:00'));
        const finRes = this.aMinutos(String(r.horaFin || r.strhoraFin || '00:00'));
        return iniSlot < finRes && finSlot > iniRes;
      });

      return {
        hora,
        horaSiguiente: horaSig,
        ocupado,
        seleccionado: false
      };
    });
  }

  toggleSlot(slot: SlotHorario) {
    if (slot.ocupado) return;

    slot.seleccionado = !slot.seleccionado;
    const elegidos = this.slotsHorario.filter((s) => s.seleccionado);

    if (elegidos.length === 0) {
      this.horaInicio = '';
      this.horaFin = '';
      return;
    }

    // Asegurar rango continuo entre el primer y último bloque marcado
    const idxPrimero = this.slotsHorario.indexOf(elegidos[0]);
    const idxUltimo = this.slotsHorario.indexOf(elegidos[elegidos.length - 1]);

    // Si hay un bloque ocupado en medio, dejar solo el último clicado
    const hayOcupadoEnMedio = this.slotsHorario
      .slice(idxPrimero, idxUltimo + 1)
      .some((s) => s.ocupado);

    if (hayOcupadoEnMedio) {
      this.slotsHorario.forEach((s) => (s.seleccionado = s === slot));
      this.horaInicio = slot.hora;
      this.horaFin = slot.horaSiguiente;
      return;
    }

    for (let i = idxPrimero; i <= idxUltimo; i++) {
      this.slotsHorario[i].seleccionado = true;
    }

    this.horaInicio = this.slotsHorario[idxPrimero].hora;
    this.horaFin = this.slotsHorario[idxUltimo].horaSiguiente;
  }

  confirmarReserva() {
    if (!this.solicitante.trim() || !this.fecha || !this.horaInicio || !this.horaFin) {
      alert('Selecciona un día y al menos un horario disponible.');
      return;
    }

    const nuevaReserva = {
      recursoId: this.recurso._id,
      codigoRecurso: this.recurso.codigo,
      nombreRecurso: this.recurso.nombre,
      ubicacion: this.recurso.ubicacion,
      solicitante: this.solicitante.trim(),
      matricula: this.usuarioMatricula,
      correo: this.usuarioCorreo,
      fecha: this.fecha,
      horaInicio: this.horaInicio,
      horaFin: this.horaFin,
      motivo: this.motivo.trim(),
      estado: 'Pendiente'
    };

    this.enviando = true;
    this.http.post(`${this.apiUrl}/reservas`, nuevaReserva).subscribe({
      next: () => {
        this.enviando = false;
        alert('Solicitud de reserva enviada para ' + this.recurso.nombre);
        this.router.navigateByUrl('/inicio');
      },
      error: () => {
        this.enviando = false;
        alert('Error al registrar la reserva. Verifica que el endpoint POST /reservas exista en Flask.');
      }
    });
  }

  cancelar() {
    this.router.navigateByUrl('/inicio');
  }
}