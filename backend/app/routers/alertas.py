from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.queue_manager import gestor_sesiones

router = APIRouter(prefix="/api/alertas", tags=["alertas"])

@router.websocket("/ws/{id_camara}")
async def websocket_alertas(websocket: WebSocket, id_camara: str):
    await websocket.accept()
    sesion = gestor_sesiones.obtener_o_crear(id_camara)
    try:
        while True:
            alerta = await sesion.cola_eventos.get()
            await websocket.send_json(alerta)
    except WebSocketDisconnect:
        pass