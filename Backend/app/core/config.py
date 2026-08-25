import os

HOST_API = os.getenv("HOST_API", "0.0.0.0")
PUERTO_API = int(os.getenv("PUERTO_API", "8000"))

# BD: SQLITE en desarrollo y Postgres en producción

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./vigilancia.db")

TAMANO_MAXIMO_BUFFER = 150

FPS_STREAMING = 30