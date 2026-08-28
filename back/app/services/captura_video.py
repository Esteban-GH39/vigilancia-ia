import cv2
import numpy as np
import sys
import platform
from datetime import datetime
sys.path.append('..')
import backend.configuracion as configuracion

class CapturaVideo:

    def __init__(self, fuente=configuracion.FUENTE_VIDEO):

        self.fuente = fuente
        self.es_camara = isinstance(fuente, int)
        self.captura = None
        self.esta_corriendo = False
        self.contador_frames = 0
        self.frame_procesado_actual = None
        
    def iniciar(self):

        if self.es_camara and platform.system() == "Windows":
            self.captura = cv2.VideoCapture(self.fuente, cv2.CAP_DSHOW)
        else:
            self.captura = cv2.VideoCapture(self.fuente)

        self.captura.set(cv2.CAP_PROP_FRAME_WIDTH, configuracion.ANCHO_FRAME)
        self.captura.set(cv2.CAP_PROP_FRAME_HEIGHT, configuracion.ALTO_FRAME)
        self.captura.set(cv2.CAP_PROP_FPS, configuracion.FPS_OBJETIVO)
        
        if not self.captura.isOpened():
            raise Exception(f"No se pudo abrir la fuente de video: {self.fuente}")
        
        self.esta_corriendo = True
        print(f"{configuracion.MENSAJES['captura_iniciada']}: {self.fuente}")
        
    def leer_frame(self):

        if not self.esta_corriendo:
            return None
        
        ret, frame = self.captura.read()

        if not ret and not self.es_camara and configuracion.LOOP_VIDEO_DEMO:
            self.captura.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self.captura.read()

        if not ret:
            return None
        
        if configuracion.ROTAR_FRAME_180:
            frame = cv2.rotate(frame, cv2.ROTATE_180)

        frame = self._preprocesar(frame)
        self.contador_frames += 1
        
        return frame
    
    def _preprocesar(self, frame):

        frame_sin_ruido = cv2.bilateralFilter(frame, 9, 75, 75)
        
        return frame_sin_ruido
    
    def guardar_clip(self, frames, nombre_archivo):

        if not frames:
            return None
        
        ruta_archivo = configuracion.ALMACENAMIENTO_VIDEOS / f"{nombre_archivo}.mp4"
        alto, ancho = frames[0].shape[:2]

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        escritor = cv2.VideoWriter(
            str(ruta_archivo), 
            fourcc, 
            configuracion.FPS_OBJETIVO, 
            (ancho, alto)
        )

        for frame in frames:
            escritor.write(frame)
        
        escritor.release()
        print(f"{configuracion.MENSAJES['clip_guardado']}: {ruta_archivo}")
        return str(ruta_archivo)
    
    def detener(self):

        if self.captura:
            self.captura.release()
        self.esta_corriendo = False
        print(configuracion.MENSAJES['captura_detenida'])
    
    def obtener_info(self):

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

        self.detener()