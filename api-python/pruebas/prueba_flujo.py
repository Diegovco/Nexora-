"""Prueba funcional sin MongoDB real: usa un cliente simulado en memoria.

Ejecuta desde api-python:
    pip install -r requirements.txt -r requirements-dev.txt
    python pruebas/prueba_flujo.py

Comprueba reserva libre, choque de horario con rollback, cancelación,
mantenimiento, aprobaciones, avisos, recordatorio y clave de administración.
"""

import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import mongomock  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import db  # noqa: E402
from app.security import hash_clave  # noqa: E402
from app.tiempo import (  # noqa: E402
    ahora_local,
    dias_para_selector,
    sello_utc,
)

db.instalar_cliente(mongomock.MongoClient())

from app.main import app  # noqa: E402

USUARIO = "demo-001"
NOMBRE = "Ana Ruiz"
OTRO = "demo-002"
CLAVE = "clave-de-prueba"
ADMIN = {"X-Api-Key": CLAVE}
API = "/api"

exitos = 0


def ok(nombre: str, condicion: bool, detalle: str = "") -> None:
    global exitos
    if not condicion:
        raise AssertionError(f"FALLÓ: {nombre} {detalle}")
    exitos += 1
    print(f"  OK  {nombre}")


def preparar() -> None:
    db.recursos().insert_one(
        {
            "codigo": "LAB-002",
            "nombre": "Laboratorio de Cómputo 2",
            "categoria": "Laboratorio",
            "ubicacion": "Edificio B · Planta baja",
            "estado": "Disponible",
            "equipos": 30,
            "horario": {"inicio": "06:00", "fin": "22:00", "duracionBloque": 60},
            "descripcion": "Pruebas",
            "creadoEn": sello_utc(),
            "actualizadoEn": sello_utc(),
        }
    )
    db.api_keys().insert_one(
        {
            "nombre": "pruebas",
            "rol": "admin",
            "hash": hash_clave(CLAVE),
            "activa": True,
            "creadaEn": sello_utc(),
        }
    )


def disponibilidad(cliente: TestClient, fecha: str) -> dict:
    respuesta = cliente.get(f"{API}/computo/disponibilidad", params={"codigo": "LAB-002", "fecha": fecha})
    ok("disponibilidad responde 200", respuesta.status_code == 200, respuesta.text)
    return respuesta.json()


def reservar(cliente: TestClient, fecha: str, horas: list[str], usuario: str = USUARIO, motivo: str = "Práctica de estructuras de datos"):
    return cliente.post(
        f"{API}/computo/reservas",
        json={
            "recursoCodigo": "LAB-002",
            "fecha": fecha,
            "horas": horas,
            "motivo": motivo,
            "usuarioId": usuario,
            "usuarioNombre": NOMBRE if usuario == USUARIO else "Luis Mena",
        },
    )


def codigo(respuesta) -> str:
    detalle = respuesta.json().get("detail")
    if isinstance(detalle, dict):
        return detalle.get("codigo", "")
    return ""


