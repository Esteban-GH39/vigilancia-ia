import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import MosaicoCamaras from '../components/MosaicoCamaras';
import MapaCalor from '../components/MapaCalor';
import PanelAlertas from '../components/PanelAlertas';
import AlertasInteligentes from '../components/AlertasInteligentes';
import BitacoraCasos from '../components/BitacoraCasos';
import GestionUsuarios from '../components/GestionUsuarios';
import VistaPendiente from '../components/VistaPendiente';
import Reportes from '../components/Reportes';

const RESTRICCIONES_VISTA = {
    usuarios: ['admin'],
    camaras: ['admin', 'operador'],
};

const ETIQUETA_ROL = {
    admin: 'Administrador',
    operador: 'Operador',
    visualizador: 'Visualizador',
};

export default function Dashboard({ sesion, onCerrarSesion }) {
    const [vistaActiva, setVistaActiva] = useState('monitoreo');
    const rol = sesion.rol;

    function tieneAcceso(vista) {
        const rolesPermitidos = RESTRICCIONES_VISTA[vista];
        return !rolesPermitidos || rolesPermitidos.includes(rol);
    }

    function renderizarVistaPrincipal() {
        if (!tieneAcceso(vistaActiva)) {
            return (
                <div className="estado-vacio">
                    <span className="estado-vacio-icono">🔒</span>
                    <p>No tienes permiso para ver este módulo con tu rol actual ({rol}).</p>
                </div>
            );
        }

        switch (vistaActiva) {
        case 'monitoreo':
            return <MosaicoCamaras rol={rol} />;
        case 'alertas':
            return <AlertasInteligentes />;
        case 'patrones':
            return <MapaCalor />;
        case 'camaras':
            return <MosaicoCamaras rol={rol} />; // misma gestión CRUD, distinto punto de entrada del menú
        case 'control':
            return <VistaPendiente titulo="Centro de Control Estratégico" icono="🏛️" sprintSugerido="Sprint 2 - Dashboard completo" />;
        case 'bitacora':
            return <BitacoraCasos rol={rol} />;
        case 'reportes':
            return <Reportes />;
        case 'usuarios':
            return <GestionUsuarios />;
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
            <span className="topbar-badge">{ETIQUETA_ROL[sesion.rol] || sesion.rol}</span>
            <button className="btn-logout" onClick={onCerrarSesion}>
                Cerrar Sesión
            </button>
            </div>
        </div>

        <div className="dashboard-body">
            <Sidebar vistaActiva={vistaActiva} onCambiarVista={setVistaActiva} rol={rol} />

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
