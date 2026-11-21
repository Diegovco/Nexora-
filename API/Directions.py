from flask import Flask, jsonify, request
from flask_cors import CORS

import BackEnd.Functions as CallMethod
import BackEnd.GlobalInfo.ResponseMessages as Messages

# Instancia
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])

@app.route('/')
def Getmessage():
    try:
        objResult = CallMethod.fnMesajeGet()
        return objResult
    except Exception as e:
        print("Error en Getmessage:", e)
        return jsonify(Messages.err500)

# 1. RUTAS DE USUARIOS

@app.route('/getUsers', methods=['GET'])
def GetUsers():
    try:
        objResult = CallMethod.fnGetUsers()
        return objResult
    except Exception as e:
        print("Error en GetUsers:", e)
        return jsonify(Messages.err500)

@app.route('/users', methods=['POST'])
def PostUser():
    return CallMethod.fnInsertUser(request.get_json(silent=True) or {})

@app.route('/users/<strId>', methods=['PUT'])
def PutUser(strId):
    return CallMethod.fnUpdateUser(
        strId,
        request.get_json(silent=True) or {}
    )

@app.route('/users/<strId>', methods=['DELETE'])
def DeleteUser(strId):
    return CallMethod.fnDeleteUser(strId)

# 2. RUTAS DE CULTIVOS

@app.route('/getCultivos', methods=['GET'])
def GetCultivos():
    try:
        objResult = CallMethod.fnGetCultivos()
        return objResult
    except Exception as e:
        print("Error en GetCultivos:", e)
        return jsonify(Messages.err500)

@app.route('/cultivos', methods=['POST'])
def PostCultivo():
    return CallMethod.fnInsertCultivo(request.get_json(silent=True) or {})

@app.route('/cultivos/<strId>', methods=['PUT'])
def PutCultivo(strId):
    return CallMethod.fnUpdateCultivo(
        strId,
        request.get_json(silent=True) or {}
    )

@app.route('/cultivos/<strId>', methods=['DELETE'])
def DeleteCultivo(strId):
    return CallMethod.fnDeleteCultivo(strId)

# 3. RUTAS DE SISTEMA IOT

@app.route('/getSistemaIoT', methods=['GET'])
def GetSistemaIoT():
    try:
        objResult = CallMethod.fnGetSistemaIoT()
        return objResult
    except Exception as e:
        print("Error en GetSistemaIoT:", e)
        return jsonify(Messages.err500)

@app.route('/sistemaiot', methods=['POST'])
def PostSistemaIoT():
    return CallMethod.fnInsertSistemaIoT(request.get_json(silent=True) or {})

@app.route('/sistemaiot/<strId>', methods=['PUT'])
def PutSistemaIoT(strId):
    return CallMethod.fnUpdateSistemaIoT(
        strId,
        request.get_json(silent=True) or {}
    )

@app.route('/users/email/<strCorreo>', methods=['GET'])
def GetUserByEmail(strCorreo):
    try:
        return CallMethod.fnGetUserByEmail(strCorreo)
    except Exception as e:
        print("Error en GetUserByEmail:", e)
        return jsonify(Messages.err500)

@app.route('/test-db', methods=['GET'])
def TestDB():
    try:
        total_usuarios = CallMethod.dbUsers.count_documents({})
        return jsonify({
            "status": "OK",
            "mensaje": "Conexión a MongoDB activa",
            "total_usuarios": total_usuarios
        }), 200
    except Exception as e:
        return jsonify({
            "status": "Error",
            "mensaje": str(e)
        }), 500

# 4. RUTAS DE COLA DE ESPERA Y PILA DE HISTORIAL

@app.route('/cola/encolar', methods=['POST'])
def EncolarReserva():
    try:
        datos = request.get_json(silent=True) or {}
        strRecursoId = datos.get('recurso_id', '')
        strNombreRecurso = datos.get('nombre_recurso', '')
        strCorreoUsuario = datos.get('usuario_email', '')

        if not strRecursoId or not strCorreoUsuario:
            return jsonify({"error": "Faltan datos obligatorios (recurso_id, usuario_email)"}), 400

        return CallMethod.fnEncolarReserva(strRecursoId, strNombreRecurso, strCorreoUsuario)
    except Exception as e:
        print("Error en EncolarReserva:", e)
        return jsonify(Messages.err500)

