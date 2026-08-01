"""
Analizador de Comportamiento Sospechoso
Detecta patrones de comportamiento anormales en personas rastreadas
"""
import numpy as np
from datetime import datetime, timedelta
import sys
sys.path.append('..')
import configuracion

class AnalizadorComportamiento:
    """Analiza patrones de comportamiento sospechoso en tiempo real"""
    
    def __init__(self):
        """Inicializar analizador de comportamiento"""
        self.historial_comportamientos = {}
        
    def analizar(self, objetos_rastreados, numero_frame):
        """
        Analizar comportamientos sospechosos de personas rastreadas
        
        Args:
            objetos_rastreados: Diccionario de objetos rastreados
            numero_frame: Número del frame actual
            
        Returns:
            Lista de comportamientos sospechosos detectados
        """
        comportamientos_sospechosos = []
        
        for id_rastreo, datos_objeto in objetos_rastreados.items():
            # Necesitamos suficiente data histórica para análisis confiable
            if datos_objeto['frames_rastreados'] < configuracion.FRAMES_MINIMOS_TRACKING:
                continue
            
            # Analizar diferentes patrones de comportamiento
            comportamientos = []
            
            # 1. Detección de Merodeo (Loitering)
            merodeo = self._detectar_merodeo(datos_objeto, numero_frame)
            if merodeo:
                comportamientos.append(merodeo)
            
            # 2. Movimiento Errático
            erratico = self._detectar_movimiento_erratico(datos_objeto)
            if erratico:
                comportamientos.append(erratico)
            
            # 3. Velocidad Sospechosa
            velocidad_sospechosa = self._detectar_velocidad_sospechosa(datos_objeto)
            if velocidad_sospechosa:
                comportamientos.append(velocidad_sospechosa)
            
            # 4. Cambios Bruscos de Dirección
            cambio_direccion = self._detectar_cambio_direccion_brusco(datos_objeto)
            if cambio_direccion:
                comportamientos.append(cambio_direccion)
            
            # Si se detectaron comportamientos sospechosos, agregarlos
            if comportamientos:
                comportamientos_sospechosos.append({
                    'id_rastreo': id_rastreo,
                    'comportamientos': comportamientos,
                    'posicion': datos_objeto['posiciones'][-1],
                    'frames_rastreados': datos_objeto['frames_rastreados']
                })
        
        return comportamientos_sospechosos
    
    def _detectar_merodeo(self, datos_objeto, numero_frame):
        """
        Detectar patrón de merodeo (permanecer en área pequeña mucho tiempo)
        
        Args:
            datos_objeto: Datos del objeto rastreado
            numero_frame: Frame actual
            
        Returns:
            Diccionario con datos del comportamiento o None
        """
        posiciones = datos_objeto['posiciones']
        
        # Verificar si hay suficiente tiempo transcurrido
        tiempo_minimo_frames = configuracion.FPS_OBJETIVO * configuracion.UMBRAL_TIEMPO_MERODEO
        if len(posiciones) < tiempo_minimo_frames:
            return None
        
        # Calcular desplazamiento total
        desplazamiento_total = 0
        for i in range(1, len(posiciones)):
            dx = posiciones[i][0] - posiciones[i-1][0]
            dy = posiciones[i][1] - posiciones[i-1][1]
            desplazamiento_total += np.sqrt(dx**2 + dy**2)
        
        # Calcular desplazamiento promedio por frame
        desplazamiento_promedio = desplazamiento_total / len(posiciones)
        
        # Si el desplazamiento promedio es muy bajo = merodeo
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
        """
        Detectar patrón de movimiento errático (cambios constantes de velocidad)
        
        Args:
            datos_objeto: Datos del objeto rastreado
            
        Returns:
            Diccionario con datos del comportamiento o None
        """
        velocidades = datos_objeto.get('velocidades', [])
        
        if len(velocidades) < 20:
            return None
        
        # Calcular variación en las velocidades
        varianza_velocidad = np.var(velocidades)
        desviacion_estandar = np.std(velocidades)
        velocidad_promedio = np.mean(velocidades)
        
        # Si la variación es muy alta = movimiento errático
        if desviacion_estandar > velocidad_promedio * 0.8 and velocidad_promedio > 1.0:
            return {
                'tipo': 'movimiento_erratico',
                'confianza': min(desviacion_estandar / (velocidad_promedio + 1), 1.0),
                'descripcion': f'Movimiento errático detectado (desv.std: {desviacion_estandar:.2f})',
                'severidad': 'bajo'
            }
        
        return None
    
    def _detectar_velocidad_sospechosa(self, datos_objeto):
        """
        Detectar velocidad anormalmente baja o alta
        
        Args:
            datos_objeto: Datos del objeto rastreado
            
        Returns:
            Diccionario con datos del comportamiento o None
        """
        velocidades = datos_objeto.get('velocidades', [])
        
        if len(velocidades) < 10:
            return None
        
        # Analizar últimos 30 frames
        velocidad_promedio = np.mean(velocidades[-30:])
        
        # Velocidad muy baja (posible observación sospechosa)
        if configuracion.VELOCIDAD_SOSPECHOSA_MIN < velocidad_promedio < configuracion.VELOCIDAD_SOSPECHOSA_MIN + 1:
            return {
                'tipo': 'velocidad_baja_sospechosa',
                'confianza': 0.6,
                'descripcion': f'Velocidad sospechosamente baja: {velocidad_promedio:.2f} px/frame',
                'severidad': 'medio'
            }
        
        # Velocidad muy alta (posible huida o carrera)
        if velocidad_promedio > configuracion.VELOCIDAD_SOSPECHOSA_MAX:
            return {
                'tipo': 'velocidad_alta_sospechosa',
                'confianza': min(velocidad_promedio / configuracion.VELOCIDAD_SOSPECHOSA_MAX, 1.0),
                'descripcion': f'Velocidad alta detectada: {velocidad_promedio:.2f} px/frame',
                'severidad': 'alto'
            }
        
        return None
    
    def _detectar_cambio_direccion_brusco(self, datos_objeto):
        """
        Detectar cambios bruscos y repetidos de dirección
        
        Args:
            datos_objeto: Datos del objeto rastreado
            
        Returns:
            Diccionario con datos del comportamiento o None
        """
        posiciones = datos_objeto['posiciones']
        
        if len(posiciones) < 15:
            return None
        
        # Calcular ángulos de cambio de dirección
        angulos = []
        for i in range(2, len(posiciones)):
            # Vectores de movimiento
            v1 = np.array([
                posiciones[i-1][0] - posiciones[i-2][0], 
                posiciones[i-1][1] - posiciones[i-2][1]
            ])
            v2 = np.array([
                posiciones[i][0] - posiciones[i-1][0], 
                posiciones[i][1] - posiciones[i-1][1]
            ])
            
            # Evitar división por cero
            if np.linalg.norm(v1) == 0 or np.linalg.norm(v2) == 0:
                continue
            
            # Calcular ángulo entre vectores
            cos_angulo = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
            cos_angulo = np.clip(cos_angulo, -1, 1)
            angulo = np.arccos(cos_angulo)
            angulos.append(np.degrees(angulo))
        
        if not angulos:
            return None
        
        # Contar cambios bruscos (>120 grados)
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
        """
        Evaluar nivel de riesgo global basado en comportamientos detectados
        
        Args:
            comportamientos_sospechosos: Lista de comportamientos detectados
            
        Returns:
            tupla: (nivel_riesgo, puntuacion_riesgo, explicacion)
        """
        if not comportamientos_sospechosos:
            return 'BAJO', 0.0, 'No se detectaron comportamientos sospechosos'
        
        # Pesos por severidad
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
        
        # Normalizar puntuación
        puntuacion_riesgo = min(puntuacion_total / len(comportamientos_sospechosos), 1.0)
        
        # Determinar nivel de riesgo
        if puntuacion_riesgo >= configuracion.NIVELES_RIESGO['ALTO']:
            nivel_riesgo = 'ALTO'
        elif puntuacion_riesgo >= configuracion.NIVELES_RIESGO['MEDIO']:
            nivel_riesgo = 'MEDIO'
        else:
            nivel_riesgo = 'BAJO'
        
        explicacion = '; '.join(explicaciones)
        
        return nivel_riesgo, puntuacion_riesgo, explicacion