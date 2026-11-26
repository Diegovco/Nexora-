import { HttpErrorResponse } from '@angular/common/http';

const MENSAJES: Record<string, string> = {
  BLOQUE_OCUPADO: 'Ese horario acaba de ocuparse. Elige otro bloque.',
  ANTICIPACION_INSUFICIENTE: 'Debes reservar con al menos 24 horas de anticipación.',
  FUERA_DE_RANGO: 'Solo puedes reservar dentro de los próximos 5 días.',
  MAX_BLOQUES: 'Puedes elegir como máximo 4 horas por solicitud.',
  NO_CONSECUTIVAS: 'Las horas deben ser consecutivas.',
  MOTIVO_REQUERIDO: 'Escribe el motivo de la reserva.',
  LIMITE_RESERVAS: 'Ya tienes 3 reservas activas. Cancela una para solicitar otra.',
  RECURSO_EN_MANTENIMIENTO: 'El laboratorio está en mantenimiento.',
  RECURSO_CON_RESERVAS: 'No se puede eliminar: tiene reservas activas.',
  RESERVA_YA_PROCESADA: 'Esta solicitud ya fue atendida.',
  SIN_PERMISO: 'No tienes permiso para esta acción.',
  API_KEY_REQUERIDA: 'Falta la clave de administración en environment.ts.',
  API_KEY_INVALIDA: 'La clave de administración no es válida o fue desactivada.',
  CODIGO_DUPLICADO: 'Ya existe un recurso con ese código.',
  DB_NO_DISPONIBLE: 'La API no tiene conexión con MongoDB. Revisa api-python/.env.',
  FECHA_INVALIDA: 'La fecha enviada no es válida.',
  HORARIO_INVALIDO: 'El horario elegido no es válido.',
};

export function codigoDeError(error: unknown): string | null {
  if (error instanceof HttpErrorResponse) {
    const detalle = error.error?.detail;
    if (detalle && typeof detalle === 'object' && 'codigo' in detalle) {
      return String((detalle as { codigo: string }).codigo);
    }
  }
  return null;
}

export function mensajeDeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No hay conexión con la API. Revisa que el servidor Python esté encendido.';
    }
    const detalle = error.error?.detail;
    if (typeof detalle === 'string') {
      return detalle;
    }
    if (detalle && typeof detalle === 'object') {
      const codigo = codigoDeError(error);
      const mensaje = (detalle as { mensaje?: string }).mensaje;
      if (codigo && MENSAJES[codigo]) {
        return MENSAJES[codigo];
      }
      if (mensaje) {
        return mensaje;
      }
    }
    if (error.status === 503) {
      return 'La API está en línea pero sin conexión con MongoDB.';
    }
    return `La operación falló (HTTP ${error.status}).`;
  }
  return 'Ocurrió un error inesperado. Vuelve a intentarlo.';
}
