import { useState } from 'react';
import { api } from '../api/client';

const LOCALIDADES_PRIORITARIAS = ['Chapinero', 'Kennedy', 'Engativá', 'Suba', 'Bosa'];

export default function FormularioCamara({ onCamaraCreada, onCerrar }) {
    const [nombre, setNombre] = useState('');
    const [ubicacion, setUbicacion] = useState(LOCALIDADES_PRIORITARIAS[0]);
    const [fuente, setFuente] = useState('0');
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    async function manejarSubmit(evento) {
        evento.preventDefault();

        if (!nombre.trim()) {
            setError('El nombre de la cámara es obligatorio.');
            return;
        }

        setGuardando(true);
        try {
            const camara = await api.crearCamara({
                nombre,
                ubicacion,
                fuente,
                tipo: 'IP',
            });
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
                className="modal-caja"
                onClick={(e) => e.stopPropagation()}
                onSubmit={manejarSubmit}
            >
                <h3>Registrar nueva cámara</h3>

                <label>
                    Nombre
                    <input
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="CAM 5 - Entrada Norte"
                    />
                </label>

                <label>
                    Localidad
                    <select
                        value={ubicacion}
                        onChange={(e) => setUbicacion(e.target.value)}
                    >
                        {LOCALIDADES_PRIORITARIAS.map((loc) => (
                            <option key={loc} value={loc}>
                                {loc}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Fuente (RTSP o índice de webcam)
                    <input
                        value={fuente}
                        onChange={(e) => setFuente(e.target.value)}
                        placeholder="0"
                    />
                </label>

                {error && <p className="login-error">{error}</p>}

                <div className="modal-acciones">
                    <button
                        type="button"
                        className="btn-secundario"
                        onClick={onCerrar}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn-login"
                        disabled={guardando}
                    >
                        {guardando ? 'Guardando…' : 'Registrar cámara'}
                    </button>
                </div>
            </form>
        </div>
    );
}
