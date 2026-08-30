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
    const localidadCritica = [...localidades].sort((a, b) => b.eventos - a.eventos)[0];
    const localidadesRankeadas = [...localidades].sort((a, b) => b.eventos - a.eventos);
    const localidadesActivas = localidades.filter((l) => l.eventos > 0).length;

    return (
        <div>
            <div className="dashboard-toolbar">
                <h2>Análisis Territorial</h2>
            </div>

            <div className="kpi-grid">
                <div className="kpi-card">
                    <span className="kpi-valor">{totalEventos}</span>
                    <span className="kpi-etiqueta">Eventos totales registrados</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-valor">{localidadesActivas}/{localidades.length}</span>
                    <span className="kpi-etiqueta">Localidades con actividad</span>
                </div>
                <div className="kpi-card kpi-card-alto">
                    <span className="kpi-valor">{localidadCritica?.eventos > 0 ? localidadCritica.nombre : '—'}</span>
                    <span className="kpi-etiqueta">Localidad más crítica</span>
                </div>
            </div>

            <div className="analisis-territorial-layout">
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

                <div className="ranking-localidades">
                    <h3>Ranking por localidad</h3>
                    <div className="ranking-lista">
                        {localidadesRankeadas.map((loc, indice) => {
                            const nivel = nivelDeRiesgo(loc.eventos, maximoEventos);
                            return (
                                <div key={loc.nombre} className="ranking-fila">
                                    <span className="ranking-posicion">#{indice + 1}</span>
                                    <div className="ranking-info">
                                        <div className="ranking-nombre">{loc.nombre}</div>
                                        <div className="ranking-barra-track">
                                            <div
                                                className="ranking-barra-relleno"
                                                style={{
                                                    width: `${maximoEventos > 0 ? (loc.eventos / maximoEventos) * 100 : 0}%`,
                                                    background: nivel.color,
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <span className="ranking-valor">{loc.eventos}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
