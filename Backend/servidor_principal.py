"""
╔═══════════════════════════════════════════════════════════╗
║  SISTEMA DE VIGILANCIA OPTIMIZADO CON INTELIGENCIA        ║
║  ARTIFICIAL                                               ║
║                                                           ║
║  Universidad Central                                      ║
║  Facultad de Ingeniería y Ciencias Básicas                ║
║  Práctica de Ingeniería II                                ║
║                                                           ║
║  Autores:                                                 ║
║  - Juan Felipe Garavito Feo                               ║
║  - Esteban Giron Herrera                                  ║
║  - Juan Fernando Fonseca                                  ║
╚═══════════════════════════════════════════════════════════╝

Servidor Principal - FastAPI
"""
import sys
sys.path.append('..')
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import asyncio
import json
from datetime import datetime
import numpy as np

import configuracion
from captura_video import CapturaVideo
from detector_movimiento import DetectorMovimiento
from detector_objetos import DetectorObjetos
from analizador_comportamientos import AnalizadorComportamiento
from sistema_alertas import SistemaAlertas
from base_datos import guardar_evento, obtener_eventos_recientes

# Ruta absoluta al Frontend, para que funcione sin importar el directorio
# de trabajo desde el que se lance el servidor (clave para desplegar en la nube).
DIRECTORIO_FRONTEND = Path(__file__).resolve().parent.parent / "Frontend"

# ============================================
# INICIALIZACIÓN DE FASTAPI
# ============================================
app = FastAPI(
    title="Sistema de Vigilancia con IA",
    description="Sistema inteligente de vigilancia optimizado con técnicas de IA",
    version="1.0.0"
)

from fastapi.staticfiles import StaticFiles
app.mount("/static", StaticFiles(directory=str(DIRECTORIO_FRONTEND)), name="static")

# Configurar CORS para permitir acceso desde el navegador
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# COMPONENTES DEL SISTEMA
# ============================================
captura_video = None
detector_movimiento = None
detector_objetos = None
analizador_comportamiento = None
sistema_alertas = None

# ============================================
# ESTADO DEL SISTEMA
# ============================================
estado_sistema = {
    'corriendo': False,
    'frames_procesados': 0,
    'alertas_generadas': 0,
    'personas_detectadas': 0,
    'ultima_actualizacion': None
}

# Buffer de frames recientes para generar clips de video
frames_recientes = []
TAMANO_MAXIMO_BUFFER = 150  # 10 segundos a 15 FPS

# ============================================
# EVENTOS DE INICIO
# ============================================
@app.on_event("startup")
async def inicializar_sistema():
    """Inicializar componentes del sistema al arranque"""
    global detector_movimiento, detector_objetos, analizador_comportamiento, sistema_alertas
    
    print(configuracion.MENSAJES['inicio'])
    
    detector_movimiento = DetectorMovimiento()
    detector_objetos = DetectorObjetos()
    analizador_comportamiento = AnalizadorComportamiento()
    sistema_alertas = SistemaAlertas()
    
    print(configuracion.MENSAJES['sistema_listo'])

# ============================================
# RUTAS DE LA API
# ============================================

@app.get("/")
async def pagina_principal():
    """Servir página principal del dashboard"""
    ruta_html = DIRECTORIO_FRONTEND / "index.html"
    try:
        with open(ruta_html, "r", encoding="utf-8") as archivo:
            contenido_html = archivo.read()
        return HTMLResponse(content=contenido_html)
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Error: No se encontró index.html</h1>", status_code=404)
    
@app.get("/aplicacion.js")
async def servir_js():
    """Servir el archivo JavaScript del frontend"""
    ruta_js = DIRECTORIO_FRONTEND / "aplicacion.js"
    try:
        return FileResponse(ruta_js, media_type="application/javascript")
    except FileNotFoundError:
        return HTMLResponse(content="// archivo no encontrado", status_code=404)

@app.get("/api/estado")
async def obtener_estado():
    """
    Obtener estado actual del sistema
    
    Returns:
        Diccionario con el estado del sistema
    """
    return {
        "estado": "corriendo" if estado_sistema['corriendo'] else "detenido",
        "frames_procesados": estado_sistema['frames_procesados'],
        "alertas_generadas": estado_sistema['alertas_generadas'],
        "personas_detectadas": estado_sistema['personas_detectadas'],
        "marca_tiempo": datetime.now().isoformat()
    }

