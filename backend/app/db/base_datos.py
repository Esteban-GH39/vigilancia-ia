from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import configuracion

Base = declarative_base()

class Evento(Base):

    __tablename__ = "eventos"
    
    id = Column(Integer, primary_key=True)
    marca_tiempo = Column(DateTime, default=datetime.utcnow)
    tipo_evento = Column(String(50))      
    nivel_riesgo = Column(String(20))     
    confianza = Column(Float)
    ubicacion = Column(String(100))
    descripcion = Column(Text)
    ruta_video = Column(String(200))
    cantidad_personas = Column(Integer)
    alerta_enviada = Column(Boolean, default=False)
    
    def a_diccionario(self):

        return {
            "id": self.id,
            "marca_tiempo": self.marca_tiempo.isoformat(),
            "tipo_evento": self.tipo_evento,
            "nivel_riesgo": self.nivel_riesgo,
            "confianza": self.confianza,
            "ubicacion": self.ubicacion,
            "descripcion": self.descripcion,
            "ruta_video": self.ruta_video,
            "cantidad_personas": self.cantidad_personas,
            "alerta_enviada": self.alerta_enviada
        }

class PersonaRastreada(Base):

    __tablename__ = "personas_rastreadas"
    
    id = Column(Integer, primary_key=True)
    id_rastreo = Column(String(50), unique=True)
    primera_deteccion = Column(DateTime, default=datetime.utcnow)
    ultima_deteccion = Column(DateTime, default=datetime.utcnow)
    total_frames = Column(Integer, default=0)
    velocidad_promedio = Column(Float)
    velocidad_maxima = Column(Float)
    tipo_comportamiento = Column(String(50))
    ruta_miniatura = Column(String(200))

motor = create_engine(configuracion.URL_BASE_DATOS)
Base.metadata.create_all(motor)
FabricaSesion = sessionmaker(bind=motor)

def obtener_sesion():

    sesion = FabricaSesion()
    try:
        yield sesion
    finally:
        sesion.close()

def guardar_evento(datos_evento):

    sesion = FabricaSesion()
    try:
        evento = Evento(**datos_evento)
        sesion.add(evento)
        sesion.commit()
        sesion.refresh(evento)
        print(f"{configuracion.MENSAJES['evento_guardado']} - ID: {evento.id}")
        return evento
    finally:
        sesion.close()

def obtener_eventos_recientes(limite=10):

    sesion = FabricaSesion()
    try:
        eventos = sesion.query(Evento).order_by(
            Evento.marca_tiempo.desc()
        ).limit(limite).all()
        return [evento.a_diccionario() for evento in eventos]
    finally:
        sesion.close()

def obtener_estadisticas_eventos():

    sesion = FabricaSesion()
    try:
        total_eventos = sesion.query(Evento).count()
        eventos_alto_riesgo = sesion.query(Evento).filter(
            Evento.nivel_riesgo == "ALTO"
        ).count()
        eventos_medio_riesgo = sesion.query(Evento).filter(
            Evento.nivel_riesgo == "MEDIO"
        ).count()
        eventos_bajo_riesgo = sesion.query(Evento).filter(
            Evento.nivel_riesgo == "BAJO"
        ).count()
        
        return {
            "total": total_eventos,
            "alto": eventos_alto_riesgo,
            "medio": eventos_medio_riesgo,
            "bajo": eventos_bajo_riesgo
        }
    finally:
        sesion.close()
