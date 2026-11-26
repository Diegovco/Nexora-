"""Bandeja de administración: aprobaciones, inventario y estado de laboratorios."""

from uuid import uuid4

from fastapi import APIRouter, Depends
from pymongo.errors import DuplicateKeyError

from .. import db
from ..avisos import avisar_aprobada, avisar_listo, avisar_mantenimiento, avisar_rechazada
from ..db import requiere_mongo
from ..errores import error_api
from ..schemas import Aprobacion, CambioEstado, Rechazo, RecursoActualizar, RecursoCrear
from ..security import requiere_admin
from ..tiempo import ahora_local, sello_utc
from .computo import obtener_recurso

router = APIRouter(
    prefix="/computo",
    tags=["administración"],
    dependencies=[Depends(requiere_mongo), Depends(requiere_admin)],
)

PREFIJOS = {"Laboratorio": "LAB", "Libro": "LIB", "Equipo AV": "AV"}


def siguiente_codigo(categoria: str, codigo: str | None) -> str:
    if codigo:
        return codigo.strip().upper()

    prefijo = PREFIJOS.get(categoria, "AV")
    mayor = 0
    for recurso in db.recursos().find({"codigo": {"$regex": f"^{prefijo}-"}}, {"codigo": 1}):
        try:
            numero = int(str(recurso["codigo"]).split("-")[1])
        except (IndexError, ValueError):
            continue
        mayor = max(mayor, numero)
    return f"{prefijo}-{mayor + 1:03d}"


def obtener_reserva(reserva_id: str) -> dict:
    reserva = db.reservas().find_one({"id": reserva_id}, {"_id": 0})
    if reserva is None:
        error_api("RESERVA_NO_ENCONTRADA", "La reserva no existe.", 404)
    return reserva


@router.get("/reservas/pendientes")
def reservas_pendientes() -> dict:
    pendientes = list(
        db.reservas()
        .find({"estado": "pendiente"}, {"_id": 0})
        .sort([("fecha", 1), ("horaInicio", 1)])
    )
    return {"reservas": pendientes, "total": len(pendientes)}


@router.patch("/reservas/{reserva_id}/aprobar")
def aprobar_reserva(reserva_id: str, payload: Aprobacion) -> dict:
    reserva = obtener_reserva(reserva_id)
    if reserva["estado"] != "pendiente":
        error_api("RESERVA_YA_PROCESADA", "Esta solicitud ya fue atendida.", 409)

    db.reservas().update_one(
        {"id": reserva_id},
        {
            "$set": {
                "estado": "aprobada",
                "aprobadaPor": payload.adminNombre,
                "actualizadaEn": sello_utc(),
            }
        },
    )
    reserva["estado"] = "aprobada"
    reserva["aprobadaPor"] = payload.adminNombre
    avisar_aprobada(reserva)
    return reserva


@router.patch("/reservas/{reserva_id}/rechazar")
def rechazar_reserva(reserva_id: str, payload: Rechazo) -> dict:
    reserva = obtener_reserva(reserva_id)
    if reserva["estado"] != "pendiente":
        error_api("RESERVA_YA_PROCESADA", "Esta solicitud ya fue atendida.", 409)

    db.reservas().update_one(
        {"id": reserva_id},
        {
            "$set": {
                "estado": "rechazada",
                "motivoRechazo": payload.motivo,
                "aprobadaPor": payload.adminNombre,
                "actualizadaEn": sello_utc(),
            }
        },
    )
    db.bloques().delete_many({"reservaId": reserva_id})
    reserva["estado"] = "rechazada"
    reserva["motivoRechazo"] = payload.motivo
    avisar_rechazada(reserva, payload.motivo)
    return reserva


@router.post("/recursos", status_code=201)
def crear_recurso(payload: RecursoCrear) -> dict:
    codigo = siguiente_codigo(payload.categoria, payload.codigo)
    documento = payload.model_dump(exclude={"codigo"})
    documento.update(
        {
            "codigo": codigo,
            "creadoEn": sello_utc(),
            "actualizadoEn": sello_utc(),
        }
    )
    try:
        db.recursos().insert_one(dict(documento))
    except DuplicateKeyError:
        error_api("CODIGO_DUPLICADO", f"Ya existe un recurso con el código {codigo}.", 409)
    return documento


@router.patch("/recursos/{codigo}")
def actualizar_recurso(codigo: str, payload: RecursoActualizar) -> dict:
    obtener_recurso(codigo)
    cambios = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not cambios:
        error_api("SIN_CAMBIOS", "No enviaste cambios para guardar.", 400)

    cambios["actualizadoEn"] = sello_utc()
    db.recursos().update_one({"codigo": codigo}, {"$set": cambios})
    return obtener_recurso(codigo)


@router.patch("/recursos/{codigo}/estado")
def cambiar_estado(codigo: str, payload: CambioEstado) -> dict:
    recurso = obtener_recurso(codigo)
    if recurso["estado"] == payload.estado:
        return recurso

    db.recursos().update_one(
        {"codigo": codigo},
        {"$set": {"estado": payload.estado, "actualizadoEn": sello_utc()}},
    )
    recurso["estado"] = payload.estado
    evento = uuid4().hex[:8]

    if payload.estado == "Mantenimiento":
        avisar_mantenimiento(recurso, evento)
    else:
        avisar_listo(recurso, evento)

    return recurso


@router.delete("/recursos/{codigo}")
def eliminar_recurso(codigo: str) -> dict:
    obtener_recurso(codigo)
    activas = db.reservas().count_documents(
        {
            "recursoCodigo": codigo,
            "estado": {"$in": ["pendiente", "aprobada"]},
            "fecha": {"$gte": ahora_local().date().isoformat()},
        }
    )
    if activas > 0:
        error_api(
            "RECURSO_CON_RESERVAS",
            f"No se puede eliminar: tiene {activas} reserva(s) activa(s).",
            409,
        )

    db.recursos().delete_one({"codigo": codigo})
    db.bloques().delete_many({"recursoCodigo": codigo})
    return {"eliminado": codigo}
