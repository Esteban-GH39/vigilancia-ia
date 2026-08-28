import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { api } from '../api/client';

const CENTRO_BOGOTA = [4.6486, -74.1178];

function CapaCalor({ puntos }) {
    const mapa = useMap();

    useEffect(() => {
        if (!puntos || puntos.length === 0) return undefined;

        const capa = L.heatLayer(puntos, { radius: 35, blur: 25, maxZoom: 14 }).addTo(mapa);
        return () => mapa.removeLayer(capa);
    }, [mapa, puntos]);

    return null;
}

function nivelDeRiesgo(eventos, maximo) {
    if (eventos === 0 || maximo === 0) return { color: '#556072', etiqueta: 'Sin eventos' };
    const proporcion = eventos / maximo;
    if (proporcion >= 0.66) return { color: '#ef4444', etiqueta: 'Alta' };
    if (proporcion >= 0.33) return { color: '#eab308', etiqueta: 'Media' };
    return { color: '#22c55e', etiqueta: 'Baja' };
}

export default function MapaCalor() {
    const [puntos, setPuntos] = useState([]);
    const [localidades, setLocalidades] = useState([]);
    const [localidadesPrioritarias, setLocalidadesPrioritarias] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        api.mapaCalor()
            .then((datos) => {
                setPuntos(datos.puntos);
                setLocalidades(datos.localidades ?? []);
                setLocalidadesPrioritarias(datos.localidades_prioritarias ?? []);
            })
            .finally(() => setCargando(false));
    }, []);

    const maximoEventos = Math.max(...localidades.map((l) => l.eventos), 0);
    const totalEventos = localidades.reduce((suma, l) => suma + l.eventos, 0);

    return (
        <div>
            <div className="dashboard-toolbar">
                <h2>Análisis de Patrones Delictivos</h2>
            </div>

            <div className="mapa-tarjeta">
                <div className="mapa-header">
                    <p className="mapa-nota">
                        📍 Localidades prioritarias:{' '}
                        {localidadesPrioritarias.length > 0 ? localidadesPrioritarias.join(', ') : 'aún sin datos suficientes'}
                    </p>
                    <div className="mapa-leyenda">
                        <span className="mapa-leyenda-item"><span className="mapa-leyenda-punto baja" /> Baja</span>
                        <span className="mapa-leyenda-item"><span className="mapa-leyenda-punto media" /> Media</span>
                        <span className="mapa-leyenda-item"><span className="mapa-leyenda-punto alta" /> Alta</span>
                    </div>
                </div>

                {cargando ? (
                    <div className="mapa-contenedor mapa-contenedor-vacio">
                        <span className="spinner-conexion" />
                        <span>Cargando mapa de calor…</span>
                    </div>
                ) : (
                    <>
                        {totalEventos === 0 && (
                            <p className="mapa-nota" style={{ marginBottom: '0.6rem' }}>
                                Aún no hay eventos registrados: el mapa muestra las 12 localidades monitoreadas,
                                la capa de calor se activará automáticamente cuando empiecen a llegar alertas.
                            </p>
                        )}
                        <div className="mapa-contenedor">
                            <MapContainer center={CENTRO_BOGOTA} zoom={11} style={{ height: '100%', width: '100%' }}>
                                <TileLayer
                                    attribution='&copy; OpenStreetMap contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <CapaCalor puntos={puntos} />
                                {localidades.map((loc) => {
                                    const nivel = nivelDeRiesgo(loc.eventos, maximoEventos);
                                    return (
                                        <CircleMarker
                                            key={loc.nombre}
                                            center={[loc.latitud, loc.longitud]}
                                            radius={loc.eventos > 0 ? 9 + Math.min(loc.eventos, 10) : 7}
                                            pathOptions={{
                                                color: nivel.color,
                                                fillColor: nivel.color,
                                                fillOpacity: 0.55,
                                                weight: 2,
                                            }}
                                        >
                                            <Popup>
                                                <strong>{loc.nombre}</strong>
                                                <br />
                                                {loc.eventos} evento{loc.eventos === 1 ? '' : 's'} registrado{loc.eventos === 1 ? '' : 's'}
                                                <br />
                                                Riesgo: {nivel.etiqueta}
                                            </Popup>
                                        </CircleMarker>
                                    );
                                })}
                            </MapContainer>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
