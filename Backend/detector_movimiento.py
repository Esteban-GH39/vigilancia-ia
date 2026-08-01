"""
Detector de Movimiento mediante Análisis de Frames
"""
import cv2
import numpy as np
import sys
sys.path.append('..')
import configuracion

class DetectorMovimiento:
    """Detector de movimiento usando diferencia de frames"""
    
    def __init__(self):
        """Inicializar detector de movimiento"""
        self.frame_anterior = None
        self.movimiento_detectado = False
        self.regiones_movimiento = []
        
    def detectar(self, frame):
        """
        Detectar movimiento en el frame actual
        
        Args:
            frame: Frame actual a analizar
            
        Returns:
            tupla: (hay_movimiento, regiones_movimiento, mascara_movimiento)
        """
        # Convertir a escala de grises
        gris = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gris = cv2.GaussianBlur(gris, (21, 21), 0)
        
        # Si es el primer frame, guardarlo como referencia
        if self.frame_anterior is None:
            self.frame_anterior = gris
            return False, [], None
        
        # Calcular diferencia absoluta entre frames
        diferencia_frame = cv2.absdiff(self.frame_anterior, gris)
        umbral = cv2.threshold(
            diferencia_frame, 
            configuracion.UMBRAL_MOVIMIENTO, 
            255, 
            cv2.THRESH_BINARY
        )[1]
        
        # Dilatar para rellenar huecos
        umbral = cv2.dilate(umbral, None, iterations=2)
        
        # Encontrar contornos de las áreas en movimiento
        contornos, _ = cv2.findContours(
            umbral.copy(), 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        # Filtrar contornos por área mínima
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
        
        # Actualizar frame anterior
        self.frame_anterior = gris
        
        hay_movimiento = len(regiones_movimiento) > 0
        self.movimiento_detectado = hay_movimiento
        self.regiones_movimiento = regiones_movimiento
        
        return hay_movimiento, regiones_movimiento, umbral
    
    def dibujar_movimiento(self, frame, regiones_movimiento):
        """
        Dibujar las regiones de movimiento en el frame
        
        Args:
            frame: Frame donde dibujar
            regiones_movimiento: Lista de regiones detectadas
            
        Returns:
            Frame con las regiones dibujadas
        """
        salida = frame.copy()
        
        for region in regiones_movimiento:
            x, y, w, h = region['rectangulo']
            
            # Dibujar rectángulo verde alrededor del movimiento
            cv2.rectangle(salida, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            # Agregar etiqueta
            cv2.putText(
                salida, 
                "MOVIMIENTO", 
                (x, y-10), 
                cv2.FONT_HERSHEY_SIMPLEX, 
                0.5, 
                (0, 255, 0), 
                2
            )
            
            # Dibujar punto central
            centro = region['centro']
            cv2.circle(salida, centro, 5, (0, 255, 255), -1)
        
        return salida
    
    def obtener_intensidad_movimiento(self):
        """
        Calcular intensidad total del movimiento detectado
        
        Returns:
            float: Área total en píxeles del movimiento
        """
        if not self.regiones_movimiento:
            return 0.0
        
        area_total = sum(r['area'] for r in self.regiones_movimiento)
        return area_total
    
    def hay_movimiento_significativo(self, umbral_area=1000):
        """
        Verificar si hay movimiento significativo
        
        Args:
            umbral_area: Área mínima total para considerar significativo
            
        Returns:
            bool: True si hay movimiento significativo
        """
        return self.obtener_intensidad_movimiento() > umbral_area
    
    def reiniciar(self):
        """Reiniciar el detector (útil al cambiar de cámara)"""
        self.frame_anterior = None
        self.movimiento_detectado = False
        self.regiones_movimiento = []