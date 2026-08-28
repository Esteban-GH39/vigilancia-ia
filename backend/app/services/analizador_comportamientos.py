import numpy as np
from datetime import datetime, timedelta
import sys
sys.path.append('..')
import backend.configuracion as configuracion

class AnalizadorComportamiento:

    def __init__(self):
        self.historial_comportamientos = {}
        
    def analizar(self, objetos_rastreados, numero_frame):

        comportamientos_sospechosos = []
        
        for id_rastreo, datos_objeto in objetos_rastreados.items():
            if datos_objeto['frames_rastreados'] < configuracion.FRAMES_MINIMOS_TRACKING:
                continue
            comportamientos = []

            merodeo = self._detectar_merodeo(datos_objeto, numero_frame)
            if merodeo:
                comportamientos.append(merodeo)

            erratico = self._detectar_movimiento_erratico(datos_objeto)
            if erratico:
                comportamientos.append(erratico)

            velocidad_sospechosa = self._detectar_velocidad_sospechosa(datos_objeto)
            if velocidad_sospechosa:
                comportamientos.append(velocidad_sospechosa)

            cambio_direccion = self._detectar_cambio_direccion_brusco(datos_objeto)
            if cambio_direccion:
                comportamientos.append(cambio_direccion)

            if comportamientos:
                comportamientos_sospechosos.append({
                    'id_rastreo': id_rastreo,
                    'comportamientos': comportamientos,
                    'posicion': datos_objeto['posiciones'][-1],
                    'frames_rastreados': datos_objeto['frames_rastreados']
                })
        
        return comportamientos_sospechosos
    
    def _detectar_merodeo(self, datos_objeto, numero_frame):

        posiciones = datos_objeto['posiciones']

        tiempo_minimo_frames = configuracion.FPS_OBJETIVO * configuracion.UMBRAL_TIEMPO_MERODEO
        if len(posiciones) < tiempo_minimo_frames:
            return None

        desplazamiento_total = 0
        for i in range(1, len(posiciones)):
            dx = posiciones[i][0] - posiciones[i-1][0]
            dy = posiciones[i][1] - posiciones[i-1][1]
            desplazamiento_total += np.sqrt(dx**2 + dy**2)

        desplazamiento_promedio = desplazamiento_total / len(posiciones)

        if desplazamiento_promedio < 2.0:
            duracion = datos_objeto['frames_rastreados'] / configuracion.FPS_OBJETIVO
            return {
                'tipo': 'merodeo',
                'confianza': min(duracion / configuracion.UMBRAL_TIEMPO_MERODEO, 1.0),
                'descripcion': f'Persona merodeando por {duracion:.1f} segundos',
                'severidad': 'medio'
            }
        
        return None
    
    def _detectar_movimiento_erratico(self, datos_objeto):

        velocidades = datos_objeto.get('velocidades', [])
        
        if len(velocidades) < 20:
            return None

        varianza_velocidad = np.var(velocidades)
        desviacion_estandar = np.std(velocidades)
        velocidad_promedio = np.mean(velocidades)

        if desviacion_estandar > velocidad_promedio * 0.8 and velocidad_promedio > 1.0:
            return {
                'tipo': 'movimiento_erratico',
                'confianza': min(desviacion_estandar / (velocidad_promedio + 1), 1.0),
                'descripcion': f'Movimiento errático detectado (desv.std: {desviacion_estandar:.2f})',
                'severidad': 'bajo'
            }
        
        return None
    
    def _detectar_velocidad_sospechosa(self, datos_objeto):

        velocidades = datos_objeto.get('velocidades', [])
        
        if len(velocidades) < 10:
            return None

        velocidad_promedio = np.mean(velocidades[-30:])

        if configuracion.VELOCIDAD_SOSPECHOSA_MIN < velocidad_promedio < configuracion.VELOCIDAD_SOSPECHOSA_MIN + 1:
            return {
                'tipo': 'velocidad_baja_sospechosa',
                'confianza': 0.6,
                'descripcion': f'Velocidad sospechosamente baja: {velocidad_promedio:.2f} px/frame',
                'severidad': 'medio'
            }

        if velocidad_promedio > configuracion.VELOCIDAD_SOSPECHOSA_MAX:
            return {
                'tipo': 'velocidad_alta_sospechosa',
                'confianza': min(velocidad_promedio / configuracion.VELOCIDAD_SOSPECHOSA_MAX, 1.0),
                'descripcion': f'Velocidad alta detectada: {velocidad_promedio:.2f} px/frame',
                'severidad': 'alto'
            }
        
        return None
    
    def _detectar_cambio_direccion_brusco(self, datos_objeto):

        posiciones = datos_objeto['posiciones']
        
        if len(posiciones) < 15:
            return None

        angulos = []
        for i in range(2, len(posiciones)):

            v1 = np.array([
                posiciones[i-1][0] - posiciones[i-2][0], 
                posiciones[i-1][1] - posiciones[i-2][1]
            ])
            v2 = np.array([
                posiciones[i][0] - posiciones[i-1][0], 
                posiciones[i][1] - posiciones[i-1][1]
            ])

            if np.linalg.norm(v1) == 0 or np.linalg.norm(v2) == 0:
                continue

            cos_angulo = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
            cos_angulo = np.clip(cos_angulo, -1, 1)
            angulo = np.arccos(cos_angulo)
            angulos.append(np.degrees(angulo))
        
        if not angulos:
            return None

        giros_bruscos = sum(1 for angulo in angulos if angulo > 120)
        
        if giros_bruscos >= 3:
            return {
                'tipo': 'cambios_direccion_bruscos',
                'confianza': min(giros_bruscos / 5, 1.0),
                'descripcion': f'{giros_bruscos} cambios bruscos de dirección detectados',
                'severidad': 'medio'
            }
        
        return None
    
    def evaluar_riesgo(self, comportamientos_sospechosos):

        if not comportamientos_sospechosos:
            return 'BAJO', 0.0, 'No se detectaron comportamientos sospechosos'

        pesos_severidad = {
            'bajo': 0.2,
            'medio': 0.5,
            'alto': 0.8
        }
        
        puntuacion_total = 0
        explicaciones = []
        
        for persona_comportamiento in comportamientos_sospechosos:
            for comportamiento in persona_comportamiento['comportamientos']:
                peso = pesos_severidad.get(comportamiento['severidad'], 0.5)
                puntuacion_total += comportamiento['confianza'] * peso
                explicaciones.append(comportamiento['descripcion'])

        puntuacion_riesgo = min(puntuacion_total / len(comportamientos_sospechosos), 1.0)

        if puntuacion_riesgo >= configuracion.NIVELES_RIESGO['ALTO']:
            nivel_riesgo = 'ALTO'
        elif puntuacion_riesgo >= configuracion.NIVELES_RIESGO['MEDIO']:
            nivel_riesgo = 'MEDIO'
        else:
            nivel_riesgo = 'BAJO'
        
        explicacion = '; '.join(explicaciones)
        
        return nivel_riesgo, puntuacion_riesgo, explicacion