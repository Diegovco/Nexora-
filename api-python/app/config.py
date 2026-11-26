"""Configuración central. Ningún dato sensible se escribe en el código."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Ajustes(BaseSettings):
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "nexora"

    zona_horaria: str = "America/Mexico_City"
    cors_origins: str = "http://localhost:8100,http://localhost:4200,http://localhost:5173"

    anticipacion_horas: int = 24
    dias_disponibles: int = 5
    max_bloques: int = 4
    max_reservas_activas: int = 3
    recordatorio_horas: int = 24

    api_keys_enabled: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def origenes_cors(self) -> list[str]:
        return [origen.strip() for origen in self.cors_origins.split(",") if origen.strip()]


@lru_cache
def obtener_ajustes() -> Ajustes:
    return Ajustes()


ajustes = obtener_ajustes()
