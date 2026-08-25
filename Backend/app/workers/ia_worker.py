import asyncio
import cv2
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from app.core.config import TAMANO_MAXIMO_BUFFER
from app.core.queue_manager import SesionCamara
from app.db.eventos import guardar_evento

_executor = ThreadPoolExecutor(max_workers=2)


async def iniciar_worker_camara(
    sesion: SesionCamara,
    captura_video,
    detector_movimiento,
    detector_objetos,
    analizador_comportamiento,
    sistema_alertas,
):

    loop = asyncio.get_running_loop()
    numero_frame = 0
    sesion.corriendo = True

    while sesion.corriendo:
        frame = captura_video.leer_frame()
        if frame is None:
            break

        numero_frame += 1
        sesion.frames_procesados = numero_frame

        sesion.frames_recientes.append(frame.copy())
        if len(sesion.frames_recientes) > TAMANO_MAXIMO_BUFFER:
            sesion.frames_recientes.pop(0)

        hay_movimiento, regiones, mascara = await loop.run_in_executor(
            _executor, detector_movimiento.detectar, frame
        )

        frame_visualizacion = frame.copy()

        if hay_movimiento:
            detecciones = await loop.run_in_executor(
                _executor, detector_objetos.detectar, frame
            )

            if detecciones:
                objetos_rastreados = detector_objetos.rastrear_objetos(detecciones, numero_frame)
                sesion.personas_detectadas = len(objetos_rastreados)

                comportamientos = await loop.run_in_executor(
                    _executor,
                    analizador_comportamiento.analizar,
                    detector_objetos.objetos_rastreados,
                    numero_frame,
                )

                if comportamientos:
                    nivel_riesgo, puntuacion, explicacion = analizador_comportamiento.evaluar_riesgo(
                        comportamientos
                    )

                    if sistema_alertas.debe_enviar_alerta("comportamiento_sospechoso", nivel_riesgo):
                        nombre_clip = f"alerta_{sesion.id_camara}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                        ruta_video = captura_video.guardar_clip(sesion.frames_recientes, nombre_clip)

                        datos_evento = {
                            "id_camara": sesion.id_camara,
                            "tipo_evento": "comportamiento_sospechoso",
                            "nivel_riesgo": nivel_riesgo,
                            "confianza": puntuacion,
                            "descripcion": explicacion,
                            "ruta_video": ruta_video,
                        }

                        await loop.run_in_executor(_executor, guardar_evento, datos_evento)

                        alerta = sistema_alertas.generar_alerta(datos_evento, ruta_video)
                        sesion.alertas_generadas += 1

                        await sesion.cola_eventos.put(alerta)

                frame_visualizacion = detector_objetos.dibujar_detecciones(
                    frame_visualizacion, objetos_rastreados
                )

        if sesion.cola_frames.full():
            _ = sesion.cola_frames.get_nowait()
        await sesion.cola_frames.put(frame_visualizacion)

        await asyncio.sleep(0.001)

    sesion.corriendo = False
