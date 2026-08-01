/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║  SISTEMA DE VIGILANCIA CON IA - APLICACIÓN FRONTEND       ║
 * ║  Universidad Central - Práctica de Ingeniería III         ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const BASE_API = 'http://localhost:8000/api';
let websocket = null;
let intervaloEstado = null;
let intervaloEventos = null;
let layoutActual = 1;

// ============================================
// LOGIN / SESIÓN
// ============================================

function iniciarSesion() {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const errorEl = document.getElementById('login-error');

    if (!user || !pass) {
        errorEl.textContent = 'Por favor completa todos los campos.';
        errorEl.style.display = 'block';
        return;
    }

    // Credenciales simples por defecto (pendiente personalización o integración real segun la necesidad)
    const USUARIOS = {
        'admin':    { pass: 'admin123',   rol: 'Administrador' },
        'operador': { pass: 'oper2024',   rol: 'Operador de Monitoreo' },
        'analista': { pass: 'ana2024',    rol: 'Analista de Datos' },
        'supervisor':{ pass: 'sup2024',   rol: 'Supervisor' },
    };

    const cuenta = USUARIOS[user.toLowerCase()];
    if (cuenta && cuenta.pass === pass) {
        errorEl.style.display = 'none';
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        document.getElementById('topbar-username').textContent = user;
        document.getElementById('topbar-role').textContent = cuenta.rol;

        // Iniciar carga de datos después del login
        cargarEventos();
        cargarAlertas();
        iniciarActualizacionEstado();
        console.log(`✅ Sesión iniciada: ${user} (${cuenta.rol})`);
    } else {
        errorEl.textContent = 'Usuario o contraseña incorrectos.';
        errorEl.style.display = 'block';
    }
}

function cerrarSesion() {
    // Detener vigilancia si está activa
    if (websocket) { websocket.close(); websocket = null; }
    if (intervaloEstado)  { clearInterval(intervaloEstado);  intervaloEstado = null; }
    if (intervaloEventos) { clearInterval(intervaloEventos); intervaloEventos = null; }

    document.getElementById('app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    console.log('🔒 Sesión cerrada');
}

// Permitir Enter en el campo de contraseña
document.addEventListener('DOMContentLoaded', () => {
    const passInput = document.getElementById('login-pass');
    if (passInput) {
        passInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') iniciarSesion();
        });
    }
    const userInput = document.getElementById('login-user');
    if (userInput) {
        userInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') passInput.focus();
        });
    }
    console.log('🚀 Dashboard inicializado');
});

// ============================================
// NAVEGACIÓN POR VISTAS
// ============================================

function cambiarVista(nombre, itemNav) {
    // Desactivar todos los nav items y ocultar vistas
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));

    // Activar el ítem y la vista correspondiente
    if (itemNav) itemNav.classList.add('active');

    // Mapeo: si la vista de "alertas" es la sidebar item de alertas, muestra view-alertas
    // Si es "reportes", muestra cuadricula de eventos, etc.
    const vistaId = `view-${nombre}`;
    const vista = document.getElementById(vistaId);
    if (vista) {
        vista.classList.add('active');

        if (nombre === 'reportes') cargarEventos();
        if (nombre === 'alertas')  cargarAlertasCompletas();

        if (nombre === 'control') {
            setTimeout(iniciarMapa, 200);
        }
    }
}

// ============================================
// LAYOUT DE CÁMARAS
// ============================================

