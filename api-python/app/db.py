"""Conexión a MongoDB, colecciones e índices."""

from typing import Any

from fastapi import HTTPException
from pymongo import ASCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.errors import PyMongoError

from .config import ajustes

_cliente: MongoClient | None = None
_base: Any = None
ultimo_error: str | None = None


def instalar_cliente(cliente: Any) -> None:
    """Permite sustituir el cliente (pruebas automáticas)."""
    global _cliente, _base, ultimo_error
    _cliente = cliente
    _base = cliente[ajustes.mongo_db]
    ultimo_error = None


def cliente() -> MongoClient:
    global _cliente
    if _cliente is None:
        _cliente = MongoClient(ajustes.mongo_uri, serverSelectionTimeoutMS=5000, tz_aware=True)
    return _cliente


def base() -> Any:
    global _base
    if _base is None:
        _base = cliente()[ajustes.mongo_db]
    return _base


def recursos() -> Collection:
    return base()["recursos"]


def reservas() -> Collection:
    return base()["reservas"]


def bloques() -> Collection:
    return base()["reserva_bloques"]


def avisos() -> Collection:
    return base()["avisos"]


def api_keys() -> Collection:
    return base()["api_keys"]


def asegurar_indices() -> None:
    """Crea los índices que sostienen las reglas de negocio."""
    global ultimo_error
    try:
        cliente().list_database_names()
        recursos().create_index([("codigo", ASCENDING)], unique=True, name="codigo_unico")
        bloques().create_index(
            [("recursoCodigo", ASCENDING), ("fecha", ASCENDING), ("hora", ASCENDING)],
            unique=True,
            name="bloque_unico",
        )
        reservas().create_index([("usuarioId", ASCENDING), ("estado", ASCENDING)])
        reservas().create_index([("recursoCodigo", ASCENDING), ("fecha", ASCENDING)])
        avisos().create_index([("claveUnica", ASCENDING)], unique=True, name="aviso_unico")
        avisos().create_index([("usuarioId", ASCENDING), ("creadoEn", ASCENDING)])
        api_keys().create_index([("hash", ASCENDING)], unique=True, name="hash_unico")
        ultimo_error = None
    except (PyMongoError, OSError) as error:
        ultimo_error = str(error)
        raise


def requiere_mongo() -> None:
    """Devuelve 503 claro cuando la base no está disponible."""
    if ultimo_error is not None:
        raise HTTPException(
            status_code=503,
            detail={
                "codigo": "DB_NO_DISPONIBLE",
                "mensaje": "No hay conexión con MongoDB. Revisa MONGO_URI en tu archivo .env.",
            },
        )


def cerrar() -> None:
    global _cliente, _base
    if _cliente is not None:
        _cliente.close()
    _cliente = None
    _base = None
