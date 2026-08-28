export default function TarjetaLocalidadPendiente({ localidad, onAsignar }) {
    return (
        <div className="tarjeta-camara tarjeta-localidad-pendiente">
            <div className="tarjeta-camara-header">
                <span className="tarjeta-camara-nombre">{localidad.nombre}</span>
                <span className="estado-punto inactivo" />
            </div>

            <div className="tarjeta-camara-video tarjeta-localidad-pendiente-video">
                <span className="tarjeta-camara-espera-icono">📍</span>
                <span>Localidad sin cámara asignada</span>
                <button className="btn-mini" onClick={() => onAsignar(localidad.nombre)}>
                    + Asignar cámara
                </button>
            </div>

            <div className="tarjeta-camara-footer">
                <span className="tarjeta-camara-ubicacion">
                    📍 lat {localidad.latitud.toFixed(3)}, lng {localidad.longitud.toFixed(3)}
                </span>
            </div>
        </div>
    );
}
