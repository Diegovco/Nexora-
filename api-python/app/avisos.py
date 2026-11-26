"""Generación de avisos. Cada aviso tiene una clave única para no duplicarse."""

from datetime import timedelta
from uuid import uuid4

from pymongo.errors import DuplicateKeyError

from . import db
from .config import ajustes
from .tiempo import (
    ahora_local,
    construir_inicio,
    formatear_fecha_corta,
    sello_utc,
)

TITULOS = {
    "solicitud": "Solicitud enviada",
    "aprobada": "Reserva aprobada",
    "rechazada": "Reserva rechazada",
    "cancelada": "Reserva cancelada",
    "recordatorio": "Tu reserva empieza pronto",
    "mantenimiento": "Tu reserva está en mantenimiento",
    "listo": "Laboratorio listo",
}


def crear_aviso(
    usuario_id: str,
    tipo: str,
    titulo: str,
    mensaje: str,
    *,
    recurso_codigo: str | None = None,
    reserva_id: str | None = None,
    clave: str | None = None,
) -> None:
    documento = {
        "id": uuid4().hex,
        "usuarioId": usuario_id,
        "tipo": tipo,
        "titulo": titulo,
        "mensaje": mensaje,
        "recursoCodigo": recurso_codigo,
        "reservaId": reserva_id,
        "leido": False,
        "claveUnica": clave or uuid4().hex,
        "creadoEn": sello_utc(),
    }
    try:
        db.avisos().update_one(
            {"claveUnica": documento["claveUnica"]},
            {"$setOnInsert": documento},
            upsert=True,
        )
    except DuplicateKeyError:
        # Otro proceso generó el mismo aviso al mismo tiempo: no se duplica.
        pass


def rango_texto(reserva: dict) -> str:
    return f"{formatear_fecha_corta(reserva['fecha'])}, de {reserva['horaInicio']} a {reserva['horaFin']}"


def avisar_solicitud(reserva: dict) -> None:
    crear_aviso(
        reserva["usuarioId"],
        "info",
        TITULOS["solicitud"],
        f"Tu solicitud para {reserva['recursoNombre']} el {rango_texto(reserva)} quedó pendiente de aprobación.",
        recurso_codigo=reserva["recursoCodigo"],
        reserva_id=reserva["id"],
        clave=f"solicitud:{reserva['id']}",
    )


def avisar_aprobada(reserva: dict) -> None:
    crear_aviso(
        reserva["usuarioId"],
        "exito",
        TITULOS["aprobada"],
        f"{reserva['recursoNombre']} · {rango_texto(reserva)}. Llega 10 minutos antes y presenta tu credencial.",
        recurso_codigo=reserva["recursoCodigo"],
        reserva_id=reserva["id"],
        clave=f"aprobada:{reserva['id']}",
    )


def avisar_rechazada(reserva: dict, motivo: str) -> None:
    crear_aviso(
        reserva["usuarioId"],
        "error",
        TITULOS["rechazada"],
        f"{reserva['recursoNombre']} · {rango_texto(reserva)}. Motivo: {motivo}",
        recurso_codigo=reserva["recursoCodigo"],
        reserva_id=reserva["id"],
        clave=f"rechazada:{reserva['id']}",
    )


def avisar_cancelada(reserva: dict) -> None:
    crear_aviso(
        reserva["usuarioId"],
        "info",
        TITULOS["cancelada"],
        f"Cancelaste {reserva['recursoNombre']} del {rango_texto(reserva)}. El horario quedó libre.",
        recurso_codigo=reserva["recursoCodigo"],
        reserva_id=reserva["id"],
        clave=f"cancelada:{reserva['id']}",
    )


def avisar_mantenimiento(recurso: dict, evento: str) -> None:
    afectadas = db.reservas().find(
        {
            "recursoCodigo": recurso["codigo"],
            "estado": {"$in": ["pendiente", "aprobada"]},
            "fecha": {"$gte": ahora_local().date().isoformat()},
        }
    )
    for reserva in afectadas:
        crear_aviso(
            reserva["usuarioId"],
            "alerta",
            TITULOS["mantenimiento"],
            f"{recurso['nombre']} pasó a mantenimiento. Tu reserva del {rango_texto(reserva)} queda en revisión; el encargado te confirmará.",
            recurso_codigo=recurso["codigo"],
            reserva_id=reserva["id"],
            clave=f"mantenimiento:{evento}:{reserva['id']}",
        )


def avisar_listo(recurso: dict, evento: str) -> None:
    afectadas = db.reservas().find(
        {
            "recursoCodigo": recurso["codigo"],
            "estado": {"$in": ["pendiente", "aprobada"]},
            "fecha": {"$gte": ahora_local().date().isoformat()},
        }
    )
    for reserva in afectadas:
        estado = "sigue en pie" if reserva["estado"] == "aprobada" else "queda pendiente de aprobación"
        crear_aviso(
            reserva["usuarioId"],
            "exito",
            TITULOS["listo"],
            f"{recurso['nombre']} ya está disponible. Tu reserva del {rango_texto(reserva)} {estado}.",
            recurso_codigo=recurso["codigo"],
            reserva_id=reserva["id"],
            clave=f"listo:{evento}:{reserva['id']}",
        )


def generar_recordatorios(usuario_id: str) -> None:
    """Crea el recordatorio de las reservas aprobadas que empiezan dentro del aviso configurado."""
    ahora = ahora_local()
    limite = ahora + timedelta(hours=ajustes.recordatorio_horas)
    proximas = db.reservas().find(
        {
            "usuarioId": usuario_id,
            "estado": "aprobada",
            "fecha": {"$in": [ahora.date().isoformat(), limite.date().isoformat()]},
        }
    )
    for reserva in proximas:
        inicio = construir_inicio(reserva["fecha"], reserva["horaInicio"])
        if ahora < inicio <= limite:
            crear_aviso(
                reserva["usuarioId"],
                "alerta",
                TITULOS["recordatorio"],
                f"{reserva['recursoNombre']} · hoy de {reserva['horaInicio']} a {reserva['horaFin']} ({rango_texto(reserva)}).",
                recurso_codigo=reserva["recursoCodigo"],
                reserva_id=reserva["id"],
                clave=f"recordatorio:{reserva['id']}",
            )
