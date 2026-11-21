from datetime import datetime
from flask import jsonify
from bson import ObjectId

from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

import BackEnd.GlobalInfo.ResponseMessages as Messages
import BackEnd.GlobalInfo.Keys as ColabsKey
from BackEnd.Structures.cola_espera import ColaEspera
from BackEnd.Structures.pila_historial import PilaHistorial

# Conexión e inicialización de BD y colecciones
if ColabsKey.dbconn is None:
    try:
        mongoConnect = MongoClient(ColabsKey.strConnection, serverSelectionTimeoutMS=2000)
        # Forzar una petición rápida de ping para verificar la conexión
        mongoConnect.admin.command('ping')
        ColabsKey.dbconn = mongoConnect[ColabsKey.strBDConnection]
        print("✅ ¡CONEXIÓN EXITOSA A MONGODB!")
    except Exception as err:
        print("❌ ERROR AL CONECTAR CON MONGODB:", err)

dbUsers = ColabsKey.dbconn["clUsuarios"] if ColabsKey.dbconn is not None else None
dbCultivos = ColabsKey.dbconn["clCultivos"] if ColabsKey.dbconn is not None else None
dbSistemaIoT = ColabsKey.dbconn["clSistemaIoT"] if ColabsKey.dbconn is not None else None
dbRecursos = ColabsKey.dbconn["clRecursos"] if ColabsKey.dbconn is not None else None
dbReservas = ColabsKey.dbconn["clReservas"] if ColabsKey.dbconn is not None else None
dbReportes = ColabsKey.dbconn["clReportes"] if ColabsKey.dbconn is not None else None


# 1. PERFIL DE USUARIO

def fnGetUsers():
    try:
        arrFinalUsers = []
        listUsers = list(dbUsers.find({}))
        
        for objUser in listUsers:
            arrFinalUsers.append({
                "_id": str(objUser['_id']),
                "strnombreUsuario": objUser.get("strnombreUsuario", ""),
                "strcorreoUsuario": objUser.get("strcorreoUsuario", ""),
                "strmatricula": objUser.get("strmatricula", ""),
                "strrol": objUser.get("strrol", ""),
                "strwebsite": objUser.get("strwebsite", ""),
                "strcontrasena": objUser.get("strcontrasena", "")
            })
            
        objResponse = Messages.succ200.copy()
        objResponse['Respuesta'] = arrFinalUsers
        return jsonify(objResponse)
    except Exception as e:
        print("Error en fnGetUsers:", e)
        return jsonify(Messages.err500)


def fnInsertUser(objUser):
    try:
        resultado = dbUsers.insert_one(objUser)
        return jsonify({"_id": str(resultado.inserted_id)}), 201
    except Exception as e:
        print("Error en fnInsertUser:", e)
        return jsonify(Messages.err500)


def fnUpdateUser(strId, objCambios):
    if not ObjectId.is_valid(strId):
        return jsonify({"error": "ID Inválido"}), 400

    camposPermitidos = {"strnombreUsuario", "strcorreoUsuario", "strmatricula", "strrol", "strwebsite", "strcontrasena"}
    cambios = {k: v for k, v in objCambios.items() if k in camposPermitidos}

    if not cambios:
        return jsonify({"error": "No hay campos válidos para actualizar"}), 400

    resultado = dbUsers.update_one(
        {"_id": ObjectId(strId)},
        {"$set": cambios}
    )

    if resultado.matched_count == 0:
        return jsonify({"error": "Usuario no encontrado"}), 404

    return jsonify({"actualizados": resultado.modified_count}), 200


def fnDeleteUser(strId):
    if not ObjectId.is_valid(strId):
        return jsonify({"error": "ID Inválido"}), 400

    resultado = dbUsers.delete_one({"_id": ObjectId(strId)})

    if resultado.deleted_count == 0:
        return jsonify({"error": "Usuario no encontrado"}), 404

    return jsonify({"eliminados": resultado.deleted_count}), 200


def fnGetUserByEmail(strCorreo):
    try:
        objUser = dbUsers.find_one({"strcorreoUsuario": strCorreo})
        if not objUser:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        return jsonify({
            "_id": str(objUser['_id']),
            "strnombreUsuario": objUser.get("strnombreUsuario", ""),
            "strcorreoUsuario": objUser.get("strcorreoUsuario", ""),
            "strmatricula": objUser.get("strmatricula", ""),
            "strrol": objUser.get("strrol", ""),
            "strwebsite": objUser.get("strwebsite", ""),
            "strcontrasena": objUser.get("strcontrasena", "")
        }), 200
    except Exception as e:
        print("Error en fnGetUserByEmail:", e)
        return jsonify(Messages.err500)


