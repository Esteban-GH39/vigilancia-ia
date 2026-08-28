"""
Prueba unitaria rápida de la LÓGICA de detector_poses.py usando keypoints
sintéticos (no requiere tener ultralytics/torch instalado, porque evitamos
llamar a __init__, que es lo único que carga el modelo YOLO real).
"""
import sys
import types
from pathlib import Path
import numpy as np


def _encontrar_raiz_proyecto():
    """Sube desde este archivo, carpeta por carpeta, hasta encontrar la que
    contiene 'configuracion.py' (la raíz del repo)."""
    actual = Path(__file__).resolve().parent
    for _ in range(6):
        if (actual / 'configuracion.py').exists():
            return actual
        if actual.parent == actual:
            break
        actual = actual.parent
    raise FileNotFoundError(
        "No encontré 'configuracion.py' subiendo desde "
        f"{Path(__file__).resolve().parent}. Revisa que el repo esté completo."
    )


def _encontrar_carpeta_de_detector_poses(raiz_proyecto):
    """Busca detector_poses.py en cualquier parte bajo la raíz del proyecto,
    sin asumir una ruta fija (Backend/app/services puede variar de mayúsculas
    o de nombre según cómo lo hayan organizado)."""
    coincidencias = list(raiz_proyecto.rglob('detector_poses.py'))
    if not coincidencias:
        raise FileNotFoundError(
            f"No encontré 'detector_poses.py' en ninguna carpeta dentro de {raiz_proyecto}.\n"
            "Verifica que hayas guardado ese archivo en tu proyecto "
            "(debería estar en Backend/app/services/detector_poses.py)."
        )
    return coincidencias[0].parent


RAIZ_PROYECTO = _encontrar_raiz_proyecto()
CARPETA_SERVICES = _encontrar_carpeta_de_detector_poses(RAIZ_PROYECTO)

print(f"[info] Raíz del proyecto: {RAIZ_PROYECTO}")
print(f"[info] detector_poses.py encontrado en: {CARPETA_SERVICES}")

sys.path.insert(0, str(CARPETA_SERVICES))
sys.path.insert(0, str(RAIZ_PROYECTO))

# ultralytics (y por lo tanto torch) y cv2 (OpenCV) no hacen falta para
# probar la LÓGICA de clasificación de poses -- solo se usan dentro de
# detectar() y dibujar_esqueletos(), que aquí no llamamos. Los simulamos para
# poder importar el módulo sin instalar esas librerías pesadas solo por esto.
modulo_falso_ultralytics = types.ModuleType('ultralytics')
modulo_falso_ultralytics.YOLO = object
sys.modules['ultralytics'] = modulo_falso_ultralytics

modulo_falso_cv2 = types.ModuleType('cv2')
modulo_falso_cv2.line = lambda *a, **k: None
modulo_falso_cv2.circle = lambda *a, **k: None
modulo_falso_cv2.rectangle = lambda *a, **k: None
modulo_falso_cv2.putText = lambda *a, **k: None
modulo_falso_cv2.polylines = lambda *a, **k: None
modulo_falso_cv2.FONT_HERSHEY_SIMPLEX = 0
sys.modules['cv2'] = modulo_falso_cv2

import detector_poses as dp

CONF_ALTA = 0.9


def crear_keypoints_base():
    """17 puntos en (x, y, conf), postura neutral 'de pie', todos visibles."""
    kp = np.zeros((17, 3))
    kp[dp.NARIZ] = [100, 50, CONF_ALTA]
    kp[dp.OJO_IZQ] = [95, 45, CONF_ALTA]
    kp[dp.OJO_DER] = [105, 45, CONF_ALTA]
    kp[dp.OREJA_IZQ] = [90, 46, CONF_ALTA]
    kp[dp.OREJA_DER] = [110, 46, CONF_ALTA]
    kp[dp.HOMBRO_IZQ] = [85, 90, CONF_ALTA]
    kp[dp.HOMBRO_DER] = [115, 90, CONF_ALTA]
    kp[dp.CODO_IZQ] = [80, 130, CONF_ALTA]
    kp[dp.CODO_DER] = [120, 130, CONF_ALTA]
    kp[dp.MUÑECA_IZQ] = [78, 170, CONF_ALTA]   # brazos colgando, relajados
    kp[dp.MUÑECA_DER] = [122, 170, CONF_ALTA]
    kp[dp.CADERA_IZQ] = [90, 190, CONF_ALTA]
    kp[dp.CADERA_DER] = [110, 190, CONF_ALTA]
    kp[dp.RODILLA_IZQ] = [90, 250, CONF_ALTA]
    kp[dp.RODILLA_DER] = [110, 250, CONF_ALTA]
    kp[dp.TOBILLO_IZQ] = [90, 310, CONF_ALTA]
    kp[dp.TOBILLO_DER] = [110, 310, CONF_ALTA]
    return kp


