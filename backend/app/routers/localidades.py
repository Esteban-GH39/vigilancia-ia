from fastapi import APIRouter, Depends
from app.core.seguridad import obtener_usuario_actual
from app.constants.localidades import LOCALIDADES_BOGOTA

router = APIRouter(prefix="/api/localidades", tags=["localidades"])


@router.get("/")
async def listar_localidades(usuario_actual: dict = Depends(obtener_usuario_actual)):
    return LOCALIDADES_BOGOTA
