from datetime import date, datetime, time
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.core.seguridad import requiere_rol, obtener_usuario_actual
from app.db.eventos import (
    obtener_eventos_recientes,
    obtener_eventos_filtrados,
    obtener_estadisticas_eventos,
    actualizar_estado_evento,
)

router = APIRouter(prefix="/api/eventos", tags=["eventos"])


class ActualizarEstadoEntrada(BaseModel):
    estado: str


@router.get("/")
async def listar_eventos(
    limite: int = 50,
    ubicacion: Optional[str] = None,
    nivel_riesgo: Optional[str] = None,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    hay_filtros = any([ubicacion, nivel_riesgo, fecha_inicio, fecha_fin])
    if not hay_filtros:
        return obtener_eventos_recientes(limite)

    inicio = datetime.combine(fecha_inicio, time.min) if fecha_inicio else None
    fin = datetime.combine(fecha_fin, time.max) if fecha_fin else None

    return obtener_eventos_filtrados(
        ubicacion=ubicacion,
        nivel_riesgo=nivel_riesgo,
        fecha_inicio=inicio,
        fecha_fin=fin,
    )


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
