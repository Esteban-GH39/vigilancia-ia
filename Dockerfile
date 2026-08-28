FROM python:3.10-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV VIDEO_SOURCE=media/demo_video.mp4
ENV ROTAR_FRAME_180=false
ENV LOOP_VIDEO_DEMO=true

EXPOSE 8000

WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"]
