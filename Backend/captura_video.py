"""
Módulo de Captura y Preprocesamiento de Video
"""
import cv2
import numpy as np
import sys
import platform
from datetime import datetime
sys.path.append('..')
import configuracion

class CapturaVideo:
    """Gestor de captura y preprocesamiento de video"""
    
    def __init__(self, fuente=configuracion.FUENTE_VIDEO):
        """
        Inicializar captura de video
        
        Args:
            fuente: Índice de cámara (0, 1, ...) o ruta a archivo de video
        """
        self.fuente = fuente
        self.es_camara = isinstance(fuente, int)
        self.captura = None
        self.esta_corriendo = False
        self.contador_frames = 0
        self.frame_procesado_actual = None
        
    def iniciar(self):
        """Iniciar captura de video"""
        # CAP_DSHOW solo existe en Windows; en Linux/Mac (típico en servidores
        # en la nube) se usa el backend por defecto.
        if self.es_camara and platform.system() == "Windows":
            self.captura = cv2.VideoCapture(self.fuente, cv2.CAP_DSHOW)
        else:
            self.captura = cv2.VideoCapture(self.fuente)
        
        # Configurar resolución y FPS (solo aplica de forma confiable a cámaras)
        self.captura.set(cv2.CAP_PROP_FRAME_WIDTH, configuracion.ANCHO_FRAME)
        self.captura.set(cv2.CAP_PROP_FRAME_HEIGHT, configuracion.ALTO_FRAME)
        self.captura.set(cv2.CAP_PROP_FPS, configuracion.FPS_OBJETIVO)
        
        if not self.captura.isOpened():
            raise Exception(f"❌ No se pudo abrir la fuente de video: {self.fuente}")
        
        self.esta_corriendo = True
        print(f"{configuracion.MENSAJES['captura_iniciada']}: {self.fuente}")
        
    def leer_frame(self):
        """
        Leer y preprocesar el siguiente frame
        
        Returns:
            Frame preprocesado o None si no hay más frames
        """
        if not self.esta_corriendo:
            return None
        
        ret, frame = self.captura.read()

        # Si es un archivo de video (no cámara) y llegó al final, reiniciar
        # desde el primer frame para simular una demo continua.
        if not ret and not self.es_camara and configuracion.LOOP_VIDEO_DEMO:
            self.captura.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self.captura.read()

        if not ret:
            return None
        
        if configuracion.ROTAR_FRAME_180:
            frame = cv2.rotate(frame, cv2.ROTATE_180)
        
        # Aplicar preprocesamiento
        frame = self._preprocesar(frame)
        self.contador_frames += 1
        
        return frame
    
    def _preprocesar(self, frame):
        """
        Preprocesamiento del frame:
        - Reducción de ruido
        - Normalización de iluminación
        
        Args:
            frame: Frame original
            
        Returns:
            Frame preprocesado
        """
        # Reducir ruido con filtro bilateral
        # Preserva bordes mientras suaviza áreas uniformes
        frame_sin_ruido = cv2.bilateralFilter(frame, 9, 75, 75)
        
        return frame_sin_ruido
    
    def guardar_clip(self, frames, nombre_archivo):
        """
        Guardar secuencia de frames como clip de video
        
        Args:
            frames: Lista de frames a guardar
            nombre_archivo: Nombre del archivo (sin extensión)
            
        Returns:
            Ruta completa del archivo guardado
        """
        if not frames:
            return None
        
        ruta_archivo = configuracion.ALMACENAMIENTO_VIDEOS / f"{nombre_archivo}.mp4"
        alto, ancho = frames[0].shape[:2]
        
        # Codec para video MP4
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        escritor = cv2.VideoWriter(
            str(ruta_archivo), 
            fourcc, 
            configuracion.FPS_OBJETIVO, 
            (ancho, alto)
        )
        
        # Escribir todos los frames
        for frame in frames:
            escritor.write(frame)
        
        escritor.release()
        print(f"{configuracion.MENSAJES['clip_guardado']}: {ruta_archivo}")
        return str(ruta_archivo)
    
    def detener(self):
        """Detener captura de video"""
        if self.captura:
            self.captura.release()
        self.esta_corriendo = False
        print(configuracion.MENSAJES['captura_detenida'])
    
    def obtener_info(self):
        """
        Obtener información de la captura
        
        Returns:
            Diccionario con información de la captura
        """
        if not self.captura:
            return None
        
        return {
            'ancho': int(self.captura.get(cv2.CAP_PROP_FRAME_WIDTH)),
            'alto': int(self.captura.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            'fps': int(self.captura.get(cv2.CAP_PROP_FPS)),
            'frames_procesados': self.contador_frames,
            'esta_corriendo': self.esta_corriendo
        }
    
    def __del__(self):
        """Destructor - asegurar liberación de recursos"""
        self.detener()