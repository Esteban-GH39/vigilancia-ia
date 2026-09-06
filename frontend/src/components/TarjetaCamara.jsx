import { useState } from 'react';
import { useVideoStream } from '../hooks/useVideoStream';
import { api } from '../api/client';

export default function TarjetaCamara({ camara, onEliminada, soloLectura = false }) {
    const [activa, setActiva] = useState(camara.estado === 'activa');
    const [cargando, setCargando] = useState(false);
    const urlFrame = useVideoStream(camara.id_camara, activa);

    async function alternar() {
        setCargando(true);
        try {
        if (activa) {
            await api.detenerCamara(camara.id_camara);
        } else {
            await api.iniciarCamara(camara.id_camara);
        }
        setActiva(!activa);
        } catch (err) {
        alert(err.message);
        } finally {
        setCargando(false);
        }
    }

    async function eliminar() {
        if (activa) {
        alert('Detén la vigilancia antes de eliminar esta cámara.');
        return;
        }
        if (!confirm(`¿Eliminar "${camara.nombre}"?`)) return;
        await api.eliminarCamara(camara.id_camara);
        onEliminada(camara.id_camara);
    }

    return (
        <div className={`tarjeta-camara ${activa ? 'tarjeta-camara-activa' : ''}`}>
        <div className="tarjeta-camara-header">
            <span className="tarjeta-camara-nombre">{camara.nombre}</span>
            <span className={`estado-punto ${activa ? 'activo' : 'inactivo'}`} />
        </div>

        <div className="tarjeta-camara-video">
            {urlFrame ? (
            <img src={urlFrame} alt={`Transmisión de ${camara.nombre}`} />
            ) : (
            <div className="tarjeta-camara-espera">
                {activa ? (
                <>
                    <span className="spinner-conexion" />
                    <span>Conectando…</span>
                </>
                ) : (
                <>
                    <span className="tarjeta-camara-espera-icono">📷</span>
                    <span>En espera</span>
                </>
                )}
            </div>
            )}
            {activa && urlFrame && (
            <span className="badge-en-vivo">
                <span className="badge-en-vivo-punto" /> EN VIVO
            </span>
            )}
        </div>

        <div className="tarjeta-camara-footer">
            <span className="tarjeta-camara-ubicacion">📍 {camara.ubicacion}</span>
            {!soloLectura && (
            <div className="tarjeta-camara-botones">
                <button className="btn-mini" onClick={alternar} disabled={cargando}>
                    {activa ? '■ Detener' : '▶ Iniciar'}
                </button>
                <button className="btn-mini btn-mini-peligro" onClick={eliminar} disabled={activa}>
                    🗑
                </button>
            </div>
            )}
        </div>
        </div>
    );
}
