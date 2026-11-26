"""Modelos de entrada y salida. Los nombres coinciden con Ionic y MongoDB."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator

EstadoRecurso = Literal["Disponible", "Mantenimiento", "Prestado"]
EstadoReserva = Literal["pendiente", "aprobada", "rechazada", "cancelada", "completada"]
TipoAviso = Literal["exito", "info", "alerta", "error"]


class Horario(BaseModel):
    inicio: str = "07:00"
    fin: str = "20:00"
    duracionBloque: int = 60


class RecursoCrear(BaseModel):
    codigo: str | None = None
    nombre: str = Field(min_length=2, max_length=90)
    categoria: Literal["Laboratorio", "Libro", "Equipo AV"] = "Laboratorio"
    ubicacion: str = "Edificio B · Planta baja"
    estado: EstadoRecurso = "Disponible"
    equipos: int = Field(default=1, ge=0, le=500)
    horario: Horario = Horario()
    descripcion: str = ""

    @field_validator("nombre")
    @classmethod
    def limpiar_nombre(cls, valor: str) -> str:
        return valor.strip()


class RecursoActualizar(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=90)
    categoria: Literal["Laboratorio", "Libro", "Equipo AV"] | None = None
    ubicacion: str | None = None
    estado: EstadoRecurso | None = None
    equipos: int | None = Field(default=None, ge=0, le=500)
    horario: Horario | None = None
    descripcion: str | None = None


class CambioEstado(BaseModel):
    estado: Literal["Disponible", "Mantenimiento"]


class ReservaCrear(BaseModel):
    recursoCodigo: str
    fecha: str
    horas: list[str] = Field(default_factory=list)
    motivo: str = Field(max_length=140)
    usuarioId: str = Field(min_length=3, max_length=60)
    usuarioNombre: str = Field(min_length=2, max_length=80)

    @field_validator("horas")
    @classmethod
    def horas_unicas(cls, valor: list[str]) -> list[str]:
        return sorted(dict.fromkeys(valor))

    @field_validator("motivo")
    @classmethod
    def limpiar_motivo(cls, valor: str) -> str:
        return valor.strip()


class Cancelacion(BaseModel):
    usuarioId: str


class Aprobacion(BaseModel):
    adminNombre: str = "Encargado"


class Rechazo(BaseModel):
    motivo: str = Field(min_length=3, max_length=140)
    adminNombre: str = "Encargado"


class MarcarLeidos(BaseModel):
    usuarioId: str
