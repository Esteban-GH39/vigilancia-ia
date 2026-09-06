from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.core.seguridad import requiere_rol
from app.db.repositorio_usuarios import (
    listar_usuarios,
    actualizar_estado_usuario,
    actualizar_rol_usuario,
)

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


class ActualizarEstadoEntrada(BaseModel):
    estado: str


class ActualizarRolEntrada(BaseModel):
    rol: str


@router.get("/")
async def obtener_usuarios(usuario_actual: dict = Depends(requiere_rol("admin"))):
    return listar_usuarios()


@router.put("/{id_usuario}/estado")
async def cambiar_estado_usuario(
    id_usuario: int,
    datos: ActualizarEstadoEntrada,
    usuario_actual: dict = Depends(requiere_rol("admin")),
):
    try:
        resultado = actualizar_estado_usuario(id_usuario, datos.estado)
    except ValueError as error:
        raise HTTPException(400, detail=str(error))

    if resultado is None:
        raise HTTPException(404, detail="Usuario no encontrado")
    return resultado


@router.put("/{id_usuario}/rol")
async def cambiar_rol_usuario(
    id_usuario: int,
    datos: ActualizarRolEntrada,
    usuario_actual: dict = Depends(requiere_rol("admin")),
):
    try:
        resultado = actualizar_rol_usuario(id_usuario, datos.rol)
    except ValueError as error:
        raise HTTPException(400, detail=str(error))

    if resultado is None:
        raise HTTPException(404, detail="Usuario no encontrado")
    return resultado
