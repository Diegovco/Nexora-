"""Solicitudes de reserva del estudiante."""

from datetime import timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, Query
from pymongo.errors import DuplicateKeyError

from .. import db
from ..avisos import avisar_cancelada, avisar_solicitud
from ..config import ajustes
from ..db import requiere_mongo
from ..errores import error_api
from ..schemas import Cancelacion, ReservaCrear
from ..tiempo import (
    ahora_local,
    construir_inicio,
    fuera_de_rango,
    hora_a_minutos,
    parse_fecha,
    rango_horas,
    sello_utc,
    son_consecutivas,
)
from .computo import obtener_recurso

router = APIRouter(prefix="/computo", tags=["reservas"], dependencies=[Depends(requiere_mongo)])

ESTADOS_ACTIVOS = ("pendiente", "aprobada")


def es_futura(reserva: dict) -> bool:
    ahora = ahora_local()
    fecha = parse_fecha(reserva["fecha"])
    if fecha > ahora.date():
        return True
    if fecha < ahora.date():
        return False
    return hora_a_minutos(reserva["horaFin"]) > ahora.hour * 60 + ahora.minute


def validar_solicitud(payload: ReservaCrear, recurso: dict) -> tuple[list[str], int, str]:
    horario = recurso.get("horario") or {"inicio": "07:00", "fin": "20:00", "duracionBloque": 60}
    duracion = max(15, int(horario.get("duracionBloque", 60)))
    apertura = hora_a_minutos(horario.get("inicio", "07:00"))
    cierre = hora_a_minutos(horario.get("fin", "20:00"))

    if recurso["estado"] == "Mantenimiento":
        error_api(
            "RECURSO_EN_MANTENIMIENTO",
            f"{recurso['nombre']} está en mantenimiento y no puede reservarse.",
            400,
        )

    if len(payload.motivo.strip()) < 5:
        error_api("MOTIVO_REQUERIDO", "Escribe el motivo de la reserva (mínimo 5 caracteres).", 400)

    horas = payload.horas
    if not horas:
        error_api("HORARIO_INVALIDO", "Selecciona al menos una hora.", 400)
    if len(horas) > ajustes.max_bloques:
        error_api(
            "MAX_BLOQUES",
            f"Puedes reservar como máximo {ajustes.max_bloques} horas por solicitud.",
            400,
        )

    for hora in horas:
        try:
            minutos = hora_a_minutos(hora)
        except ValueError:
            error_api("HORARIO_INVALIDO", f"La hora {hora} no es válida.", 400)
        if minutos < apertura or minutos + duracion > cierre:
            error_api(
                "HORARIO_INVALIDO",
                f"{hora} está fuera del horario de atención ({horario['inicio']}–{horario['fin']}).",
                400,
            )

    if not son_consecutivas(horas, duracion):
        error_api("NO_CONSECUTIVAS", "Las horas deben ser consecutivas.", 400)

    try:
        fecha = parse_fecha(payload.fecha)
    except ValueError:
        error_api("FECHA_INVALIDA", "La fecha debe tener el formato AAAA-MM-DD.", 400)

    if fuera_de_rango(fecha):
        error_api(
            "FUERA_DE_RANGO",
            f"Solo puedes reservar dentro de los próximos {ajustes.dias_disponibles} días.",
            400,
        )

    hora_inicio, _ = rango_horas(horas, duracion)
    inicio = construir_inicio(payload.fecha, hora_inicio)
    if inicio < ahora_local() + timedelta(hours=ajustes.anticipacion_horas):
        error_api(
            "ANTICIPACION_INSUFICIENTE",
            f"Debes reservar con al menos {ajustes.anticipacion_horas} horas de anticipación.",
            400,
        )

    activas = db.reservas().count_documents(
        {
            "usuarioId": payload.usuarioId,
            "estado": {"$in": list(ESTADOS_ACTIVOS)},
            "fecha": {"$gte": ahora_local().date().isoformat()},
        }
    )
    if activas >= ajustes.max_reservas_activas:
        error_api(
            "LIMITE_RESERVAS",
            f"Ya tienes {ajustes.max_reservas_activas} reservas activas. Cancela una para solicitar otra.",
            400,
        )

    return horas, duracion, hora_inicio


