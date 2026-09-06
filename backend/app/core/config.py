import os

HOST_API = os.getenv("HOST_API", "0.0.0.0")
PUERTO_API = int(os.getenv("PUERTO_API", "8000"))

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./vigilancia.db")

TAMANO_MAXIMO_BUFFER = 150

FPS_STREAMING = 30

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "clave-secreta-desarrollo-cambiar-en-produccion")
JWT_ALGORITMO = "HS256"
JWT_MINUTOS_EXPIRACION = int(os.getenv("JWT_MINUTOS_EXPIRACION", "480"))  # 8 horas