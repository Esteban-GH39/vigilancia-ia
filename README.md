# Sistema de Vigilancia con Inteligencia Artificial

Sistema inteligente de vigilancia en tiempo real que combina detección de movimiento,
detección de objetos con YOLOv8 y análisis de comportamiento (merodeo, velocidad
sospechosa) para generar alertas automáticas, con un dashboard web en vivo.

Proyecto desarrollado para la asignatura **Práctica de Ingeniería II** — Facultad de
Ingeniería y Ciencias Básicas, **Universidad Central**.

**Autores:**
- Juan Felipe Garavito Feo
- Esteban Girón Herrera
- Juan Fernando Fonseca

## Arquitectura

- **Backend:** FastAPI (Python) + OpenCV + Ultralytics YOLOv8 + SQLAlchemy (SQLite)
- **Frontend:** HTML/CSS/JavaScript, consumo de video en tiempo real vía WebSocket
- **Módulos principales:**
  - `captura_video.py` — captura y preprocesamiento de frames
  - `detector_movimiento.py` — detección de movimiento por diferencia de frames
  - `detector_objetos.py` — detección de personas con YOLOv8
  - `analizador_comportamientos.py` — evaluación de riesgo (merodeo, velocidad)
  - `sistema_alertas.py` — generación y gestión de alertas
  - `base_datos.py` — persistencia de eventos en SQLite
  - `servidor_principal.py` — API REST + WebSocket (FastAPI)

## ⚠️ Nota importante sobre la fuente de video

Este sistema fue diseñado originalmente para leer la **cámara física** del equipo
donde corre (`VIDEO_SOURCE=0`). Un servidor en la nube no tiene cámara conectada,
así que el despliegue público usa un **video de demostración en bucle** en su lugar
(`media/demo_video.mp4`), controlado por variables de entorno — el código de
detección, análisis y alertas es exactamente el mismo.

| Variable          | Descripción                                          | Local (con cámara) | Demo en la nube        |
|-------------------|-------------------------------------------------------|---------------------|--------------------------|
| `VIDEO_SOURCE`    | `0` = webcam, o ruta a un archivo de video            | `0`                  | `media/demo_video.mp4`  |
| `ROTAR_FRAME_180` | Rotar el frame 180° según el montaje de la cámara      | `true` si aplica     | `false`                  |
| `LOOP_VIDEO_DEMO`  | Repetir el video en bucle al llegar al final           | (no aplica)          | `true`                   |
| `PORT`            | Puerto del servidor (lo inyecta la plataforma en la nube) | `8000`            | asignado automáticamente |

> 💡 El video de demo incluido es un placeholder sintético (no una persona real).
> Para una demo más convincente, reemplaza `media/demo_video.mp4` por un clip corto
> (10–20s) de una persona caminando — el detector de personas de YOLO reaccionará
> ante ella igual que lo haría con la cámara en vivo.

## Ejecutar en local (con cámara)

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / Mac

pip install -r requirements.txt

cd Backend
python servidor_principal.py
```

Abre `http://localhost:8000` en el navegador.

## Ejecutar en local con Docker (modo demo, sin cámara)

```bash
docker build -t vigilancia-ia .
docker run -p 8000:8000 vigilancia-ia
```

## Despliegue en la nube (Render)

1. Crea un nuevo **Web Service** en [Render](https://render.com), conectado a este
   repositorio de GitHub.
2. Render detecta automáticamente el `render.yaml` y el `Dockerfile` (entorno Docker).
3. Al finalizar el build, la app queda disponible en una URL pública, procesando el
   video de demo en bucle.

## Endpoints principales

- `GET /` — Dashboard web
- `GET /api/estado` — Estado actual del sistema
- `POST /api/iniciar` / `POST /api/detener` — Control de la captura
- `GET /api/eventos` — Eventos recientes
- `GET /api/alertas` — Alertas generadas
- `GET /api/estadisticas` — Estadísticas del sistema
- `WS /ws/video` — Transmisión de video en tiempo real

## Stack técnico

Python · FastAPI · OpenCV · YOLOv8 (Ultralytics) · SQLAlchemy · SQLite · WebSockets · Docker
