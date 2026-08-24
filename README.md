# Sistema de Vigilancia con Inteligencia Artificial

Sistema inteligente de vigilancia en tiempo real que combina detección de movimiento,
detección de objetos con YOLOv8 y análisis de comportamiento (merodeo, velocidad
sospechosa) para generar alertas automáticas, con un dashboard web en vivo.

Proyecto desarrollado para la asignatura **Práctica de Ingeniería IV** — Facultad de
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

## Stack técnico

Python · FastAPI · OpenCV · YOLOv8 (Ultralytics) · SQLAlchemy · SQLite · WebSockets · Docker
