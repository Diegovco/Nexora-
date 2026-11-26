"""Utilidades de fecha y hora en la zona horaria de la institución."""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from .config import ajustes

DIAS_CORTOS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]
DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
MESES = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
]


def zona() -> ZoneInfo:
    return ZoneInfo(ajustes.zona_horaria)


def ahora_local() -> datetime:
    return datetime.now(zona())


def hoy_str(ahora: datetime | None = None) -> str:
    return (ahora or ahora_local()).date().isoformat()


def sello_utc() -> str:
    return datetime.now(ZoneInfo("UTC")).isoformat().replace("+00:00", "Z")


def parse_fecha(valor: str) -> date:
    return date.fromisoformat(valor)


def hora_a_minutos(valor: str) -> int:
    horas, minutos = valor.split(":")
    return int(horas) * 60 + int(minutos)


def minutos_a_hora(minutos: int) -> str:
    return f"{minutos // 60:02d}:{minutos % 60:02d}"


def construir_inicio(fecha: str, hora: str) -> datetime:
    return datetime.combine(parse_fecha(fecha), time.fromisoformat(hora), tzinfo=zona())


def fecha_minima(ahora: datetime | None = None) -> date:
    """Primer día reservable respetando la anticipación mínima."""
    base = ahora or ahora_local()
    return (base + timedelta(hours=ajustes.anticipacion_horas)).date()


def fechas_disponibles(ahora: datetime | None = None) -> list[date]:
    base = ahora or ahora_local()
    primera = fecha_minima(base)
    return [primera + timedelta(days=indice) for indice in range(ajustes.dias_disponibles)]


def fuera_de_rango(fecha: date, ahora: datetime | None = None) -> bool:
    return fecha not in fechas_disponibles(ahora)


def dias_para_selector(ahora: datetime | None = None) -> list[dict]:
    base = ahora or ahora_local()
    dias = []
    for fecha in fechas_disponibles(base):
        dias.append(
            {
                "fecha": fecha.isoformat(),
                "dia": DIAS_CORTOS[fecha.weekday()],
                "numero": fecha.day,
                "etiqueta": formatear_fecha_corta(fecha),
                "esHoy": fecha == base.date(),
                "disponible": True,
            }
        )
    return dias


def formatear_fecha_corta(fecha: date | str) -> str:
    valor = parse_fecha(fecha) if isinstance(fecha, str) else fecha
    return f"{DIAS_CORTOS[valor.weekday()]} {valor.day} {MESES[valor.month - 1][:3]}"


def formatear_fecha_larga(fecha: date | str) -> str:
    valor = parse_fecha(fecha) if isinstance(fecha, str) else fecha
    return f"{DIAS_LARGOS[valor.weekday()]} {valor.day} de {MESES[valor.month - 1]}"


def rango_horas(horas: list[str], duracion: int) -> tuple[str, str]:
    ordenadas = sorted(horas, key=hora_a_minutos)
    inicio = ordenadas[0]
    fin = minutos_a_hora(hora_a_minutos(ordenadas[-1]) + duracion)
    return inicio, fin


def son_consecutivas(horas: list[str], duracion: int) -> bool:
    ordenadas = sorted(horas, key=hora_a_minutos)
    for indice in range(1, len(ordenadas)):
        if hora_a_minutos(ordenadas[indice]) - hora_a_minutos(ordenadas[indice - 1]) != duracion:
            return False
    return True
