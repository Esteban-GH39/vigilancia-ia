from fastapi import APIRouter
from app.constants.localidades import LOCALIDADES_BOGOTA

router = APIRouter(prefix="/api/localidades", tags=["localidades"])


@router.get("/")
async def listar_localidades():
    return LOCALIDADES_BOGOTA
