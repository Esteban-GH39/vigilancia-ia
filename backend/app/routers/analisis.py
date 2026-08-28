from fastapi import APIRouter
from app.db.base_datos import FabricaSesion, Evento
from app.db.modelos_camara import Camara

router = APIRouter(prefix="/api/analisis", tags=["analisis"])

COORDENADAS_LOCALIDAD = {
    "Chapinero": (4.6488, -74.0628),
    "Kennedy": (4.6280, -74.1631),
    "Engativá": (4.7100, -74.1130),
    "Suba": (4.7420, -74.0930),
    "Bosa": (4.6180, -74.1830),
}


@router.get("/mapa-calor")
async def mapa_calor():
    sesion = FabricaSesion()
    try:
        camaras = sesion.query(Camara).all()
        puntos = []
        for camara in camaras:
            cantidad_eventos = sesion.query(Evento).filter(Evento.ubicacion == camara.ubicacion).count()
            if cantidad_eventos == 0:
                continue
            if camara.latitud and camara.longitud:
                lat, lng = camara.latitud, camara.longitud
            else:
                lat, lng = COORDENADAS_LOCALIDAD.get(camara.ubicacion, (4.6097, -74.0817))
            puntos.append([lat, lng, cantidad_eventos])
        return {"puntos": puntos, "localidades_prioritarias": list(COORDENADAS_LOCALIDAD.keys())}
    finally:
        sesion.close()