"""Claves de administración guardadas con hash en MongoDB."""

import hashlib
import secrets
from typing import Annotated

from fastapi import Header, HTTPException

from . import db
from .config import ajustes
from .tiempo import sello_utc


def hash_clave(clave: str) -> str:
    return hashlib.sha256(clave.encode("utf-8")).hexdigest()


def crear_clave(nombre: str, rol: str = "admin") -> str:
    """Genera una clave, guarda solo su hash y devuelve el texto una sola vez."""
    clave = f"nx_{secrets.token_urlsafe(24)}"
    db.api_keys().insert_one(
        {
            "nombre": nombre,
            "rol": rol,
            "hash": hash_clave(clave),
            "activa": True,
            "creadaEn": sello_utc(),
        }
    )
    return clave


def requiere_admin(x_api_key: Annotated[str | None, Header(alias="X-Api-Key")] = None) -> dict:
    if not ajustes.api_keys_enabled:
        return {"nombre": "modo-abierto", "rol": "admin"}

    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail={
                "codigo": "API_KEY_REQUERIDA",
                "mensaje": "Falta el encabezado X-Api-Key para esta acción de administración.",
            },
        )

    clave = db.api_keys().find_one({"hash": hash_clave(x_api_key), "activa": True})
    if clave is None:
        raise HTTPException(
            status_code=403,
            detail={
                "codigo": "API_KEY_INVALIDA",
                "mensaje": "La clave de administración no existe o fue desactivada.",
            },
        )
    return clave
