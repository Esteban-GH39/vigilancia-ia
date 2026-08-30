import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

const ESTADOS = [
    { id: 'pendiente', etiqueta: 'Pendiente', icono: '🕓' },
    { id: 'en_seguimiento', etiqueta: 'En seguimiento', icono: '🔎' },
    { id: 'resuelto', etiqueta: 'Resuelto', icono: '✅' },
];

const NIVELES = ['ALTO', 'MEDIO', 'BAJO'];

export default function BitacoraCasos() {
    const [eventos, setEventos] = useState([]);
    const [localidades, setLocalidades] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [filtroTexto, setFiltroTexto] = useState('');
    const [filtroLocalidad, setFiltroLocalidad] = useState('todas');
    const [filtroNivel, setFiltroNivel] = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');

    useEffect(() => {
        cargar();
    }, []);

    async function cargar() {
        setCargando(true);
        try {
            const [datosEventos, datosLocalidades] = await Promise.all([
                api.listarEventos(200),
                api.listarLocalidades(),
            ]);
            setEventos(datosEventos);
            setLocalidades(datosLocalidades);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    async function cambiarEstado(idEvento, nuevoEstado) {
        // Actualización optimista: se refleja de inmediato en la lista,
        // y si el servidor rechaza el cambio se revierte.
        const anteriores = eventos;
        setEventos((prev) => prev.map((e) => (e.id === idEvento ? { ...e, estado_caso: nuevoEstado } : e)));
        try {
            await api.actualizarEstadoEvento(idEvento, nuevoEstado);
        } catch (err) {
            setEventos(anteriores);
            setError(`No se pudo actualizar el caso #${idEvento}: ${err.message}`);
        }
    }

    const eventosFiltrados = useMemo(() => {
        const texto = filtroTexto.trim().toLowerCase();
        return eventos.filter((ev) => {
            if (filtroLocalidad !== 'todas' && ev.ubicacion !== filtroLocalidad) return false;
            if (filtroNivel !== 'todos' && ev.nivel_riesgo !== filtroNivel) return false;
            if (filtroEstado !== 'todos' && (ev.estado_caso || 'pendiente') !== filtroEstado) return false;
            if (texto && !ev.descripcion?.toLowerCase().includes(texto) && !ev.ubicacion?.toLowerCase().includes(texto)) {
                return false;
            }
            return true;
        });
    }, [eventos, filtroTexto, filtroLocalidad, filtroNivel, filtroEstado]);

    const conteoPorEstado = useMemo(() => {
        const conteo = { pendiente: 0, en_seguimiento: 0, resuelto: 0 };
        eventos.forEach((ev) => {
            const estado = ev.estado_caso || 'pendiente';
            if (conteo[estado] !== undefined) conteo[estado] += 1;
        });
        return conteo;
    }, [eventos]);

    return (
        <div>
            <div className="dashboard-toolbar">
                <h2>Bitácora de Casos</h2>
                <button className="btn-mini" onClick={cargar}>↻ Actualizar</button>
            </div>

            <div className="bitacora-resumen">
                {ESTADOS.map((estado) => (
                    <button
                        key={estado.id}
                        className={`bitacora-resumen-card ${filtroEstado === estado.id ? 'activo' : ''}`}
                        onClick={() => setFiltroEstado(filtroEstado === estado.id ? 'todos' : estado.id)}
                    >
                        <span className="bitacora-resumen-icono">{estado.icono}</span>
                        <span className="bitacora-resumen-valor">{conteoPorEstado[estado.id]}</span>
                        <span className="bitacora-resumen-etiqueta">{estado.etiqueta}</span>
                    </button>
                ))}
            </div>

            <div className="bitacora-filtros">
                <input
                    className="bitacora-buscador"
                    placeholder="🔍 Buscar por descripción o localidad…"
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                />
                <select value={filtroLocalidad} onChange={(e) => setFiltroLocalidad(e.target.value)}>
                    <option value="todas">Todas las localidades</option>
                    {localidades.map((loc) => (
                        <option key={loc.nombre} value={loc.nombre}>{loc.nombre}</option>
                    ))}
                </select>
                <select value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)}>
                    <option value="todos">Todos los niveles</option>
                    {NIVELES.map((n) => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                    <option value="todos">Todos los estados</option>
                    {ESTADOS.map((e) => (
                        <option key={e.id} value={e.id}>{e.etiqueta}</option>
                    ))}
                </select>
            </div>

            {error && <p className="centro-control-error">{error}</p>}

            {cargando ? (
                <p className="panel-alertas-vacio">Cargando bitácora…</p>
            ) : eventosFiltrados.length === 0 ? (
                <div className="estado-vacio">
                    <span className="estado-vacio-icono">🗂️</span>
                    <p>No hay casos que coincidan con estos filtros.</p>
                </div>
            ) : (
                <div className="bitacora-lista">
                    {eventosFiltrados.map((ev) => {
                        const estadoActual = ev.estado_caso || 'pendiente';
                        return (
                            <div key={ev.id} className={`bitacora-caso bitacora-caso-${estadoActual}`}>
                                <div className="bitacora-caso-info">
                                    <div className="bitacora-caso-cabecera">
                                        <span className={`alerta-nivel alerta-nivel-${ev.nivel_riesgo?.toLowerCase()}`}>
                                            {ev.nivel_riesgo}
                                        </span>
                                        <span className="bitacora-caso-localidad">📍 {ev.ubicacion}</span>
                                        <span className="bitacora-caso-fecha">
                                            {new Date(ev.marca_tiempo).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="bitacora-caso-descripcion">{ev.descripcion}</p>
                                </div>

                                <div className="bitacora-caso-acciones">
                                    {ESTADOS.map((estado) => (
                                        <button
                                            key={estado.id}
                                            className={`btn-mini ${estadoActual === estado.id ? 'btn-mini-activo' : ''}`}
                                            onClick={() => cambiarEstado(ev.id, estado.id)}
                                            disabled={estadoActual === estado.id}
                                        >
                                            {estado.icono} {estado.etiqueta}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