# ==============================================================================
# 2. ESTRUCTURAS DE DATOS (COLA DE ESPERA Y PILA DE HISTORIAL)
# ==============================================================================

colas_espera: dict[str, ColaEspera[dict]] = {}
pila_historial = PilaHistorial[dict]()


def fnEncolarReserva(strRecursoId: str, strNombreRecurso: str, strCorreoUsuario: str):
    try:
        if strRecursoId not in colas_espera:
            colas_espera[strRecursoId] = ColaEspera[dict]()

        fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        solicitud = {
            "recurso_id": strRecursoId,
            "recurso": strNombreRecurso,
            "usuario": strCorreoUsuario,
            "fecha": fecha_actual
        }

        # Inserta en la COLA (FIFO)
        colas_espera[strRecursoId].encolar(solicitud)

        # Registra movimiento en la PILA (LIFO)
        pila_historial.apilar({
            "accion": "EN_COLA_ESPERA",
            "detalle": f"{strCorreoUsuario} entró a lista de espera por {strNombreRecurso}",
            "fecha": fecha_actual
        })

        objResponse = Messages.succ200.copy()
        objResponse['Respuesta'] = {
            "mensaje": f"Agregado a la cola de espera para {strNombreRecurso}",
            "cola_actual": colas_espera[strRecursoId].ver_cola()
        }
        return jsonify(objResponse), 200
    except Exception as e:
        print("Error en fnEncolarReserva:", e)
        return jsonify(Messages.err500)


