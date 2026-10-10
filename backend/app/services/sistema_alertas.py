from datetime import datetime, timedelta
import json
import sys
sys.path.append('..')
import configuracion

class SistemaAlertas:

    def __init__(self):

        self.historial_alertas = []
        self.ultima_alerta_por_tipo = {}
        self.contador_alertas = 0
        
    def debe_enviar_alerta(self, tipo_evento, nivel_riesgo):

        if nivel_riesgo == 'BAJO':
            return False

        ahora = datetime.now()
        ultima_vez = self.ultima_alerta_por_tipo.get(tipo_evento)
        
        if ultima_vez:
            diferencia_tiempo = (ahora - ultima_vez).total_seconds()
            if diferencia_tiempo < configuracion.TIEMPO_ESPERA_ALERTAS:
                return False
        
        return True
    
    def generar_alerta(self, datos_evento, ruta_video=None):

        id_alerta = f"ALERTA_{self.contador_alertas:06d}"
        self.contador_alertas += 1
        
        alerta = {
            'id': id_alerta,
            'marca_tiempo': datetime.now().isoformat(),
            'tipo_evento': datos_evento.get('tipo_evento', 'desconocido'),
            'nivel_riesgo': datos_evento.get('nivel_riesgo', 'BAJO'),
            'puntuacion_riesgo': datos_evento.get('puntuacion_riesgo', 0.0),
            'descripcion': datos_evento.get('descripcion', ''),
            'ubicacion': datos_evento.get('ubicacion', 'Cámara 1'),
            'cantidad_personas': datos_evento.get('cantidad_personas', 0),
            'ruta_video': ruta_video,
            'acciones_tomadas': []
        }

        self.historial_alertas.append(alerta)
        self.ultima_alerta_por_tipo[alerta['tipo_evento']] = datetime.now()

        if alerta['nivel_riesgo'] == 'ALTO':
            self._manejar_alerta_alta(alerta)
        elif alerta['nivel_riesgo'] == 'MEDIO':
            self._manejar_alerta_media(alerta)
        
        return alerta
    
    def _manejar_alerta_alta(self, alerta):

        print(f"\n{'='*60}")
        print(f"{configuracion.MENSAJES['alerta_critica']}")
        print(f"{'='*60}")
        print(f"🆔 ID: {alerta['id']}")
        print(f"📋 Tipo: {alerta['tipo_evento']}")
        print(f"📝 Descripción: {alerta['descripcion']}")
        print(f"📍 Ubicación: {alerta['ubicacion']}")
        print(f"📊 Puntuación: {alerta['puntuacion_riesgo']:.2f}")
        print(f"👥 Personas: {alerta['cantidad_personas']}")
        print(f"⏰ Hora: {alerta['marca_tiempo']}")
        print(f"{'='*60}\n")
        
        acciones = []

        if configuracion.HABILITAR_SMS:
            sms_enviado = self._enviar_sms(alerta)
            acciones.append(f"SMS: {'✅ Enviado' if sms_enviado else '❌ Error'}")
        else:
            acciones.append("SMS: ⚠️ Deshabilitado en configuración")

        if configuracion.HABILITAR_EMAIL:
            email_enviado = self._enviar_email(alerta)
            acciones.append(f"Email: {'✅ Enviado' if email_enviado else '❌ Error'}")
        else:
            acciones.append("Email: ⚠️ Deshabilitado en configuración")

        acciones.append("Push: ✅ Enviada a unidades móviles")

        acciones.append("Protocolo: ✅ Unidades despachadas")
        
        alerta['acciones_tomadas'] = acciones

        print("📢 ACCIONES EJECUTADAS:")
        for accion in acciones:
            print(f"   • {accion}")
        print()
    
    def _manejar_alerta_media(self, alerta):

        print(f"\n{configuracion.MENSAJES['alerta_media']}")
        print(f"🆔 ID: {alerta['id']}")
        print(f"📋 Tipo: {alerta['tipo_evento']}")
        print(f"📝 Descripción: {alerta['descripcion']}")
        print(f"📍 Ubicación: {alerta['ubicacion']}\n")
        
        acciones = []

        if configuracion.HABILITAR_EMAIL:
            email_enviado = self._enviar_email(alerta)
            acciones.append(f"Email: {'✅ Enviado' if email_enviado else '❌ Error'}")
        else:
            acciones.append("Email: ⚠️ Deshabilitado")

        acciones.append("Registro: ✅ Guardado en base de datos")
        
        alerta['acciones_tomadas'] = acciones
    
    def _enviar_sms(self, alerta):

        mensaje = f"ALERTA {alerta['nivel_riesgo']}: {alerta['descripcion']}"
        print(f"📱 SMS Simulado: {mensaje}")
        return True
    
    def _enviar_email(self, alerta):

        asunto = f"⚠️ Alerta de Seguridad - {alerta['nivel_riesgo']}"
        cuerpo = f"""
        ╔══════════════════════════════════════════╗
        ║      ALERTA DE SEGURIDAD DETECTADA       ║
        ╚══════════════════════════════════════════╝
        
        ID Alerta: {alerta['id']}
        Fecha/Hora: {alerta['marca_tiempo']}
        
        Tipo de Evento: {alerta['tipo_evento']}
        Nivel de Riesgo: {alerta['nivel_riesgo']}
        Puntuación: {alerta['puntuacion_riesgo']:.2f}
        
        Descripción: {alerta['descripcion']}
        
        Ubicación: {alerta['ubicacion']}
        Personas Involucradas: {alerta['cantidad_personas']}
        
        {'Video Adjunto: ' + alerta['ruta_video'] if alerta['ruta_video'] else 'Sin video'}
        
        ═══════════════════════════════════════════
        Este es un mensaje automático del Sistema
        de Vigilancia con Inteligencia Artificial
        ═══════════════════════════════════════════
        """
        
        print(f"📧 Email Simulado:")
        print(f"   Asunto: {asunto}")
        print(f"   Destinatario: seguridad@empresa.com")
        return True
    
    def obtener_alertas_recientes(self, limite=10):

        return self.historial_alertas[-limite:]
    
    def obtener_estadisticas_alertas(self):

        if not self.historial_alertas:
            return {
                'total': 0,
                'por_nivel': {},
                'por_tipo': {}
            }
        
        estadisticas = {
            'total': len(self.historial_alertas),
            'por_nivel': {},
            'por_tipo': {}
        }
        
        for alerta in self.historial_alertas:

            nivel = alerta['nivel_riesgo']
            estadisticas['por_nivel'][nivel] = estadisticas['por_nivel'].get(nivel, 0) + 1

            tipo = alerta['tipo_evento']
            estadisticas['por_tipo'][tipo] = estadisticas['por_tipo'].get(tipo, 0) + 1
        
        return estadisticas
    
    def limpiar_historial(self, dias=30):

        fecha_limite = datetime.now() - timedelta(days=dias)
        
        self.historial_alertas = [
            alerta for alerta in self.historial_alertas
            if datetime.fromisoformat(alerta['marca_tiempo']) > fecha_limite
        ]
        
        print(f"🧹 Historial limpiado. Alertas mantenidas: {len(self.historial_alertas)}")