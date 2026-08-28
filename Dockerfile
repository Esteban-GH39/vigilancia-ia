FROM python:3.10-slim

# Dependencias del sistema requeridas por OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Modo demo: no hay cámara física en la nube, se usa un video de prueba en bucle
ENV VIDEO_SOURCE=media/demo_video.mp4
ENV ROTAR_FRAME_180=false
ENV LOOP_VIDEO_DEMO=true

EXPOSE 8000

WORKDIR /app/Backend
CMD ["sh", "-c", "python -m uvicorn servidor_principal:app --host 0.0.0.0 --port ${PORT:-8000}"]
