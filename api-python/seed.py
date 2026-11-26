"""Carga datos de ejemplo para probar el flujo completo.

Uso:
    python seed.py             # limpia y vuelve a cargar los datos de ejemplo
    python seed.py --conservar # agrega datos sin borrar lo existente
"""

import sys
from datetime import timedelta
from uuid import uuid4

from app import db
from app.avisos import avisar_aprobada, avisar_solicitud
from app.security import crear_clave
from app.tiempo import (
    ahora_local,
    construir_inicio,
    fechas_disponibles,
    rango_horas,
    sello_utc,
)

USUARIO_DEMO = {"usuarioId": "demo-001", "usuarioNombre": "Ana Ruiz"}
OTRO_USUARIO = {"usuarioId": "demo-002", "usuarioNombre": "Luis Mena"}

LABORATORIOS = [
    {
        "codigo": "LAB-002",
        "nombre": "Laboratorio de Cómputo 2",
        "categoria": "Laboratorio",
        "ubicacion": "Edificio B · Planta baja",
        "estado": "Disponible",
        "equipos": 30,
        "horario": {"inicio": "07:00", "fin": "20:00", "duracionBloque": 60},
        "descripcion": "30 equipos con IDE, 2 proyectores y red local.",
    },
    {
        "codigo": "LAB-003",
        "nombre": "Laboratorio de Cómputo 3",
        "categoria": "Laboratorio",
        "ubicacion": "Edificio B · Piso 1",
        "estado": "Disponible",
        "equipos": 25,
        "horario": {"inicio": "07:00", "fin": "21:00", "duracionBloque": 60},
        "descripcion": "25 equipos para prácticas de programación.",
    },
    {
        "codigo": "LAB-005",
        "nombre": "Laboratorio de Redes",
        "categoria": "Laboratorio",
        "ubicacion": "Edificio C · Piso 2",
        "estado": "Mantenimiento",
        "equipos": 20,
        "horario": {"inicio": "08:00", "fin": "19:00", "duracionBloque": 60},
        "descripcion": "En mantenimiento de cableado estructurado.",
    },
]


def limpiar() -> None:
    for coleccion in ("recursos", "reservas", "reserva_bloques", "avisos", "api_keys"):
        db.base()[coleccion].delete_many({})


def insertar_recurso(recurso: dict) -> None:
    documento = dict(recurso)
    documento["creadoEn"] = sello_utc()
    documento["actualizadoEn"] = sello_utc()
    db.recursos().insert_one(documento)


def crear_reserva(
    recurso: dict,
    usuario: dict,
    fecha: str,
    horas: list[str],
    estado: str,
    motivo: str,
) -> dict:
    duracion = recurso["horario"]["duracionBloque"]
    ordenadas = sorted(horas)
    inicio, fin = rango_horas(ordenadas, duracion)
    reserva_id = uuid4().hex

    reserva = {
        "id": reserva_id,
        "folio": f"RES-{reserva_id[:6].upper()}",
        "recursoCodigo": recurso["codigo"],
        "recursoNombre": recurso["nombre"],
        "usuarioId": usuario["usuarioId"],
        "usuarioNombre": usuario["usuarioNombre"],
        "fecha": fecha,
        "horaInicio": inicio,
        "horaFin": fin,
        "horas": ordenadas,
        "motivo": motivo,
        "estado": estado,
        "aprobadaPor": "Encargado" if estado == "aprobada" else None,
        "motivoRechazo": None,
        "creadaEn": sello_utc(),
        "actualizadaEn": sello_utc(),
    }
    db.reservas().insert_one(dict(reserva))

    for hora in ordenadas:
        db.bloques().insert_one(
            {
                "recursoCodigo": recurso["codigo"],
                "fecha": fecha,
                "hora": hora,
                "reservaId": reserva_id,
            }
        )

    if estado == "pendiente":
        avisar_solicitud(reserva)
    if estado == "aprobada":
        avisar_solicitud(reserva)
        avisar_aprobada(reserva)

    return reserva


def horario_disponible_hoy(recurso: dict, ahora) -> str | None:
    """Hora entera más próxima dentro del horario, para el recordatorio de ejemplo."""
    propuesta = ahora + timedelta(hours=1)
    inicio = int(recurso["horario"]["inicio"].split(":")[0])
    fin = int(recurso["horario"]["fin"].split(":")[0])
    if not inicio <= propuesta.hour < fin - 1:
        return None
    return f"{propuesta.hour:02d}:00"


def main() -> None:
    db.asegurar_indices()
    if "--conservar" not in sys.argv:
        limpiar()
        print("Datos anteriores eliminados.")

    for laboratorio in LABORATORIOS:
        insertar_recurso(laboratorio)

    recursos = {laboratorio["codigo"]: laboratorio for laboratorio in LABORATORIOS}
    dias = fechas_disponibles()
    dia0, dia1, dia2 = dias[0].isoformat(), dias[1].isoformat(), dias[2].isoformat()

    crear_reserva(recursos["LAB-002"], OTRO_USUARIO, dia0, ["09:00", "10:00"], "aprobada", "Clase de bases de datos")
    crear_reserva(recursos["LAB-002"], USUARIO_DEMO, dia1, ["10:00", "11:00"], "aprobada", "Práctica de estructuras de datos")
    crear_reserva(recursos["LAB-002"], USUARIO_DEMO, dia2, ["08:00"], "pendiente", "Asesoría de proyecto final")
    crear_reserva(recursos["LAB-003"], OTRO_USUARIO, dia1, ["14:00", "15:00"], "aprobada", "Práctica de redes")

    hora_recordatorio = horario_disponible_hoy(recursos["LAB-003"], ahora_local())
    if hora_recordatorio:
        consulta = construir_inicio(ahora_local().date().isoformat(), hora_recordatorio)
        if consulta > ahora_local():
            crear_reserva(
                recursos["LAB-003"],
                USUARIO_DEMO,
                ahora_local().date().isoformat(),
                [hora_recordatorio],
                "aprobada",
                "Repaso de examen",
            )

    clave = crear_clave("Encargado de laboratorio", "admin")
    db.cerrar()

    print("\nDatos de ejemplo cargados:")
    print(f"  Laboratorios: {', '.join(recursos)}")
    print(f"  Días reservables: {', '.join(dias_iso.isoformat() for dias_iso in dias)}")
    print(f"  Usuario de ejemplo: {USUARIO_DEMO['usuarioId']} ({USUARIO_DEMO['usuarioNombre']})")
    print("\nClave de administración (se muestra una sola vez):")
    print(f"  {clave}")
    print("\nPégala en environment.ts como adminApiKey y en el encabezado X-Api-Key.")


if __name__ == "__main__":
    main()
