import { useEffect, useState } from 'react';
import { api } from '../api/client';

function formatearFecha(fechaIso) {
    return fechaIso ? new Date(fechaIso).toLocaleString() : 'Sin registros';
}

const ETIQUETA_TAREA = {
    reporte: 'Generación de reporte',
    escalamiento: 'Revisión de escalamiento',
};

function formatearAntiguedad(horas) {
    return horas < 48 ? `${horas} h` : `${Math.floor(horas / 24)} d`;
}

export default function BotRPA() {
    const [estado, setEstado] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [iniciando, setIniciando] = useState(false); // NUEVO
    const [mensaje, setMensaje] = useState('');        // NUEVO
    const [historial, setHistorial] = useState([]);
    const [reportes, setReportes] = useState([]);
    const [visor, setVisor] = useState(null);   // { nombre, url } del PDF abierto
    const [abriendo, setAbriendo] = useState(''); // nombre del PDF que se está descargando
    const [pendientes, setPendientes] = useState({ umbral_horas: 0, total: 0, casos: [] });

    useEffect(() => {
        cargarEstado();
    }, []);

    // NUEVO: mientras el bot esté ejecutándose, consulta el estado cada 3 s
    useEffect(() => {
        if (!estado?.ejecutando) return;
        const intervalo = setInterval(() => cargarEstado(true), 3000);
        return () => clearInterval(intervalo);
    }, [estado?.ejecutando]);

    // Libera la memoria del PDF abierto cuando se cierra, se cambia o se sale de la sección
    useEffect(() => {
        return () => {
            if (visor?.url) window.URL.revokeObjectURL(visor.url);
        };
    }, [visor]);

    async function cargarEstado(silencioso = false) { // CAMBIÓ: parámetro nuevo
        if (!silencioso) setCargando(true);
        try {
            const [datos, registros, archivos, casos] = await Promise.all([
                api.estadoBotRpa(),
                api.historialBotRpa(),
                api.listarReportesBotRpa(),
                api.casosPendientesBotRpa(),
            ]);
            setEstado(datos);
            setHistorial(registros);
            setReportes(archivos);
            setPendientes(casos);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    // NUEVO
    async function ejecutarAhora() {
        setIniciando(true);
        setMensaje('');
        setError('');
        try {
            const respuesta = await api.ejecutarBotRpa();
            setMensaje(respuesta.mensaje);
            await cargarEstado(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setIniciando(false);
        }
    }

    async function verReporte(nombre) {
        setAbriendo(nombre);
        setError('');
        try {
            const url = await api.obtenerPdfBotRpa(nombre);
            setVisor({ nombre, url });
        } catch (err) {
            setError(err.message);
        } finally {
            setAbriendo('');
        }
    }

    return (
        <div>
            <div className="dashboard-toolbar">
                <h2>Bot RPA</h2>
                <div className="tabla-usuarios-acciones">
                    {/* NUEVO */}
                    <button
                        className="btn-mini"
                        disabled={iniciando || estado?.ejecutando}
                        onClick={ejecutarAhora}
                    >
                        {estado?.ejecutando ? '⏳ Ejecutando…' : '▶ Ejecutar ahora'}
                    </button>
                    {/* CAMBIÓ: onClick ahora es una función flecha */}
                    <button className="btn-mini" disabled={cargando} onClick={() => cargarEstado()}>
                        ↻ Actualizar
                    </button>
                </div>
            </div>

            {error && <p className="centro-control-error">{error}</p>}
            {mensaje && <p className="mapa-nota">{mensaje}</p>}

            {cargando && !estado && <p className="mapa-nota">Cargando estado del bot…</p>}

            {estado && (
                <>
                    <div className="kpi-grid">
                        {/* NUEVO */}
                        <div className="kpi-card">
                            <span className="kpi-valor">{estado.ejecutando ? 'Ejecutando' : 'En espera'}</span>
                            <span className="kpi-etiqueta">Estado del bot</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-valor">{formatearFecha(estado.ultima_actividad)}</span>
                            <span className="kpi-etiqueta">Última actividad</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-valor">{formatearFecha(estado.ultimo_reporte)}</span>
                            <span className="kpi-etiqueta">Último reporte generado</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-valor">{estado.total_reportes}</span>
                            <span className="kpi-etiqueta">Reportes generados</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-valor">{estado.hora_reporte}</span>
                            <span className="kpi-etiqueta">Hora del reporte diario</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-valor">{estado.horas_escalamiento} h</span>
                            <span className="kpi-etiqueta">Umbral de escalamiento</span>
                        </div>
                        <div className={`kpi-card ${pendientes.total > 0 ? 'kpi-card-alto' : ''}`}>
                            <span className="kpi-valor">{pendientes.total}</span>
                            <span className="kpi-etiqueta">Casos por escalar</span>
                        </div>
                    </div>

                    <p className="mapa-nota">
                        El bot corre como un proceso aparte. Este estado se deduce de los archivos que
                        deja (log y reportes). "Ejecutando" solo se detecta si lo lanzaste desde este botón.
                    </p>
                                        <div className="dashboard-toolbar">
                        <h2>Historial de ejecuciones</h2>
                    </div>

                    {historial.length === 0 ? (
                        <div className="estado-vacio">
                            <span className="estado-vacio-icono">🗒️</span>
                            <p>Aún no hay ejecuciones registradas.</p>
                        </div>
                    ) : (
                        <table className="tabla-usuarios">
                            <thead>
                                <tr>
                                    <th>Inicio</th>
                                    <th>Tarea</th>
                                    <th>Resultado</th>
                                    <th>Detalle</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historial.map((registro, indice) => (
                                    <tr key={`${registro.inicio}-${registro.tarea}-${indice}`}>
                                        <td>{new Date(registro.inicio).toLocaleString()}</td>
                                        <td>{ETIQUETA_TAREA[registro.tarea] || registro.tarea}</td>
                                        <td>
                                            <span
                                                className={`usuario-estado-badge ${
                                                    registro.resultado === 'ok'
                                                        ? 'usuario-estado-aprobado'
                                                        : 'usuario-estado-rechazado'
                                                }`}
                                            >
                                                {registro.resultado === 'ok' ? 'Correcto' : 'Error'}
                                            </span>
                                        </td>
                                        <td>{registro.detalle}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                                        <div className="dashboard-toolbar">
                        <h2>Reportes PDF generados</h2>
                    </div>

                    {reportes.length === 0 ? (
                        <div className="estado-vacio">
                            <span className="estado-vacio-icono">📄</span>
                            <p>Aún no hay reportes generados por el bot.</p>
                        </div>
                    ) : (
                        <table className="tabla-usuarios">
                            <thead>
                                <tr>
                                    <th>Archivo</th>
                                    <th>Generado</th>
                                    <th>Tamaño</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportes.map((reporte) => (
                                    <tr key={reporte.nombre}>
                                        <td className="tabla-usuarios-usuario">{reporte.nombre}</td>
                                        <td>{new Date(reporte.fecha).toLocaleString()}</td>
                                        <td>{reporte.tamano_kb} KB</td>
                                        <td>
                                            <button
                                                className="btn-mini"
                                                disabled={abriendo === reporte.nombre}
                                                onClick={() => verReporte(reporte.nombre)}
                                            >
                                                {abriendo === reporte.nombre ? 'Abriendo…' : '👁 Ver'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {visor && (
                        <div>
                            <div className="dashboard-toolbar">
                                <h2>{visor.nombre}</h2>
                                <button className="btn-mini" onClick={() => setVisor(null)}>✕ Cerrar</button>
                            </div>
                            <iframe
                                title={`Reporte ${visor.nombre}`}
                                src={visor.url}
                                style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px' }}
                            />
                        </div>
                    )}
                                        <div className="dashboard-toolbar">
                        <h2>Casos pendientes de escalamiento</h2>
                        <span className="mapa-nota">
                            Pendientes hace más de {pendientes.umbral_horas} h sin gestión
                        </span>
                    </div>

                    {pendientes.casos.length === 0 ? (
                        <div className="estado-vacio">
                            <span className="estado-vacio-icono">✅</span>
                            <p>No hay casos pendientes por escalar.</p>
                        </div>
                    ) : (
                        <table className="tabla-usuarios">
                            <thead>
                                <tr>
                                    <th>Riesgo</th>
                                    <th>Localidad</th>
                                    <th>Tipo</th>
                                    <th>Pendiente hace</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendientes.casos.map((caso) => (
                                    <tr key={caso.id}>
                                        <td>
                                            <span className={`etiqueta-riesgo etiqueta-${caso.nivel_riesgo?.toLowerCase()}`}>
                                                {caso.nivel_riesgo}
                                            </span>
                                        </td>
                                        <td>{caso.ubicacion}</td>
                                        <td>{caso.tipo_evento || 'Evento'}</td>
                                        <td>{formatearAntiguedad(caso.horas_pendiente)}</td>
                                        <td>{new Date(caso.marca_tiempo).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}
        </div>
    );
}