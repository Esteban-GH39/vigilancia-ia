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
        { id: 'facial', icono: '👤', texto: 'Reconocimiento Facial' },
        { id: 'patrones', icono: '📊', texto: 'Análisis de Patrones' },
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

export default function Sidebar({ vistaActiva, onCambiarVista }) {
    return (
        <nav className="sidebar">
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
        </nav>
    );
}
