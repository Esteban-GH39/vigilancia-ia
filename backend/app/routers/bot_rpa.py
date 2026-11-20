import json
import os
import subprocess
import sys
import re
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query

from fastapi.responses import FileResponse

from app.core.seguridad import requiere_rol

from app.db.eventos import obtener_casos_pendientes_vencidos

router = APIRouter(prefix="/api/rpa", tags=["rpa"])

CARPETA_RPA = Path(__file__).resolve().parents[2] / "almacenamiento" / "rpa"
CARPETA_REPORTES = CARPETA_RPA / "reportes"
ARCHIVO_LOG = CARPETA_RPA / "bot.log"
ARCHIVO_HISTORIAL = CARPETA_RPA / "historial.jsonl"

DIRECTORIO_BACKEND = Path(__file__).resolve().parents[2]

# Los reportes del bot se llaman reporte_AAAAMMDD_HHMMSS.pdf
PATRON_NOMBRE_REPORTE = re.compile(r"reporte_\d{8}_\d{6}\.pdf")

HORAS_ESCALAMIENTO = float(os.getenv("RPA_HORAS_ESCALAMIENTO", "24"))

# Guarda el proceso del bot lanzado desde la API (None si no hay ninguno)
_proceso_actual = None


def _bot_ejecutando() -> bool:
    return _proceso_actual is not None and _proceso_actual.poll() is None

def _fecha_modificacion(ruta: Path) -> str:
    return datetime.fromtimestamp(ruta.stat().st_mtime).isoformat()


@router.get("/estado")
async def estado_bot(usuario_actual: dict = Depends(requiere_rol("admin", "operador"))):
    ultima_actividad = _fecha_modificacion(ARCHIVO_LOG) if ARCHIVO_LOG.exists() else None

    pdfs = []
    if CARPETA_REPORTES.exists():
        pdfs = sorted(
            CARPETA_REPORTES.glob("reporte_*.pdf"),
            key=lambda ruta: ruta.stat().st_mtime,
            reverse=True,
        )

    return {
        "ultima_actividad": ultima_actividad,
        "ultimo_reporte": _fecha_modificacion(pdfs[0]) if pdfs else None,
        "total_reportes": len(pdfs),
        "hora_reporte": os.getenv("RPA_HORA_REPORTE", "23:00"),
        "horas_escalamiento": HORAS_ESCALAMIENTO,
        "ejecutando": _bot_ejecutando(),
    }

@router.post("/ejecutar")
async def ejecutar_bot(usuario_actual: dict = Depends(requiere_rol("admin", "operador"))):
    global _proceso_actual

    if _bot_ejecutando():
        raise HTTPException(409, detail="El bot ya se está ejecutando, espera a que termine")

    _proceso_actual = subprocess.Popen(
        [sys.executable, "-m", "rpa.bot_reportes", "--ahora"],
        cwd=DIRECTORIO_BACKEND,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return {"mensaje": "Ejecución del bot iniciada"}

@router.get("/historial")
async def historial_bot(
    limite: int = Query(50, ge=1, le=500),
    usuario_actual: dict = Depends(requiere_rol("admin", "operador")),
):
    if not ARCHIVO_HISTORIAL.exists():
        return []

    registros = []
    with open(ARCHIVO_HISTORIAL, encoding="utf-8") as archivo:
        for linea in archivo:
            linea = linea.strip()
            if not linea:
                continue
            try:
                registros.append(json.loads(linea))
            except json.JSONDecodeError:
                continue  # línea dañada o a medio escribir: se ignora

    registros.reverse()  # los más recientes primero
    return registros[:limite]

@router.get("/reportes")
async def listar_reportes(
    limite: int = Query(50, ge=1, le=500),
    usuario_actual: dict = Depends(requiere_rol("admin", "operador")),
):
    if not CARPETA_REPORTES.exists():
        return []

    archivos = sorted(
        CARPETA_REPORTES.glob("reporte_*.pdf"),
        key=lambda ruta: ruta.stat().st_mtime,
        reverse=True,
    )
    return [
        {
            "nombre": ruta.name,
            "fecha": _fecha_modificacion(ruta),
            "tamano_kb": max(1, ruta.stat().st_size // 1024),
        }
        for ruta in archivos[:limite]
    ]


@router.get("/reportes/{nombre}")
async def obtener_reporte(
    nombre: str,
    usuario_actual: dict = Depends(requiere_rol("admin", "operador")),
):
    if not PATRON_NOMBRE_REPORTE.fullmatch(nombre):
        raise HTTPException(400, detail="Nombre de reporte inválido")

    ruta = CARPETA_REPORTES / nombre
    if not ruta.is_file():
        raise HTTPException(404, detail="Reporte no encontrado")

    return FileResponse(ruta, media_type="application/pdf")

@router.get("/pendientes")
async def casos_pendientes(usuario_actual: dict = Depends(requiere_rol("admin", "operador"))):
    ahora = datetime.utcnow()
    casos = obtener_casos_pendientes_vencidos(HORAS_ESCALAMIENTO)

    for caso in casos:
        antiguedad = ahora - datetime.fromisoformat(caso["marca_tiempo"])
        caso["horas_pendiente"] = round(antiguedad.total_seconds() / 3600, 1)

    return {
        "umbral_horas": HORAS_ESCALAMIENTO,
        "total": len(casos),
        "casos": casos,
    }