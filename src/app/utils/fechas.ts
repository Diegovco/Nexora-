const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function aFecha(iso: string): Date {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

export function fechaCorta(iso: string): string {
  const fecha = aFecha(iso);
  return `${DIAS_CORTOS[fecha.getDay()]} ${fecha.getDate()} ${MESES[fecha.getMonth()].slice(0, 3)}`;
}

export function fechaLarga(iso: string): string {
  const fecha = aFecha(iso);
  return `${DIAS_LARGOS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

export function horaDeSello(sello: string): string {
  const fecha = new Date(sello);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }
  return `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

export function esHoy(sello: string): boolean {
  const fecha = new Date(sello);
  const hoy = new Date();
  return (
    fecha.getDate() === hoy.getDate() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getFullYear() === hoy.getFullYear()
  );
}

export function sumarMinutos(hora: string, minutos: number): string {
  const [horas, mins] = hora.split(':').map(Number);
  const total = horas * 60 + mins + minutos;
  return `${dosDigitos(Math.floor(total / 60))}:${dosDigitos(total % 60)}`;
}