@app.post("/api/iniciar")
async def iniciar_vigilancia():
    """
    Iniciar el sistema de vigilancia
    
    Returns:
        Mensaje de confirmación o error
    """
    global captura_video, estado_sistema
    
    if estado_sistema['corriendo']:
        return {
            "mensaje": "⚠️ El sistema ya está en ejecución",
            "estado": "advertencia"
        }
    
    try:
        captura_video = CapturaVideo()
        captura_video.iniciar()
        estado_sistema['corriendo'] = True
        
        # Iniciar procesamiento en segundo plano
        asyncio.create_task(procesar_video())
        
        return {
            "mensaje": "✅ Vigilancia iniciada correctamente",
            "estado": "exito"
        }
    except Exception as error:
        return {
            "mensaje": f"❌ Error al iniciar: {str(error)}",
            "estado": "error"
        }

@app.post("/api/detener")
async def detener_vigilancia():
    """
    Detener el sistema de vigilancia
    
    Returns:
        Mensaje de confirmación
    """
    global captura_video, estado_sistema
    
    if captura_video:
        captura_video.detener()
        captura_video = None
    
    estado_sistema['corriendo'] = False
    
    return {
        "mensaje": "⏹️ Vigilancia detenida",
        "estado": "exito"
    }

@app.get("/api/eventos")
async def obtener_eventos():
    """
    Obtener eventos recientes registrados
    
    Returns:
        Lista de eventos
    """
    eventos = obtener_eventos_recientes(limite=20)
    return {"eventos": eventos}

@app.get("/api/alertas")
async def obtener_alertas():
    """
    Obtener alertas recientes generadas
    
    Returns:
        Lista de alertas
    """
    alertas = sistema_alertas.obtener_alertas_recientes(limite=20)
    return {"alertas": alertas}

@app.get("/api/estadisticas")
async def obtener_estadisticas():
    """
    Obtener estadísticas generales del sistema
    
    Returns:
        Diccionario con estadísticas
    """
    estadisticas_alertas = sistema_alertas.obtener_estadisticas_alertas()
    
    return {
        "sistema": estado_sistema,
        "alertas": estadisticas_alertas,
        "marca_tiempo": datetime.now().isoformat()
    }

# ============================================
# WEBSOCKET PARA STREAMING DE VIDEO
# ============================================
@app.websocket("/ws/video")
async def websocket_video(websocket: WebSocket):
    """
    WebSocket para transmisión de video en tiempo real
    
    Args:
        websocket: Conexión WebSocket
    """
    await websocket.accept()
    print("📡 Cliente conectado al stream de video")
    
    try:
        while estado_sistema['corriendo']:
            if captura_video and hasattr(captura_video, 'frame_procesado_actual'):
                frame = captura_video.frame_procesado_actual
                
                if frame is not None:
                    # Codificar frame a JPEG
                    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    bytes_frame = buffer.tobytes()
                    
                    # Enviar frame por WebSocket
                    await websocket.send_bytes(bytes_frame)
            
            await asyncio.sleep(0.033)  # ~30 FPS
            
    except WebSocketDisconnect:
        print("📡 Cliente desconectado del stream")
    except Exception as error:
        print(f"❌ Error en WebSocket: {error}")

