from ultralytics import YOLO
import numpy as np
import cv2
import sys
sys.path.append('..')
import configuracion

NARIZ = 0
OJO_IZQ, OJO_DER = 1, 2
OREJA_IZQ, OREJA_DER = 3, 4
HOMBRO_IZQ, HOMBRO_DER = 5, 6
CODO_IZQ, CODO_DER = 7, 8
MUÑECA_IZQ, MUÑECA_DER = 9, 10
CADERA_IZQ, CADERA_DER = 11, 12
RODILLA_IZQ, RODILLA_DER = 13, 14
TOBILLO_IZQ, TOBILLO_DER = 15, 16

CONEXIONES_ESQUELETO = [
    (HOMBRO_IZQ, HOMBRO_DER), (HOMBRO_IZQ, CODO_IZQ), (CODO_IZQ, MUÑECA_IZQ),
    (HOMBRO_DER, CODO_DER), (CODO_DER, MUÑECA_DER),
    (HOMBRO_IZQ, CADERA_IZQ), (HOMBRO_DER, CADERA_DER), (CADERA_IZQ, CADERA_DER),
    (CADERA_IZQ, RODILLA_IZQ), (RODILLA_IZQ, TOBILLO_IZQ),
    (CADERA_DER, RODILLA_DER), (RODILLA_DER, TOBILLO_DER),
]


