"""
Detector de Objetos usando YOLOv8
Sistema de Tracking de Personas
"""
from ultralytics import YOLO
import cv2
import numpy as np
import sys
sys.path.append('..')
import configuracion

class DetectorObjetos:
    """Detector de objetos (personas) usando YOLO con tracking"""
    
    def __init__(self):
        """Inicializar detector YOLO"""
        print("🔄 Cargando modelo YOLO...")
        self.modelo = YOLO(configuracion.MODELO_YOLO)
        self.objetos_rastreados = {}
        self.siguiente_id = 0
        print("✅ Modelo YOLO cargado exitosamente")
        
    def detectar(self, frame):
        """
        Detectar objetos (personas) en el frame
        
        Args:
            frame: Frame a analizar
            
        Returns:
            Lista de detecciones
        """
        resultados = self.modelo(
            frame, 
            classes=configuracion.CLASES_INTERES,
            conf=configuracion.CONFIANZA_YOLO,
            verbose=False
        )
        
        detecciones = []
        for resultado in resultados:
            cajas = resultado.boxes
            for caja in cajas:
                # Extraer coordenadas y datos
                x1, y1, x2, y2 = caja.xyxy[0].cpu().numpy()
                confianza = float(caja.conf[0])
                clase_id = int(caja.cls[0])
                
                deteccion = {
                    'rectangulo': (int(x1), int(y1), int(x2-x1), int(y2-y1)),
                    'centro': (int((x1+x2)/2), int((y1+y2)/2)),
                    'confianza': confianza,
                    'clase_id': clase_id,
                    'nombre_clase': 'persona'
                }
                
                detecciones.append(deteccion)
        
        return detecciones
    
    def rastrear_objetos(self, detecciones, numero_frame):
        """
        Tracking simple de objetos entre frames consecutivos
        
        Args:
            detecciones: Lista de detecciones del frame actual
            numero_frame: Número del frame actual
            
        Returns:
            Lista de objetos rastreados con ID persistente
        """
        rastreados = []
        
        for deteccion in detecciones:
            # Buscar el objeto rastreado más cercano
            id_rastreo = self._encontrar_rastreo_mas_cercano(deteccion['centro'])
            
            if id_rastreo is None:
                # Nuevo objeto detectado - asignar nuevo ID
                id_rastreo = f"persona_{self.siguiente_id}"
                self.siguiente_id += 1
                self.objetos_rastreados[id_rastreo] = {
                    'id': id_rastreo,
                    'primer_frame': numero_frame,
                    'ultimo_frame': numero_frame,
                    'posiciones': [deteccion['centro']],
                    'frames_rastreados': 1,
                    'velocidades': []
                }
            else:
                # Actualizar objeto existente
                objeto = self.objetos_rastreados[id_rastreo]
                posicion_anterior = objeto['posiciones'][-1]
                posicion_actual = deteccion['centro']
                
                # Calcular velocidad (distancia euclidiana en píxeles/frame)
                velocidad = np.sqrt(
                    (posicion_actual[0] - posicion_anterior[0])**2 + 
                    (posicion_actual[1] - posicion_anterior[1])**2
                )
                
                objeto['ultimo_frame'] = numero_frame
                objeto['posiciones'].append(posicion_actual)
                objeto['velocidades'].append(velocidad)
                objeto['frames_rastreados'] += 1
            
            # Agregar información de tracking a la detección
            deteccion_rastreada = deteccion.copy()
            deteccion_rastreada['id_rastreo'] = id_rastreo
            deteccion_rastreada['trayectoria'] = self.objetos_rastreados[id_rastreo]['posiciones']
            rastreados.append(deteccion_rastreada)
        
        # Limpiar objetos antiguos no vistos recientemente
        self._limpiar_rastreos_antiguos(numero_frame)
        
        return rastreados
    
    def _encontrar_rastreo_mas_cercano(self, posicion, distancia_maxima=100):
        """
        Encontrar el rastreo más cercano a una posición
        
        Args:
            posicion: Posición (x, y) actual
            distancia_maxima: Distancia máxima permitida en píxeles
            
        Returns:
            ID del rastreo más cercano o None
        """
        distancia_minima = distancia_maxima
        id_mas_cercano = None
        
        for id_rastreo, objeto in self.objetos_rastreados.items():
            ultima_posicion = objeto['posiciones'][-1]
            distancia = np.sqrt(
                (posicion[0] - ultima_posicion[0])**2 + 
                (posicion[1] - ultima_posicion[1])**2
            )
            
            if distancia < distancia_minima:
                distancia_minima = distancia
                id_mas_cercano = id_rastreo
        
        return id_mas_cercano
    
    def _limpiar_rastreos_antiguos(self, frame_actual, edad_maxima=30):
        """
        Limpiar rastreos de objetos no vistos recientemente
        
        Args:
            frame_actual: Número del frame actual
            edad_maxima: Frames sin ver para considerar perdido
        """
        ids_eliminar = []
        for id_rastreo, objeto in self.objetos_rastreados.items():
            if frame_actual - objeto['ultimo_frame'] > edad_maxima:
                ids_eliminar.append(id_rastreo)
        
        for id_rastreo in ids_eliminar:
            del self.objetos_rastreados[id_rastreo]
    
    def dibujar_detecciones(self, frame, detecciones):
        """
        Dibujar detecciones y trayectorias en el frame
        
        Args:
            frame: Frame donde dibujar
            detecciones: Lista de detecciones rastreadas
            
        Returns:
            Frame con las detecciones dibujadas
        """
        salida = frame.copy()
        
        for det in detecciones:
            x, y, w, h = det['rectangulo']
            confianza = det['confianza']
            
            # Color según confianza
            color = (0, 255, 0) if confianza > 0.7 else (0, 255, 255)
            
            # Dibujar rectángulo delimitador
            cv2.rectangle(salida, (x, y), (x+w, y+h), color, 2)
            
            # Etiqueta con ID y confianza
            etiqueta = f"{det.get('id_rastreo', 'N/A')} ({confianza:.2f})"
            cv2.putText(
                salida, 
                etiqueta, 
                (x, y-10), 
                cv2.FONT_HERSHEY_SIMPLEX, 
                0.5, 
                color, 
                2
            )
            
            # Dibujar trayectoria si existe
            if 'trayectoria' in det and len(det['trayectoria']) > 1:
                puntos = np.array(det['trayectoria'], dtype=np.int32)
                cv2.polylines(salida, [puntos], False, (255, 0, 0), 2)
                
                # Marcar posición inicial
                cv2.circle(salida, tuple(puntos[0]), 5, (0, 255, 0), -1)
        
        return salida
    
    def obtener_estadisticas_rastreo(self, id_rastreo):
        """
        Obtener estadísticas de un objeto rastreado
        
        Args:
            id_rastreo: ID del objeto rastreado
            
        Returns:
            Diccionario con estadísticas o None
        """
        if id_rastreo not in self.objetos_rastreados:
            return None
        
        objeto = self.objetos_rastreados[id_rastreo]
        
        return {
            'id_rastreo': id_rastreo,
            'frames_rastreados': objeto['frames_rastreados'],
            'velocidad_promedio': np.mean(objeto['velocidades']) if objeto['velocidades'] else 0,
            'velocidad_maxima': max(objeto['velocidades']) if objeto['velocidades'] else 0,
            'longitud_trayectoria': len(objeto['posiciones'])
        }
    
    def obtener_todos_los_rastreos(self):
        """
        Obtener información de todos los objetos actualmente rastreados
        
        Returns:
            Diccionario con todos los rastreos activos
        """
        return self.objetos_rastreados.copy()