import { useEffect, useState } from 'react';
import { api } from '../api/client';

const SECCIONES = [
    {
        etiqueta: 'Principal',
        items: [
        { id: 'monitoreo', icono: '📹', texto: 'Monitoreo en Vivo' },
        { id: 'alertas', icono: '🚨', texto: 'Alertas Inteligentes' },
        { id: 'control', icono: '🏛️', texto: 'Centro de Control' },
        ],
    },
    {
        etiqueta: 'Análisis',
        items: [
        { id: 'bitacora', icono: '🗂️', texto: 'Bitácora de Casos' },
        { id: 'patrones', icono: '📊', texto: 'Análisis Territorial' },
        { id: 'reportes', icono: '📋', texto: 'Reportes' },
        ],
    },
    {
        etiqueta: 'Gestión',
        items: [
        { id: 'camaras', icono: '🎥', texto: 'Gestión de Cámaras' },
        { id: 'usuarios', icono: '👥', texto: 'Gestión de Usuarios' },
        ],
    },
];

function useEstadisticasRapidas() {
    const [datos, setDatos] = useState({ camarasActivas: 0, totalLocalidades: 12, alertasHoy: 0, alertasAltas: 0 });

    useEffect(() => {
        let cancelado = false;

        async function actualizar() {
            try {
                const [camaras, localidades, estadisticas] = await Promise.all([
                    api.listarCamaras(),
                    api.listarLocalidades(),
                    api.estadisticasEventos(),
                ]);
                if (cancelado) return;
                setDatos({
                    camarasActivas: camaras.filter((c) => c.estado === 'activa').length,
                    totalLocalidades: localidades.length,
                    alertasHoy: estadisticas.total ?? 0,
                    alertasAltas: estadisticas.alto ?? 0,
                });
            } catch {
                // silencioso: el sidebar no debe romper la navegación si esto falla
            }
        }

        actualizar();
        const intervalo = setInterval(actualizar, 8000);
        return () => {
            cancelado = true;
            clearInterval(intervalo);
        };
    }, []);

    return datos;
}

export default function Sidebar({ vistaActiva, onCambiarVista }) {
    const stats = useEstadisticasRapidas();

    return (
        <nav className="sidebar">
        <div className="sidebar-brand">
            <span className="sidebar-brand-icono">🛰️</span>
            <div>
            <div className="sidebar-brand-titulo">VigIA</div>
            <div className="sidebar-brand-sub">Centro de operaciones</div>
            </div>
        </div>

        {SECCIONES.map((seccion) => (
            <div key={seccion.etiqueta} className="sidebar-section">
            <div className="sidebar-label">{seccion.etiqueta}</div>
            {seccion.items.map((item) => (
                <button
                key={item.id}
                className={`nav-item ${vistaActiva === item.id ? 'activo' : ''}`}
                onClick={() => onCambiarVista(item.id)}
                >
                <span className="nav-icon">{item.icono}</span>
                <span>{item.texto}</span>
                </button>
            ))}
            </div>
        ))}

        <div className="sidebar-stats">
            <div className="sidebar-stats-titulo">Estado actual</div>
            <div className="sidebar-stats-fila">
                <span className="sidebar-stats-etiqueta">Cámaras activas</span>
                <span className="sidebar-stats-valor">{stats.camarasActivas}/{stats.totalLocalidades}</span>
            </div>
            <div className="sidebar-stats-fila">
                <span className="sidebar-stats-etiqueta">Alertas registradas</span>
                <span className="sidebar-stats-valor">{stats.alertasHoy}</span>
            </div>
            <div className="sidebar-stats-fila">
                <span className="sidebar-stats-etiqueta">Alertas críticas</span>
                <span className={`sidebar-stats-valor ${stats.alertasAltas > 0 ? 'alto' : ''}`}>
                    {stats.alertasAltas}
                </span>
            </div>
        </div>

        <div className="sidebar-footer">
            <span className="sidebar-footer-punto" />
            Sistema operativo
        </div>
        </nav>
    );
}