function cambiarLayout(num, btn) {
    layoutActual = num;

    // Actualizar botones
    document.querySelectorAll('.cam-layout-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const grid = document.getElementById('cam-grid');
    grid.className = `cam-grid layout-${num}`;

    // Mostrar u ocultar celdas según layout
    const celdas = [2, 3, 4, 5, 6, 7, 8, 9];
    const visibles = { 1: 0, 4: 3, 9: 8 };

    celdas.forEach((id, idx) => {
        const el = document.getElementById(`cam-${id}`);
        if (el) el.style.display = idx < (visibles[num] ?? 0) ? '' : 'none';
    });
}

// ============================================
// CONTROL DE VIGILANCIA (LÓGICA ORIGINAL)
// ============================================

async function iniciarVigilancia() {
    try {
        const respuesta = await fetch(`${BASE_API}/iniciar`, { method: 'POST' });
        const datos = await respuesta.json();

        if (datos.estado === 'exito') {
            console.log('✅ Vigilancia iniciada');
            actualizarEstadoUI(true);
            conectarWebSocket();

            if (!intervaloEventos) {
                intervaloEventos = setInterval(cargarEventos, 5000);
                setInterval(cargarAlertas, 3000);
            }
            mostrarNotificacion('Sistema iniciado correctamente', 'exito');
        } else {
            console.error('❌ Error:', datos.mensaje);
            mostrarNotificacion(datos.mensaje, 'error');
        }
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        mostrarNotificacion(
            'No se pudo conectar con el servidor. Verifica que esté corriendo en el puerto 8000',
            'error'
        );
    }
}

async function detenerVigilancia() {
    try {
        const respuesta = await fetch(`${BASE_API}/detener`, { method: 'POST' });
        await respuesta.json();

        console.log('⏹️ Vigilancia detenida');
        actualizarEstadoUI(false);

        if (websocket) { websocket.close(); websocket = null; }

        // Ocultar feed y mostrar placeholder
        const vid = document.getElementById('transmisionVideo');
        const ph  = document.getElementById('cam-placeholder-1');
        vid.src = ''; vid.style.display = 'none';
        if (ph) ph.style.display = '';

        mostrarNotificacion('Sistema detenido', 'info');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarNotificacion('Error al detener el sistema', 'error');
    }
}

function actualizarEstadoUI(activo) {
    const estadoEl   = document.getElementById('estadoTransmision');
    const sistemaEl  = document.getElementById('estadoSistema');
    const sidebarEl  = document.getElementById('sidebar-system-status');
    const camStatus  = document.getElementById('cam-status-1');
    const infoEl     = document.getElementById('infoSistema');

    if (activo) {
        if (estadoEl)  estadoEl.textContent = 'EN VIVO';
        if (sistemaEl) sistemaEl.textContent = '▶';
        if (sidebarEl) sidebarEl.textContent = 'Sistema activo';
        if (camStatus) { camStatus.className = 'cam-status activa'; }
        if (infoEl)    infoEl.textContent = 'Sistema activo — procesando video en tiempo real';
    } else {
        if (estadoEl)  estadoEl.textContent = 'Detenido';
        if (sistemaEl) sistemaEl.textContent = '⏸';
        if (sidebarEl) sidebarEl.textContent = 'Sistema detenido';
        if (camStatus) { camStatus.className = 'cam-status detenida'; }
        if (infoEl)    infoEl.textContent = 'Sistema detenido — esperando inicio';
    }
}

// ============================================
// WEBSOCKET PARA VIDEO EN TIEMPO REAL (ORIGINAL)
// ============================================

function conectarWebSocket() {
    try {
        websocket = new WebSocket('ws://localhost:8000/ws/video');

        websocket.onopen = () => {
            console.log('📡 WebSocket conectado');
        };

        websocket.onmessage = (evento) => {
            const blob = evento.data;
            const url  = URL.createObjectURL(blob);

            const imagenVideo  = document.getElementById('transmisionVideo');
            const placeholder  = document.getElementById('cam-placeholder-1');
            const modalFeed    = document.getElementById('modal-video-feed');
            const modalPh      = document.getElementById('modal-placeholder');

            // Liberar URL anterior
            if (imagenVideo.src && imagenVideo.src.startsWith('blob:')) {
                URL.revokeObjectURL(imagenVideo.src);
            }

            imagenVideo.src = url;
            imagenVideo.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';

            // Actualizar feed en modal si está abierto en cam 1
            const modal = document.getElementById('cam-modal');
            if (modal && modal.classList.contains('open')) {
                const numEl = document.getElementById('modal-cam-num');
                if (numEl && numEl.textContent === '1') {
                    modalFeed.src = url;
                    modalFeed.style.display = 'block';
                    if (modalPh) modalPh.style.display = 'none';
                }
            }
        };

        websocket.onerror = (error) => {
            console.error('❌ Error en WebSocket:', error);
            mostrarNotificacion('Error en transmisión de video', 'error');
        };

        websocket.onclose = () => {
            console.log('📡 WebSocket desconectado');
        };

    } catch (error) {
        console.error('❌ Error conectando WebSocket:', error);
        mostrarNotificacion('No se pudo conectar al stream de video', 'error');
    }
}

// ============================================
// ACTUALIZACIÓN DE ESTADO (ORIGINAL)
// ============================================

function iniciarActualizacionEstado() {
    intervaloEstado = setInterval(async () => {
        try {
            const respuesta = await fetch(`${BASE_API}/estado`);
            const datos     = await respuesta.json();

            const frames   = datos.frames_procesados.toLocaleString('es-ES');
            const personas = datos.personas_detectadas;
            const alertas  = datos.alertas_generadas;

            // Actualizar contadores principales (barra inferior)
            setTexto('contadorFrames',   frames);
            setTexto('contadorPersonas', personas);
            setTexto('contadorAlertas',  alertas);

            // Actualizar mini-stats del panel derecho
            setTexto('rp-frames',  frames);
            setTexto('rp-personas', personas);

            // Badge de alertas en sidebar
            const badge = document.getElementById('badge-alertas');
            if (badge) {
                if (alertas > 0) {
                    badge.style.display = '';
                    badge.textContent = alertas;
                } else {
                    badge.style.display = 'none';
                }
            }

            // Notificación visual en topbar si hay alertas
            const notifDot = document.getElementById('notif-dot');
            if (notifDot) {
                notifDot.style.display = alertas > 0 ? 'block' : 'none';
            }

            // Actualizar nivel de riesgo de CAM 1 según personas
            actualizarRiesgoCam(personas, alertas);

        } catch (_) {
            // Silenciar errores de polling
        }
    }, 1000);
}

function actualizarRiesgoCam(personas, alertas) {
    const riskEl = document.getElementById('cam-risk-1');
    if (!riskEl) return;
    if (alertas > 0) {
        riskEl.className = 'cam-risk rojo';
        riskEl.textContent = 'Crítico';
    } else if (personas > 3) {
        riskEl.className = 'cam-risk amarillo';
        riskEl.textContent = 'Alerta';
    } else {
        riskEl.className = 'cam-risk verde';
        riskEl.textContent = 'Normal';
    }
}

// ============================================
// CARGA DE DATOS (LÓGICA ORIGINAL)
// ============================================

async function cargarEventos() {
    try {
        const respuesta = await fetch(`${BASE_API}/eventos`);
        const datos     = await respuesta.json();
        const contenedor = document.getElementById('cuadriculaEventos');
 
        const eventos = datos.eventos || [];
 
        if (contenedor) {
            if (eventos.length === 0) {
                contenedor.innerHTML = '<div class="alerta-empty" style="grid-column:1/-1">📭 No hay eventos registrados</div>';
            } else {
                const filtro = document.getElementById('filtro-nivel-evento')?.value || 'todos';
                const filtrados = filtro === 'todos'
                    ? eventos
                    : eventos.filter(e => (e.nivel_riesgo||'').toLowerCase() === filtro);
 
                contenedor.innerHTML = filtrados.length === 0
                    ? '<div class="alerta-empty" style="grid-column:1/-1">Sin eventos con ese nivel</div>'
                    : filtrados.map((ev, i) => `
                        <div class="evento-card" style="animation-delay:${i * 0.05}s">
                            <div class="evento-card-header">
                                <span class="evento-tipo">${ev.tipo_evento || 'Evento'}</span>
                                <span class="badge-riesgo badge-${(ev.nivel_riesgo||'bajo').toLowerCase()}">
                                    ${ev.nivel_riesgo || 'BAJO'}
                                </span>
                            </div>
                            <div class="evento-fecha">📅 ${formatearFecha(ev.marca_tiempo)}</div>
                            <div class="evento-desc">${ev.descripcion || 'Sin descripción'}</div>
                            <div class="evento-meta">
                                <span>📍 ${ev.ubicacion || 'Desconocida'} · 👥 ${ev.cantidad_personas || 0} personas</span>
                                <span class="evento-conf">✅ ${((ev.confianza||0)*100).toFixed(1)}%</span>
                            </div>
                        </div>
                    `).join('');
            }
        }
 
        _actualizarContadoresEventos(eventos);
        actualizarDetecciones(eventos);
 
    } catch (error) {
        console.error('❌ Error eventos:', error);
        const c = document.getElementById('cuadriculaEventos');
        if (c) c.innerHTML = '<div class="alerta-empty" style="grid-column:1/-1">⚠️ No se pudo conectar con el servidor</div>';
    }
}
 
function _actualizarContadoresEventos(eventos) {
    const alto  = eventos.filter(e => (e.nivel_riesgo||'').toUpperCase() === 'ALTO').length;
    const medio = eventos.filter(e => (e.nivel_riesgo||'').toUpperCase() === 'MEDIO').length;
    const bajo  = eventos.filter(e => (e.nivel_riesgo||'').toUpperCase() === 'BAJO').length;
    const fn = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    fn('ev-cnt-alto',  alto);
    fn('ev-cnt-medio', medio);
    fn('ev-cnt-bajo',  bajo);
    fn('ev-cnt-total', eventos.length);
}
 
function filtrarEventos() { cargarEventos(); }

async function cargarAlertas() {
    try {
        const respuesta = await fetch(`${BASE_API}/alertas`);
        const datos     = await respuesta.json();

        const contenedor = document.getElementById('contenedorAlertas');
        if (!contenedor) return;

        if (!datos.alertas || datos.alertas.length === 0) {
            contenedor.innerHTML = '<div class="alerta-empty">✅ No hay alertas activas</div>';
            return;
        }

        const alertasOrdenadas = [...datos.alertas].reverse().slice(0, 8);

        contenedor.innerHTML = alertasOrdenadas.map((a, i) => `
            <div class="alerta-item ${(a.nivel_riesgo || 'bajo').toLowerCase()}" style="animation-delay:${i * 0.05}s">
                <div class="alerta-meta">
                    <span class="alerta-tipo">${iconoAlerta(a.nivel_riesgo)} ${a.tipo_evento || a.nivel_riesgo || 'Alerta'}</span>
                    <span class="alerta-hora">${horaCorta(a.marca_tiempo)}</span>
                </div>
                <div class="alerta-desc">${a.descripcion || 'Comportamiento sospechoso detectado'}</div>
                <div class="alerta-loc">📍 ${a.ubicacion || '—'} · 👥 ${a.cantidad_personas || 0} persona(s)</div>
            </div>
        `).join('');

    } catch (error) {
        console.error('❌ Error cargando alertas:', error);
    }
}

// Vista de alertas completa (al navegar a esa sección)
async function cargarAlertasCompletas() {
    try {
        const respuesta = await fetch(`${BASE_API}/alertas`);
        const datos     = await respuesta.json();
        const contenedor = document.getElementById('alertas-full-list');
        if (!contenedor) return;
 
        const alertas = datos.alertas || [];
 
        if (alertas.length === 0) {
            contenedor.innerHTML = '<div class="alerta-empty">✅ No hay alertas registradas</div>';
            _actualizarContadoresAlertas([]);
            return;
        }
 
        // Aplicar filtro activo
        const filtro = document.getElementById('filtro-nivel-alerta')?.value || 'todos';
        const filtradas = filtro === 'todos'
            ? alertas
            : alertas.filter(a => (a.nivel_riesgo || '').toLowerCase() === filtro);
 
        _actualizarContadoresAlertas(alertas);
 
        if (filtradas.length === 0) {
            contenedor.innerHTML = '<div class="alerta-empty">Sin alertas con ese nivel</div>';
            return;
        }
 
        contenedor.innerHTML = [...filtradas].reverse().map((a, i) => `
            <div class="alerta-item-full ${(a.nivel_riesgo || 'bajo').toLowerCase()}"
                 style="animation-delay:${i * 0.04}s">
                <div class="aif-left">
                    <span class="aif-icono">${iconoAlerta(a.nivel_riesgo)}</span>
                    <div class="aif-info">
                        <div class="aif-tipo">${a.tipo_evento || 'Alerta de seguridad'}</div>
                        <div class="aif-desc">${a.descripcion || 'Comportamiento sospechoso detectado'}</div>
                        <div class="aif-meta">
                            📍 ${a.ubicacion || '—'} &nbsp;·&nbsp;
                            👥 ${a.cantidad_personas || 0} persona(s) &nbsp;·&nbsp;
                            📅 ${formatearFecha(a.marca_tiempo)}
                        </div>
                    </div>
                </div>
                <div class="aif-right">
                    <span class="aif-badge ${(a.nivel_riesgo || 'bajo').toLowerCase()}">
                        ${a.nivel_riesgo || 'BAJO'}
                    </span>
                    <span class="aif-conf">✅ ${((a.confianza || 0) * 100).toFixed(0)}%</span>
                </div>
            </div>
        `).join('');
 
    } catch (error) {
        console.error('❌ Error alertas:', error);
        const c = document.getElementById('alertas-full-list');
        if (c) c.innerHTML = '<div class="alerta-empty">⚠️ No se pudo conectar con el servidor</div>';
    }
}
 
function _actualizarContadoresAlertas(alertas) {
    const alto  = alertas.filter(a => (a.nivel_riesgo||'').toUpperCase() === 'ALTO').length;
    const medio = alertas.filter(a => (a.nivel_riesgo||'').toUpperCase() === 'MEDIO').length;
    const bajo  = alertas.filter(a => (a.nivel_riesgo||'').toUpperCase() === 'BAJO').length;
    const fn = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    fn('cnt-alto',  alto);
    fn('cnt-medio', medio);
    fn('cnt-bajo',  bajo);
    fn('cnt-total', alertas.length);
}
 
function filtrarAlertas() { cargarAlertasCompletas(); }

function actualizarDetecciones(eventos) {
    const contenedor = document.getElementById('detecciones-list');
    if (!contenedor) return;

    const conPersonas = eventos.filter(e => e.cantidad_personas > 0).slice(0, 5);
    if (conPersonas.length === 0) {
        contenedor.innerHTML = '<div class="alerta-empty">Sin detecciones recientes</div>';
        return;
    }

    contenedor.innerHTML = conPersonas.map((e, i) => `
        <div class="deteccion-item" style="animation-delay:${i * 0.06}s">
            <div class="deteccion-avatar">👤</div>
            <div class="deteccion-info">
                <div class="deteccion-nombre">${e.tipo_evento || 'Detección'}</div>
                <div class="deteccion-meta">📍 ${e.ubicacion || '—'} · ${e.cantidad_personas} persona(s)</div>
            </div>
            <div class="deteccion-hora">${horaCorta(e.marca_tiempo)}</div>
        </div>
    `).join('');
}

// ============================================
// MODAL CÁMARA EXPANDIDA
// ============================================

function expandirCamara(num) {
    const modal    = document.getElementById('cam-modal');
    const numEl    = document.getElementById('modal-cam-num');
    const feedEl   = document.getElementById('modal-video-feed');
    const phEl     = document.getElementById('modal-placeholder');
    const statusEl = document.getElementById('modal-cam-status');

    if (numEl) numEl.textContent = num;

    // Si es cam 1 y hay stream activo, mostrar el feed actual
    const mainFeed = document.getElementById('transmisionVideo');
    if (num === 1 && mainFeed && mainFeed.src && mainFeed.src.startsWith('blob:')) {
        feedEl.src = mainFeed.src;
        feedEl.style.display = 'block';
        if (phEl) phEl.style.display = 'none';
        if (statusEl) statusEl.className = 'cam-status activa';
    } else {
        if (feedEl) feedEl.style.display = 'none';
        if (phEl)   phEl.style.display = 'flex';
        if (statusEl) statusEl.className = 'cam-status detenida';
    }

    modal.classList.add('open');
}

function cerrarModal() {
    document.getElementById('cam-modal').classList.remove('open');
}

function activarSeguimiento() {
    mostrarNotificacion('Seguimiento automático activado', 'exito');
}

function generarAlertaManual() {
    mostrarNotificacion('⚠️ Alerta manual generada', 'advertencia');
    cargarAlertas();
}

function guardarEvidencia() {
    mostrarNotificacion('💾 Evidencia guardada', 'exito');
}

// Cerrar modal con Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('cam-modal');
        if (modal && modal.classList.contains('open')) cerrarModal();
    }
});

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function setTexto(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
}

