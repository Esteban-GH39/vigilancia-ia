from fastapi import APIRouter
from app.db.eventos import obtener_eventos_recientes

router = APIRouter(prefix="/api/eventos", tags=["eventos"])

@router.get("/")
async def listar_eventos(limite: int = 50):
    return obtener_eventos_recientes(limite)
