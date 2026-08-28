from app.db.base_datos import FabricaSesion
from app.db.modelos_camara import Camara


def crear_camara(nombre: str, ubicacion: str, tipo: str = "IP",
                fuente: str = "0", latitud: float = None, longitud: float = None) -> dict:
    sesion = FabricaSesion()
    try:
        camara = Camara(nombre=nombre, ubicacion=ubicacion, tipo=tipo,
                        fuente=fuente, latitud=latitud, longitud=longitud)
        sesion.add(camara)
        sesion.commit()
        sesion.refresh(camara)
        return _a_diccionario(camara)
    finally:
        sesion.close()


def listar_camaras() -> list[dict]:
    sesion = FabricaSesion()
    try:
        return [_a_diccionario(c) for c in sesion.query(Camara).all()]
    finally:
        sesion.close()


def editar_camara(id_camara: int, **cambios) -> dict | None:
    sesion = FabricaSesion()
    try:
        camara = sesion.query(Camara).filter(Camara.id_camara == id_camara).first()
        if not camara:
            return None
        for campo, valor in cambios.items():
            if valor is not None and hasattr(camara, campo):
                setattr(camara, campo, valor)
        sesion.commit()
        sesion.refresh(camara)
        return _a_diccionario(camara)
    finally:
        sesion.close()


def eliminar_camara(id_camara: int) -> bool:
    sesion = FabricaSesion()
    try:
        camara = sesion.query(Camara).filter(Camara.id_camara == id_camara).first()
        if not camara:
            return False
        sesion.delete(camara)
        sesion.commit()
        return True
    finally:
        sesion.close()


def _a_diccionario(camara: Camara) -> dict:
    return {
        "id_camara": camara.id_camara,
        "nombre": camara.nombre,
        "ubicacion": camara.ubicacion,
        "tipo": camara.tipo,
        "fuente": camara.fuente,
        "estado": camara.estado,
        "latitud": camara.latitud,
        "longitud": camara.longitud,
    }