# ============================================
# PROCESAMIENTO DE VIDEO (BUCLE PRINCIPAL)
# ============================================
async def procesar_video():
    """
    Bucle principal de procesamiento de video
    Implementa el flujo completo del sistema:
    1. Captura de video
    2. Preprocesamiento
    3. Detección de movimiento
    4. Detección de objetos
    5. Tracking
    6. Análisis de comportamiento
    7. Evaluación de riesgo
    8. Generación de alertas
    9. Almacenamiento
    """
    global frames_recientes, estado_sistema
    
    print(configuracion.MENSAJES['procesamiento_activo'])
    numero_frame = 0
    
    while estado_sistema['corriendo'] and captura_video:
        # PASO 1: CAPTURA DE VIDEO
        frame = captura_video.leer_frame()
        if frame is None:
            break
        
        numero_frame += 1
        estado_sistema['frames_procesados'] = numero_frame
        estado_sistema['ultima_actualizacion'] = datetime.now().isoformat()
        
        # Agregar frame al buffer (para clips de video)
        frames_recientes.append(frame.copy())
        if len(frames_recientes) > TAMANO_MAXIMO_BUFFER:
            frames_recientes.pop(0)
        
        # PASO 2 & 3: DETECCIÓN DE MOVIMIENTO
        hay_movimiento, regiones_movimiento, mascara_movimiento = detector_movimiento.detectar(frame)
        
        # Frame para visualización
        frame_visualizacion = frame.copy()
        
        if hay_movimiento:
            # PASO 4: DETECCIÓN DE OBJETOS (solo si hay movimiento)
            detecciones = detector_objetos.detectar(frame)
            
            if detecciones:
                # PASO 5: TRACKING DE OBJETOS
                objetos_rastreados = detector_objetos.rastrear_objetos(detecciones, numero_frame)
                estado_sistema['personas_detectadas'] = len(objetos_rastreados)
                
                # PASO 6: ANÁLISIS DE COMPORTAMIENTO
                comportamientos_sospechosos = analizador_comportamiento.analizar(
                    detector_objetos.objetos_rastreados,
                    numero_frame
                )
                
                if comportamientos_sospechosos:
                    # PASO 7: EVALUACIÓN DE RIESGO
                    nivel_riesgo, puntuacion_riesgo, explicacion = \
                        analizador_comportamiento.evaluar_riesgo(comportamientos_sospechosos)
                    
                    # PASO 8: GENERAR ALERTA SI ES NECESARIO
                    if sistema_alertas.debe_enviar_alerta('comportamiento_sospechoso', nivel_riesgo):
                        # Guardar clip de video
                        nombre_clip = f"alerta_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                        ruta_video = captura_video.guardar_clip(frames_recientes, nombre_clip)
                        
                        # PASO 9: ALMACENAMIENTO - Crear evento
                        datos_evento = {
                            'tipo_evento': 'comportamiento_sospechoso',
                            'nivel_riesgo': nivel_riesgo,
                            'confianza': puntuacion_riesgo,
                            'ubicacion': 'Cámara 1',
                            'descripcion': explicacion,
                            'ruta_video': ruta_video,
                            'cantidad_personas': len(comportamientos_sospechosos)
                        }
                        
                        # Guardar en base de datos
                        guardar_evento(datos_evento)
                        
                        # Generar alerta
                        alerta = sistema_alertas.generar_alerta(datos_evento, ruta_video)
                        estado_sistema['alertas_generadas'] += 1
                
                # Dibujar detecciones en el frame
                frame_visualizacion = detector_objetos.dibujar_detecciones(
                    frame_visualizacion, 
                    objetos_rastreados
                )
                
                # Dibujar información de riesgo si hay comportamiento sospechoso
                if comportamientos_sospechosos:
                    cv2.putText(
                        frame_visualizacion, 
                        f"⚠️ RIESGO: {nivel_riesgo} ({puntuacion_riesgo:.2f})",
                        (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 
                        0.7, 
                        (0, 0, 255), 
                        2
                    )
                    cv2.putText(
                        frame_visualizacion, 
                        explicacion[:80],
                        (10, 60), 
                        cv2.FONT_HERSHEY_SIMPLEX, 
                        0.5, 
                        (0, 255, 255), 
                        1
                    )
        
        # Dibujar regiones de movimiento
        if regiones_movimiento:
            frame_visualizacion = detector_movimiento.dibujar_movimiento(
                frame_visualizacion, 
                regiones_movimiento
            )
        
        # Agregar información general al frame
        alto_frame = frame_visualizacion.shape[0]
        cv2.putText(
            frame_visualizacion, 
            f"Frame: {numero_frame}",
            (10, alto_frame - 40),
            cv2.FONT_HERSHEY_SIMPLEX, 
            0.5, 
            (255, 255, 255), 
            1
        )
        cv2.putText(
            frame_visualizacion, 
            f"Personas: {estado_sistema['personas_detectadas']}",
            (10, alto_frame - 20),
            cv2.FONT_HERSHEY_SIMPLEX, 
            0.5, 
            (255, 255, 255), 
            1
        )
        
        # Guardar frame procesado para streaming
        captura_video.frame_procesado_actual = frame_visualizacion
        
        # Pequeña pausa para no saturar CPU
        await asyncio.sleep(0.001)
    
    print("⏹️ Procesamiento de video finalizado")

# ============================================
# PUNTO DE ENTRADA
# ============================================
if __name__ == "__main__":
    import uvicorn
    
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   SISTEMA DE VIGILANCIA OPTIMIZADO CON IA                 ║
    ║                                                           ║
    ║   Universidad Central                                     ║
    ║   Práctica de Ingeniería II                               ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    
    📡 Servidor iniciando en http://localhost:8000
    📊 Dashboard disponible en http://localhost:8000
    📖 Documentación API en http://localhost:8000/docs
    
    Presiona Ctrl+C para detener el servidor
    """)
    
    uvicorn.run(
        app, 
        host=configuracion.HOST_API, 
        port=configuracion.PUERTO_API,
        log_level="info"
    )