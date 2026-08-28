import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import MosaicoCamaras from '../components/MosaicoCamaras';
import MapaCalor from '../components/MapaCalor';
import PanelAlertas from '../components/PanelAlertas';
import AlertasInteligentes from '../components/AlertasInteligentes';
import VistaPendiente from '../components/VistaPendiente';

export default function Dashboard({ sesion, onCerrarSesion }) {
    const [vistaActiva, setVistaActiva] = useState('monitoreo');

    function renderizarVistaPrincipal() {
        switch (vistaActiva) {
        case 'monitoreo':
            return <MosaicoCamaras />;
        case 'alertas':
            return <AlertasInteligentes />;
        case 'patrones':
            return <MapaCalor />;
        case 'camaras':
            return <MosaicoCamaras />; // misma gestión CRUD, distinto punto de entrada del menú
        case 'control':
            return <VistaPendiente titulo="Centro de Control Estratégico" icono="🏛️" sprintSugerido="Sprint 26 - Dashboard completo" />;
        case 'facial':
            return <VistaPendiente titulo="Reconocimiento Facial" icono="👤" sprintSugerido="Sprint 23 - Reconocimiento facial (HU11)" />;
        case 'reportes':
            return <VistaPendiente titulo="Reportes" icono="📋" sprintSugerido="Sprint 27 - Reportes (HU20)" />;
        case 'usuarios':
            return <VistaPendiente titulo="Gestión de Usuarios" icono="👥" sprintSugerido="RF-19 en adelante" />;
        default:
            return null;
        }
    }

    return (
        <div id="app">
        <div className="topbar">
            <div className="topbar-logo">🛡️</div>
            <div className="topbar-title">
            Sistema de <span>Vigilancia</span> IA
            </div>
            <div className="topbar-user">
            <span>{sesion.usuario}</span>
            <span className="topbar-badge">{sesion.rol}</span>
            <button className="btn-logout" onClick={onCerrarSesion}>
                Cerrar Sesión
            </button>
            </div>
        </div>

        <div className="dashboard-body">
            <Sidebar vistaActiva={vistaActiva} onCambiarVista={setVistaActiva} />

            <div className="dashboard-principal">{renderizarVistaPrincipal()}</div>

            {vistaActiva === 'monitoreo' && (
            <aside className="dashboard-lateral">
                <PanelAlertas idCamara="1" activo />
            </aside>
            )}
        </div>
        </div>
    );
}
