from ultralytics import YOLO
import cv2
import numpy as np
import sys
sys.path.append('..')
import configuracion

class DetectorObjetos:

    def __init__(self):

        print("Cargando modelo YOLO...")
        self.modelo = YOLO(configuracion.MODELO_YOLO)
        self.objetos_rastreados = {}
        self.siguiente_id = 0
        print("Modelo YOLO cargado exitosamente")
        
    def detectar(self, frame):

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

        rastreados = []
        
        for deteccion in detecciones:

            id_rastreo = self._encontrar_rastreo_mas_cercano(deteccion['centro'])
            
            if id_rastreo is None:

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

                objeto = self.objetos_rastreados[id_rastreo]
                posicion_anterior = objeto['posiciones'][-1]
                posicion_actual = deteccion['centro']

                velocidad = np.sqrt(
                    (posicion_actual[0] - posicion_anterior[0])**2 + 
                    (posicion_actual[1] - posicion_anterior[1])**2
                )
                
                objeto['ultimo_frame'] = numero_frame
                objeto['posiciones'].append(posicion_actual)
                objeto['velocidades'].append(velocidad)
                objeto['frames_rastreados'] += 1

            deteccion_rastreada = deteccion.copy()
            deteccion_rastreada['id_rastreo'] = id_rastreo
            deteccion_rastreada['trayectoria'] = self.objetos_rastreados[id_rastreo]['posiciones']
            rastreados.append(deteccion_rastreada)

        self._limpiar_rastreos_antiguos(numero_frame)
        
        return rastreados
    
    def _encontrar_rastreo_mas_cercano(self, posicion, distancia_maxima=100):

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

        ids_eliminar = []
        for id_rastreo, objeto in self.objetos_rastreados.items():
            if frame_actual - objeto['ultimo_frame'] > edad_maxima:
                ids_eliminar.append(id_rastreo)
        
        for id_rastreo in ids_eliminar:
            del self.objetos_rastreados[id_rastreo]
    
    def dibujar_detecciones(self, frame, detecciones):

        salida = frame.copy()
        
        for det in detecciones:
            x, y, w, h = det['rectangulo']
            confianza = det['confianza']

            color = (0, 255, 0) if confianza > 0.7 else (0, 255, 255)

            cv2.rectangle(salida, (x, y), (x+w, y+h), color, 2)

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

            if 'trayectoria' in det and len(det['trayectoria']) > 1:
                puntos = np.array(det['trayectoria'], dtype=np.int32)
                cv2.polylines(salida, [puntos], False, (255, 0, 0), 2)

                cv2.circle(salida, tuple(puntos[0]), 5, (0, 255, 0), -1)
        
        return salida
    
    def obtener_estadisticas_rastreo(self, id_rastreo):

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

        return self.objetos_rastreados.copy()