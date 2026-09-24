import csv
import io
from datetime import date, datetime, time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.seguridad import obtener_usuario_actual
from app.db.eventos import obtener_eventos_filtrados

router = APIRouter(prefix="/api/reportes", tags=["reportes"])

FORMATOS_VALIDOS = {"pdf", "csv"}

ENCABEZADOS = ["Fecha", "Localidad", "Nivel de riesgo", "Tipo de evento", "Descripción", "Estado del caso"]


def _obtener_filas(eventos):
    filas = []
    for ev in eventos:
        filas.append([
            datetime.fromisoformat(ev["marca_tiempo"]).strftime("%Y-%m-%d %H:%M"),
            ev["ubicacion"] or "",
            ev["nivel_riesgo"] or "",
            ev["tipo_evento"] or "",
            ev["descripcion"] or "",
            ev["estado_caso"] or "pendiente",
        ])
    return filas


def _generar_csv(eventos) -> io.StringIO:
    buffer = io.StringIO()
    escritor = csv.writer(buffer)
    escritor.writerow(ENCABEZADOS)
    escritor.writerows(_obtener_filas(eventos))
    buffer.seek(0)
    return buffer


def _generar_pdf(eventos, filtros_aplicados: str) -> io.BytesIO:
    buffer = io.BytesIO()
    documento = SimpleDocTemplate(buffer, pagesize=landscape(letter))
    estilos = getSampleStyleSheet()

    elementos = [
        Paragraph("Reporte de Casos — Sistema de Vigilancia IA", estilos["Title"]),
        Paragraph(filtros_aplicados, estilos["Normal"]),
        Spacer(1, 12),
    ]

    datos_tabla = [ENCABEZADOS] + _obtener_filas(eventos)
    tabla = Table(datos_tabla, repeatRows=1)
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f2f2")]),
    ]))
    elementos.append(tabla)

    documento.build(elementos)
    buffer.seek(0)
    return buffer


@router.get("/exportar")
async def exportar_reporte(
    formato: str,
    ubicacion: Optional[str] = None,
    nivel_riesgo: Optional[str] = None,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    if formato not in FORMATOS_VALIDOS:
        raise HTTPException(400, detail="Formato inválido. Usa 'pdf' o 'csv'")

    inicio = datetime.combine(fecha_inicio, time.min) if fecha_inicio else None
    fin = datetime.combine(fecha_fin, time.max) if fecha_fin else None

    eventos = obtener_eventos_filtrados(
        ubicacion=ubicacion,
        nivel_riesgo=nivel_riesgo,
        fecha_inicio=inicio,
        fecha_fin=fin,
    )

    partes_filtro = []
    if ubicacion:
        partes_filtro.append(f"Localidad: {ubicacion}")
    if nivel_riesgo:
        partes_filtro.append(f"Nivel de riesgo: {nivel_riesgo}")
    if fecha_inicio:
        partes_filtro.append(f"Desde: {fecha_inicio}")
    if fecha_fin:
        partes_filtro.append(f"Hasta: {fecha_fin}")
    descripcion_filtros = " | ".join(partes_filtro) if partes_filtro else "Sin filtros aplicados"

    marca = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    if formato == "csv":
        buffer = _generar_csv(eventos)
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=reporte_{marca}.csv"},
        )

    buffer = _generar_pdf(eventos, descripcion_filtros)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=reporte_{marca}.pdf"},
    )