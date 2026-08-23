import { useVideoStream } from '../hooks/useVideoStream';

export default function TarjetaCamara({ idCamara, nombre, activa}) {
    const urlFrame = useVideoStream(idCamara, activa);
    return (
        <div className="tarjeta-camara">
            <div className="tarjeta-camara-header">
                <span>{nombre}</span>
                <span className={`estado-punto ${activa ? 'activo' : 'inactivo'}`} />
            </div>
            <div className="tarjeta-camara-video">
                {urlFrame ? (
                    <img src={urlFrame} alt={`Transmisión de ${nombre}`} />
                ) : (
                    <div className="tarjeta-camara-espera">
                        {activa ? 'Conectando...' : 'En espera'}
                    </div>
                )}
            </div>
        </div>
    );
}