@app.route('/cola/atender/<strRecursoId>', methods=['POST'])
def AtenderSiguienteCola(strRecursoId):
    try:
        return CallMethod.fnAtenderSiguienteEnCola(strRecursoId)
    except Exception as e:
        print("Error en AtenderSiguienteCola:", e)
        return jsonify(Messages.err500)

@app.route('/cola/<strRecursoId>', methods=['GET'])
def VerColaRecurso(strRecursoId):
    try:
        return CallMethod.fnVerColaRecurso(strRecursoId)
    except Exception as e:
        print("Error en VerColaRecurso:", e)
        return jsonify(Messages.err500)

@app.route('/historial', methods=['GET'])
def ObtenerHistorial():
    try:
        return CallMethod.fnObtenerHistorial()
    except Exception as e:
        print("Error en ObtenerHistorial:", e)
        return jsonify(Messages.err500)

@app.route('/historial/deshacer', methods=['POST'])
def DeshacerUltimoMovimiento():
    try:
        return CallMethod.fnDeshacerUltimoMovimiento()
    except Exception as e:
        print("Error en DeshacerUltimoMovimiento:", e)
        return jsonify(Messages.err500)

# 5. RUTAS DE RECURSOS

@app.route('/getRecursos', methods=['GET'])
def GetRecursos():
    try:
        return CallMethod.fnGetRecursos()
    except Exception as e:
        print("Error en GetRecursos:", e)
        return jsonify(Messages.err500)

@app.route('/recursos', methods=['POST'])
def PostRecurso():
    return CallMethod.fnInsertRecurso(request.get_json(silent=True) or {})

@app.route('/recursos/<strId>', methods=['PUT'])
def PutRecurso(strId):
    return CallMethod.fnUpdateRecurso(
        strId,
        request.get_json(silent=True) or {}
    )

@app.route('/recursos/<strId>', methods=['DELETE'])
def DeleteRecurso(strId):
    return CallMethod.fnDeleteRecurso(strId)

# 6. RUTAS DE RESERVAS

@app.route('/getReservas', methods=['GET'])
def GetReservas():
    try:
        return CallMethod.fnGetReservas()
    except Exception as e:
        print("Error en GetReservas:", e)
        return jsonify(Messages.err500)

@app.route('/getReservas/matricula/<strMatricula>', methods=['GET'])
def GetReservasByMatricula(strMatricula):
    try:
        return CallMethod.fnGetReservasByMatricula(strMatricula)
    except Exception as e:
        print("Error en GetReservasByMatricula:", e)
        return jsonify(Messages.err500)

@app.route('/getReservas/aprobadas', methods=['GET'])
def GetReservasAprobadasUsuario():
    try:
        identificador = request.args.get('identificador', '')
        rol = request.args.get('rol', 'Estudiante')
        return CallMethod.fnGetReservasAprobadasUsuario(identificador, rol)
    except Exception as e:
        print("Error en GetReservasAprobadasUsuario:", e)
        return jsonify(Messages.err500)

@app.route('/reservas', methods=['POST'])
def PostReserva():
    try:
        return CallMethod.fnInsertReserva(request.get_json(silent=True) or {})
    except Exception as e:
        print("Error en PostReserva:", e)
        return jsonify(Messages.err500)

@app.route('/reservas/<strId>', methods=['PUT'])
def PutReserva(strId):
    try:
        datos = request.get_json(silent=True) or {}
        return CallMethod.fnUpdateEstadoReserva(
            strId,
            datos.get("estado", "Pendiente"),
            datos.get("aprobadoPor", "")
        )
    except Exception as e:
        print("Error en PutReserva:", e)
        return jsonify(Messages.err500)

# 7. RUTAS DE REPORTES

@app.route('/getReportes', methods=['GET'])
def GetReportes():
    try:
        return CallMethod.fnGetReportes()
    except Exception as e:
        print("Error en GetReportes:", e)
        return jsonify(Messages.err500)

@app.route('/reportes', methods=['POST'])
def PostReporte():
    try:
        return CallMethod.fnInsertReporte(request.get_json(silent=True) or {})
    except Exception as e:
        print("Error en PostReporte:", e)
        return jsonify(Messages.err500)

@app.route('/reportes/<strId>', methods=['PUT'])
def PutReporte(strId):
    try:
        datos = request.get_json(silent=True) or {}
        return CallMethod.fnUpdateEstadoReporte(strId, datos.get("estado", "Resuelto"))
    except Exception as e:
        print("Error en PutReporte:", e)
        return jsonify(Messages.err500)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=True)