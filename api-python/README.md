# API de Nexora · Cómputo

API en Python (FastAPI + PyMongo) que guarda laboratorios, reservas, bloques apartados y avisos en MongoDB.

## Arranque

```bash
cd api-python
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # coloca tu MONGO_URI
python seed.py            # datos de ejemplo + clave de administración
uvicorn app.main:app --reload --port 8000
```

- Salud: `GET /api/salud`
- Documentación: `http://localhost:8000/docs`

## Estructura

```
api-python/
  app/
    config.py      variables de entorno
    db.py          conexión, colecciones e índices únicos
    schemas.py     validación de entrada
    tiempo.py      zona horaria, días reservables y bloques
    avisos.py      generación y deduplicación de avisos
    security.py    claves de administración con hash
    errores.py     formato único de error
    routers/
      computo.py   catálogo y disponibilidad
      reservas.py  crear, listar y cancelar
      admin.py     aprobar, rechazar, inventario y estado
      avisos.py    bandeja y marcar leídos
    main.py        arranque, CORS y salud
  seed.py
  pruebas/prueba_flujo.py
```

## Colecciones

- `recursos`: `codigo`, `nombre`, `categoria`, `ubicacion`, `estado`, `equipos`, `horario`, `descripcion`, `creadoEn`, `actualizadoEn`.
- `reservas`: `id`, `folio`, `recursoCodigo`, `recursoNombre`, `usuarioId`, `usuarioNombre`, `fecha`, `horaInicio`, `horaFin`, `horas`, `motivo`, `estado`, `aprobadaPor`, `motivoRechazo`, `creadaEn`, `actualizadaEn`.
- `reserva_bloques`: `recursoCodigo`, `fecha`, `hora`, `reservaId`; índice único por laboratorio + fecha + hora (impide doble reserva y permite el rollback).
- `avisos`: `id`, `usuarioId`, `tipo`, `titulo`, `mensaje`, `recursoCodigo`, `reservaId`, `leido`, `claveUnica`, `creadoEn`; índice único por `claveUnica` (evita duplicados).
- `api_keys`: `nombre`, `rol`, `hash`, `activa`, `creadaEn`.

## Endpoints

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/computo/recursos` | Catálogo e inventario (`categoria`, `texto`) |
| GET | `/api/computo/recursos/{codigo}` | Detalle |
| GET | `/api/computo/disponibilidad?codigo=&fecha=` | Días y bloques con su estado |
| POST | `/api/computo/reservas` | Solicitud del estudiante |
| GET | `/api/computo/reservas?usuarioId=` | Próximas, historial y resumen |
| PATCH | `/api/computo/reservas/{id}/cancelar` | Cancelar la propia |
| GET | `/api/computo/reservas/pendientes` | Admin |
| PATCH | `/api/computo/reservas/{id}/aprobar` | Admin |
| PATCH | `/api/computo/reservas/{id}/rechazar` | Admin, con motivo |
| POST | `/api/computo/recursos` | Admin, alta |
| PATCH | `/api/computo/recursos/{codigo}` | Admin, edición |
| PATCH | `/api/computo/recursos/{codigo}/estado` | Admin, disponible o mantenimiento |
| DELETE | `/api/computo/recursos/{codigo}` | Admin, baja con validación |
| GET | `/api/avisos?usuarioId=` | Bandeja (genera recordatorios) |
| PATCH | `/api/avisos/leidos` | Marcar todo como leído |

Las rutas de administración exigen el encabezado `X-Api-Key` con una clave activa de `api_keys`.

## Estados

- Recurso: `Disponible`, `Mantenimiento`, `Prestado`.
- Reserva: `pendiente`, `aprobada`, `rechazada`, `cancelada`, `completada`.
- Bloque: `libre`, `ocupado`, `mantenimiento`, `pasado`, `no_disponible`.
- Aviso: `exito`, `info`, `alerta`, `error`.

## Pruebas sin MongoDB

```bash
pip install -r requirements-dev.txt
python pruebas/prueba_flujo.py
```

Ejecuta 55 comprobaciones con un cliente en memoria: reserva libre, choque con rollback, aprobación, cancelación, mantenimiento, recordatorio y claves.

## Seguridad

- La cadena de MongoDB y la clave viven en `.env`, fuera de Git.
- Las claves se guardan como hash SHA-256; `seed.py` imprime el texto una sola vez.
- En este demo la clave de admin viaja desde la app Angular; para producción se debe reemplazar por autenticación real con sesiones y roles.
