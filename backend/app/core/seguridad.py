from datetime import datetime, timedelta
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import JWT_SECRET_KEY, JWT_ALGORITMO, JWT_MINUTOS_EXPIRACION

_esquema_bearer = HTTPBearer(auto_error=False)


def crear_token(usuario: str, rol: str) -> str:
    expiracion = datetime.utcnow() + timedelta(minutes=JWT_MINUTOS_EXPIRACION)
    payload = {"sub": usuario, "rol": rol, "exp": expiracion}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITMO)


def _decodificar_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITMO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, detail="La sesión expiró, inicia sesión de nuevo")
    except jwt.InvalidTokenError:
        raise HTTPException(401, detail="Token inválido")


async def obtener_usuario_actual(credenciales: HTTPAuthorizationCredentials = Depends(_esquema_bearer)) -> dict:
    if credenciales is None:
        raise HTTPException(401, detail="No autenticado")

    payload = _decodificar_token(credenciales.credentials)
    return {"usuario": payload["sub"], "rol": payload["rol"]}


def requiere_rol(*roles_permitidos: str):
    async def verificador(usuario_actual: dict = Depends(obtener_usuario_actual)) -> dict:
        if usuario_actual["rol"] not in roles_permitidos:
            raise HTTPException(
                403,
                detail=f"Tu rol ({usuario_actual['rol']}) no tiene permiso para esta acción",
            )
        return usuario_actual

    return verificador
