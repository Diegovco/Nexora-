"""Recursos de cómputo, catálogo y disponibilidad por fecha."""

import re
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query

from .. import db
from ..config import ajustes
from ..db import requiere_mongo
from ..errores import error_api
from ..tiempo import (
    ahora_local,
    construir_inicio,
    dias_para_selector,
    fuera_de_rango,
    hora_a_minutos,
    minutos_a_hora,
    parse_fecha,
)

router = APIRouter(prefix="/computo", tags=["cómputo"], dependencies=[Depends(requiere_mongo)])


def obtener_recurso(codigo: str) -> dict:
    recurso = db.recursos().find_one({"codigo": codigo}, {"_id": 0})
    if recurso is None:
        error_api("RECURSO_NO_ENCONTRADO", f"No existe el recurso {codigo}.", 404)
    return recurso


def construir_slots(recurso: dict, fecha: date, motivo_rango: str | None) -> list[dict]:
    horario = recurso.get("horario") or {"inicio": "07:00", "fin": "20:00", "duracionBloque": 60}
    duracion = max(15, int(horario.get("duracionBloque", 60)))
    apertura = hora_a_minutos(horario.get("inicio", "07:00"))
    cierre = hora_a_minutos(horario.get("fin", "20:00"))

    apartados = {
        bloque["hora"]: bloque["reservaId"]
        for bloque in db.bloques().find(
            {"recursoCodigo": recurso["codigo"], "fecha": fecha.isoformat()}, {"_id": 0}
        )
    }

    ahora = ahora_local()
    minimo = ahora + timedelta(hours=ajustes.anticipacion_horas)
    slots: list[dict] = []

    for minutos in range(apertura, cierre - duracion + 1, duracion):
        hora = minutos_a_hora(minutos)
        hora_fin = minutos_a_hora(minutos + duracion)
        inicio = construir_inicio(fecha.isoformat(), hora)

        if recurso["estado"] == "Mantenimiento":
            estado = "mantenimiento"
        elif recurso["estado"] == "Prestado":
            estado = "mantenimiento"
        elif motivo_rango is not None:
            estado = "no_disponible"
        elif inicio < minimo:
            estado = "no_disponible"
        elif hora in apartados:
            estado = "ocupado"
        else:
            estado = "libre"

        slot = {"hora": hora, "horaFin": hora_fin, "estado": estado}
        if estado == "ocupado":
            slot["reservaId"] = apartados[hora]
        slots.append(slot)

    return slots


@router.get("/recursos")
def listar_recursos(
    categoria: str | None = Query(default=None),
    texto: str | None = Query(default=None),
) -> list[dict]:
    filtro: dict = {}
    if categoria and categoria != "Todos":
        filtro["categoria"] = categoria
    if texto:
        patron = re.escape(texto.strip())
        filtro["$or"] = [
            {"nombre": {"$regex": patron, "$options": "i"}},
            {"codigo": {"$regex": patron, "$options": "i"}},
            {"ubicacion": {"$regex": patron, "$options": "i"}},
        ]
    return list(db.recursos().find(filtro, {"_id": 0}).sort("nombre", 1))


@router.get("/recursos/{codigo}")
def detalle_recurso(codigo: str) -> dict:
    return obtener_recurso(codigo)


@router.get("/disponibilidad")
def disponibilidad(codigo: str, fecha: str | None = Query(default=None)) -> dict:
    recurso = obtener_recurso(codigo)
    ahora = ahora_local()
    dias = dias_para_selector(ahora)
    fecha_texto = fecha or dias[0]["fecha"]

    try:
        fecha_dia = parse_fecha(fecha_texto)
    except ValueError:
        error_api("FECHA_INVALIDA", "La fecha debe tener el formato AAAA-MM-DD.", 400)

    motivo = None
    if fuera_de_rango(fecha_dia, ahora):
        motivo = f"Solo puedes reservar del {dias[0]['etiqueta']} al {dias[-1]['etiqueta']}."
    if recurso["estado"] == "Mantenimiento":
        motivo = f"{recurso['nombre']} está en mantenimiento. No hay horarios disponibles."

    return {
        "recurso": recurso,
        "fecha": fecha_texto,
        "dias": dias,
        "slots": construir_slots(recurso, fecha_dia, motivo),
        "motivoBloqueo": motivo,
    }