class DetectorPoses:

    def __init__(self):

        print("Cargando modelo YOLO-Pose...")
        self.modelo = YOLO(configuracion.MODELO_YOLO_POSE)
        self.historial_altura = {}
        print("Modelo YOLO-Pose cargado exitosamente")

    def detectar(self, frame):

        resultados = self.modelo(
            frame,
            conf=configuracion.CONFIANZA_POSE,
            verbose=False
        )

        personas = []
        for resultado in resultados:
            if resultado.keypoints is None:
                continue

            cajas = resultado.boxes
            todos_keypoints = resultado.keypoints.data.cpu().numpy()  

            for i, keypoints in enumerate(todos_keypoints):
                x1, y1, x2, y2 = cajas.xyxy[i].cpu().numpy()
                confianza_caja = float(cajas.conf[i])

                persona = {
                    'rectangulo': (int(x1), int(y1), int(x2 - x1), int(y2 - y1)),
                    'centro': (int((x1 + x2) / 2), int((y1 + y2) / 2)),
                    'confianza': confianza_caja,
                    'alto_caja': float(y2 - y1),
                    'keypoints': keypoints,  
                }
                personas.append(persona)

        return personas

    def _kp_valido(self, keypoints, indice):
        return keypoints[indice][2] >= configuracion.CONFIANZA_POSE

    def _contar_keypoints_visibles(self, keypoints):
        return int(np.sum(keypoints[:, 2] >= configuracion.CONFIANZA_POSE))

    def clasificar_pose(self, persona):

        keypoints = persona['keypoints']
        poses_detectadas = []

        if self._contar_keypoints_visibles(keypoints) < configuracion.KEYPOINTS_MINIMOS_VISIBLES:
            return poses_detectadas

        caida = self._detectar_caida(keypoints)
        if caida:
            poses_detectadas.append(caida)

        brazos_arriba = self._detectar_brazos_arriba(keypoints, persona['alto_caja'])
        if brazos_arriba:
            poses_detectadas.append(brazos_arriba)

        return poses_detectadas

    def _detectar_caida(self, keypoints):

        if not (self._kp_valido(keypoints, HOMBRO_IZQ) or self._kp_valido(keypoints, HOMBRO_DER)):
            return None
        if not (self._kp_valido(keypoints, CADERA_IZQ) or self._kp_valido(keypoints, CADERA_DER)):
            return None

        hombro = self._punto_medio(keypoints, HOMBRO_IZQ, HOMBRO_DER)
        cadera = self._punto_medio(keypoints, CADERA_IZQ, CADERA_DER)

        dx = cadera[0] - hombro[0]
        dy = cadera[1] - hombro[1]

        if dx == 0 and dy == 0:
            return None

        angulo_vertical = np.degrees(np.arctan2(abs(dx), abs(dy) + 1e-6))

        if angulo_vertical > configuracion.UMBRAL_CAIDA_ANGULO_TRONCO:
            confianza = min(angulo_vertical / 90, 1.0)
            return {
                'tipo': 'persona_caida',
                'confianza': confianza,
                'descripcion': f'Postura de caída detectada (tronco a {angulo_vertical:.0f}° de la vertical)',
                'severidad': 'alto'
            }

        return None

    def _detectar_brazos_arriba(self, keypoints, alto_caja):

        if not (self._kp_valido(keypoints, HOMBRO_IZQ) and self._kp_valido(keypoints, MUÑECA_IZQ)):
            brazo_izq_arriba = False
        else:
            brazo_izq_arriba = (
                keypoints[HOMBRO_IZQ][1] - keypoints[MUÑECA_IZQ][1]
            ) > configuracion.UMBRAL_BRAZOS_ARRIBA_RATIO * alto_caja

        if not (self._kp_valido(keypoints, HOMBRO_DER) and self._kp_valido(keypoints, MUÑECA_DER)):
            brazo_der_arriba = False
        else:
            brazo_der_arriba = (
                keypoints[HOMBRO_DER][1] - keypoints[MUÑECA_DER][1]
            ) > configuracion.UMBRAL_BRAZOS_ARRIBA_RATIO * alto_caja

        if brazo_izq_arriba and brazo_der_arriba:
            return {
                'tipo': 'brazos_en_alto',
                'confianza': 0.75,
                'descripcion': 'Ambos brazos levantados por encima de los hombros',
                'severidad': 'medio'
            }

        return None

    def detectar_forcejeo_grupal(self, personas):

        eventos = []

        for i in range(len(personas)):
            for j in range(i + 1, len(personas)):
                centro_i = personas[i]['centro']
                centro_j = personas[j]['centro']

                distancia = np.sqrt(
                    (centro_i[0] - centro_j[0]) ** 2 + (centro_i[1] - centro_j[1]) ** 2
                )

                if distancia > configuracion.DISTANCIA_FORCEJEO_PX:
                    continue

                brazos_extendidos_i = self._tiene_brazos_extendidos(personas[i]['keypoints'])
                brazos_extendidos_j = self._tiene_brazos_extendidos(personas[j]['keypoints'])

                if brazos_extendidos_i or brazos_extendidos_j:
                    eventos.append({
                        'tipo': 'forcejeo_agarre',
                        'confianza': 0.65,
                        'descripcion': f'Posible forcejeo entre dos personas (distancia {distancia:.0f}px)',
                        'severidad': 'alto',
                        'centros_involucrados': [centro_i, centro_j]
                    })

        return eventos

    def _tiene_brazos_extendidos(self, keypoints):

        extendido_izq = self._brazo_extendido(keypoints, HOMBRO_IZQ, CODO_IZQ, MUÑECA_IZQ)
        extendido_der = self._brazo_extendido(keypoints, HOMBRO_DER, CODO_DER, MUÑECA_DER)
        return extendido_izq or extendido_der

    def _brazo_extendido(self, keypoints, hombro_idx, codo_idx, muñeca_idx):
        if not (self._kp_valido(keypoints, hombro_idx) and
                self._kp_valido(keypoints, codo_idx) and
                self._kp_valido(keypoints, muñeca_idx)):
            return False

        hombro = keypoints[hombro_idx][:2]
        codo = keypoints[codo_idx][:2]
        muñeca = keypoints[muñeca_idx][:2]

        distancia_hombro_muñeca = np.linalg.norm(muñeca - hombro)
        distancia_hombro_codo = np.linalg.norm(codo - hombro)

        if distancia_hombro_codo == 0:
            return False

        return distancia_hombro_muñeca > distancia_hombro_codo * 1.6

    def _punto_medio(self, keypoints, indice_izq, indice_der):
        if self._kp_valido(keypoints, indice_izq) and self._kp_valido(keypoints, indice_der):
            return (
                (keypoints[indice_izq][0] + keypoints[indice_der][0]) / 2,
                (keypoints[indice_izq][1] + keypoints[indice_der][1]) / 2,
            )
        if self._kp_valido(keypoints, indice_izq):
            return keypoints[indice_izq][:2]
        return keypoints[indice_der][:2]

    def registrar_altura_y_detectar_agachado(self, id_rastreo, alto_caja, numero_frame):

        if id_rastreo not in self.historial_altura:
            self.historial_altura[id_rastreo] = []

        historial = self.historial_altura[id_rastreo]
        historial.append((numero_frame, alto_caja))

        if len(historial) > 15:
            historial.pop(0)

        if len(historial) < 10:
            return None

        alturas = [h[1] for h in historial]
        altura_referencia = max(alturas[:5])
        altura_reciente = np.mean(alturas[-3:])

        if altura_referencia == 0:
            return None

        ratio_reduccion = 1 - (altura_reciente / altura_referencia)

        if ratio_reduccion > 0.35:
            return {
                'tipo': 'agachado_subito',
                'confianza': min(ratio_reduccion / 0.5, 1.0),
                'descripcion': f'Reducción súbita de altura corporal ({ratio_reduccion*100:.0f}%)',
                'severidad': 'medio'
            }

        return None

    def dibujar_esqueletos(self, frame, personas):

        salida = frame.copy()

        for persona in personas:
            keypoints = persona['keypoints']

            for punto_a, punto_b in CONEXIONES_ESQUELETO:
                if self._kp_valido(keypoints, punto_a) and self._kp_valido(keypoints, punto_b):
                    pa = tuple(keypoints[punto_a][:2].astype(int))
                    pb = tuple(keypoints[punto_b][:2].astype(int))
                    cv2.line(salida, pa, pb, (0, 200, 255), 2)

            for indice in range(len(keypoints)):
                if self._kp_valido(keypoints, indice):
                    punto = tuple(keypoints[indice][:2].astype(int))
                    cv2.circle(salida, punto, 3, (0, 0, 255), -1)

        return salida

    def limpiar_historial(self, ids_activos):

        ids_eliminar = [id_ for id_ in self.historial_altura if id_ not in ids_activos]
        for id_ in ids_eliminar:
            del self.historial_altura[id_]