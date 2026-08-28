"Ejecutar uvicorn app.main:app --reload --port 8000 (se definió en el front)"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import modelos_camara

from app.routers import camaras, websocket, eventos, alertas, auth, analisis
from app.core.config import HOST_API, PUERTO_API

app = FastAPI (
    title="Sistema de Vigilancia con IA",
    description="Backend modular: API asíncrona + motor de IA desacoplado",
    version="2.0.0"
)

app.add_middleware (
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(camaras.router)
app.include_router(eventos.router)
app.include_router(alertas.router)
app.include_router(websocket.router)
app.include_router(analisis.router)

@app.get("/")
async def raiz():
    return {"estado": "ok", "servicio": "vigilancia-ia-backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST_API, port=PUERTO_API)