import asyncio
import shutil
import sys
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

sys.path.append("..")
import backend.configuracion as configuracion
from app.core.queue_manager import gestor_sesiones
from app.workers.ia_worker import iniciar_worker_camara
from app.services.captura_video import CapturaVideo
from app.services.detector_movimiento import DetectorMovimiento
from app.services.detector_objetos import DetectorObjetos
from app.services.detector_poses import DetectorPoses
from app.services.analizador_comportamientos import AnalizadorComportamiento
from app.services.sistema_alertas import SistemaAlertas
from app.db import repositorio_camaras as repo

EXTENSIONES_VIDEO_PERMITIDAS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

router = APIRouter(prefix="/api/camaras", tags=["camaras"])

_tareas_activas: dict[str, asyncio.Task] = {}

class CamaraEntrada(BaseModel):
    nombre: str
    ubicacion: str
    tipo: str = "IP"
    fuente: str = "0"
    latitud: float | None = None
    longitud: float | None = None

class CamaraActualizacion(BaseModel):
    nombre: str | None = None
    ubicacion: str | None = None
    tipo: str | None = None
    fuente: str | None = None
    estado: str | None = None
    latitud: float | None = None
    longitud: float | None = None

@router.get("/")
async def listar_camaras():
    return repo.listar_camaras()

@router.post("/")
async def crear_camara(datos: CamaraEntrada):
    return repo.crear_camara(**datos.model_dump())

@router.post("/subir-video")
async def crear_camara_con_video(
    nombre: str = Form(...),
    ubicacion: str = Form(...),
    latitud: float | None = Form(None),
    longitud: float | None = Form(None),
    archivo: UploadFile = File(...),
):

    extension = Path(archivo.filename or "").suffix.lower()
    if extension not in EXTENSIONES_VIDEO_PERMITIDAS:
        raise HTTPException(
            400,
            detail=f"Formato no soportado ({extension or 'sin extensión'}). "
                   f"Usa uno de: {', '.join(EXTENSIONES_VIDEO_PERMITIDAS)}"
        )

    carpeta_destino = configuracion.ALMACENAMIENTO_VIDEOS / "localidades"
    carpeta_destino.mkdir(parents=True, exist_ok=True)

    nombre_archivo = f"{uuid.uuid4().hex}{extension}"
    ruta_destino = carpeta_destino / nombre_archivo

    with open(ruta_destino, "wb") as buffer:
        shutil.copyfileobj(archivo.file, buffer)

    return repo.crear_camara(
        nombre=nombre,
        ubicacion=ubicacion,
        tipo="video",
        fuente=str(ruta_destino),
        latitud=latitud,
        longitud=longitud,
    )

@router.put("/{id_camara}")
async def editar_camara(id_camara: int, datos: CamaraActualizacion):
    camara = repo.editar_camara(id_camara, **datos.model_dump())
    if not camara:
        raise HTTPException(404, detail="Cámara no encontrada")
    return camara

@router.delete("/{id_camara}")
async def eliminar_camara(id_camara: int):
    if id_camara in _tareas_activas:
        raise HTTPException(400, detail="Detén la vigilancia antes de eliminar la cámara")
    if not repo.eliminar_camara(id_camara):
        raise HTTPException(404, detail="Cámara no encontrada")
    return {"mensaje": "Cámara eliminada"}

@router.post("/{id_camara}/iniciar")
async def iniciar_vigilancia(id_camara: int):
    clave = str(id_camara)
    if clave in _tareas_activas:
        raise HTTPException(400, detail="Esta cámara ya está en vigilancia")

    camaras = {c["id_camara"]: c for c in repo.listar_camaras()}
    datos_camara = camaras.get(id_camara)
    if not datos_camara:
        raise HTTPException(404, detail="Cámara no encontrada")

    sesion = gestor_sesiones.obtener_o_crear(clave)

    fuente_camara = datos_camara["fuente"]
    es_indice_dispositivo = datos_camara.get("tipo") == "webcam" or (
        isinstance(fuente_camara, str) and fuente_camara.isdigit()
    )
    if es_indice_dispositivo:
        fuente_camara = int(fuente_camara)

    captura = CapturaVideo(fuente_camara)

    tarea = asyncio.create_task(
        iniciar_worker_camara(
            sesion=sesion,
            captura_video=captura,
            detector_movimiento=DetectorMovimiento(),
            detector_objetos=DetectorObjetos(),
            detector_poses=DetectorPoses(),
            analizador_comportamiento=AnalizadorComportamiento(),
            sistema_alertas=SistemaAlertas(),
        )
    )
    _tareas_activas[clave] = tarea
    repo.editar_camara(id_camara, estado="activa")
    return {"mensaje": f"Vigilancia iniciada en cámara {id_camara}"}

@router.post("/{id_camara}/detener")
async def detener_vigilancia(id_camara: int):
    clave = str(id_camara)
    sesion = gestor_sesiones.obtener(clave)
    if not sesion:
        raise HTTPException(404, detail="La cámara no está en vigilancia")

    sesion.corriendo = False
    tarea = _tareas_activas.pop(clave, None)
    if tarea:
        tarea.cancel()
    repo.editar_camara(id_camara, estado="inactiva")
    return {"mensaje": f"Vigilancia detenida en cámara {id_camara}"}

@router.get("/{id_camara}/estado")
async def estado_camara(id_camara: int):
    sesion = gestor_sesiones.obtener(str(id_camara))
    if not sesion:
        return {"corriendo": False}
    return {
        "corriendo": sesion.corriendo,
        "frames_procesados": sesion.frames_procesados,
        "alertas_generadas": sesion.alertas_generadas,
        "personas_detectadas": sesion.personas_detectadas,
    }