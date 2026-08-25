import asyncio
from fastapi import APIRouter, HTTPException

from app.core.queue_manager import gestor_sesiones
from app.workers.ia_worker import iniciar_worker_camara
from app.services.captura_video import CapturaVideo
from app.services.detector_movimiento import DetectorMovimiento
from app.services.detector_objetos import DetectorObjetos
from app.services.analizador_comportamientos import AnalizadorComportamiento
from app.services.sistema_alertas import SistemaAlertas

router = APIRouter(prefix="/api/camaras", tags=["camaras"])

_tareas_activas: dict[str, asyncio.Task] = {}

@router.post("/{id_camara}/iniciar")
async def iniciar_vigilancia(id_camara: str, fuente: str = "0"):
    if id_camara in _tareas_activas:
        raise HTTPException(400, detail="Esta cámara ya está en vigilancia")

    sesion = gestor_sesiones.obtener_o_crear(id_camara)
    captura = CapturaVideo(fuente)

    tarea = asyncio.create_task(
        iniciar_worker_camara(
            sesion=sesion,
            captura_video=captura,
            detector_movimiento=DetectorMovimiento(),
            detector_objetos=DetectorObjetos(),
            analizador_comportamiento=AnalizadorComportamiento(),
            sistema_alertas=SistemaAlertas(),
        )
    )
    _tareas_activas[id_camara] = tarea
    return {"mensaje": f"Vigilancia iniciada en {id_camara}"}

@router.post("/{id_camara}/detener")
async def detener_vigilancia(id_camara: str):
    sesion = gestor_sesiones.obtener(id_camara)
    if not sesion:
        raise HTTPException(404, detail="Cámara no encontrada")

    sesion.corriendo = False
    tarea = _tareas_activas.pop(id_camara, None)
    if tarea:
        tarea.cancel()
    return {"mensaje": f"Vigilancia detenida en {id_camara}"}

@router.get("/{id_camara}/estado")
async def estado_camara(id_camara: str):
    sesion = gestor_sesiones.obtener(id_camara)
    if not sesion:
        raise HTTPException(404, detail="Cámara no encontrada")
    return {
        "corriendo": sesion.corriendo,
        "frames_procesados": sesion.frames_procesados,
        "alertas_generadas": sesion.alertas_generadas,
        "personas_detectadas": sesion.personas_detectadas,
    }

@router.get("/")
async def listar_camaras():
    return {"camaras": gestor_sesiones.listar_ids()}
