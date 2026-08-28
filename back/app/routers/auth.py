# Contraseñas hasheadas y lógica de login, si llegamos a usar datos reales cambiamos a JWT con expiración y refresh

import secrets
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from passlib.hash import bcrypt

router = APIRouter(prefix="/api/auth", tags=["auth"])

_USUARIOS_DEMO = {
    "admin": {"hash": bcrypt.hash("admin123"), "rol": "Administrador"},
    "operador": {"hash": bcrypt.hash("oper2024"), "rol": "Operador de Monitoreo"},
}

_sesiones_activas: dict[str, str] = {}  

class LoginRequest(BaseModel):
    usuario: str
    contrasena: str

@router.post("/login")
async def login(datos: LoginRequest):
    cuenta = _USUARIOS_DEMO.get(datos.usuario.lower())
    if not cuenta or not bcrypt.verify(datos.contrasena, cuenta["hash"]):
        raise HTTPException(401, detail="Usuario o contraseña incorrectos")

    token = secrets.token_urlsafe(32)
    _sesiones_activas[token] = datos.usuario
    return {"token": token, "rol": cuenta["rol"], "usuario": datos.usuario}

@router.post("/logout")
async def logout(token: str):
    _sesiones_activas.pop(token, None)
    return {"mensaje": "Sesión cerrada"}