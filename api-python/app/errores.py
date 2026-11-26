"""Error uniforme para que Ionic pueda leer siempre el mismo formato."""

from fastapi import HTTPException


def error_api(codigo: str, mensaje: str, status_code: int = 400, **extra) -> None:
    detalle = {"codigo": codigo, "mensaje": mensaje}
    detalle.update(extra)
    raise HTTPException(status_code=status_code, detail=detalle)
