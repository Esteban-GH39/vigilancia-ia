import { useEffect, useState } from 'react';
import { api } from '../api/client';
import TarjetaCamara from './TarjetaCamara';
import TarjetaLocalidadPendiente from './TarjetaLocalidadPendiente';
import FormularioCamara from './FormularioCamara';

const OPCIONES_VISTA = [12, 6, 3, 1];

export default function MosaicoCamaras() {
    const [camaras, setCamaras] = useState([]);
    const [localidades, setLocalidades] = useState([]);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [localidadParaAsignar, setLocalidadParaAsignar] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [cantidadVista, setCantidadVista] = useState(12);
    const [localidadEnfocada, setLocalidadEnfocada] = useState(null);

    useEffect(() => {
        cargarTodo();
    }, []);

    async function cargarTodo() {
        try {
            const [datosCamaras, datosLocalidades] = await Promise.all([
                api.listarCamaras(),
                api.listarLocalidades(),
            ]);
            setCamaras(datosCamaras);
            setLocalidades(datosLocalidades);
            if (datosLocalidades.length > 0) setLocalidadEnfocada(datosLocalidades[0].nombre);
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

    function abrirFormularioPara(nombreLocalidad) {
        setLocalidadParaAsignar(nombreLocalidad);
        setMostrarFormulario(true);
    }

    const localidadesConCamara = localidades
        .map((loc) => ({ localidad: loc, camara: camaras.find((c) => c.ubicacion === loc.nombre) || null }))
        .sort((a, b) => (b.camara ? 1 : 0) - (a.camara ? 1 : 0));

    const camarasFueraDeCatalogo = camaras.filter(
        (c) => !localidades.some((loc) => loc.nombre === c.ubicacion)
    );

    const listaCompleta = [
        ...localidadesConCamara,
        ...camarasFueraDeCatalogo.map((c) => ({ localidad: { nombre: c.ubicacion }, camara: c })),
    ];

    const itemsVisibles =
        cantidadVista === 1
            ? listaCompleta.filter((item) => item.localidad.nombre === localidadEnfocada)
            : listaCompleta.slice(0, cantidadVista);

    return (
        <div>
            <div className="dashboard-toolbar">
                <h2>Monitoreo en vivo ({camaras.length}/{localidades.length} localidades con cámara)</h2>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div className="selector-vista-mosaico">
                        {OPCIONES_VISTA.map((n) => (
                            <button
                                key={n}
                                className={cantidadVista === n ? 'activo' : ''}
                                onClick={() => setCantidadVista(n)}
                            >
                                {n === 1 ? '1 cámara' : `${n} localidades`}
                            </button>
                        ))}
                    </div>
                    <button className="btn-iniciar" onClick={() => abrirFormularioPara(null)}>
                        + Registrar cámara
                    </button>
                </div>
            </div>

            {cantidadVista === 1 && localidades.length > 0 && (
                <div className="mosaico-selector-localidad-unica">
                    <select value={localidadEnfocada ?? ''} onChange={(e) => setLocalidadEnfocada(e.target.value)}>
                        {localidades.map((loc) => (
                            <option key={loc.nombre} value={loc.nombre}>
                                {loc.nombre} {camaras.some((c) => c.ubicacion === loc.nombre) ? '📹' : '— sin cámara'}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {cargando ? (
                <div className="mosaico-camaras">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="tarjeta-camara tarjeta-camara-skeleton" />
                    ))}
                </div>
            ) : camaras.length === 0 && localidades.length === 0 ? (
                <div className="estado-vacio">
                    <span className="estado-vacio-icono">🎥</span>
                    <p>Todavía no hay cámaras ni localidades registradas.</p>
                    <button className="btn-iniciar" onClick={() => abrirFormularioPara(null)}>
                        + Registrar la primera cámara
                    </button>
                </div>
            ) : (
                <div className={`mosaico-camaras mosaico-camaras--vista-${cantidadVista}`}>
                    {itemsVisibles.map(({ localidad, camara }) =>
                        camara ? (
                            <TarjetaCamara
                                key={camara.id_camara}
                                camara={camara}
                                onEliminada={manejarCamaraEliminada}
                            />
                        ) : (
                            <TarjetaLocalidadPendiente
                                key={localidad.nombre}
                                localidad={localidad}
                                onAsignar={abrirFormularioPara}
                            />
                        )
                    )}
                </div>
            )}

            {mostrarFormulario && (
                <FormularioCamara
                    localidadInicial={localidadParaAsignar}
                    onCamaraCreada={manejarCamaraCreada}
                    onCerrar={() => setMostrarFormulario(false)}
                />
            )}
        </div>
    );
}
