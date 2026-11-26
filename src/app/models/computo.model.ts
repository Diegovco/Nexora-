export type EstadoRecurso = 'Disponible' | 'Mantenimiento' | 'Prestado';
export type CategoriaRecurso = 'Laboratorio' | 'Libro' | 'Equipo AV';
export type EstadoReserva = 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada' | 'completada';
export type EstadoBloque = 'libre' | 'ocupado' | 'mantenimiento' | 'pasado' | 'no_disponible';
export type TipoAviso = 'exito' | 'info' | 'alerta' | 'error';

export interface Horario {
  inicio: string;
  fin: string;
  duracionBloque: number;
}

export interface Recurso {
  codigo: string;
  nombre: string;
  categoria: CategoriaRecurso;
  ubicacion: string;
  estado: EstadoRecurso;
  equipos: number;
  horario: Horario;
  descripcion: string;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface Bloque {
  hora: string;
  horaFin: string;
  estado: EstadoBloque;
  reservaId?: string;
}

export interface Dia {
  fecha: string;
  dia: string;
  numero: number;
  etiqueta: string;
  esHoy: boolean;
  disponible: boolean;
}

export interface Disponibilidad {
  recurso: Recurso;
  fecha: string;
  dias: Dia[];
  slots: Bloque[];
  motivoBloqueo: string | null;
}

export interface Reserva {
  id: string;
  folio: string;
  recursoCodigo: string;
  recursoNombre: string;
  usuarioId: string;
  usuarioNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  horas: string[];
  motivo: string;
  estado: EstadoReserva;
  aprobadaPor?: string | null;
  motivoRechazo?: string | null;
  creadaEn: string;
  actualizadaEn: string;
}

export interface ResumenReservas {
  activas: number;
  limite: number;
  porVencer: number;
  pendientes: number;
}

export interface RespuestaReservas {
  proximas: Reserva[];
  historial: Reserva[];
  resumen: ResumenReservas;
}

export interface Aviso {
  id: string;
  usuarioId: string;
  tipo: TipoAviso;
  titulo: string;
  mensaje: string;
  recursoCodigo?: string | null;
  reservaId?: string | null;
  leido: boolean;
  creadoEn: string;
}

export interface RespuestaAvisos {
  avisos: Aviso[];
  sinLeer: number;
}

export interface NuevaReserva {
  recursoCodigo: string;
  fecha: string;
  horas: string[];
  motivo: string;
  usuarioId: string;
  usuarioNombre: string;
}

export interface RespuestaPendientes {
  reservas: Reserva[];
  total: number;
}
