"""
Bot RPA — Generacion y entrega automatica de reportes + escalamiento de casos.

Que hace (proceso robotizado, basado en reglas, que imita lo que haria una
persona a mano todas las noches). Es un script independiente del servidor:
consume la API del sistema como lo haria cualquier usuario, no modifica
nada de la logica de IA ni del backend.

  1. Se autentica contra la propia API del sistema (usuario de servicio).
  2. Descarga el reporte PDF del dia usando el endpoint de Reportes que
     ya existe (GET /api/reportes/exportar).
  3. Lo guarda en almacenamiento/rpa/reportes/ y si hay SMTP configurado,
     lo envia por correo.
  4. Revisa la base de datos y arma un resumen de casos "pendiente" con
     mas de X horas sin gestion (escalamiento).
  5. Deja constancia de cada corrida en almacenamiento/rpa/bot.log y en
     la terminal.

Uso (parado en la carpeta backend/):
    python -m rpa.bot_reportes            # deja el bot corriendo con el scheduler
    python -m rpa.bot_reportes --ahora    # ejecuta un ciclo completo YA y termina
                                           # (sirve para demostrarlo en vivo)

Variables de entorno (todas opcionales, tienen un valor por defecto):
    RPA_API_URL             http://localhost:8000  (o la URL de Render)
    RPA_USUARIO             usuario del bot (se crea solo si no existe)
    RPA_CONTRASENA          contraseña del bot
    RPA_HORA_REPORTE        "23:00"  hora diaria de generacion del reporte
    RPA_HORAS_ESCALAMIENTO  "24"     horas sin gestion para escalar un caso
    RPA_SMTP_HOST / RPA_SMTP_PUERTO / RPA_SMTP_USUARIO / RPA_SMTP_CONTRASENA
    RPA_SMTP_DESTINATARIO   a quien se le manda el correo
"""

import argparse
import logging
import os
import smtplib
import sys
import time
from datetime import datetime, timedelta
from email.message import EmailMessage
from pathlib import Path

import requests
import schedule

DIRECTORIO_BACKEND = Path(__file__).resolve().parent.parent  # .../backend
sys.path.insert(0, str(DIRECTORIO_BACKEND))

import configuracion  # noqa: E402
from app.db.base_datos import FabricaSesion, Evento  # noqa: E402

# ---------------------------------------------------------------- Config

API_URL = os.getenv("RPA_API_URL", f"http://localhost:{configuracion.PUERTO_API}")
RPA_USUARIO = os.getenv("RPA_USUARIO", "rpa_bot")
RPA_CONTRASENA = os.getenv("RPA_CONTRASENA", "rpa_bot_2026")
HORA_REPORTE = os.getenv("RPA_HORA_REPORTE", "23:00")
HORAS_ESCALAMIENTO = float(os.getenv("RPA_HORAS_ESCALAMIENTO", "24"))

SMTP_HOST = os.getenv("RPA_SMTP_HOST")
SMTP_PUERTO = int(os.getenv("RPA_SMTP_PUERTO", "587"))
SMTP_USUARIO = os.getenv("RPA_SMTP_USUARIO")
SMTP_CONTRASENA = os.getenv("RPA_SMTP_CONTRASENA")
SMTP_DESTINATARIO = os.getenv("RPA_SMTP_DESTINATARIO")

