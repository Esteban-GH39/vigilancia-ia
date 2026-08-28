
# Sistema de Vigilancia con Inteligencia Artificial

Sistema inteligente de vigilancia en tiempo real que combina detección de movimiento,
detección de objetos con YOLOv8 y análisis de comportamiento (merodeo, velocidad
sospechosa) para generar alertas automáticas, con un dashboard web en vivo.

Proyecto desarrollado para la asignatura **Práctica de Ingeniería IV**
Facultad de Ingeniería y Ciencias Básicas, **Universidad Central**.

**Autores:**

- Juan Felipe Garavito Feo
- Esteban Girón Herrera
- Juan Fernando Fonseca Martínez

## Arquitectura

- **Backend:** FastAPI (Python) + OpenCV + Ultralytics YOLOv8 + SQLAlchemy (SQLite)
- **Frontend:** React + Vite, consumo de video en tiempo real vía WebSocket
- **Diseño:** motor de IA desacoplado del servidor web (worker en threads +
  cola interna), para que el procesamiento de video no bloquee la API ni el WebSocket

### Backend (`backend/app/`)

- `core/config.py` — configuración general de la app
- `core/queue_manager.py` — gestor de sesiones y colas por cámara (desacople IA/web)
- `workers/ia_worker.py` — pipeline de IA corriendo en threads, no bloqueante
- `routers/` — endpoints REST y WebSocket: `camaras`, `eventos`, `alertas`, `auth`, `analisis`
- `services/` — lógica de visión por computadora:
  - `captura_video.py` — captura y preprocesamiento de frames
  - `detector_movimiento.py` — detección de movimiento por diferencia de frames
  - `detector_objetos.py` — detección de personas con YOLOv8
  - `analizador_comportamientos.py` — evaluación de riesgo (merodeo, velocidad)
  - `sistema_alertas.py` — generación y gestión de alertas
- `db/` — persistencia (SQLAlchemy): `base_datos.py` (eventos), `modelos_camara.py`
  y `repositorio_camaras.py` (CRUD de cámaras)

### Frontend (`frontend/src/`)

- `pages/` — Login, Dashboard
- `components/` — mosaico de cámaras, formulario de registro, panel y tabla de
  alertas, mapa de calor de patrones delictivos (Leaflet), sidebar de navegación
- `hooks/` — `useVideoStream`, `useAlertas` (WebSocket)
- `api/client.js` — cliente centralizado de la API

## Cómo ejecutar

**Backend:**

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Documentación interactiva en `http://localhost:8000/docs`.

**Frontend:**

```bash
cd frontend
pnpm install
pnpm run dev
```

Disponible en `http://localhost:5173`.

## Stack técnico

Python · FastAPI · OpenCV · YOLOv8 (Ultralytics) · SQLAlchemy · SQLite · WebSockets · Docker · React · Vite