def main() -> None:
    dias = dias_para_selector()
    fecha = dias[1]["fecha"]
    print(f"\nFecha de prueba: {fecha}")

    with TestClient(app) as cliente:
        preparar()

        print("\n[A] Estáticas de la API")
        salud = cliente.get(f"{API}/salud")
        ok("salud 200 y base conectada", salud.status_code == 200 and salud.json()["estado"] == "ok", salud.text)

        catalogo = cliente.get(f"{API}/computo/recursos", params={"categoria": "Laboratorio"}).json()
        ok("catálogo devuelve el laboratorio", len(catalogo) == 1 and catalogo[0]["codigo"] == "LAB-002")

        datos = disponibilidad(cliente, fecha)
        libres = [slot["hora"] for slot in datos["slots"] if slot["estado"] == "libre"]
        ok("hay al menos 4 bloques libres", len(libres) >= 4, str(libres))

        hora_a, hora_b = libres[0], libres[1]
        hora_c = libres[2]

        print("\n[B] Reserva, choque y rollback")
        creada = reservar(cliente, fecha, [hora_a, hora_b])
        ok("reservar bloque libre devuelve 201", creada.status_code == 201, creada.text)
        reserva = creada.json()
        ok("la reserva nace pendiente", reserva["estado"] == "pendiente")
        ok("el folio se genera", reserva["folio"].startswith("RES-"))

        datos = disponibilidad(cliente, fecha)
        estados = {slot["hora"]: slot["estado"] for slot in datos["slots"]}
        ok("los dos bloques quedan ocupados", estados[hora_a] == "ocupado" and estados[hora_b] == "ocupado")

        repetida = reservar(cliente, fecha, [hora_a])
        ok("reservar encima devuelve 409", repetida.status_code == 409, repetida.text)
        ok("el código es BLOQUE_OCUPADO", codigo(repetida) == "BLOQUE_OCUPADO")

        parcial = reservar(cliente, fecha, [hora_b, hora_c])
        ok("choque parcial devuelve 409", parcial.status_code == 409, parcial.text)
        datos = disponibilidad(cliente, fecha)
        estados = {slot["hora"]: slot["estado"] for slot in datos["slots"]}
        ok("rollback: la tercera hora sigue libre", estados[hora_c] == "libre", str(estados))

        print("\n[C] Avisos y aprobación")
        aprobada = cliente.patch(f"{API}/computo/reservas/{reserva['id']}/aprobar", json={"adminNombre": "Encargado"}, headers=ADMIN)
        ok("aprobar devuelve 200", aprobada.status_code == 200, aprobada.text)
        ok("queda aprobada", aprobada.json()["estado"] == "aprobada")

        avisos = cliente.get(f"{API}/avisos", params={"usuarioId": USUARIO}).json()
        titulos = [aviso["titulo"] for aviso in avisos["avisos"]]
        ok("aviso de solicitud enviada", "Solicitud enviada" in titulos, str(titulos))
        ok("aviso de reserva aprobada", "Reserva aprobada" in titulos, str(titulos))
        ok("hay avisos sin leer", avisos["sinLeer"] >= 2)

        repetida_aprobacion = cliente.patch(f"{API}/computo/reservas/{reserva['id']}/aprobar", json={"adminNombre": "Encargado"}, headers=ADMIN)
        ok("aprobar dos veces devuelve 409", repetida_aprobacion.status_code == 409, repetida_aprobacion.text)
        ok("el código es RESERVA_YA_PROCESADA", codigo(repetida_aprobacion) == "RESERVA_YA_PROCESADA")

        conteo = len(cliente.get(f"{API}/avisos", params={"usuarioId": USUARIO}).json()["avisos"])
        ok("el aviso no se duplica", conteo == len(titulos), f"{conteo} vs {len(titulos)}")

        leidos = cliente.patch(f"{API}/avisos/leidos", json={"usuarioId": USUARIO})
        ok("marcar leídos devuelve 200", leidos.status_code == 200)
        ok("ya no quedan sin leer", cliente.get(f"{API}/avisos", params={"usuarioId": USUARIO}).json()["sinLeer"] == 0)

        print("\n[D] Cancelación y permisos")
        ajeno = cliente.patch(f"{API}/computo/reservas/{reserva['id']}/cancelar", json={"usuarioId": OTRO})
        ok("cancelar reserva ajena devuelve 403", ajeno.status_code == 403, ajeno.text)
        ok("el código es SIN_PERMISO", codigo(ajeno) == "SIN_PERMISO")

        cancelada = cliente.patch(f"{API}/computo/reservas/{reserva['id']}/cancelar", json={"usuarioId": USUARIO})
        ok("cancelar la propia devuelve 200", cancelada.status_code == 200, cancelada.text)
        datos = disponibilidad(cliente, fecha)
        estados = {slot["hora"]: slot["estado"] for slot in datos["slots"]}
        ok("los bloques vuelven a libre", estados[hora_a] == "libre" and estados[hora_b] == "libre")

        avisos = cliente.get(f"{API}/avisos", params={"usuarioId": USUARIO}).json()
        ok("aviso de cancelación", "Reserva cancelada" in [aviso["titulo"] for aviso in avisos["avisos"]])

        print("\n[E] Mantenimiento")
        nueva = reservar(cliente, fecha, [hora_a])
        ok("reserva previa al mantenimiento", nueva.status_code == 201, nueva.text)

        a_mantenimiento = cliente.patch(f"{API}/computo/recursos/LAB-002/estado", json={"estado": "Mantenimiento"}, headers=ADMIN)
        ok("cambiar a mantenimiento devuelve 200", a_mantenimiento.status_code == 200, a_mantenimiento.text)

        datos = disponibilidad(cliente, fecha)
        ok(
            "todos los bloques quedan en mantenimiento",
            all(slot["estado"] == "mantenimiento" for slot in datos["slots"]),
        )
        bloqueada = reservar(cliente, fecha, [hora_b])
        ok("reservar en mantenimiento devuelve 400", bloqueada.status_code == 400, bloqueada.text)
        ok("el código es RECURSO_EN_MANTENIMIENTO", codigo(bloqueada) == "RECURSO_EN_MANTENIMIENTO")

        avisos = cliente.get(f"{API}/avisos", params={"usuarioId": USUARIO}).json()
        ok(
            "aviso de mantenimiento",
            "Tu reserva está en mantenimiento" in [aviso["titulo"] for aviso in avisos["avisos"]],
        )

        a_disponible = cliente.patch(f"{API}/computo/recursos/LAB-002/estado", json={"estado": "Disponible"}, headers=ADMIN)
        ok("volver a disponible devuelve 200", a_disponible.status_code == 200)
        avisos = cliente.get(f"{API}/avisos", params={"usuarioId": USUARIO}).json()
        ok("aviso de laboratorio listo", "Laboratorio listo" in [aviso["titulo"] for aviso in avisos["avisos"]])

        print("\n[F] Recordatorio")
        ahora = ahora_local()
        inicio = ahora + timedelta(minutes=45)
        fin = inicio + timedelta(minutes=60)
        recordatorio_id = "recordatorio-prueba"
        db.reservas().insert_one(
            {
                "id": recordatorio_id,
                "folio": "RES-REC001",
                "recursoCodigo": "LAB-002",
                "recursoNombre": "Laboratorio de Cómputo 2",
                "usuarioId": USUARIO,
                "usuarioNombre": NOMBRE,
                "fecha": ahora.date().isoformat(),
                "horaInicio": inicio.strftime("%H:%M"),
                "horaFin": fin.strftime("%H:%M"),
                "horas": [inicio.strftime("%H:%M")],
                "motivo": "Prueba de recordatorio",
                "estado": "aprobada",
                "aprobadaPor": "Encargado",
                "motivoRechazo": None,
                "creadaEn": sello_utc(),
                "actualizadaEn": sello_utc(),
            }
        )
        avisos = cliente.get(f"{API}/avisos", params={"usuarioId": USUARIO}).json()
        ok(
            "recordatorio con rango de horas",
            any("empieza pronto" in aviso["titulo"] for aviso in avisos["avisos"]),
        )
        conteo = len(cliente.get(f"{API}/avisos", params={"usuarioId": USUARIO}).json()["avisos"])
        ok("el recordatorio no se duplica", conteo == len(avisos["avisos"]))

        print("\n[G] Reglas y validaciones")
        fuera = reservar(cliente, dias[-1]["fecha"], [hora_b], usuario="demo-003")
        ok("fecha en el último día permitido es válida", fuera.status_code in (201, 409), fuera.text)

        rangos = cliente.get(f"{API}/computo/disponibilidad", params={"codigo": "LAB-002", "fecha": "2030-01-01"})
        ok("fecha fuera de rango responde 200 con bloqueo", rangos.status_code == 200 and rangos.json()["motivoBloqueo"], rangos.text)

        sin_motivo = reservar(cliente, fecha, [hora_b], motivo="abc")
        ok("motivo corto devuelve 400", sin_motivo.status_code == 400, sin_motivo.text)
        ok("el código es MOTIVO_REQUERIDO", codigo(sin_motivo) == "MOTIVO_REQUERIDO")

        demasiadas = reservar(cliente, fecha, [hora_a, hora_b, hora_c, libres[3], libres[4]])
        ok("más de 4 horas devuelve 400", demasiadas.status_code == 400, demasiadas.text)
        ok("el código es MAX_BLOQUES", codigo(demasiadas) == "MAX_BLOQUES")

        salteadas = reservar(cliente, fecha, [libres[0], libres[2]])
        ok("horas salteadas devuelve 400", salteadas.status_code == 400, salteadas.text)
        ok("el código es NO_CONSECUTIVAS", codigo(salteadas) == "NO_CONSECUTIVAS")

        for indice in range(3):
            db.reservas().insert_one(
                {
                    "id": f"limite-{indice}",
                    "folio": f"RES-LIM00{indice}",
                    "recursoCodigo": "LAB-002",
                    "recursoNombre": "Laboratorio de Cómputo 2",
                    "usuarioId": "demo-003",
                    "usuarioNombre": "Límite",
                    "fecha": dias[2]["fecha"],
                    "horaInicio": "07:00",
                    "horaFin": "08:00",
                    "horas": ["07:00"],
                    "motivo": "Ocupa cupo",
                    "estado": "aprobada",
                    "creadaEn": sello_utc(),
                    "actualizadaEn": sello_utc(),
                }
            )
        limite = reservar(cliente, fecha, [libres[5]], usuario="demo-003")
        ok("cuarta reserva activa devuelve 400", limite.status_code == 400, limite.text)
        ok("el código es LIMITE_RESERVAS", codigo(limite) == "LIMITE_RESERVAS")

        print("\n[H] Seguridad de administración")
        sin_clave = cliente.patch(f"{API}/computo/recursos/LAB-002/estado", json={"estado": "Disponible"})
        ok("admin sin clave devuelve 401", sin_clave.status_code == 401, sin_clave.text)
        ok("el código es API_KEY_REQUERIDA", codigo(sin_clave) == "API_KEY_REQUERIDA")

        clave_mala = cliente.patch(
            f"{API}/computo/recursos/LAB-002/estado",
            json={"estado": "Disponible"},
            headers={"X-Api-Key": "clave-incorrecta"},
        )
        ok("clave inválida devuelve 403", clave_mala.status_code == 403, clave_mala.text)
        ok("el código es API_KEY_INVALIDA", codigo(clave_mala) == "API_KEY_INVALIDA")

        print(f"\nResultado: {exitos} comprobaciones correctas.\n")


if __name__ == "__main__":
    main()