function horaCorta(fechaISO) {
    if (!fechaISO) return '--:--';
    const f = new Date(fechaISO);
    return f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatearFecha(fechaISO) {
    if (!fechaISO) return 'Fecha desconocida';
    const f = new Date(fechaISO);
    return f.toLocaleString('es-ES', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

function iconoAlerta(nivel) {
    const iconos = { 'ALTO': '🔴', 'MEDIO': '🟡', 'BAJO': '🟢' };
    return iconos[(nivel || '').toUpperCase()] || '🔵';
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    const colores = { exito: '#22c55e', error: '#ef4444', info: '#00c8ff', advertencia: '#f59e0b' };
    const iconos  = { exito: '✅', error: '❌', info: 'ℹ️', advertencia: '⚠️' };

    console.log(`${iconos[tipo]} ${mensaje}`);

    const infoEl = document.getElementById('infoSistema');
    if (infoEl) {
        infoEl.innerHTML = `<strong style="color:${colores[tipo]}">${iconos[tipo]} ${mensaje}</strong>`;
    }
}

// ============================================
// LIMPIEZA AL CERRAR (ORIGINAL)
// ============================================

window.addEventListener('beforeunload', () => {
    if (websocket)       websocket.close();
    if (intervaloEstado) clearInterval(intervaloEstado);
    if (intervaloEventos) clearInterval(intervaloEventos);
});

// ============================================
// ATAJOS DE TECLADO (ORIGINAL)
// ============================================

document.addEventListener('keydown', (evento) => {
    // Solo activos si el dashboard está visible
    const app = document.getElementById('app');
    if (!app || app.style.display === 'none') return;

    if (evento.ctrlKey && evento.key === 'i') {
        evento.preventDefault();
        iniciarVigilancia();
    }
    if (evento.ctrlKey && evento.key === 'd') {
        evento.preventDefault();
        detenerVigilancia();
    }
});

console.log('📌 Atajos disponibles: Ctrl+I (Iniciar), Ctrl+D (Detener)');

// ============================================
// NAVEGACIÓN CON TECLADO (ALT + número / TAB)
// ============================================

const VISTAS_ORDEN = [
    { vista: 'monitoreo', navIndex: 0 },
    { vista: 'alertas',   navIndex: 1 },
    { vista: 'control',   navIndex: 2 },
    { vista: 'facial',    navIndex: 3 },
    { vista: 'patrones',  navIndex: 4 },
    { vista: 'reportes',  navIndex: 5 },
    { vista: 'camaras',   navIndex: 6 },
    { vista: 'usuarios',  navIndex: 7 },
];

let vistaActualIndex = 0;

// ALT + 1..7 para ir directo a cada sección
document.addEventListener('keydown', (e) => {
    const app = document.getElementById('app');
    if (!app || app.style.display === 'none') return;

    // ALT + número
    if (e.altKey && !e.ctrlKey) {
        const match = e.code.match(/^Digit([1-9])$/);
        if (match) {
            const num = parseInt(match[1]);

            if (num >= 1 && num <= VISTAS_ORDEN.length) {
                e.preventDefault();
                const { vista, navIndex } = VISTAS_ORDEN[num - 1];

                const navItems = document.querySelectorAll('.nav-item');
                if (!navItems[navIndex]) {
                    console.error('❌ navIndex fuera de rango:', navIndex);
                    return;
                }

                cambiarVista(vista, navItems[navIndex]);
                vistaActualIndex = num - 1;
            }
        }
    }

    // TAB para navegar hacia adelante entre secciones
    // SHIFT + TAB para navegar hacia atrás
    if (e.key === 'Tab' && !e.altKey && !e.ctrlKey) {
        // Solo interceptar Tab si no hay un input enfocado
        const activo = document.activeElement;
        const esInput = activo && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA');
        if (esInput) return;

        e.preventDefault();
        if (e.shiftKey) {
            vistaActualIndex = (vistaActualIndex - 1 + VISTAS_ORDEN.length) % VISTAS_ORDEN.length;
        } else {
            vistaActualIndex = (vistaActualIndex + 1) % VISTAS_ORDEN.length;
        }
        const { vista, navIndex } = VISTAS_ORDEN[vistaActualIndex];
        const navItem = document.querySelectorAll('.nav-item')[navIndex];
        cambiarVista(vista, navItem);
    }
});

console.log('⌨️  Navegación: TAB/SHIFT+TAB (siguiente/anterior) | ALT+1..7 (directo)');

// ─────────────────────────────────────────────
// ESTADO DEL MÓDULO
// ─────────────────────────────────────────────
const ControlEstrategico = {
    intervalo: null,
    datos: {
        camarasActivas:   25,
        alertasCriticas:   8,
        sospechososHoy:   12,
        zonasRiesgoAlto:   7,
        // Historial para mini-gráficos (últimas 8 lecturas)
        histCamaras:   [20, 21, 22, 23, 22, 24, 24, 25],
        histAlertas:   [ 3,  4,  5,  6,  5,  7,  7,  8],
        histSosp:      [ 5,  6,  7,  8,  9, 10, 11, 12],
        histZonas:     [ 4,  4,  5,  5,  6,  6,  7,  7],
        // Áreas de riesgo
        areasRiesgo: {
            criticas: 7,
            medias:   4,
            bajas:    3,
        },
        // Incidentes por tipo (%)
        incidentesTipo: [
            { tipo: 'Hurto a persona',           pct: 40, color: '#ef4444' },
            { tipo: 'Comportamiento sospechoso', pct: 35, color: '#f59e0b' },
            { tipo: 'Robo vehicular',            pct: 25, color: '#3b82f6' },
        ],
        // Alertas recientes (últimas 8)
        alertasRecientes: [
            { hora: '16:05', tipo: 'Arma detectada',     zona: 'Chapinero', nivel: 'alto'  },
            { hora: '15:58', tipo: 'Coincidencia facial',zona: 'San Pedro', nivel: 'alto'  },
            { hora: '15:45', tipo: 'Merodeo',            zona: 'Kennedy',   nivel: 'medio' },
            { hora: '15:30', tipo: 'Robo en proceso',    zona: 'Bosa',      nivel: 'alto'  },
            { hora: '15:10', tipo: 'Vel. sospechosa',    zona: 'Suba',      nivel: 'medio' },
            { hora: '14:55', tipo: 'Movimiento brusco',  zona: 'Usaquén',   nivel: 'bajo'  },
            { hora: '14:40', tipo: 'Arma detectada',     zona: 'Mártires',  nivel: 'alto'  },
            { hora: '14:22', tipo: 'Persona merodeando', zona: 'Chapinero', nivel: 'medio' },
        ]
    }
};
 
// ─────────────────────────────────────────────
// INICIALIZAR AL ENTRAR A LA VISTA
// ─────────────────────────────────────────────
function inicializarControlEstrategico() {
    renderizarKPIs();
    renderizarMiniGraficos();
    renderizarBarrasRiesgo();
    renderizarDonaIncidentes();
    renderizarAlertasRecientes();
    renderizarMapaZonas();
 
    // Simular datos en vivo cada 4 segundos
    if (ControlEstrategico.intervalo) clearInterval(ControlEstrategico.intervalo);
    ControlEstrategico.intervalo = setInterval(_actualizarDatosEnVivo, 4000);
}
 
function detenerControlEstrategico() {
    if (ControlEstrategico.intervalo) {
        clearInterval(ControlEstrategico.intervalo);
        ControlEstrategico.intervalo = null;
    }
}
 
// ─────────────────────────────────────────────
// KPI CARDS
// ─────────────────────────────────────────────
function renderizarKPIs() {
    const d = ControlEstrategico.datos;
 
    _setKPI('kpi-camaras',  d.camarasActivas,  `+${d.histCamaras[d.histCamaras.length-1] - d.histCamaras[0]} hoy`);
    _setKPI('kpi-alertas',  d.alertasCriticas, `+${d.histAlertas[d.histAlertas.length-1] - d.histAlertas[0]} hoy`);
    _setKPI('kpi-sosp',     d.sospechososHoy,  `+${d.histSosp[d.histSosp.length-1]  - d.histSosp[0]}  hoy`);
    _setKPI('kpi-zonas',    d.zonasRiesgoAlto, `+${d.histZonas[d.histZonas.length-1] - d.histZonas[0]} hoy`);
}
 
function _setKPI(id, valor, subtexto) {
    const el = document.getElementById(id);
    if (!el) return;
    const valEl = el.querySelector('.ce-kpi-val');
    const subEl = el.querySelector('.ce-kpi-sub');
    if (valEl) valEl.textContent = valor;
    if (subEl) subEl.textContent = subtexto;
}
 
// ─────────────────────────────────────────────
// MINI GRÁFICOS SVG (sparklines)
// ─────────────────────────────────────────────
function renderizarMiniGraficos() {
    const d = ControlEstrategico.datos;
    _dibujarSparkline('spark-camaras', d.histCamaras, '#00c8ff');
    _dibujarSparkline('spark-alertas', d.histAlertas, '#ef4444');
    _dibujarSparkline('spark-sosp',    d.histSosp,    '#f59e0b');
    _dibujarSparkline('spark-zonas',   d.histZonas,   '#a855f7');
}
 
function _dibujarSparkline(id, datos, color) {
    const svg = document.getElementById(id);
    if (!svg) return;
 
    const W = 80, H = 28;
    const min = Math.min(...datos);
    const max = Math.max(...datos);
    const rango = max - min || 1;
 
    const pts = datos.map((v, i) => {
        const x = (i / (datos.length - 1)) * W;
        const y = H - ((v - min) / rango) * (H - 4) - 2;
        return `${x},${y}`;
    }).join(' ');
 
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = `
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"
            stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${pts.split(' ').pop().split(',')[0]}"
                cy="${pts.split(' ').pop().split(',')[1]}"
                r="3" fill="${color}"/>
    `;
}
 
// ─────────────────────────────────────────────
// BARRAS DE ÁREAS DE RIESGO
// ─────────────────────────────────────────────
function renderizarBarrasRiesgo() {
    const { criticas, medias, bajas } = ControlEstrategico.datos.areasRiesgo;
    const total = criticas + medias + bajas;
 
    _setBarraRiesgo('barra-criticas', criticas, total, '#ef4444', 'Críticas');
    _setBarraRiesgo('barra-medias',   medias,   total, '#f59e0b', 'Medias');
    _setBarraRiesgo('barra-bajas',    bajas,    total, '#3b82f6', 'Bajas');
 
    const el = document.getElementById('riesgo-total');
    if (el) el.textContent = total;
}
 
function _setBarraRiesgo(id, valor, total, color, label) {
    const contenedor = document.getElementById(id);
    if (!contenedor) return;
    const pct = Math.round((valor / total) * 100);
    contenedor.innerHTML = `
        <div class="ce-barra-fila">
            <div class="ce-barra-label">
                <span class="ce-barra-punto" style="background:${color}"></span>
                <span>${label}</span>
            </div>
            <div class="ce-barra-track">
                <div class="ce-barra-fill" style="width:${pct}%; background:${color}"></div>
            </div>
            <span class="ce-barra-num" style="color:${color}">${valor}</span>
        </div>
    `;
}
 
// ─────────────────────────────────────────────
// DONA DE INCIDENTES (SVG manual)
// ─────────────────────────────────────────────
function renderizarDonaIncidentes() {
    const svg = document.getElementById('dona-incidentes');
    if (!svg) return;
 
    const tipos = ControlEstrategico.datos.incidentesTipo;
    const cx = 60, cy = 60, r = 48, grosor = 16;
    let anguloAcum = -Math.PI / 2;
    let arcos = '';
    let leyenda = '';
 
    tipos.forEach(t => {
        const angulo = (t.pct / 100) * 2 * Math.PI;
        const x1 = cx + r * Math.cos(anguloAcum);
        const y1 = cy + r * Math.sin(anguloAcum);
        anguloAcum += angulo;
        const x2 = cx + r * Math.cos(anguloAcum);
        const y2 = cy + r * Math.sin(anguloAcum);
        const largeArc = angulo > Math.PI ? 1 : 0;
 
        arcos += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}"
            fill="none" stroke="${t.color}" stroke-width="${grosor}"
            stroke-linecap="butt"/>`;
    });
 
    svg.innerHTML = `
        ${arcos}
        <text x="${cx}" y="${cy - 6}" text-anchor="middle"
            font-family="Share Tech Mono,monospace" font-size="13"
            fill="#e8f0fe" font-weight="bold">HOY</text>
        <text x="${cx}" y="${cy + 12}" text-anchor="middle"
            font-family="Share Tech Mono,monospace" font-size="10" fill="#7a9bb8">
            ${tipos.reduce((s,t) => s + t.pct, 0)}%
        </text>
    `;
 
    // Leyenda
    const leyendaEl = document.getElementById('dona-leyenda');
    if (leyendaEl) {
        leyendaEl.innerHTML = tipos.map(t => `
            <div class="ce-leyenda-item">
                <span class="ce-leyenda-color" style="background:${t.color}"></span>
                <span class="ce-leyenda-texto">${t.tipo}</span>
                <span class="ce-leyenda-pct" style="color:${t.color}">${t.pct}%</span>
            </div>
        `).join('');
    }
}
 
// ─────────────────────────────────────────────
// LISTA DE ALERTAS RECIENTES
// ─────────────────────────────────────────────
function renderizarAlertasRecientes() {
    const lista = document.getElementById('ce-alertas-lista');
    if (!lista) return;
 
    lista.innerHTML = ControlEstrategico.datos.alertasRecientes.map(a => {
        const color = a.nivel === 'alto' ? '#ef4444' : a.nivel === 'medio' ? '#f59e0b' : '#3b82f6';
        const icono = a.nivel === 'alto' ? '🔴' : a.nivel === 'medio' ? '🟡' : '🔵';
        return `
            <div class="ce-alerta-row">
                <span class="ce-alerta-hora">${a.hora}</span>
                <span style="font-size:0.85em">${icono}</span>
                <span class="ce-alerta-tipo" style="color:${color}">${a.tipo}</span>
                <span class="ce-alerta-zona">📍 ${a.zona}</span>
            </div>
        `;
    }).join('');
}
 
// ─────────────────────────────────────────────
// MAPA DE ZONAS (SVG simplificado)
// ─────────────────────────────────────────────
function renderizarMapaZonas() {
    const contenedor = document.getElementById('ce-mapa-zonas');
    if (!contenedor) return;
 
    const zonas = [
        { nombre: 'Chapinero', x: 200, y: 90,  riesgo: 92 },
        { nombre: 'Santa Fe',  x: 170, y: 145, riesgo: 80 },
        { nombre: 'Kennedy',   x: 95,  y: 195, riesgo: 78 },
        { nombre: 'Bosa',      x: 75,  y: 240, riesgo: 65 },
        { nombre: 'Suba',      x: 120, y: 55,  riesgo: 55 },
        { nombre: 'Usaquén',   x: 220, y: 40,  riesgo: 42 },
        { nombre: 'Engativá',  x: 90,  y: 110, riesgo: 60 },
    ];
 
    const color = v =>
        v >= 80 ? '#ef4444' : v >= 60 ? '#f59e0b' : v >= 40 ? '#3b82f6' : '#22c55e';
 
    contenedor.innerHTML = `
        <svg viewBox="0 0 300 295"
             style="width:100%;border-radius:8px;background:rgba(13,27,46,0.6)">
            <defs>
                <pattern id="g2" width="15" height="15" patternUnits="userSpaceOnUse">
                    <path d="M15 0L0 0 0 15" fill="none"
                          stroke="rgba(30,111,199,0.08)" stroke-width="0.5"/>
                </pattern>
            </defs>
            <rect width="300" height="295" fill="url(#g2)"/>
            <path d="M85 20 L250 35 L265 150 L240 255 L145 285 L55 255 L40 145 Z"
                  fill="rgba(30,111,199,0.05)"
                  stroke="rgba(30,111,199,0.25)" stroke-width="1.5"/>
            ${zonas.map(z => `
                <circle cx="${z.x}" cy="${z.y}" r="${14 + z.riesgo/12}"
                    fill="${color(z.riesgo)}22"
                    stroke="${color(z.riesgo)}" stroke-width="1.5"/>
                <circle cx="${z.x}" cy="${z.y}" r="${(14 + z.riesgo/12)*1.5}"
                    fill="none" stroke="${color(z.riesgo)}" stroke-width="0.5" opacity="0.3"/>
                <text x="${z.x}" y="${z.y + 3}" text-anchor="middle"
                    font-family="Share Tech Mono,monospace" font-size="7.5" fill="#fff">
                    ${z.nombre.split(' ')[0]}
                </text>
                <text x="${z.x}" y="${z.y + 13}" text-anchor="middle"
                    font-family="Share Tech Mono,monospace" font-size="7"
                    fill="${color(z.riesgo)}">${z.riesgo}%</text>
            `).join('')}
        </svg>
    `;
}
 
// ─────────────────────────────────────────────
// SIMULACIÓN DE DATOS EN VIVO
// ─────────────────────────────────────────────
function _actualizarDatosEnVivo() {
    const d = ControlEstrategico.datos;
 
    // Pequeña variación aleatoria en cada métrica
    const variar = (val, min, max) =>
        Math.min(max, Math.max(min, val + (Math.random() > 0.5 ? 1 : 0)));
 
    d.camarasActivas  = variar(d.camarasActivas,  20, 30);
    d.alertasCriticas = variar(d.alertasCriticas,  5, 15);
    d.sospechososHoy  = variar(d.sospechososHoy,   8, 20);
    d.zonasRiesgoAlto = variar(d.zonasRiesgoAlto,  4, 10);
 
    // Actualizar historial (ventana deslizante de 8)
    const push = (arr, val) => { arr.push(val); if (arr.length > 8) arr.shift(); };
    push(d.histCamaras, d.camarasActivas);
    push(d.histAlertas, d.alertasCriticas);
    push(d.histSosp,    d.sospechososHoy);
    push(d.histZonas,   d.zonasRiesgoAlto);
 
    // Actualizar UI
    renderizarKPIs();
    renderizarMiniGraficos();
}
 
// ─────────────────────────────────────────────
// HOOK EN cambiarVista() EXISTENTE
// ─────────────────────────────────────────────
const _cvAnterior = typeof cambiarVista === 'function' ? cambiarVista : null;
 
function cambiarVista(nombre, itemNav) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));

    if (itemNav) itemNav.classList.add('active');

    const vistaId = `view-${nombre}`;
    const vista = document.getElementById(vistaId);

    if (vista) {
        vista.classList.add('active');

        if (nombre === 'reportes') cargarEventos();
        if (nombre === 'alertas')  cargarAlertasCompletas();

        if (nombre === 'control') {
            setTimeout(() => {
                iniciarMapa();
            }, 300);
        }
    }
}

let mapaInicializado = false;
let mapa;

function iniciarMapa() {
    const contenedor = document.getElementById("mapa");

    if (!contenedor) {
        console.log("no existe #mapa");
        return;
    }

    const height = contenedor.offsetHeight;

    console.log("altura actual:", height);

    if (height === 0) {
        console.log("sin altura, reintentando...");
        setTimeout(iniciarMapa, 300);
        return;
    }

    if (!mapaInicializado) {
        console.log("CREANDO MAPA");

        mapa = L.map('mapa').setView([4.7110, -74.0721], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(mapa);

        mapaInicializado = true;
    }

    setTimeout(() => {
        mapa.invalidateSize();
    }, 200);
}
// ══════════════════════════════════════════════════════════════════
// INSTRUCCIÓN DE INSERCIÓN — aplicacion.js
// PEGA TODO ESTE BLOQUE AL FINAL del archivo aplicacion.js
// ══════════════════════════════════════════════════════════════════

// ============================================================
// MÓDULO: GESTIÓN DE CÁMARAS
// ============================================================

const GestionCamaras = (() => {

    // ── DATOS INICIALES (simulados, reemplazables por API) ──
    let camaras = [
        { id: '1001', ubicacion: 'Parque 93',        zona: 'Usaquén',   estado: 'activa',  resolucion: '1080p', tipo: 'IP',        ultimaConexion: '2024-04-25 16:10', ip: '192.168.1.101', puerto: '554', obs: 'Cámara principal zona norte.' },
        { id: '1002', ubicacion: 'Calle 22 / Cr 7',  zona: 'Santa Fe',  estado: 'alerta',  resolucion: '1080p', tipo: 'IP',        ultimaConexion: '2024-04-25 15:55', ip: '192.168.1.102', puerto: '554', obs: 'Intermitencia reportada.' },
        { id: '1003', ubicacion: 'Calle 73 / Cr 11', zona: 'Chapinero', estado: 'activa',  resolucion: '720p',  tipo: 'Analógica', ultimaConexion: '2024-04-25 14:50', ip: '—',             puerto: '—',   obs: '' },
        { id: '1004', ubicacion: 'Carrera 10 #14',   zona: 'Santa Fe',  estado: 'alerta',  resolucion: '1080p', tipo: 'IP',        ultimaConexion: '2024-04-25 14:20', ip: '192.168.1.104', puerto: '554', obs: 'Zona de alto tráfico.' },
        { id: '1005', ubicacion: 'Miramar CC',        zona: 'Miramar',   estado: 'offline', resolucion: '720p',  tipo: 'Analógica', ultimaConexion: '2024-04-24 13:45', ip: '—',             puerto: '—',   obs: 'Desconectada. Requiere revisión.' },
        { id: '1006', ubicacion: 'Av. El Dorado',    zona: 'Engativá',  estado: 'activa',  resolucion: '4K',    tipo: 'IP',        ultimaConexion: '2024-04-25 16:00', ip: '192.168.1.106', puerto: '8554',obs: 'Cámara 4K instalada en 2024.' },
        { id: '1007', ubicacion: 'Transv. 93 / Cl 127', zona: 'Suba',   estado: 'activa',  resolucion: '1080p', tipo: 'IP',        ultimaConexion: '2024-04-25 15:30', ip: '192.168.1.107', puerto: '554', obs: '' },
        { id: '1008', ubicacion: 'CL 45 / Cr 68',    zona: 'Kennedy',   estado: 'activa',  resolucion: '720p',  tipo: 'Analógica', ultimaConexion: '2024-04-25 16:05', ip: '—',             puerto: '—',   obs: 'Zona alta incidencia.' },
        { id: '1009', ubicacion: 'Carrera 50 / Cl 80', zona: 'Engativá', estado: 'offline', resolucion: '1080p', tipo: 'IP',       ultimaConexion: '2024-04-23 11:00', ip: '192.168.1.109', puerto: '554', obs: 'Sin señal. En mantenimiento.' },
        { id: '1010', ubicacion: 'Portal Kennedy',   zona: 'Kennedy',   estado: 'activa',  resolucion: '1080p', tipo: 'IP',        ultimaConexion: '2024-04-25 16:08', ip: '192.168.1.110', puerto: '554', obs: '' },
        { id: '1011', ubicacion: 'CL 80 / Cr 30',   zona: 'Suba',      estado: 'activa',  resolucion: '720p',  tipo: 'Analógica', ultimaConexion: '2024-04-25 15:00', ip: '—',             puerto: '—',   obs: '' },
        { id: '1012', ubicacion: 'Av. Boyacá / Cl 17', zona: 'Bosa',    estado: 'alerta',  resolucion: '1080p', tipo: 'IP',        ultimaConexion: '2024-04-25 14:45', ip: '192.168.1.112', puerto: '554', obs: 'Señal débil, revisar cableado.' },
    ];

    // Estado de paginación / filtros / orden
    let filtradas = [...camaras];
    let paginaActual = 1;
    const POR_PAGINA = 8;
    let ordenCampo = null;
    let ordenAsc = true;
    // ID de la cámara siendo editada (null = nueva)
    let editandoId = null;

    // ── INICIALIZACIÓN ──
    function init() {
        filtradas = [...camaras];
        renderTabla();
        renderKPIs();
    }

    // ── KPIs ──
    function renderKPIs() {
        const activas   = camaras.filter(c => c.estado === 'activa').length;
        const alerta    = camaras.filter(c => c.estado === 'alerta').length;
        const offline   = camaras.filter(c => c.estado === 'offline').length;
        const ip        = camaras.filter(c => c.tipo === 'IP').length;
        const analogica = camaras.filter(c => c.tipo === 'Analógica').length;

        _set('gc-kpi-activas',   activas);
        _set('gc-kpi-alerta',    alerta);
        _set('gc-kpi-offline',   offline);
        _set('gc-kpi-total',     camaras.length);
        _set('gc-kpi-ip',        ip);
        _set('gc-kpi-analogica', analogica);
    }

    // ── FILTRADO ──
    function filtrar() {
        const q      = (document.getElementById('gc-search')?.value || '').toLowerCase();
        const estado = document.getElementById('gc-filtro-estado')?.value || 'todos';
        const tipo   = document.getElementById('gc-filtro-tipo')?.value   || 'todos';
        const zona   = document.getElementById('gc-filtro-zona')?.value   || 'todos';

        filtradas = camaras.filter(c => {
            const matchQ      = !q || c.id.toLowerCase().includes(q) || c.ubicacion.toLowerCase().includes(q) || c.zona.toLowerCase().includes(q);
            const matchEstado = estado === 'todos' || c.estado === estado;
            const matchTipo   = tipo   === 'todos' || c.tipo   === tipo;
            const matchZona   = zona   === 'todos' || c.zona   === zona;
            return matchQ && matchEstado && matchTipo && matchZona;
        });

        // Reaplica orden si existe
        if (ordenCampo) _aplicarOrden();

        paginaActual = 1;
        renderTabla();
    }

    // ── ORDENAMIENTO ──
    function ordenar(campo) {
        if (ordenCampo === campo) {
            ordenAsc = !ordenAsc;
        } else {
            ordenCampo = campo;
            ordenAsc = true;
        }
        // Actualizar iconos
        document.querySelectorAll('.gc-sort-icon').forEach(el => el.textContent = '↕');
        const iconEl = document.getElementById(`sort-${campo}`);
        if (iconEl) iconEl.textContent = ordenAsc ? '↑' : '↓';

        _aplicarOrden();
        renderTabla();
    }

    function _aplicarOrden() {
        filtradas.sort((a, b) => {
            const va = (a[ordenCampo] || '').toString().toLowerCase();
            const vb = (b[ordenCampo] || '').toString().toLowerCase();
            return ordenAsc ? va.localeCompare(vb) : vb.localeCompare(va);
        });
    }

    // ── RENDER TABLA ──
    function renderTabla() {
        const tbody = document.getElementById('gc-tbody');
        if (!tbody) return;

        const total  = filtradas.length;
        const inicio = (paginaActual - 1) * POR_PAGINA;
        const fin    = Math.min(inicio + POR_PAGINA, total);
        const pagina = filtradas.slice(inicio, fin);

        if (pagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="gc-empty-row">No se encontraron cámaras con los filtros aplicados.</td></tr>`;
        } else {
            tbody.innerHTML = pagina.map(c => _filaCamara(c)).join('');
        }

        _set('gc-count-label', `Mostrando ${pagina.length} de ${total} cámara${total !== 1 ? 's' : ''}`);
        renderPaginacion(total);
    }

    function _filaCamara(c) {
        const estadoBadge = {
            activa:  `<span class="gc-badge gc-badge-activa">🟢 Activa</span>`,
            alerta:  `<span class="gc-badge gc-badge-alerta">🟡 Alerta</span>`,
            offline: `<span class="gc-badge gc-badge-offline">🔴 Offline</span>`,
        }[c.estado] || c.estado;

        const tipoBadge = c.tipo === 'IP'
            ? `<span class="gc-tipo-badge gc-tipo-ip">📡 IP</span>`
            : `<span class="gc-tipo-badge gc-tipo-analogica">📼 Analógica</span>`;

        return `
        <tr>
            <td><strong style="font-family:'Share Tech Mono',monospace;color:var(--accent-cyan)">${c.id}</strong></td>
            <td>${c.ubicacion}</td>
            <td>${c.zona}</td>
            <td>${estadoBadge}</td>
            <td style="font-family:'Share Tech Mono',monospace">${c.resolucion}</td>
            <td>${tipoBadge}</td>
            <td style="color:var(--text-muted);font-size:0.82em">${c.ultimaConexion}</td>
            <td style="font-family:'Share Tech Mono',monospace;font-size:0.8em;color:var(--text-muted)">${c.ip}</td>
            <td>
                <div class="gc-acciones">
                    <button class="gc-action-btn view" onclick="GC.verDetalle('${c.id}')">👁 Ver</button>
                    <button class="gc-action-btn edit" onclick="GC.abrirEditar('${c.id}')">✏ Editar</button>
                    <button class="gc-action-btn deact" onclick="GC.confirmarDesactivar('${c.id}')">⏻ ${c.estado !== 'offline' ? 'Desactivar' : 'Activar'}</button>
                </div>
            </td>
        </tr>`;
    }

    // ── PAGINACIÓN ──
    function renderPaginacion(total) {
        const cont = document.getElementById('gc-pagination');
        if (!cont) return;

        const totalPags = Math.ceil(total / POR_PAGINA);
        if (totalPags <= 1) { cont.innerHTML = ''; return; }

        let html = '';
        if (paginaActual > 1)
            html += `<button class="gc-page-btn" onclick="GC.irPagina(${paginaActual - 1})">‹</button>`;
        for (let i = 1; i <= totalPags; i++) {
            html += `<button class="gc-page-btn ${i === paginaActual ? 'active' : ''}" onclick="GC.irPagina(${i})">${i}</button>`;
        }
        if (paginaActual < totalPags)
            html += `<button class="gc-page-btn" onclick="GC.irPagina(${paginaActual + 1})">›</button>`;
        cont.innerHTML = html;
    }

    function irPagina(n) { paginaActual = n; renderTabla(); }

    // ── MODAL AGREGAR / EDITAR ──
    function abrirModalAgregar() {
        editandoId = null;
        _set('gc-modal-titulo', '➕ Agregar Cámara');
        _limpiarForm();
        document.getElementById('gc-form-id').removeAttribute('disabled');
        document.getElementById('gc-modal').style.display = 'flex';
    }

    function abrirEditar(id) {
        const cam = camaras.find(c => c.id === id);
        if (!cam) return;
        editandoId = id;
        _set('gc-modal-titulo', `✏ Editar Cámara ${id}`);
        _limpiarForm();
        document.getElementById('gc-form-id').value        = cam.id;
        document.getElementById('gc-form-id').setAttribute('disabled', true);
        document.getElementById('gc-form-tipo').value      = cam.tipo;
        document.getElementById('gc-form-ubicacion').value = cam.ubicacion;
        document.getElementById('gc-form-zona').value      = cam.zona;
        document.getElementById('gc-form-resolucion').value= cam.resolucion;
        document.getElementById('gc-form-ip').value        = cam.ip === '—' ? '' : cam.ip;
        document.getElementById('gc-form-puerto').value    = cam.puerto === '—' ? '' : cam.puerto;
        document.getElementById('gc-form-obs').value       = cam.obs || '';
        document.getElementById('gc-modal').style.display  = 'flex';
    }

    function cerrarModal() {
        document.getElementById('gc-modal').style.display = 'none';
        _limpiarForm();
    }

    function guardarCamara() {
        const id        = document.getElementById('gc-form-id').value.trim();
        const tipo      = document.getElementById('gc-form-tipo').value;
        const ubicacion = document.getElementById('gc-form-ubicacion').value.trim();
        const zona      = document.getElementById('gc-form-zona').value;
        const resolucion= document.getElementById('gc-form-resolucion').value;
        const ip        = document.getElementById('gc-form-ip').value.trim() || '—';
        const puerto    = document.getElementById('gc-form-puerto').value.trim() || '—';
        const obs       = document.getElementById('gc-form-obs').value.trim();
        const errorEl   = document.getElementById('gc-form-error');

        // Validación básica
        if (!id || !ubicacion) {
            errorEl.textContent = '⚠ Los campos ID y Ubicación son obligatorios.';
            errorEl.style.display = 'block';
            return;
        }
        if (!editandoId && camaras.find(c => c.id === id)) {
            errorEl.textContent = `⚠ Ya existe una cámara con el ID "${id}".`;
            errorEl.style.display = 'block';
            return;
        }

        const ahora = new Date().toISOString().slice(0,16).replace('T',' ');
        const nuevaCam = { id, ubicacion, zona, estado: editandoId ? camaras.find(c=>c.id===editandoId).estado : 'activa', resolucion, tipo, ultimaConexion: ahora, ip, puerto, obs };

        if (editandoId) {
            const idx = camaras.findIndex(c => c.id === editandoId);
            if (idx !== -1) camaras[idx] = { ...camaras[idx], ...nuevaCam };
            mostrarNotificacion(`Cámara ${id} actualizada correctamente.`, 'exito');
        } else {
            camaras.unshift(nuevaCam);
            mostrarNotificacion(`Cámara ${id} agregada correctamente.`, 'exito');
        }

        cerrarModal();
        filtrar();
        renderKPIs();
    }

    // ── VER DETALLE ──
    function verDetalle(id) {
        const cam = camaras.find(c => c.id === id);
        if (!cam) return;
        _set('gc-detalle-titulo', `📷 Cámara ${cam.id} — ${cam.ubicacion}`);
        const estadoBadge = { activa: '🟢 Activa', alerta: '🟡 En Alerta', offline: '🔴 Offline' }[cam.estado] || cam.estado;
        document.getElementById('gc-detalle-body').innerHTML = `
            <div class="gc-detalle-grid">
                <div class="gc-detalle-field"><label>ID Cámara</label><span>${cam.id}</span></div>
                <div class="gc-detalle-field"><label>Estado</label><span>${estadoBadge}</span></div>
                <div class="gc-detalle-field" style="grid-column:1/-1"><label>Ubicación Física</label><span>${cam.ubicacion}</span></div>
                <div class="gc-detalle-field"><label>Zona / Localidad</label><span>${cam.zona}</span></div>
                <div class="gc-detalle-field"><label>Tipo</label><span>${cam.tipo}</span></div>
                <div class="gc-detalle-field"><label>Resolución</label><span>${cam.resolucion}</span></div>
                <div class="gc-detalle-field"><label>Última Conexión</label><span>${cam.ultimaConexion}</span></div>
                <div class="gc-detalle-field"><label>Dirección IP</label><span>${cam.ip}</span></div>
                <div class="gc-detalle-field"><label>Puerto RTSP</label><span>${cam.puerto}</span></div>
                ${cam.obs ? `<div class="gc-detalle-field" style="grid-column:1/-1"><label>Observaciones</label><span>${cam.obs}</span></div>` : ''}
            </div>`;
        document.getElementById('gc-modal-detalle').style.display = 'flex';
    }

    // ── DESACTIVAR / ACTIVAR ──
    function confirmarDesactivar(id) {
        const cam = camaras.find(c => c.id === id);
        if (!cam) return;
        const accion = cam.estado !== 'offline' ? 'desactivar' : 'activar';
        document.getElementById('gc-confirm-msg').textContent =
            `¿Deseas ${accion} la cámara ${cam.id} ubicada en "${cam.ubicacion}" (${cam.zona})?`;
        const btn = document.getElementById('gc-confirm-btn');
        btn.onclick = () => {
            cam.estado = cam.estado !== 'offline' ? 'offline' : 'activa';
            cam.ultimaConexion = new Date().toISOString().slice(0,16).replace('T',' ');
            document.getElementById('gc-modal-confirm').style.display = 'none';
            filtrar();
            renderKPIs();
            mostrarNotificacion(`Cámara ${cam.id} ${cam.estado === 'offline' ? 'desactivada' : 'activada'}.`, 'info');
        };
        document.getElementById('gc-modal-confirm').style.display = 'flex';
    }

    // ── EXPORTAR CSV ──
    function exportarCSV() {
        const cabeceras = ['ID','Ubicación','Zona','Estado','Resolución','Tipo','Última Conexión','IP','Puerto','Observaciones'];
        const filas = filtradas.map(c =>
            [c.id, c.ubicacion, c.zona, c.estado, c.resolucion, c.tipo, c.ultimaConexion, c.ip, c.puerto, c.obs]
            .map(v => `"${(v||'').toString().replace(/"/g,'""')}"`)
            .join(',')
        );
        const csv = [cabeceras.join(','), ...filas].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `camaras_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        mostrarNotificacion('CSV exportado correctamente.', 'exito');
    }

    // ── ACTUALIZAR (simula recarga de API) ──
    function actualizar() {
        mostrarNotificacion('Datos de cámaras actualizados.', 'info');
        filtrar();
        renderKPIs();
    }

    // ── HELPERS ──
    function _set(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }
    function _limpiarForm() {
        ['gc-form-id','gc-form-tipo','gc-form-ubicacion','gc-form-zona','gc-form-resolucion','gc-form-ip','gc-form-puerto','gc-form-obs'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const err = document.getElementById('gc-form-error');
        if (err) err.style.display = 'none';
    }

    // API pública
    return {
        init,
        filtrar,
        ordenar,
        irPagina,
        abrirModalAgregar,
        abrirEditar,
        cerrarModal,
        guardarCamara,
        verDetalle,
        confirmarDesactivar,
        exportarCSV,
        actualizar,
    };
})();

// ── Alias globales para los onclick del HTML ──
const GC = GestionCamaras;
const gcFiltrar          = () => GC.filtrar();
const gcOrdenar          = (c) => GC.ordenar(c);
const gcAbrirModalAgregar= () => GC.abrirModalAgregar();
const gcCerrarModal      = () => GC.cerrarModal();
const gcGuardarCamara    = () => GC.guardarCamara();
const gcExportarCSV      = () => GC.exportarCSV();
const gcActualizar       = () => GC.actualizar();

// ── Hook en cambiarVista para inicializar al navegar ──

const _gcCVOrig = cambiarVista;
cambiarVista = function(nombre, itemNav) {
    _gcCVOrig(nombre, itemNav);
    if (nombre === 'camaras') {
        GestionCamaras.init();
    }
};