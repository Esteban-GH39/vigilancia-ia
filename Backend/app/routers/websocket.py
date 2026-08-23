import cv2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.queue_manager import gestor_sesiones

router = APIRouter()

@router.websocket("/ws/video/{id_camara}")
async def websocket_video(websocket: WebSocket, id_camara: str):
    await websocket.accept()
    sesion = gestor_sesiones.obtener_o_crear(id_camara)

    try:
        while sesion.corriendo:
            frame = await sesion.cola_frames.get()  
            _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            await websocket.send_bytes(buffer.tobytes())
    except WebSocketDisconnect:
        print(f"Cliente desconectado del stream de {id_camara}")
