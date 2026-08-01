"""
Configuración del Sistema de Vigilancia con IA
Universidad Central - Práctica de Ingeniería II
"""
import os
from pathlib import Path

# ============================================
# DIRECTORIOS DEL SISTEMA
# ============================================
DIRECTORIO_BASE = Path(__file__).parent
ALMACENAMIENTO_VIDEOS = DIRECTORIO_BASE / "almacenamiento" / "videos"
ALMACENAMIENTO_ALERTAS = DIRECTORIO_BASE / "almacenamiento" / "alertas"
RUTA_BASE_DATOS = DIRECTORIO_BASE / "vigilancia.db"

# Crear directorios si no existen
ALMACENAMIENTO_VIDEOS.mkdir(parents=True, exist_ok=True)
ALMACENAMIENTO_ALERTAS.mkdir(parents=True, exist_ok=True)

# ============================================
# CONFIGURACIÓN DE CAPTURA DE VIDEO
# ============================================
# FUENTE_VIDEO: 0 para webcam local, o ruta a archivo de video (para nube/demo).
# Se puede sobreescribir con la variable de entorno VIDEO_SOURCE, útil para
# desplegar en la nube (donde no hay cámara física) usando un video de prueba.
_fuente_env = os.getenv("VIDEO_SOURCE", "0")
if _fuente_env.isdigit():
    FUENTE_VIDEO = int(_fuente_env)
else:
    _ruta_fuente = Path(_fuente_env)
    # Si es una ruta relativa, se resuelve contra la raíz del proyecto
    FUENTE_VIDEO = str(_ruta_fuente if _ruta_fuente.is_absolute() else DIRECTORIO_BASE / _ruta_fuente)

# Si es True, rota el frame 180° (según el montaje físico de la cámara).
# En modo demo/nube normalmente se deja en False.
ROTAR_FRAME_180 = os.getenv("ROTAR_FRAME_180", "false").lower() == "true"

# Si es True y la fuente es un archivo de video, el video se repite en bucle
# al llegar al final (ideal para una demo continua en la nube).
LOOP_VIDEO_DEMO = os.getenv("LOOP_VIDEO_DEMO", "true").lower() == "true"

FPS_OBJETIVO = 15  # Frames por segundo para procesamiento
ANCHO_FRAME = 640  # Ancho del frame en píxeles
ALTO_FRAME = 480   # Alto del frame en píxeles

# ============================================
# CONFIGURACIÓN DETECCIÓN DE MOVIMIENTO
# ============================================
UMBRAL_MOVIMIENTO = 25      # Sensibilidad (más bajo = más sensible)
AREA_MINIMA_CONTORNO = 500  # Área mínima en píxeles para considerar movimiento

# ============================================
# CONFIGURACIÓN YOLO (DETECCIÓN DE OBJETOS)
# ============================================
MODELO_YOLO = str(DIRECTORIO_BASE / "Backend" / "yolov8n.pt")  # Modelo nano (más rápido)
CONFIANZA_YOLO = 0.5           # Umbral de confianza (0.0 - 1.0)
CLASES_INTERES = [0]           # 0 = persona en dataset COCO

# ============================================
# CONFIGURACIÓN ANÁLISIS DE COMPORTAMIENTO
# ============================================
UMBRAL_TIEMPO_MERODEO = 10      # Segundos para considerar merodeo
VELOCIDAD_SOSPECHOSA_MIN = 0.5  # Píxeles/frame (muy lento)
VELOCIDAD_SOSPECHOSA_MAX = 15.0 # Píxeles/frame (muy rápido)
FRAMES_MINIMOS_TRACKING = 30    # Frames mínimos para análisis confiable

# ============================================
# CONFIGURACIÓN EVALUACIÓN DE RIESGO
# ============================================
NIVELES_RIESGO = {
    "BAJO": 0.3,      # 0.0 - 0.3: Riesgo bajo
    "MEDIO": 0.6,     # 0.3 - 0.6: Riesgo medio
    "ALTO": 0.8       # 0.6 - 1.0: Riesgo alto
}

# ============================================
# CONFIGURACIÓN SISTEMA DE ALERTAS
# ============================================
TIEMPO_ESPERA_ALERTAS = 30  # Segundos entre alertas del mismo tipo
HABILITAR_EMAIL = False     # Cambiar a True para activar emails
HABILITAR_SMS = False       # Cambiar a True para activar SMS

# ============================================
# CONFIGURACIÓN API Y SERVIDOR
# ============================================
HOST_API = "0.0.0.0"  # Dirección del servidor
# La mayoría de plataformas en la nube (Render, Railway, etc.) inyectan el
# puerto a usar en la variable de entorno PORT.
PUERTO_API = int(os.getenv("PORT", 8000))

# ============================================
# CONFIGURACIÓN BASE DE DATOS
# ============================================
URL_BASE_DATOS = f"sqlite:///{RUTA_BASE_DATOS}"

# ============================================
# MENSAJES DEL SISTEMA
# ============================================
MENSAJES = {
    "inicio": "🚀 Iniciando Sistema de Vigilancia con IA...",
    "sistema_listo": "✅ Sistema inicializado correctamente",
    "captura_iniciada": "▶️ Captura de video iniciada",
    "captura_detenida": "⏹️ Captura de video detenida",
    "procesamiento_activo": "🔄 Procesando video en tiempo real...",
    "alerta_critica": "🚨 ¡ALERTA CRÍTICA DETECTADA!",
    "alerta_media": "⚠️ Alerta de riesgo medio",
    "evento_guardado": "💾 Evento guardado en base de datos",
    "clip_guardado": "🎥 Clip de video guardado"
}