@router.post("/reservas", status_code=201)
def crear_reserva(payload: ReservaCrear) -> dict:
    recurso = obtener_recurso(payload.recursoCodigo)
    horas, duracion, hora_inicio = validar_solicitud(payload, recurso)
    _, hora_fin = rango_horas(horas, duracion)

    reserva_id = uuid4().hex
    documento = {
        "id": reserva_id,
        "folio": f"RES-{reserva_id[:6].upper()}",
        "recursoCodigo": recurso["codigo"],
        "recursoNombre": recurso["nombre"],
        "usuarioId": payload.usuarioId,
        "usuarioNombre": payload.usuarioNombre,
        "fecha": payload.fecha,
        "horaInicio": hora_inicio,
        "horaFin": hora_fin,
        "horas": horas,
        "motivo": payload.motivo,
        "estado": "pendiente",
        "aprobadaPor": None,
        "motivoRechazo": None,
        "creadaEn": sello_utc(),
        "actualizadaEn": sello_utc(),
    }

    db.reservas().insert_one(dict(documento))

    insertadas: list[str] = []
    for hora in horas:
        bloque = {
            "recursoCodigo": recurso["codigo"],
            "fecha": payload.fecha,
            "hora": hora,
            "reservaId": reserva_id,
        }
        try:
            db.bloques().insert_one(bloque)
            insertadas.append(hora)
        except DuplicateKeyError as error:
            # Rollback: libera lo insertado por esta reserva y borra la reserva.
            db.bloques().delete_many({"reservaId": reserva_id})
            db.reservas().delete_one({"id": reserva_id})
            conflicto = error.details.get("keyValue", {}).get("hora", hora) if error.details else hora
            error_api(
                "BLOQUE_OCUPADO",
                f"El bloque {conflicto} acaba de ser reservado por otra persona. Elige otro horario.",
                409,
                horas=[conflicto],
            )

    avisar_solicitud(documento)
    return documento


@router.get("/reservas")
def listar_reservas(usuarioId: str = Query(min_length=3)) -> dict:
    documentos = list(db.reservas().find({"usuarioId": usuarioId}, {"_id": 0}))
    proximas = [reserva for reserva in documentos if reserva["estado"] in ESTADOS_ACTIVOS and es_futura(reserva)]
    historial = [reserva for reserva in documentos if reserva not in proximas]

    proximas.sort(key=lambda reserva: (reserva["fecha"], reserva["horaInicio"]))
    historial.sort(key=lambda reserva: reserva["creadaEn"], reverse=True)

    ahora = ahora_local()
    limite = ahora + timedelta(hours=48)
    por_vencer = 0
    for reserva in proximas:
        inicio = construir_inicio(reserva["fecha"], reserva["horaInicio"])
        if ahora < inicio <= limite:
            por_vencer += 1

    return {
        "proximas": proximas,
        "historial": historial,
        "resumen": {
            "activas": len(proximas),
            "limite": ajustes.max_reservas_activas,
            "porVencer": por_vencer,
            "pendientes": len([reserva for reserva in proximas if reserva["estado"] == "pendiente"]),
        },
    }


@router.patch("/reservas/{reserva_id}/cancelar")
def cancelar_reserva(reserva_id: str, payload: Cancelacion) -> dict:
    reserva = db.reservas().find_one({"id": reserva_id}, {"_id": 0})
    if reserva is None:
        error_api("RESERVA_NO_ENCONTRADA", "La reserva no existe.", 404)
    if reserva["usuarioId"] != payload.usuarioId:
        error_api("SIN_PERMISO", "No puedes cancelar una reserva de otra persona.", 403)
    if reserva["estado"] not in ESTADOS_ACTIVOS:
        error_api("ESTADO_INVALIDO", "Esta reserva ya no se puede cancelar.", 409)

    db.reservas().update_one(
        {"id": reserva_id},
        {"$set": {"estado": "cancelada", "actualizadaEn": sello_utc()}},
    )
    db.bloques().delete_many({"reservaId": reserva_id})
    avisar_cancelada(reserva)
    reserva["estado"] = "cancelada"
    return reserva
