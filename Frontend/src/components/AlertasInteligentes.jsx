import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function AlertasInteligentes() {
    const [eventos, setEventos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [filtroRiesgo, setFiltroRiesgo] = useState('todos');

    useEffect(() => {
        api.listarEventos(100)
        .then(setEventos)
        .finally(() => setCargando(false));
    }, []);

    const eventosFiltrados = eventos.filter(
        (e) => filtroRiesgo === 'todos' || e.nivel_riesgo === filtroRiesgo
    );

    return (
        <div>
            <div className="dashboard-toolbar">
                <h2>Alertas Inteligentes</h2>
                <select className="select-filtro" value={filtroRiesgo} onChange={(e) => setFiltroRiesgo(e.target.value)}>
                <option value="todos">Todos los niveles</option>
                <option value="ALTO">Alto</option>
                <option value="MEDIO">Medio</option>
                <option value="BAJO">Bajo</option>
                </select>
            </div>

            {cargando ? (
                <p>Cargando alertas…</p>
            ) : eventosFiltrados.length === 0 ? (
                <p className="tarjeta-camara-espera">No hay alertas registradas todavía.</p>
            ) : (
                <table className="tabla-alertas">
                <thead>
                    <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Riesgo</th>
                    <th>Confianza</th>
                    <th>Ubicación</th>
                    <th>Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    {eventosFiltrados.map((evento) => (
                    <tr key={evento.id}>
                        <td>{new Date(evento.marca_tiempo).toLocaleString()}</td>
                        <td>{evento.tipo_evento}</td>
                        <td>
                        <span className={`etiqueta-riesgo etiqueta-${evento.nivel_riesgo?.toLowerCase()}`}>
                            {evento.nivel_riesgo}
                        </span>
                        </td>
                        <td>{Math.round((evento.confianza || 0) * 100)}%</td>
                        <td>{evento.ubicacion}</td>
                        <td>{evento.descripcion}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
        </div>
    );
}
