"""Arranque de la API de Nexora."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .config import ajustes
from .routers import admin, avisos, computo, reservas
from .tiempo import ahora_local

logging.basicConfig(level=logging.INFO)
registro = logging.getLogger("nexora")


@asynccontextmanager
async def ciclo(app: FastAPI):
    try:
        db.asegurar_indices()
        registro.info("MongoDB conectado. Base: %s", ajustes.mongo_db)
    except Exception as error:  # noqa: BLE001 - se informa y la API responde 503
        registro.error("No se pudo conectar con MongoDB: %s", error)
        registro.error("Revisa MONGO_URI en api-python/.env y vuelve a iniciar.")
    yield
    db.cerrar()


app = FastAPI(
    title="Nexora · API de cómputo",
    description="Reservas de laboratorios con MongoDB",
    version="1.0.0",
    lifespan=ciclo,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ajustes.origenes_cors,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Api-Key"],
)

app.include_router(computo.router, prefix="/api")
app.include_router(reservas.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(avisos.router, prefix="/api")


@app.get("/api/salud")
def salud() -> dict:
    return {
        "estado": "ok" if db.ultimo_error is None else "sin_mongo",
        "base": ajustes.mongo_db,
        "zonaHoraria": ajustes.zona_horaria,
        "ahora": ahora_local().isoformat(),
        "detalle": db.ultimo_error,
    }
