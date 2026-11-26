from typing import Generic, TypeVar, Optional
from datetime import datetime

T = TypeVar('T')


class NodoPila(Generic[T]):
    def __init__(self, dato: T):
        self.dato: T = dato
        self.siguiente: Optional['NodoPila[T]'] = None


class PilaHistorial(Generic[T]):
    def __init__(self):
        self.tope: Optional[NodoPila[T]] = None
        self._tamano: int = 0

    def esta_vacia(self) -> bool:
        return self.tope is None

    def apilar(self, item: T) -> None:
        """Agrega una reserva/movimiento en el tope de la pila (LIFO)."""
        nuevo_nodo = NodoPila(item)
        nuevo_nodo.siguiente = self.tope
        self.tope = nuevo_nodo
        self._tamano += 1

    def desapilar(self) -> Optional[T]:
        """Extrae y devuelve el elemento más reciente del tope."""
        if self.esta_vacia():
            return None
        assert self.tope is not None
        dato = self.tope.dato
        self.tope = self.tope.siguiente
        self._tamano -= 1
        return dato

    def ver_tope(self) -> Optional[T]:
        """Consulta el registro más reciente sin sacarlo."""
        return self.tope.dato if self.tope else None

    def ver_pila(self) -> list[T]:
        """Devuelve todos los elementos del más reciente al más antiguo."""
        elementos = []
        actual = self.tope
        while actual is not None:
            elementos.append(actual.dato)
            actual = actual.siguiente
        return elementos


# ==============================================================================
# CONTROL DE HISTORIAL POR USUARIO (MATRÍCULA Y CORREO)
# ==============================================================================

# Diccionario de pilas indexado por clave normalizada (matrícula o correo)
pilas_usuarios: dict[str, PilaHistorial[dict]] = {}


def _clave_usuario(matricula: str = "", correo: str = "") -> str:
    mat = str(matricula or "").strip().lower()
    mail = str(correo or "").strip().lower()
    return f"{mat}|{mail}"


def registrar_en_historial_usuario(reserva: dict, accion: str = "RESERVA_CREADA") -> list[dict]:
    """Apila una reserva en el historial personal del usuario (matrícula + correo)."""
    matricula = str(reserva.get("matricula") or reserva.get("solicitante") or "").strip()
    correo = str(reserva.get("correo") or reserva.get("email") or "").strip()
    clave = _clave_usuario(matricula, correo)

    if clave not in pilas_usuarios:
        pilas_usuarios[clave] = PilaHistorial[dict]()

    registro = {
        "accion": accion,
        "reserva_id": str(reserva.get("_id", "")),
        "matricula": matricula,
        "correo": correo,
        "codigoRecurso": reserva.get("codigoRecurso", ""),
        "nombreRecurso": reserva.get("nombreRecurso", ""),
        "ubicacion": reserva.get("ubicacion", ""),
        "fecha": reserva.get("fecha", ""),
        "horaInicio": reserva.get("horaInicio", ""),
        "horaFin": reserva.get("horaFin", ""),
        "estado": reserva.get("estado", "Pendiente"),
        "fechaMovimiento": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    pilas_usuarios[clave].apilar(registro)
    return pilas_usuarios[clave].ver_pila()


def obtener_historial_usuario(matricula: str = "", correo: str = "") -> list[dict]:
    """Devuelve la pila LIFO (de la más reciente a la más antigua) filtrando por matrícula y/o correo."""
    mat_busq = str(matricula or "").strip().lower()
    mail_busq = str(correo or "").strip().lower()

    resultados: list[dict] = []
    for clave, pila in pilas_usuarios.items():
        mat_pila, mail_pila = clave.split("|", 1)
        coincide_mat = bool(mat_busq) and mat_busq == mat_pila
        coincide_mail = bool(mail_busq) and mail_busq == mail_pila

        if (mat_busq and mail_busq and coincide_mat and coincide_mail) or \
           (mat_busq and not mail_busq and coincide_mat) or \
           (mail_busq and not mat_busq and coincide_mail):
            resultados.extend(pila.ver_pila())

    resultados.sort(key=lambda x: x.get("fechaMovimiento", ""), reverse=True)
    return resultados


def eliminar_ultimo_movimiento_usuario(matricula: str = "", correo: str = "") -> Optional[dict]:
    """Desapila (pop) el último movimiento del usuario."""
    clave = _clave_usuario(matricula, correo)
    if clave in pilas_usuarios:
        return pilas_usuarios[clave].desapilar()
    return None


def sincronizar_pilas_desde_lista(lista_reservas: list[dict], mapa_usuarios: Optional[dict[str, str]] = None) -> None:
    """
    Reconstruye las pilas LIFO al arrancar el servidor a partir de las reservas de MongoDB
    ordenadas cronológicamente (la última apilada queda en el tope).
    mapa_usuarios: dict opcional {matricula_lower: correo} para completar el correo si la reserva solo guardó matrícula.
    """
    pilas_usuarios.clear()
    mapa = mapa_usuarios or {}

    for r in lista_reservas:
        matricula = str(r.get("matricula") or r.get("solicitante") or "").strip()
        correo = str(r.get("correo") or r.get("email") or mapa.get(matricula.lower(), "")).strip()
        clave = _clave_usuario(matricula, correo)

        if clave not in pilas_usuarios:
            pilas_usuarios[clave] = PilaHistorial[dict]()

        pilas_usuarios[clave].apilar({
            "accion": f"ESTADO_{str(r.get('estado', 'Pendiente')).upper()}",
            "reserva_id": str(r.get("_id", "")),
            "matricula": matricula,
            "correo": correo,
            "codigoRecurso": r.get("codigoRecurso", ""),
            "nombreRecurso": r.get("nombreRecurso", ""),
            "ubicacion": r.get("ubicacion", ""),
            "fecha": r.get("fecha", ""),
            "horaInicio": r.get("horaInicio", ""),
            "horaFin": r.get("horaFin", ""),
            "estado": r.get("estado", "Pendiente"),
            "fechaMovimiento": r.get("fechaAprobacion") or r.get("fechaCreacion", "")
        })
        