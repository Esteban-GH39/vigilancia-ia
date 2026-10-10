from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from app.core.seguridad import obtener_usuario_actual
from app.db.base_datos import FabricaSesion, Evento
from app.db.modelos_camara import Camara
from app.constants.localidades import LOCALIDADES_BOGOTA, NOMBRES_LOCALIDADES

router = APIRouter(prefix="/api/analisis", tags=["analisis"])


@router.get("/mapa-calor")
async def mapa_calor(usuario_actual: dict = Depends(obtener_usuario_actual)):
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


@router.get("/resumen-control")
async def resumen_control(usuario_actual: dict = Depends(obtener_usuario_actual)):
    """Agrega datos de cámaras, casos y actividad reciente para el
    Centro de Control Estratégico. Todo se calcula a partir de datos
    que ya existen (cámaras y eventos), sin lógica de IA nueva."""
    sesion = FabricaSesion()
    try:
        ahora = datetime.utcnow()
        hace_24h = ahora - timedelta(hours=24)

        camaras = sesion.query(Camara).all()
        total_camaras = len(camaras)
        camaras_activas = sum(1 for c in camaras if c.estado == "activa")

        eventos_24h = sesion.query(Evento).filter(Evento.marca_tiempo >= hace_24h).all()

        total_eventos = sesion.query(Evento).count()
        pendientes = sesion.query(Evento).filter(Evento.estado_caso == "pendiente").count()
        en_seguimiento = sesion.query(Evento).filter(Evento.estado_caso == "en_seguimiento").count()
        resueltos = sesion.query(Evento).filter(Evento.estado_caso == "resuelto").count()

        serie_horaria = []
        for i in range(23, -1, -1):
            inicio_cubeta = (ahora - timedelta(hours=i)).replace(minute=0, second=0, microsecond=0)
            fin_cubeta = inicio_cubeta + timedelta(hours=1)
            cantidad = sum(1 for e in eventos_24h if inicio_cubeta <= e.marca_tiempo < fin_cubeta)
            serie_horaria.append({"hora": inicio_cubeta.strftime("%H:00"), "cantidad": cantidad})

        ranking_localidades = []
        for localidad in LOCALIDADES_BOGOTA:
            cantidad = sesion.query(Evento).filter(Evento.ubicacion == localidad["nombre"]).count()
            if cantidad > 0:
                ranking_localidades.append({"nombre": localidad["nombre"], "eventos": cantidad})
        ranking_localidades.sort(key=lambda loc: loc["eventos"], reverse=True)
        ranking_localidades = ranking_localidades[:5]

        ultimas_alertas = sesion.query(Evento).order_by(Evento.marca_tiempo.desc()).limit(6).all()

        return {
            "camaras": {"total": total_camaras, "activas": camaras_activas},
            "alertas_24h": len(eventos_24h),
            "casos": {
                "pendientes": pendientes,
                "en_seguimiento": en_seguimiento,
                "resueltos": resueltos,
                "total": total_eventos,
            },
            "serie_horaria": serie_horaria,
            "ranking_localidades": ranking_localidades,
            "ultimas_alertas": [e.a_diccionario() for e in ultimas_alertas],
        }
    finally:
        sesion.close()
