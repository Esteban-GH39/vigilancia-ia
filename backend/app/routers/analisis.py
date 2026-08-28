from fastapi import APIRouter
from app.db.base_datos import FabricaSesion, Evento
from app.db.modelos_camara import Camara
from app.constants.localidades import LOCALIDADES_BOGOTA, NOMBRES_LOCALIDADES

router = APIRouter(prefix="/api/analisis", tags=["analisis"])


@router.get("/mapa-calor")
async def mapa_calor():
    sesion = FabricaSesion()
    try:
        localidades_con_eventos = []
        puntos = []

        for localidad in LOCALIDADES_BOGOTA:
            cantidad_eventos = sesion.query(Evento).filter(
                Evento.ubicacion == localidad["nombre"]
            ).count()

            localidades_con_eventos.append({**localidad, "eventos": cantidad_eventos})

            if cantidad_eventos > 0:
                puntos.append([localidad["latitud"], localidad["longitud"], cantidad_eventos])

        camaras = sesion.query(Camara).all()
        for camara in camaras:
            si_tiene_coordenadas = camara.latitud is not None and camara.longitud is not None
            si_es_localidad_conocida = camara.ubicacion in NOMBRES_LOCALIDADES
            if si_tiene_coordenadas and not si_es_localidad_conocida:
                cantidad_eventos = sesion.query(Evento).filter(
                    Evento.ubicacion == camara.ubicacion
                ).count()
                if cantidad_eventos > 0:
                    puntos.append([camara.latitud, camara.longitud, cantidad_eventos])

        localidades_prioritarias = [
            loc["nombre"] for loc in sorted(
                localidades_con_eventos, key=lambda l: l["eventos"], reverse=True
            ) if loc["eventos"] > 0
        ][:5]

        return {
            "puntos": puntos,
            "localidades": localidades_con_eventos,
            "localidades_prioritarias": localidades_prioritarias,
        }
    finally:
        sesion.close()