def test_persona_de_pie_no_dispara_nada():
    detector = object.__new__(dp.DetectorPoses)
    kp = crear_keypoints_base()
    persona = {'keypoints': kp, 'alto_caja': 280.0}
    resultado = detector.clasificar_pose(persona)
    assert resultado == [], f"Esperaba [] para postura neutral, dio: {resultado}"
    print("OK  - persona de pie -> sin alertas")


def test_persona_caida():
    detector = object.__new__(dp.DetectorPoses)
    kp = crear_keypoints_base()
    # Tronco horizontal: cadera casi a la misma altura Y que el hombro,
    # pero muy desplazada en X (persona tendida en el suelo)
    kp[dp.HOMBRO_IZQ] = [50, 200, CONF_ALTA]
    kp[dp.HOMBRO_DER] = [50, 210, CONF_ALTA]
    kp[dp.CADERA_IZQ] = [180, 202, CONF_ALTA]
    kp[dp.CADERA_DER] = [180, 212, CONF_ALTA]
    persona = {'keypoints': kp, 'alto_caja': 90.0}
    resultado = detector.clasificar_pose(persona)
    tipos = [r['tipo'] for r in resultado]
    assert 'persona_caida' in tipos, f"Esperaba 'persona_caida', dio: {tipos}"
    print(f"OK  - persona caída detectada -> {resultado[0]['descripcion']}")


def test_brazos_en_alto():
    detector = object.__new__(dp.DetectorPoses)
    kp = crear_keypoints_base()
    # Muñecas muy por encima de los hombros
    kp[dp.MUÑECA_IZQ] = [78, 20, CONF_ALTA]
    kp[dp.MUÑECA_DER] = [122, 20, CONF_ALTA]
    persona = {'keypoints': kp, 'alto_caja': 280.0}
    resultado = detector.clasificar_pose(persona)
    tipos = [r['tipo'] for r in resultado]
    assert 'brazos_en_alto' in tipos, f"Esperaba 'brazos_en_alto', dio: {tipos}"
    print(f"OK  - brazos en alto detectados -> {resultado[0]['descripcion']}")


def test_forcejeo_grupal():
    detector = object.__new__(dp.DetectorPoses)

    kp1 = crear_keypoints_base()
    kp1[dp.MUÑECA_IZQ] = [40, 100, CONF_ALTA]  # brazo muy extendido hacia la otra persona

    kp2 = crear_keypoints_base()
    for idx in range(17):
        kp2[idx][0] += 60  # desplazada 60px en X (cerca, dentro del umbral de 80px)

    personas = [
        {'centro': (100, 190), 'keypoints': kp1},
        {'centro': (160, 190), 'keypoints': kp2},
    ]
    eventos = detector.detectar_forcejeo_grupal(personas)
    assert len(eventos) >= 1, "Esperaba detectar forcejeo entre las dos personas cercanas"
    print(f"OK  - forcejeo detectado -> {eventos[0]['descripcion']}")


def test_agachado_subito():
    detector = object.__new__(dp.DetectorPoses)
    detector.historial_altura = {}

    # Frames 1-5: de pie, altura ~280px. Frames 6-10: agachado, altura ~150px.
    alturas = [280, 282, 278, 281, 279, 200, 170, 155, 150, 148]
    resultado = None
    for i, alto in enumerate(alturas):
        resultado = detector.registrar_altura_y_detectar_agachado("persona_0", alto, numero_frame=i)

    assert resultado is not None and resultado['tipo'] == 'agachado_subito', \
        f"Esperaba detectar agachado súbito, dio: {resultado}"
    print(f"OK  - agachado súbito detectado -> {resultado['descripcion']}")


def test_keypoints_insuficientes_no_revienta():
    detector = object.__new__(dp.DetectorPoses)
    kp = np.zeros((17, 3))  # ningún keypoint visible (confianza 0)
    persona = {'keypoints': kp, 'alto_caja': 100.0}
    resultado = detector.clasificar_pose(persona)
    assert resultado == [], "Con 0 keypoints visibles no debería clasificar nada"
    print("OK  - keypoints insuficientes -> no revienta, devuelve []")


if __name__ == "__main__":
    pruebas = [
        test_persona_de_pie_no_dispara_nada,
        test_persona_caida,
        test_brazos_en_alto,
        test_forcejeo_grupal,
        test_agachado_subito,
        test_keypoints_insuficientes_no_revienta,
    ]
    fallidas = 0
    for prueba in pruebas:
        try:
            prueba()
        except AssertionError as e:
            fallidas += 1
            print(f"FALLO - {prueba.__name__}: {e}")
        except Exception as e:
            fallidas += 1
            print(f"ERROR - {prueba.__name__}: {type(e).__name__}: {e}")

    print(f"\n{len(pruebas) - fallidas}/{len(pruebas)} pruebas pasaron")