def fnAtenderSiguienteEnCola(strRecursoId: str):
    try:
        if strRecursoId not in colas_espera or colas_espera[strRecursoId].esta_vacia():
            return jsonify({"mensaje": "No hay usuarios en espera para este recurso", "siguiente": None}), 200

        # Extrae al primero que llegó a la COLA (FIFO)
        siguiente = colas_espera[strRecursoId].desencolar()

        # Registra movimiento en la PILA (LIFO)
        pila_historial.apilar({
            "accion": "ASIGNADO_DESDE_COLA",
            "detalle": f"Recurso {strRecursoId} asignado a {siguiente['usuario']}",
            "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })

        objResponse = Messages.succ200.copy()
        objResponse['Respuesta'] = {
            "asignado_a": siguiente,
            "cola_restante": colas_espera[strRecursoId].ver_cola()
        }
        return jsonify(objResponse), 200
    except Exception as e:
        print("Error en fnAtenderSiguienteEnCola:", e)
        return jsonify(Messages.err500)


def fnVerColaRecurso(strRecursoId: str):
    try:
        lista_espera = colas_espera[strRecursoId].ver_cola() if strRecursoId in colas_espera else []
        objResponse = Messages.succ200.copy()
        objResponse['Respuesta'] = lista_espera
        return jsonify(objResponse), 200
    except Exception as e:
        print("Error en fnVerColaRecurso:", e)
        return jsonify(Messages.err500)


def fnObtenerHistorial():
    try:
        objResponse = Messages.succ200.copy()
        objResponse['Respuesta'] = pila_historial.ver_historial()
        return jsonify(objResponse), 200
    except Exception as e:
        print("Error en fnObtenerHistorial:", e)
        return jsonify(Messages.err500)


def fnDeshacerUltimoMovimiento():
    try:
        ultimo = pila_historial.desapilar()
        if not ultimo:
            return jsonify({"mensaje": "El historial está vacío", "eliminado": None}), 200

        objResponse = Messages.succ200.copy()
        objResponse['Respuesta'] = {
            "mensaje": "Último movimiento revertido",
            "eliminado": ultimo
        }
        return jsonify(objResponse), 200
    except Exception as e:
        print("Error en fnDeshacerUltimoMovimiento:", e)
        return jsonify(Messages.err500)


# ==============================================================================
# RECURSOS (CRUD EN MONGODB)
# ==============================================================================

def fnGetRecursos():
    if dbRecursos is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        arrFinalRecursos = []
        listRecursos = list(dbRecursos.find({}))

        for objRec in listRecursos:
            arrFinalRecursos.append({
                "_id": str(objRec['_id']),
                "codigo": objRec.get("codigo", ""),
                "nombre": objRec.get("nombre", ""),
                "categoria": objRec.get("categoria", ""),
                "ubicacion": objRec.get("ubicacion", ""),
                "estado": objRec.get("estado", "Disponible"),
                "descripcion": objRec.get("descripcion", "")
            })

        objResponse = Messages.succ200.copy()
        objResponse['Respuesta'] = arrFinalRecursos
        return jsonify(objResponse), 200
    except Exception as e:
        print("Error en fnGetRecursos:", e)
        return jsonify(Messages.err500)


def fnInsertRecurso(objRecurso):
    if dbRecursos is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        nuevo = {
            "codigo": objRecurso.get("codigo", ""),
            "nombre": objRecurso.get("nombre", ""),
            "categoria": objRecurso.get("categoria", ""),
            "ubicacion": objRecurso.get("ubicacion", ""),
            "estado": objRecurso.get("estado", "Disponible"),
            "descripcion": objRecurso.get("descripcion", "")
        }
        resultado = dbRecursos.insert_one(nuevo)
        return jsonify({"_id": str(resultado.inserted_id)}), 201
    except Exception as e:
        print("Error en fnInsertRecurso:", e)
        return jsonify(Messages.err500)


def fnUpdateRecurso(strId, objCambios):
    if dbRecursos is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        camposPermitidos = {"codigo", "nombre", "categoria", "ubicacion", "estado", "descripcion"}
        cambios = {k: v for k, v in objCambios.items() if k in camposPermitidos}

        if not cambios:
            return jsonify({"error": "No hay campos válidos para actualizar"}), 400

        filtro = {"_id": ObjectId(strId)} if ObjectId.is_valid(strId) else {"codigo": strId}
        resultado = dbRecursos.update_one(filtro, {"$set": cambios})

        if resultado.matched_count == 0:
            return jsonify({"error": "Recurso no encontrado"}), 404

        return jsonify({"actualizados": resultado.modified_count}), 200
    except Exception as e:
        print("Error en fnUpdateRecurso:", e)
        return jsonify(Messages.err500)


def fnDeleteRecurso(strId):
    if dbRecursos is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        filtro = {"_id": ObjectId(strId)} if ObjectId.is_valid(strId) else {"codigo": strId}
        resultado = dbRecursos.delete_one(filtro)

        if resultado.deleted_count == 0:
            return jsonify({"error": "Recurso no encontrado"}), 404

        return jsonify({"eliminados": resultado.deleted_count}), 200
    except Exception as e:
        print("Error en fnDeleteRecurso:", e)
        return jsonify(Messages.err500)


# ==============================================================================
# RESERVAS (PERSISTENCIA EN MONGODB + COLA DE ESPERA Y PILA DE HISTORIAL)
# ==============================================================================

def fnGetReservas():
    if dbReservas is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        arrFinalReservas = []
        listReservas = list(dbReservas.find({}).sort([("fechaAprobacion", -1), ("fechaCreacion", -1), ("_id", -1)]))

        for objRes in listReservas:
            arrFinalReservas.append({
                "_id": str(objRes['_id']),
                "turno": objRes.get("turno", 0),
                "recursoId": objRes.get("recursoId", ""),
                "codigoRecurso": objRes.get("codigoRecurso", ""),
                "nombreRecurso": objRes.get("nombreRecurso", ""),
                "ubicacion": objRes.get("ubicacion", ""),
                "solicitante": objRes.get("solicitante", ""),
                "matricula": objRes.get("matricula", ""),
                "correo": objRes.get("correo", ""),
                "fecha": objRes.get("fecha", ""),
                "horaInicio": objRes.get("horaInicio", ""),
                "horaFin": objRes.get("horaFin", ""),
                "motivo": objRes.get("motivo", ""),
                "estado": objRes.get("estado", "Pendiente"),
                "aprobadoPor": objRes.get("aprobadoPor", ""),
                "fechaAprobacion": objRes.get("fechaAprobacion", ""),
                "fechaCreacion": objRes.get("fechaCreacion", "")
            })

        objResponse = Messages.succ200.copy()
        objResponse['Respuesta'] = arrFinalReservas
        return jsonify(objResponse), 200
    except Exception as e:
        print("Error en fnGetReservas:", e)
        return jsonify(Messages.err500)


def fnGetReservasByMatricula(strMatricula):
    if dbReservas is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        matricula_limpia = str(strMatricula).strip()
        if not matricula_limpia:
            return jsonify({"error": "Debes proporcionar una matrícula"}), 400

        arrFinalReservas = []
        listReservas = list(
            dbReservas.find({
                "$or": [
                    {"solicitante": {"$regex": matricula_limpia, "$options": "i"}},
                    {"matricula": {"$regex": matricula_limpia, "$options": "i"}}
                ]
            }).sort([("fechaCreacion", -1), ("turno", 1)])
        )

        for objRes in listReservas:
            arrFinalReservas.append({
                "_id": str(objRes['_id']),
                "turno": objRes.get("turno", 0),
                "recursoId": objRes.get("recursoId", ""),
                "codigoRecurso": objRes.get("codigoRecurso", ""),
                "nombreRecurso": objRes.get("nombreRecurso", ""),
                "ubicacion": objRes.get("ubicacion", ""),
                "solicitante": objRes.get("solicitante", ""),
                "matricula": objRes.get("matricula", ""),
                "correo": objRes.get("correo", ""),
                "fecha": objRes.get("fecha", ""),
                "horaInicio": objRes.get("horaInicio", ""),
                "horaFin": objRes.get("horaFin", ""),
                "motivo": objRes.get("motivo", ""),
                "estado": objRes.get("estado", "Pendiente"),
                "aprobadoPor": objRes.get("aprobadoPor", ""),
                "fechaAprobacion": objRes.get("fechaAprobacion", ""),
                "fechaCreacion": objRes.get("fechaCreacion", "")
            })

        objResponse = Messages.succ200.copy()
        objResponse['Respuesta'] = arrFinalReservas
        return jsonify(objResponse), 200
    except Exception as e:
        print("Error en fnGetReservasByMatricula:", e)
        return jsonify(Messages.err500)


def fnGetReservasAprobadasUsuario(strIdentificador, strRol="Estudiante"):
    if dbReservas is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        ident = str(strIdentificador).strip()
        if not ident:
            return jsonify({"error": "Identificador requerido"}), 400

        base_ident = ident.split("@")[0].lstrip("aeAE")

        if strRol.lower() == "administrativo":
            condiciones_admin = [
                {"aprobadoPor": {"$regex": ident, "$options": "i"}}
            ]
            if base_ident and len(base_ident) >= 4:
                condiciones_admin.append({"aprobadoPor": {"$regex": base_ident, "$options": "i"}})

            filtro = {
                "estado": {"$in": ["Aprobada", "Atendida", "aprobada", "atendida"]},
                "$or": condiciones_admin
            }
        else:
            condiciones_est = [
                {"solicitante": {"$regex": ident, "$options": "i"}},
                {"matricula": {"$regex": ident, "$options": "i"}},
                {"correo": {"$regex": ident, "$options": "i"}}
            ]
            if base_ident and len(base_ident) >= 4:
                condiciones_est.append({"solicitante": {"$regex": base_ident, "$options": "i"}})
                condiciones_est.append({"matricula": {"$regex": base_ident, "$options": "i"}})
                condiciones_est.append({"correo": {"$regex": base_ident, "$options": "i"}})

            filtro = {
                "estado": {"$in": ["Aprobada", "Atendida", "aprobada", "atendida"]},
                "$or": condiciones_est
            }

        listReservas = list(
            dbReservas.find(filtro).sort([("fechaAprobacion", -1), ("fechaCreacion", -1), ("_id", -1)])
        )

        arrFinal = []
        for objRes in listReservas:
            arrFinal.append({
                "_id": str(objRes["_id"]),
                "turno": objRes.get("turno", 0),
                "recursoId": objRes.get("recursoId", ""),
                "codigoRecurso": objRes.get("codigoRecurso", ""),
                "nombreRecurso": objRes.get("nombreRecurso", ""),
                "ubicacion": objRes.get("ubicacion", ""),
                "solicitante": objRes.get("solicitante", ""),
                "matricula": objRes.get("matricula", ""),
                "correo": objRes.get("correo", ""),
                "fecha": objRes.get("fecha", ""),
                "horaInicio": objRes.get("horaInicio", ""),
                "horaFin": objRes.get("horaFin", ""),
                "motivo": objRes.get("motivo", ""),
                "estado": objRes.get("estado", "Aprobada"),
                "aprobadoPor": objRes.get("aprobadoPor", ""),
                "fechaAprobacion": objRes.get("fechaAprobacion", ""),
                "fechaCreacion": objRes.get("fechaCreacion", "")
            })

        objResponse = Messages.succ200.copy()
        objResponse["Respuesta"] = arrFinal
        return jsonify(objResponse), 200
    except Exception as e:
        print("Error en fnGetReservasAprobadasUsuario:", e)
        return jsonify(Messages.err500)


def fnInsertReserva(objReserva):
    if dbReservas is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        recurso_id = str(objReserva.get("recursoId", "") or objReserva.get("codigoRecurso", ""))
        nombre_recurso = objReserva.get("nombreRecurso", "")
        solicitante = objReserva.get("solicitante", "")

        # Buscar el último turno ÚNICAMENTE de este recurso específico
        ultima = dbReservas.find_one({"recursoId": recurso_id}, sort=[("turno", -1)])
        siguiente_turno = (ultima["turno"] + 1) if ultima and "turno" in ultima else 1
        fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        nueva = {
            "turno": siguiente_turno,
            "recursoId": recurso_id,
            "codigoRecurso": objReserva.get("codigoRecurso", ""),
            "nombreRecurso": nombre_recurso,
            "ubicacion": objReserva.get("ubicacion", ""),
            "solicitante": solicitante,
            "matricula": objReserva.get("matricula", ""),
            "correo": objReserva.get("correo", ""),
            "fecha": objReserva.get("fecha", ""),
            "horaInicio": objReserva.get("horaInicio", ""),
            "horaFin": objReserva.get("horaFin", ""),
            "motivo": objReserva.get("motivo", ""),
            "estado": "Pendiente",
            "aprobadoPor": "",
            "fechaAprobacion": "",
            "fechaCreacion": fecha_actual
        }

        resultado = dbReservas.insert_one(nueva)
        nueva["_id"] = str(resultado.inserted_id)

        # Registrar en ColaEspera (FIFO) exclusiva de este recurso
        if recurso_id not in colas_espera:
            colas_espera[recurso_id] = ColaEspera[dict]()
        colas_espera[recurso_id].encolar({
            "reserva_id": nueva["_id"],
            "turno": siguiente_turno,
            "recurso_id": recurso_id,
            "recurso": nombre_recurso,
            "usuario": solicitante,
            "fecha": fecha_actual
        })

        # Registrar movimiento en PilaHistorial (LIFO)
        pila_historial.apilar({
            "accion": "RESERVA_CREADA",
            "detalle": f"Turno #{siguiente_turno} en {nombre_recurso}: solicitado por {solicitante}",
            "fecha": fecha_actual
        })

        return jsonify({
            "Mensaje": "Reserva registrada correctamente",
            "Reserva": nueva,
            "cola_actual": colas_espera[recurso_id].ver_cola()
        }), 201
    except Exception as e:
        print("Error en fnInsertReserva:", e)
        return jsonify(Messages.err500)


def fnUpdateEstadoReserva(strId, strEstado, strAprobadoPor=""):
    if dbReservas is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        filtro = {"_id": ObjectId(strId)} if ObjectId.is_valid(strId) else {"turno": int(strId)}
        reserva = dbReservas.find_one(filtro)

        if not reserva:
            return jsonify({"error": "Reserva no encontrada"}), 404

        fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cambios = {"estado": strEstado}
        if strAprobadoPor:
            cambios["aprobadoPor"] = strAprobadoPor
        if strEstado == "Aprobada":
            cambios["fechaAprobacion"] = fecha_actual

        dbReservas.update_one(filtro, {"$set": cambios})

        recurso_id = str(reserva.get("recursoId", ""))

        # Si se aprueba o rechaza, desencolar el siguiente turno de ColaEspera
        if strEstado in ("Aprobada", "Rechazada") and recurso_id in colas_espera and not colas_espera[recurso_id].esta_vacia():
            colas_espera[recurso_id].desencolar()

        # Si se aprueba, cambiar estado del recurso en clRecursos a Prestado
        if strEstado == "Aprobada" and dbRecursos is not None and ObjectId.is_valid(recurso_id):
            dbRecursos.update_one(
                {"_id": ObjectId(recurso_id)},
                {"$set": {"estado": "Prestado"}}
            )

        # Registrar movimiento en PilaHistorial
        pila_historial.apilar({
            "accion": f"RESERVA_{strEstado.upper()}",
            "detalle": f"Turno #{reserva.get('turno')} ({reserva.get('nombreRecurso')}) -> {strEstado} por {strAprobadoPor}",
            "fecha": fecha_actual
        })

        return jsonify({"Mensaje": "Estado actualizado", "estado": strEstado}), 200
    except Exception as e:
        print("Error en fnUpdateEstadoReserva:", e)
        return jsonify(Messages.err500)


# ==============================================================================
# REPORTES DE CASOS / INCIDENCIAS (PERSISTENCIA EN MONGODB)
# ==============================================================================

def fnGetReportes():
    if dbReportes is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        arrFinalReportes = []
        listReportes = list(dbReportes.find({}).sort([("fecha", -1), ("_id", -1)]))

        for objRep in listReportes:
            arrFinalReportes.append({
                "_id": str(objRep["_id"]),
                "tipoEquipo": objRep.get("tipoEquipo", ""),
                "nombreEquipo": objRep.get("nombreEquipo", ""),
                "descripcion": objRep.get("descripcion", ""),
                "usuario": objRep.get("usuario", ""),
                "correo": objRep.get("correo", ""),
                "matricula": objRep.get("matricula", ""),
                "fecha": objRep.get("fecha", ""),
                "estado": objRep.get("estado", "Pendiente")
            })

        objResponse = Messages.succ200.copy()
        objResponse["Respuesta"] = arrFinalReportes
        return jsonify(objResponse), 200
    except Exception as e:
        print("Error en fnGetReportes:", e)
        return jsonify(Messages.err500)


def fnInsertReporte(objReporte):
    if dbReportes is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        fecha_actual = objReporte.get("fecha") or datetime.now().strftime("%Y-%m-%d %H:%M")
        nuevo = {
            "tipoEquipo": objReporte.get("tipoEquipo", ""),
            "nombreEquipo": objReporte.get("nombreEquipo", ""),
            "descripcion": objReporte.get("descripcion", ""),
            "usuario": objReporte.get("usuario", "Usuario"),
            "correo": objReporte.get("correo", ""),
            "matricula": objReporte.get("matricula", ""),
            "fecha": fecha_actual,
            "estado": "Pendiente"
        }

        resultado = dbReportes.insert_one(nuevo)
        nuevo["_id"] = str(resultado.inserted_id)

        pila_historial.apilar({
            "accion": "REPORTE_CREADO",
            "detalle": f"Reporte en {nuevo['nombreEquipo']} ({nuevo['tipoEquipo']}) por {nuevo['usuario']}",
            "fecha": fecha_actual
        })

        return jsonify({
            "Mensaje": "Reporte registrado correctamente",
            "Respuesta": nuevo
        }), 201
    except Exception as e:
        print("Error en fnInsertReporte:", e)
        return jsonify(Messages.err500)


def fnUpdateEstadoReporte(strId, strEstado):
    if dbReportes is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        if not ObjectId.is_valid(strId):
            return jsonify({"error": "ID Inválido"}), 400

        resultado = dbReportes.update_one(
            {"_id": ObjectId(strId)},
            {"$set": {"estado": strEstado}}
        )

        if resultado.matched_count == 0:
            return jsonify({"error": "Reporte no encontrado"}), 404

        pila_historial.apilar({
            "accion": f"REPORTE_{strEstado.upper()}",
            "detalle": f"Reporte {strId} marcado como {strEstado}",
            "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })

        return jsonify({"Mensaje": "Estado del reporte actualizado", "estado": strEstado}), 200
    except Exception as e:
        print("Error en fnUpdateEstadoReporte:", e)
        return jsonify(Messages.err500)


def fnSincronizarColasDesdeBD():
    if dbReservas is None:
        return
    try:
        todas = list(dbReservas.find({}).sort([("fechaCreacion", 1), ("_id", 1)]))
        contadores_por_recurso: dict[str, int] = {}

        for res in todas:
            recurso_id = str(res.get("recursoId", "") or res.get("codigoRecurso", ""))
            nuevo_turno = contadores_por_recurso.get(recurso_id, 0) + 1
            contadores_por_recurso[recurso_id] = nuevo_turno

            if res.get("turno") != nuevo_turno:
                dbReservas.update_one({"_id": res["_id"]}, {"$set": {"turno": nuevo_turno}})

            if res.get("estado", "Pendiente") == "Pendiente":
                if recurso_id not in colas_espera:
                    colas_espera[recurso_id] = ColaEspera[dict]()
                colas_espera[recurso_id].encolar({
                    "reserva_id": str(res["_id"]),
                    "turno": nuevo_turno,
                    "recurso_id": recurso_id,
                    "recurso": res.get("nombreRecurso", ""),
                    "usuario": res.get("solicitante", ""),
                    "fecha": res.get("fechaCreacion", "")
                })
    except Exception as e:
        print("Error al sincronizar y renumerar colas desde MongoDB:", e)


fnSincronizarColasDesdeBD()