CARPETA_RPA = DIRECTORIO_BACKEND / "almacenamiento" / "rpa"
CARPETA_REPORTES = CARPETA_RPA / "reportes"
CARPETA_REPORTES.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(CARPETA_RPA / "bot.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("rpa")


# ---------------------------------------------------------------- Setup

def asegurar_usuario_bot():
    """Crea el usuario de servicio del bot si todavia no existe, ya aprobado
    (no necesita pasar por el flujo de aprobacion del admin: es una cuenta
    tecnica de solo lectura, rol visualizador)."""
    from app.db.repositorio_usuarios import crear_usuario
    from app.db.modelos_usuario import Usuario

    sesion = FabricaSesion()
    try:
        existe = sesion.query(Usuario).filter(Usuario.usuario == RPA_USUARIO.lower()).first()
    finally:
        sesion.close()

    if existe:
        return

    crear_usuario(RPA_USUARIO, "Bot RPA de Reportes", RPA_CONTRASENA, rol="visualizador", estado="aprobado")
    log.info("Usuario de servicio '%s' creado (rol visualizador, auto-aprobado)", RPA_USUARIO)


def autenticarse() -> str:
    respuesta = requests.post(
        f"{API_URL}/api/auth/login",
        json={"usuario": RPA_USUARIO, "contrasena": RPA_CONTRASENA},
        timeout=15,
    )
    respuesta.raise_for_status()
    return respuesta.json()["token"]


# ---------------------------------------------------------------- Job 1: Reporte diario

def generar_y_entregar_reporte():
    log.info("— Iniciando ciclo de generación de reporte —")
    try:
        token = autenticarse()
    except Exception as error:
        log.error("No se pudo autenticar el bot contra la API (%s): %s", API_URL, error)
        return

    try:
        respuesta = requests.get(
            f"{API_URL}/api/reportes/exportar",
            params={"formato": "pdf"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=60,
        )
        respuesta.raise_for_status()
    except Exception as error:
        log.error("No se pudo descargar el reporte: %s", error)
        return

    marca = datetime.now().strftime("%Y%m%d_%H%M%S")
    ruta_pdf = CARPETA_REPORTES / f"reporte_{marca}.pdf"
    ruta_pdf.write_bytes(respuesta.content)
    log.info("Reporte guardado en %s (%d KB)", ruta_pdf, len(respuesta.content) // 1024)

    if SMTP_HOST and SMTP_DESTINATARIO:
        enviar_correo(
            asunto=f"Reporte diario Vigilancia IA — {datetime.now().strftime('%d/%m/%Y')}",
            cuerpo="Adjunto el reporte automático generado por el bot RPA del sistema.",
            adjunto=ruta_pdf,
        )
    else:
        log.info("SMTP no configurado: el reporte queda guardado localmente, no se envía correo.")


# ---------------------------------------------------------------- Job 2: Escalamiento de casos

def revisar_casos_pendientes():
    log.info("— Revisando casos pendientes para escalamiento —")
    limite = datetime.utcnow() - timedelta(hours=HORAS_ESCALAMIENTO)

    sesion = FabricaSesion()
    try:
        vencidos = (
            sesion.query(Evento)
            .filter(Evento.estado_caso == "pendiente", Evento.marca_tiempo <= limite)
            .order_by(Evento.marca_tiempo.asc())
            .all()
        )
        vencidos = [e.a_diccionario() for e in vencidos]
    finally:
        sesion.close()

    if not vencidos:
        log.info("Sin casos pendientes vencidos (umbral: %.0fh).", HORAS_ESCALAMIENTO)
        return

    log.warning("%d caso(s) pendiente(s) hace más de %.0fh sin gestión:", len(vencidos), HORAS_ESCALAMIENTO)
    lineas = []
    for ev in vencidos:
        linea = f"  #{ev['id']} · {ev['ubicacion']} · {ev['nivel_riesgo']} · desde {ev['marca_tiempo']}"
        log.warning(linea)
        lineas.append(linea)

    if SMTP_HOST and SMTP_DESTINATARIO:
        enviar_correo(
            asunto=f"{len(vencidos)} caso(s) sin gestionar — Vigilancia IA",
            cuerpo="Los siguientes casos llevan pendientes más de "
                   f"{HORAS_ESCALAMIENTO:.0f}h sin que nadie los gestione:\n\n" + "\n".join(lineas),
        )


# ---------------------------------------------------------------- Correo

def enviar_correo(asunto: str, cuerpo: str, adjunto: Path = None):
    try:
        mensaje = EmailMessage()
        mensaje["Subject"] = asunto
        mensaje["From"] = SMTP_USUARIO
        mensaje["To"] = SMTP_DESTINATARIO
        mensaje.set_content(cuerpo)

        if adjunto is not None:
            mensaje.add_attachment(
                adjunto.read_bytes(),
                maintype="application",
                subtype="pdf",
                filename=adjunto.name,
            )

        with smtplib.SMTP(SMTP_HOST, SMTP_PUERTO) as servidor:
            servidor.starttls()
            servidor.login(SMTP_USUARIO, SMTP_CONTRASENA)
            servidor.send_message(mensaje)

        log.info("Correo enviado a %s", SMTP_DESTINATARIO)
    except Exception as error:
        log.error("No se pudo enviar el correo: %s", error)


# ---------------------------------------------------------------- Ciclo completo / main

def ejecutar_ciclo_completo():
    asegurar_usuario_bot()
    generar_y_entregar_reporte()
    revisar_casos_pendientes()


def main():
    parser = argparse.ArgumentParser(description="Bot RPA de reportes y escalamiento")
    parser.add_argument("--ahora", action="store_true", help="Ejecuta un ciclo completo inmediatamente y termina")
    args = parser.parse_args()

    log.info("Bot RPA iniciado — API: %s | usuario: %s", API_URL, RPA_USUARIO)

    if args.ahora:
        ejecutar_ciclo_completo()
        return

    asegurar_usuario_bot()
    schedule.every().day.at(HORA_REPORTE).do(generar_y_entregar_reporte)
    schedule.every(2).hours.do(revisar_casos_pendientes)

    log.info("Programado: reporte diario a las %s | revisión de escalamiento cada 2h", HORA_REPORTE)
    while True:
        schedule.run_pending()
        time.sleep(30)


if __name__ == "__main__":
    main()
