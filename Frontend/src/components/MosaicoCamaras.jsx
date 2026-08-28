import { useEffect, useState } from 'react';
import { api } from '../api/client';
import TarjetaCamara from './TarjetaCamara';
import FormularioCamara from './FormularioCamara';

export default function MosaicoCamaras() {
    const [camaras, setCamaras] = useState([]);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        cargarCamaras();
    }, []);

    async function cargarCamaras() {
        try {
        const datos = await api.listarCamaras();
        setCamaras(datos);
        } finally {
        setCargando(false);
        }
    }

    function manejarCamaraCreada(nuevaCamara) {
        setCamaras((previas) => [...previas, nuevaCamara]);
    }

    function manejarCamaraEliminada(idCamara) {
        setCamaras((previas) => previas.filter((c) => c.id_camara !== idCamara));
    }

    return (
        <div>
        <div className="dashboard-toolbar">
            <h2>Monitoreo en vivo ({camaras.length} cámaras)</h2>
            <button className="btn-iniciar" onClick={() => setMostrarFormulario(true)}>
            + Registrar cámara
            </button>
        </div>

        {cargando ? (
            <p>Cargando cámaras…</p>
        ) : camaras.length === 0 ? (
            <p className="tarjeta-camara-espera">
            Todavía no hay cámaras registradas. Usa "+ Registrar cámara" para agregar la primera.
            </p>
        ) : (
            <div className="mosaico-camaras">
            {camaras.map((camara) => (
                <TarjetaCamara key={camara.id_camara} camara={camara} onEliminada={manejarCamaraEliminada} />
            ))}
            </div>
        )}

        {mostrarFormulario && (
            <FormularioCamara
            onCamaraCreada={manejarCamaraCreada}
            onCerrar={() => setMostrarFormulario(false)}
            />
        )}
        </div>
    );
}
