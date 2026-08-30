from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.eventos import (
    obtener_eventos_recientes,
    obtener_estadisticas_eventos,
    actualizar_estado_evento,
)

router = APIRouter(prefix="/api/eventos", tags=["eventos"])


class ActualizarEstadoEntrada(BaseModel):
    estado: str


@router.get("/")
async def listar_eventos(limite: int = 50):
    return obtener_eventos_recientes(limite)


@router.get("/estadisticas")
async def estadisticas_eventos():
    return obtener_estadisticas_eventos()


@router.put("/{id_evento}/estado")
async def cambiar_estado_evento(id_evento: int, datos: ActualizarEstadoEntrada):
    try:
        resultado = actualizar_estado_evento(id_evento, datos.estado)
    except ValueError as error:
        raise HTTPException(400, detail=str(error))

    if resultado is None:
        raise HTTPException(404, detail="Evento no encontrado")

    return resultado
