LOCALIDADES_BOGOTA = [
    {"nombre": "Usaquén", "latitud": 4.7030, "longitud": -74.0300},
    {"nombre": "Chapinero", "latitud": 4.6488, "longitud": -74.0628},
    {"nombre": "Santa Fe", "latitud": 4.6050, "longitud": -74.0700},
    {"nombre": "San Cristóbal", "latitud": 4.5570, "longitud": -74.0850},
    {"nombre": "Kennedy", "latitud": 4.6280, "longitud": -74.1631},
    {"nombre": "Fontibón", "latitud": 4.6710, "longitud": -74.1460},
    {"nombre": "Engativá", "latitud": 4.7100, "longitud": -74.1130},
    {"nombre": "Suba", "latitud": 4.7420, "longitud": -74.0930},
    {"nombre": "Barrios Unidos", "latitud": 4.6670, "longitud": -74.0840},
    {"nombre": "Puente Aranda", "latitud": 4.6160, "longitud": -74.1160},
    {"nombre": "Rafael Uribe Uribe", "latitud": 4.5580, "longitud": -74.1160},
    {"nombre": "Ciudad Bolívar", "latitud": 4.5000, "longitud": -74.1600},
]

NOMBRES_LOCALIDADES = [loc["nombre"] for loc in LOCALIDADES_BOGOTA]


def coordenadas_de(nombre_localidad):
    for loc in LOCALIDADES_BOGOTA:
        if loc["nombre"] == nombre_localidad:
            return loc["latitud"], loc["longitud"]
    return None, None
