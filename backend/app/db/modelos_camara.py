from sqlalchemy import Column, Integer, String, Float, Boolean
from app.db.base_datos import Base, motor

class Camara(Base):
    __tablename__ = "camaras"

    id_camara = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False)
    ubicacion = Column(String(100), nullable=False)
    tipo = Column(String(20), default="IP")
    fuente = Column(String(200), default="0")
    estado = Column(String(20), default="inactiva")
    latitud = Column(Float, nullable=True)
    longitud = Column(Float, nullable=True)

Base.metadata.create_all(motor)