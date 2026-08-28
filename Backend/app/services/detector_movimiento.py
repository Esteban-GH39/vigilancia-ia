
import cv2
import numpy as np
import sys
sys.path.append('..')
import backend.configuracion as configuracion

class DetectorMovimiento:

    def __init__(self):

        self.frame_anterior = None
        self.movimiento_detectado = False
        self.regiones_movimiento = []
        
    def detectar(self, frame):

        gris = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gris = cv2.GaussianBlur(gris, (21, 21), 0)

        if self.frame_anterior is None:
            self.frame_anterior = gris
            return False, [], None

        diferencia_frame = cv2.absdiff(self.frame_anterior, gris)
        umbral = cv2.threshold(
            diferencia_frame, 
            configuracion.UMBRAL_MOVIMIENTO, 
            255, 
            cv2.THRESH_BINARY
        )[1]

        umbral = cv2.dilate(umbral, None, iterations=2)

        contornos, _ = cv2.findContours(
            umbral.copy(), 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )

        regiones_movimiento = []
        for contorno in contornos:
            area = cv2.contourArea(contorno)
            if area < configuracion.AREA_MINIMA_CONTORNO:
                continue
            
            x, y, w, h = cv2.boundingRect(contorno)
            regiones_movimiento.append({
                'rectangulo': (x, y, w, h),
                'area': area,
                'centro': (x + w//2, y + h//2)
            })

        self.frame_anterior = gris
        
        hay_movimiento = len(regiones_movimiento) > 0
        self.movimiento_detectado = hay_movimiento
        self.regiones_movimiento = regiones_movimiento
        
        return hay_movimiento, regiones_movimiento, umbral
    
    def dibujar_movimiento(self, frame, regiones_movimiento):

        salida = frame.copy()
        
        for region in regiones_movimiento:
            x, y, w, h = region['rectangulo']

            cv2.rectangle(salida, (x, y), (x+w, y+h), (0, 255, 0), 2)

            cv2.putText(
                salida, 
                "MOVIMIENTO", 
                (x, y-10), 
                cv2.FONT_HERSHEY_SIMPLEX, 
                0.5, 
                (0, 255, 0), 
                2
            )

            centro = region['centro']
            cv2.circle(salida, centro, 5, (0, 255, 255), -1)
        
        return salida
    
    def obtener_intensidad_movimiento(self):

        if not self.regiones_movimiento:
            return 0.0
        
        area_total = sum(r['area'] for r in self.regiones_movimiento)
        return area_total
    
    def hay_movimiento_significativo(self, umbral_area=1000):

        return self.obtener_intensidad_movimiento() > umbral_area
    
    def reiniciar(self):

        self.frame_anterior = None
        self.movimiento_detectado = False
        self.regiones_movimiento = []