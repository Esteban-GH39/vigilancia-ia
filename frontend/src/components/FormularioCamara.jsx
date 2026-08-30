import { useEffect, useState } from 'react';
import { api } from '../api/client';

const TIPOS_FUENTE = [
    {
        id: 'video',
        titulo: '🎞️ Subir video de la localidad',
        descripcion: 'Recomendado para la sustentación: el sistema reproduce el video en loop como si fuera la transmisión en vivo de esa localidad, corriendo por el mismo pipeline de IA que una cámara real.',
    },
    {
        id: 'webcam',
        titulo: '💻 Cámara web de este equipo',
        descripcion: 'Usa la cámara del computador donde corre el backend en este momento. Útil para mostrar detección en vivo durante la demo.',
    },
    {
        id: 'IP',
        titulo: '📡 Cámara IP / RTSP',
        descripcion: 'Para una cámara de seguridad real en producción. Documentado en la arquitectura, pero no funcional en este entorno de sustentación por no contar con hardware real.',
    },
];

export default function FormularioCamara({ onCamaraCreada, onCerrar, localidadInicial = null }) {
    const [localidades, setLocalidades] = useState([]);
    const [nombre, setNombre] = useState('');
    const [ubicacion, setUbicacion] = useState('');
    const [tipoFuente, setTipoFuente] = useState('video');
    const [fuenteRtsp, setFuenteRtsp] = useState('');
    const [archivo, setArchivo] = useState(null);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        api.listarLocalidades()
            .then((datos) => {
                setLocalidades(datos);
                if (localidadInicial) {
                    setUbicacion(localidadInicial);
                } else if (datos.length > 0) {
                    setUbicacion(datos[0].nombre);
                }
            })
            .catch(() => setError('No se pudo cargar el catálogo de localidades.'));
    }, [localidadInicial]);

    const localidadSeleccionada = localidades.find((loc) => loc.nombre === ubicacion);

    async function manejarSubmit(evento) {
        evento.preventDefault();
        setError('');

        if (!nombre.trim()) {
            setError('El nombre de la cámara es obligatorio.');
            return;
        }
        if (tipoFuente === 'video' && !archivo) {
            setError('Selecciona un archivo de video para esta localidad.');
            return;
        }
        if (tipoFuente === 'IP' && !fuenteRtsp.trim()) {
            setError('Ingresa la URL RTSP de la cámara (no será funcional en este entorno, pero queda documentada).');
            return;
        }

        setGuardando(true);
        try {
            let camara;

            if (tipoFuente === 'video') {
                const formData = new FormData();
                formData.append('nombre', nombre);
                formData.append('ubicacion', ubicacion);
                if (localidadSeleccionada) {
                    formData.append('latitud', localidadSeleccionada.latitud);
                    formData.append('longitud', localidadSeleccionada.longitud);
                }
                formData.append('archivo', archivo);
                camara = await api.subirVideoCamara(formData);
            } else {
                camara = await api.crearCamara({
                    nombre,
                    ubicacion,
                    tipo: tipoFuente,
                    fuente: tipoFuente === 'webcam' ? '0' : fuenteRtsp,
                    latitud: localidadSeleccionada?.latitud ?? null,
                    longitud: localidadSeleccionada?.longitud ?? null,
                });
            }

            onCamaraCreada(camara);
            onCerrar();
        } catch (err) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    }

    return (
        <div className="modal-fondo" onClick={onCerrar}>
            <form
                className="modal-caja modal-caja-ancha"
                onClick={(e) => e.stopPropagation()}
                onSubmit={manejarSubmit}
            >
                <h3>Registrar cámara de localidad</h3>

                <label>
                    Nombre
                    <input
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Cámara Kennedy - Parque Central"
                    />
                </label>

                <label>
                    Localidad
                    <select value={ubicacion} onChange={(e) => setUbicacion(e.target.value)}>
                        {localidades.map((loc) => (
                            <option key={loc.nombre} value={loc.nombre}>
                                {loc.nombre}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="selector-tipo-fuente">
                    {TIPOS_FUENTE.map((tipo) => (
                        <label
                            key={tipo.id}
                            className={`opcion-tipo-fuente ${tipoFuente === tipo.id ? 'seleccionada' : ''}`}
                        >
                            <input
                                type="radio"
                                name="tipoFuente"
                                value={tipo.id}
                                checked={tipoFuente === tipo.id}
                                onChange={() => setTipoFuente(tipo.id)}
                            />
                            <div>
                                <div className="opcion-tipo-fuente-titulo">{tipo.titulo}</div>
                                <div className="opcion-tipo-fuente-descripcion">{tipo.descripcion}</div>
                            </div>
                        </label>
                    ))}
                </div>

                {tipoFuente === 'video' && (
                    <label>
                        Archivo de video (mp4, avi, mov, mkv, webm)
                        <input
                            type="file"
                            accept="video/mp4,video/avi,video/quicktime,video/x-matroska,video/webm"
                            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                        />
                    </label>
                )}

                {tipoFuente === 'IP' && (
                    <label>
                        URL RTSP
                        <input
                            value={fuenteRtsp}
                            onChange={(e) => setFuenteRtsp(e.target.value)}
                            placeholder="rtsp://usuario:clave@192.168.1.10:554/stream"
                        />
                    </label>
                )}

                {tipoFuente === 'webcam' && (
                    <p className="nota-formulario">
                        Se usará el dispositivo de cámara predeterminado del equipo (índice 0).
                    </p>
                )}

                {error && <p className="login-error">{error}</p>}

                <div className="modal-acciones">
                    <button type="button" className="btn-secundario" onClick={onCerrar}>
                        Cancelar
                    </button>
                    <button type="submit" className="btn-login" disabled={guardando}>
                        {guardando ? 'Guardando…' : 'Registrar cámara'}
                    </button>
                </div>
            </form>
        </div>
    );
}
