import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
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

    export default function MapaCalor() {
    const [puntos, setPuntos] = useState([]);
    const [localidades, setLocalidades] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        api.mapaCalor()
        .then((datos) => {
            setPuntos(datos.puntos);
            setLocalidades(datos.localidades_prioritarias);
        })
        .finally(() => setCargando(false));
    }, []);

    return (
        <div>
        <div className="dashboard-toolbar">
            <h2>Análisis de Patrones Delictivos</h2>
        </div>

        <p className="mapa-nota">
            Localidades prioritarias identificadas: {localidades.join(', ')}
        </p>

        {cargando ? (
            <p>Cargando mapa de calor…</p>
        ) : puntos.length === 0 ? (
            <p className="tarjeta-camara-espera">
            Aún no hay eventos registrados para generar el mapa de calor. Inicia vigilancia en
            alguna cámara para empezar a acumular datos.
            </p>
        ) : (
            <div className="mapa-contenedor">
            <MapContainer center={CENTRO_BOGOTA} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <CapaCalor puntos={puntos} />
            </MapContainer>
            </div>
        )}
        </div>
    );
}
