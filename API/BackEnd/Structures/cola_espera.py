from typing import Generic, TypeVar, Optional
from datetime import datetime

T = TypeVar('T')

class Nodo(Generic[T]):
    def __init__(self, dato: T):
        self.dato: T = dato
        self.siguiente: Optional['Nodo[T]'] = None

class ColaEspera(Generic[T]):
    def __init__(self):
        self.frente: Optional[Nodo[T]] = None
        self.final: Optional[Nodo[T]] = None
        self._tamano: int = 0

    def esta_vacia(self) -> bool:
        return self.frente is None

    def encolar(self, item: T) -> None:
        """Agrega una solicitud de reserva al final de la cola (FIFO)."""
        nuevo_nodo = Nodo(item)
        if self.esta_vacia():
            self.frente = nuevo_nodo
            self.final = nuevo_nodo
        else:
            assert self.final is not None
            self.final.siguiente = nuevo_nodo
            self.final = nuevo_nodo
        self._tamano += 1

    def desencolar(self) -> Optional[T]:
        """Atiende y extrae la primera solicitud en espera."""
        if self.esta_vacia():
            return None
        assert self.frente is not None
        dato = self.frente.dato
        self.frente = self.frente.siguiente
        if self.frente is None:
            self.final = None
        self._tamano -= 1
        return dato

    def ver_frente(self) -> Optional[T]:
        """Consulta quién sigue en la fila sin sacarlo."""
        return self.frente.dato if self.frente else None

    def ver_cola(self) -> list[T]:
        """Devuelve todos los elementos en orden para enviarlos como JSON."""
        elementos = []
        actual = self.frente
        while actual is not None:
            elementos.append(actual.dato)
            actual = actual.siguiente
        return elementos


# ==============================================================================
# CONTROL INDEPENDIENTE DE RESERVAS APROBADAS (COLA FIFO GLOBAL)
# ==============================================================================

cola_aprobadas = ColaEspera[dict]()


def agregar_reserva_aprobada(reserva: dict) -> list[dict]:
    """Agrega una reserva aprobada al final de la cola global sin importar matrícula."""
    registro = {
        "posicion": cola_aprobadas._tamano + 1,
        "reserva_id": str(reserva.get("_id", "")),
        "recursoId": str(reserva.get("recursoId", "")),
        "codigoRecurso": reserva.get("codigoRecurso", ""),
        "nombreRecurso": reserva.get("nombreRecurso", ""),
        "ubicacion": reserva.get("ubicacion", ""),
        "solicitante": reserva.get("solicitante", ""),
        "fecha": reserva.get("fecha", ""),
        "horaInicio": reserva.get("horaInicio", ""),
        "horaFin": reserva.get("horaFin", ""),
        "fechaAprobacion": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    cola_aprobadas.encolar(registro)
    return cola_aprobadas.ver_cola()


def atender_primera_aprobada() -> Optional[dict]:
    """Desencola (atiende/libera) la primera reserva aprobada en el orden FIFO."""
    return cola_aprobadas.desencolar()


def obtener_cola_aprobadas() -> list[dict]:
    """Devuelve toda la lista de reservas aprobadas en el orden exacto en que van."""
    return cola_aprobadas.ver_cola()


def sincronizar_aprobadas_desde_lista(lista_reservas: list[dict]) -> None:
    """Llena la cola global al iniciar el servidor con las reservas Aprobadas de la BD."""
    while not cola_aprobadas.esta_vacia():
        cola_aprobadas.desencolar()

    for idx, r in enumerate(lista_reservas, start=1):
        cola_aprobadas.encolar({
            "posicion": idx,
            "reserva_id": str(r.get("_id", "")),
            "recursoId": str(r.get("recursoId", "")),
            "codigoRecurso": r.get("codigoRecurso", ""),
            "nombreRecurso": r.get("nombreRecurso", ""),
            "ubicacion": r.get("ubicacion", ""),
            "solicitante": r.get("solicitante", ""),
            "fecha": r.get("fecha", ""),
            "horaInicio": r.get("horaInicio", ""),
            "horaFin": r.get("horaFin", ""),
            "fechaAprobacion": r.get("fechaAprobacion") or r.get("fechaCreacion", "")
        })