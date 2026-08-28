import asyncio
import cv2
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from app.core.config import TAMANO_MAXIMO_BUFFER
from app.core.queue_manager import SesionCamara
from app.db.eventos import guardar_evento

_executor = ThreadPoolExecutor(max_workers=2)


def _emparejar_con_tracking(centro_pose, objetos_rastreados, distancia_maxima=50):

    id_mas_cercano = None
    distancia_minima = distancia_maxima

    for id_rastreo, objeto in objetos_rastreados.items():
        ultima_posicion = objeto['posiciones'][-1]
        distancia = (
            (centro_pose[0] - ultima_posicion[0]) ** 2 +
            (centro_pose[1] - ultima_posicion[1]) ** 2
        ) ** 0.5

        if distancia < distancia_minima:
            distancia_minima = distancia
            id_mas_cercano = id_rastreo

    return id_mas_cercano


async def iniciar_worker_camara(
    sesion: SesionCamara,
    captura_video,
    detector_movimiento,
    detector_objetos,
    detector_poses,
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

                personas_pose = await loop.run_in_executor(
                    _executor, detector_poses.detectar, frame
                )

                eventos_pose = []
                for persona_pose in personas_pose:
                    id_rastreo = _emparejar_con_tracking(
                        persona_pose['centro'], detector_objetos.objetos_rastreados
                    )

                    poses_detectadas = detector_poses.clasificar_pose(persona_pose)

                    if id_rastreo:
                        agachado = detector_poses.registrar_altura_y_detectar_agachado(
                            id_rastreo, persona_pose['rectangulo'][3], numero_frame
                        )
                        if agachado:
                            poses_detectadas.append(agachado)

                    if poses_detectadas:
                        frames_persona = (
                            detector_objetos.objetos_rastreados[id_rastreo]['frames_rastreados']
                            if id_rastreo else 1
                        )
                        eventos_pose.append({
                            'id_rastreo': id_rastreo or f"pose_sin_id_{persona_pose['centro']}",
                            'comportamientos': poses_detectadas,
                            'posicion': persona_pose['centro'],
                            'frames_rastreados': frames_persona,
                        })

                for evento_forcejeo in detector_poses.detectar_forcejeo_grupal(personas_pose):
                    eventos_pose.append({
                        'id_rastreo': 'grupo',
                        'comportamientos': [evento_forcejeo],
                        'posicion': evento_forcejeo['centros_involucrados'][0],
                        'frames_rastreados': 1,
                    })

                detector_poses.limpiar_historial(detector_objetos.objetos_rastreados.keys())

                comportamientos_totales = comportamientos + eventos_pose

                if comportamientos_totales:
                    nivel_riesgo, puntuacion, explicacion = analizador_comportamiento.evaluar_riesgo(
                        comportamientos_totales
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
                frame_visualizacion = detector_poses.dibujar_esqueletos(
                    frame_visualizacion, personas_pose
                )

        if sesion.cola_frames.full():
            _ = sesion.cola_frames.get_nowait()
        await sesion.cola_frames.put(frame_visualizacion)

        await asyncio.sleep(0.001)

    sesion.corriendo = False