import asyncio
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class SesionCamara:
    id_camara: str
    corriendo: bool = False
    frames_procesados: int = 0
    alertas_generadas: int = 0
    personas_detectadas: int = 0

    cola_frames: asyncio.Queue = field(default_factory=lambda: asyncio.Queue(maxsize=2))

    cola_eventos: asyncio.Queue = field(default_factory=lambda: asyncio.Queue())

    frames_recientes: list = field(default_factory=list)


class GestorSesiones:

    def __init__(self):
        self._sesiones: dict[str, SesionCamara] = {}

    def obtener_o_crear(self, id_camara: str) -> SesionCamara:
        if id_camara not in self._sesiones:
            self._sesiones[id_camara] = SesionCamara(id_camara=id_camara)
        return self._sesiones[id_camara]

    def obtener(self, id_camara: str) -> Optional[SesionCamara]:
        return self._sesiones.get(id_camara)

    def eliminar(self, id_camara: str):
        self._sesiones.pop(id_camara, None)

    def listar_ids(self) -> list[str]:
        return list(self._sesiones.keys())

gestor_sesiones = GestorSesiones()
