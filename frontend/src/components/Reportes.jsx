import { useEffect, useState } from 'react';
import { api } from '../api/client';

const NIVELES = ['ALTO', 'MEDIO', 'BAJO'];

export default function Reportes() {
    const [localidades, setLocalidades] = useState([]);
    const [eventos, setEventos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [exportando, setExportando] = useState(false);
    const [error, setError] = useState('');

    const [filtroLocalidad, setFiltroLocalidad] = useState('todas');
    const [filtroNivel, setFiltroNivel] = useState('todos');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    useEffect(() => {
        api.listarLocalidades().then(setLocalidades).catch(() => {});
    }, []);

    useEffect(() => {
        cargarVistaPrevia();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtroLocalidad, filtroNivel, fechaInicio, fechaFin]);

    function filtrosActuales() {
        return {
            ubicacion: filtroLocalidad === 'todas' ? '' : filtroLocalidad,
            nivelRiesgo: filtroNivel === 'todos' ? '' : filtroNivel,
            fechaInicio: fechaInicio || '',
            fechaFin: fechaFin || '',
        };
    }

    async function cargarVistaPrevia() {
        setCargando(true);
        try {
            const datos = await api.listarEventosFiltrados(filtrosActuales());
            setEventos(datos);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    async function descargar(formato) {
        setExportando(true);
        setError('');
        try {
            await api.exportarReporte(filtrosActuales(), formato);
        } catch (err) {
            setError(err.message);
        } finally {
            setExportando(false);
        }
    }

    return (
        <div>
            <div className="dashboard-toolbar">
                <h2>Reportes</h2>
                <button className="btn-mini" onClick={cargarVistaPrevia}>↻ Actualizar</button>
            </div>

            <div className="bitacora-filtros">
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
                <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    aria-label="Fecha inicio"
                />
                <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    aria-label="Fecha fin"
                />
            </div>

            <div className="dashboard-toolbar">
                <p>{cargando ? 'Cargando…' : `${eventos.length} caso${eventos.length === 1 ? '' : 's'} con estos filtros`}</p>
                <div className="tabla-usuarios-acciones">
                    <button className="btn-mini" disabled={exportando} onClick={() => descargar('csv')}>
                        {exportando ? 'Generando…' : '⬇️ Descargar CSV'}
                    </button>
                    <button className="btn-mini" disabled={exportando} onClick={() => descargar('pdf')}>
                        {exportando ? 'Generando…' : '⬇️ Descargar PDF'}
                    </button>
                </div>
            </div>

            {error && <p className="centro-control-error">{error}</p>}

            {!cargando && eventos.length === 0 ? (
                <div className="estado-vacio">
                    <span className="estado-vacio-icono">📋</span>
                    <p>No hay casos que coincidan con estos filtros.</p>
                </div>
            ) : (
                <div className="bitacora-lista">
                    {eventos.map((ev) => (
                        <div key={ev.id} className={`bitacora-caso bitacora-caso-${ev.estado_caso || 'pendiente'}`}>
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
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}