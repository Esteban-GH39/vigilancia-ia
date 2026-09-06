from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.db.base_datos import Base, motor

ROLES_VALIDOS = {"admin", "operador", "visualizador"}
ESTADOS_VALIDOS = {"pendiente", "aprobado", "rechazado"}


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    usuario = Column(String(50), unique=True, index=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    contrasena_hash = Column(String(200), nullable=False)
    rol = Column(String(20), default="visualizador", nullable=False)
    estado = Column(String(20), default="pendiente", nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)

    def a_diccionario(self):
        return {
            "id": self.id,
            "usuario": self.usuario,
            "nombre": self.nombre,
            "rol": self.rol,
            "estado": self.estado,
            "fecha_creacion": self.fecha_creacion.isoformat() if self.fecha_creacion else None,
        }


Base.metadata.create_all(motor)
