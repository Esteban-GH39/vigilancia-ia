import { useState } from 'react';
import { api } from '../api/client';
import TarjetaCamara from '../components/TarjetaCamara';
import PanelAlertas from '../components/PanelAlertas';

const CAMARAS_DEMO = [{ id: 'cam1', nombre: 'CAM 1' }];

export default function Dashboard({ sesion, onCerrarSesion }) {
    const [vigilanciaActiva, setVigilanciaActiva] = useState(false);

    async function alternarVigilancia() {
        if (vigilanciaActiva) {
        await api.detenerCamara('cam1');
        } else {
        await api.iniciarCamara('cam1');
        }
        setVigilanciaActiva(!vigilanciaActiva);
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
            <div className="dashboard-principal">
            <div className="dashboard-toolbar">
                <h2>Monitoreo en vivo</h2>
                <button className={vigilanciaActiva ? 'btn-detener' : 'btn-iniciar'} onClick={alternarVigilancia}>
                {vigilanciaActiva ? '■ Detener' : '▶ Iniciar Vigilancia'}
                </button>
            </div>

            <div className="mosaico-camaras">
                {CAMARAS_DEMO.map((camara) => (
                <TarjetaCamara
                    key={camara.id}
                    idCamara={camara.id}
                    nombre={camara.nombre}
                    activa={vigilanciaActiva}
                />
                ))}
            </div>
            </div>

            <aside className="dashboard-lateral">
            <PanelAlertas idCamara="cam1" activo={vigilanciaActiva} />
            </aside>
        </div>
        </div>
    );
}
