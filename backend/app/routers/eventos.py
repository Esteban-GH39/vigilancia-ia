from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.core.seguridad import requiere_rol, obtener_usuario_actual
from app.db.eventos import (
    obtener_eventos_recientes,
    obtener_estadisticas_eventos,
    actualizar_estado_evento,
)

router = APIRouter(prefix="/api/eventos", tags=["eventos"])


class ActualizarEstadoEntrada(BaseModel):
    estado: str


@router.get("/")
async def listar_eventos(limite: int = 50, usuario_actual: dict = Depends(obtener_usuario_actual)):
    return obtener_eventos_recientes(limite)


@router.get("/estadisticas")
async def estadisticas_eventos(usuario_actual: dict = Depends(obtener_usuario_actual)):
    return obtener_estadisticas_eventos()


@router.put("/{id_evento}/estado")
async def cambiar_estado_evento(
    id_evento: int,
    datos: ActualizarEstadoEntrada,
    usuario_actual: dict = Depends(requiere_rol("admin", "operador")),
):
    try:
        resultado = actualizar_estado_evento(id_evento, datos.estado)
    except ValueError as error:
        raise HTTPException(400, detail=str(error))

    if resultado is None:
        raise HTTPException(404, detail="Evento no encontrado")

    return resultado
