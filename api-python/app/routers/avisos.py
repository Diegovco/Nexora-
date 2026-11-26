"""Bandeja de avisos del usuario."""

from fastapi import APIRouter, Depends, Query

from .. import db
from ..avisos import generar_recordatorios
from ..db import requiere_mongo
from ..schemas import MarcarLeidos

router = APIRouter(tags=["avisos"], dependencies=[Depends(requiere_mongo)])


@router.get("/avisos")
def listar_avisos(usuarioId: str = Query(min_length=3)) -> dict:
    generar_recordatorios(usuarioId)
    documentos = list(
        db.avisos().find({"usuarioId": usuarioId}, {"_id": 0}).sort("creadoEn", -1)
    )
    sin_leer = len([aviso for aviso in documentos if not aviso.get("leido")])
    return {"avisos": documentos, "sinLeer": sin_leer}


@router.patch("/avisos/leidos")
def marcar_leidos(payload: MarcarLeidos) -> dict:
    resultado = db.avisos().update_many(
        {"usuarioId": payload.usuarioId, "leido": False},
        {"$set": {"leido": True}},
    )
    return {"actualizados": resultado.modified_count}
