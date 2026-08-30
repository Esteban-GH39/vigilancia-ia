import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import TarjetaCamara from './TarjetaCamara';
import TarjetaLocalidadPendiente from './TarjetaLocalidadPendiente';
import FormularioCamara from './FormularioCamara';

export default function MosaicoCamaras() {
    const [camaras, setCamaras] = useState([]);
    const [localidades, setLocalidades] = useState([]);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [localidadParaAsignar, setLocalidadParaAsignar] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [seleccionadas, setSeleccionadas] = useState(null); // null = "todas" hasta que carguen
    const [selectorAbierto, setSelectorAbierto] = useState(false);

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
            setSeleccionadas((previas) => previas ?? datosLocalidades.map((l) => l.nombre));
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

    function alternarLocalidad(nombre) {
        setSeleccionadas((previas) =>
            previas.includes(nombre) ? previas.filter((n) => n !== nombre) : [...previas, nombre]
        );
    }

    // Une cada localidad del catálogo con su cámara real (si ya la tiene).
    // Las localidades con cámara real van primero, para que lo funcional
    // se vea de una vez sin tener que buscarlo entre placeholders.
    const listaCompleta = useMemo(() => {
        const localidadesConCamara = localidades
            .map((loc) => ({ localidad: loc, camara: camaras.find((c) => c.ubicacion === loc.nombre) || null }))
            .sort((a, b) => (b.camara ? 1 : 0) - (a.camara ? 1 : 0));

        // Cámaras registradas en ubicaciones fuera del catálogo de 12
        const camarasFueraDeCatalogo = camaras.filter(
            (c) => !localidades.some((loc) => loc.nombre === c.ubicacion)
        );

        return [
            ...localidadesConCamara,
            ...camarasFueraDeCatalogo.map((c) => ({ localidad: { nombre: c.ubicacion }, camara: c })),
        ];
    }, [localidades, camaras]);

    const listaSeleccionada = seleccionadas ?? [];
    const itemsVisibles = listaCompleta.filter((item) => listaSeleccionada.includes(item.localidad.nombre));
    const cantidadConCamara = camaras.length;

    // La distribución del grid se adapta automáticamente a cuántas
    // localidades eligió ver la persona, no a un número fijo.
    const claseDensidad =
        itemsVisibles.length === 1 ? 'mosaico-camaras--vista-1' :
        itemsVisibles.length <= 3 ? 'mosaico-camaras--vista-3' : '';

    return (
        <div>
            <div className="dashboard-toolbar">
                <h2>Monitoreo en vivo ({cantidadConCamara}/{localidades.length} localidades con cámara)</h2>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div className="selector-localidades-envoltorio">
                        <button className="btn-mini" onClick={() => setSelectorAbierto((v) => !v)}>
                            🎚️ Ver localidades ({listaSeleccionada.length}/{localidades.length})
                        </button>
                        {selectorAbierto && (
                            <div className="selector-localidades-panel">
                                <div className="selector-localidades-acciones">
                                    <button onClick={() => setSeleccionadas(localidades.map((l) => l.nombre))}>
                                        Todas
                                    </button>
                                    <button
                                        onClick={() =>
                                            setSeleccionadas(
                                                localidades
                                                    .filter((l) => camaras.some((c) => c.ubicacion === l.nombre))
                                                    .map((l) => l.nombre)
                                            )
                                        }
                                    >
                                        Solo con cámara
                                    </button>
                                    <button onClick={() => setSeleccionadas([])}>Ninguna</button>
                                </div>
                                <div className="selector-localidades-lista">
                                    {localidades.map((loc) => (
                                        <label key={loc.nombre} className="selector-localidades-item">
                                            <input
                                                type="checkbox"
                                                checked={listaSeleccionada.includes(loc.nombre)}
                                                onChange={() => alternarLocalidad(loc.nombre)}
                                            />
                                            {loc.nombre}
                                            {camaras.some((c) => c.ubicacion === loc.nombre) && (
                                                <span className="selector-localidades-badge">📹</span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <button className="btn-iniciar" onClick={() => abrirFormularioPara(null)}>
                        + Registrar cámara
                    </button>
                </div>
            </div>

            {cargando ? (
                <div className="mosaico-camaras">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="tarjeta-camara tarjeta-camara-skeleton" />
                    ))}
                </div>
            ) : localidades.length === 0 ? (
                <div className="estado-vacio">
                    <span className="estado-vacio-icono">🎥</span>
                    <p>Todavía no hay cámaras ni localidades registradas.</p>
                    <button className="btn-iniciar" onClick={() => abrirFormularioPara(null)}>
                        + Registrar la primera cámara
                    </button>
                </div>
            ) : itemsVisibles.length === 0 ? (
                <div className="estado-vacio">
                    <span className="estado-vacio-icono">👁️</span>
                    <p>No seleccionaste ninguna localidad para ver. Ábrela con "🎚️ Ver localidades".</p>
                </div>
            ) : (
                <div className={`mosaico-camaras ${claseDensidad}`}>
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
