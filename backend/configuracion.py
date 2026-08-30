import os
from pathlib import Path

DIRECTORIO_BASE = Path(__file__).parent
ALMACENAMIENTO_VIDEOS = DIRECTORIO_BASE / "almacenamiento" / "videos"
ALMACENAMIENTO_ALERTAS = DIRECTORIO_BASE / "almacenamiento" / "alertas"
RUTA_BASE_DATOS = DIRECTORIO_BASE / "vigilancia.db"

# Crear directorios si no existen
ALMACENAMIENTO_VIDEOS.mkdir(parents=True, exist_ok=True)
ALMACENAMIENTO_ALERTAS.mkdir(parents=True, exist_ok=True)

_fuente_env = os.getenv("VIDEO_SOURCE", "0")
if _fuente_env.isdigit():
    FUENTE_VIDEO = int(_fuente_env)
else:
    _ruta_fuente = Path(_fuente_env)

    FUENTE_VIDEO = str(_ruta_fuente if _ruta_fuente.is_absolute() else DIRECTORIO_BASE / _ruta_fuente)

# Si es True, rota el frame 180° (según el montaje físico de la cámara).
ROTAR_FRAME_180 = os.getenv("ROTAR_FRAME_180", "false").lower() == "true"

# Si es True y la fuente es un archivo de video, el video se repite en bucle
LOOP_VIDEO_DEMO = os.getenv("LOOP_VIDEO_DEMO", "true").lower() == "true"

FPS_OBJETIVO = 15  # Frames por segundo para procesamiento
ANCHO_FRAME = 640  # Ancho del frame en píxeles
ALTO_FRAME = 480   # Alto del frame en píxeles

UMBRAL_MOVIMIENTO = 25      # Sensibilidad (más bajo = más sensible)
AREA_MINIMA_CONTORNO = 500  # Área mínima en píxeles para considerar movimiento

MODELO_YOLO = str(DIRECTORIO_BASE / "yolov8n.pt")  # Modelo nano (más rápido)
CONFIANZA_YOLO = 0.5           # Umbral de confianza (0.0 - 1.0)
CLASES_INTERES = [0]           # 0 = persona en dataset COCO

MODELO_YOLO_POSE = str(DIRECTORIO_BASE / "yolov8n-pose.pt") 
CONFIANZA_POSE = 0.5              # Umbral de confianza para keypoints
KEYPOINTS_MINIMOS_VISIBLES = 8    # De 17 keypoints COCO, mínimo visibles para evaluar la pose
UMBRAL_CAIDA_ANGULO_TRONCO = 45   # Grados respecto a la vertical para considerar "persona caída"
UMBRAL_BRAZOS_ARRIBA_RATIO = 0.15 # Qué tan por encima de los hombros deben estar las muñecas (relativo a alto del cuerpo)
DISTANCIA_FORCEJEO_PX = 80        # Distancia máxima entre dos personas para evaluar forcejeo/agarre
FRAMES_CONFIRMACION_POSE = 3      # Frames consecutivos con la misma pose sospechosa para confirmarla (evita falsos positivos de un solo frame)

UMBRAL_TIEMPO_MERODEO = 10      
VELOCIDAD_SOSPECHOSA_MIN = 0.5  
VELOCIDAD_SOSPECHOSA_MAX = 15.0 
FRAMES_MINIMOS_TRACKING = 30    

NIVELES_RIESGO = {
    "BAJO": 0.3,      
    "MEDIO": 0.6,     
    "ALTO": 0.8       
}

TIEMPO_ESPERA_ALERTAS = 30  
HABILITAR_EMAIL = False     
HABILITAR_SMS = False       

HOST_API = "0.0.0.0"  
PUERTO_API = int(os.getenv("PORT", 8000))

URL_BASE_DATOS = f"sqlite:///{RUTA_BASE_DATOS}"

MENSAJES = {
    "inicio": "Iniciando Sistema de Vigilancia con IA...",
    "sistema_listo": "Sistema inicializado correctamente",
    "captura_iniciada": "Captura de video iniciada",
    "captura_detenida": "Captura de video detenida",
    "procesamiento_activo": "Procesando video en tiempo real...",
    "alerta_critica": "¡ALERTA CRÍTICA DETECTADA!",
    "alerta_media": "Alerta de riesgo medio",
    "evento_guardado": "Evento guardado en base de datos",
    "clip_guardado": "Clip de video guardado"
}