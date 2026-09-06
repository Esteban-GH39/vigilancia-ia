from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from app.core.seguridad import crear_token
from app.db.repositorio_usuarios import crear_usuario, verificar_credenciales

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    usuario: str
    contrasena: str


class RegistroRequest(BaseModel):
    usuario: str
    nombre: str
    contrasena: str

    @field_validator("usuario")
    @classmethod
    def usuario_valido(cls, v):
        v = v.strip()
        if len(v) < 3:
            raise ValueError("El usuario debe tener al menos 3 caracteres")
        return v

    @field_validator("contrasena")
    @classmethod
    def contrasena_valida(cls, v):
        if len(v) < 6:
            raise ValueError("La contraseña debe tener al menos 6 caracteres")
        return v


@router.post("/login")
async def login(datos: LoginRequest):
    cuenta = verificar_credenciales(datos.usuario, datos.contrasena)

    if cuenta is None:
        raise HTTPException(401, detail="Usuario o contraseña incorrectos")

    if cuenta["estado"] == "pendiente":
        raise HTTPException(403, detail="Tu cuenta está pendiente de aprobación por un administrador")

    if cuenta["estado"] == "rechazado":
        raise HTTPException(403, detail="Tu solicitud de acceso fue rechazada. Contacta a un administrador")

    token = crear_token(cuenta["usuario"], cuenta["rol"])
    return {"token": token, "rol": cuenta["rol"], "usuario": cuenta["usuario"], "nombre": cuenta["nombre"]}


@router.post("/registro")
async def registro(datos: RegistroRequest):
    try:
        crear_usuario(datos.usuario, datos.nombre, datos.contrasena)
    except ValueError as error:
        raise HTTPException(400, detail=str(error))

    return {"mensaje": "Solicitud enviada. Un administrador debe aprobar tu cuenta antes de que puedas iniciar sesión."}


@router.post("/logout")
async def logout():
    return {"mensaje": "Sesión cerrada"}
