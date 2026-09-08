const BASE_API = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';

function obtenerToken() {
    return sessionStorage.getItem('token');
    }

    async function peticion(ruta, opciones = {}) {
    const token = obtenerToken();
    const respuesta = await fetch(`${BASE_API}${ruta}`, {
        ...opciones,
        headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opciones.headers,
        },
    });

    if (!respuesta.ok) {
        const detalle = await respuesta.json().catch(() => ({}));
        throw new Error(detalle.detail || 'Error en la petición');
    }
    return respuesta.json();
    }

    export const api = {
    login: (usuario, contrasena) =>
        peticion('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ usuario, contrasena }),
        }),

    registro: (usuario, nombre, contrasena) =>
        peticion('/auth/registro', {
        method: 'POST',
        body: JSON.stringify({ usuario, nombre, contrasena }),
        }),

    listarUsuarios: () => peticion('/usuarios/'),

    actualizarEstadoUsuario: (idUsuario, estado) =>
        peticion(`/usuarios/${idUsuario}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) }),

    actualizarRolUsuario: (idUsuario, rol) =>
        peticion(`/usuarios/${idUsuario}/rol`, { method: 'PUT', body: JSON.stringify({ rol }) }),

    iniciarCamara: (idCamara) =>
        peticion(`/camaras/${idCamara}/iniciar`, { method: 'POST' }),

    detenerCamara: (idCamara) =>
        peticion(`/camaras/${idCamara}/detener`, { method: 'POST' }),

    estadoCamara: (idCamara) => peticion(`/camaras/${idCamara}/estado`),

    listarCamaras: () => peticion('/camaras/'),

    crearCamara: (datos) =>
        peticion('/camaras/', { method: 'POST', body: JSON.stringify(datos) }),

    subirVideoCamara: async (formData) => {
        const token = obtenerToken();
        const respuesta = await fetch(`${BASE_API}/camaras/subir-video`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            // No se define Content-Type a propósito: el navegador arma el
            // boundary de multipart/form-data automáticamente a partir del FormData.
            body: formData,
        });
        if (!respuesta.ok) {
            const detalle = await respuesta.json().catch(() => ({}));
            throw new Error(detalle.detail || 'Error subiendo el video');
        }
        return respuesta.json();
    },

    editarCamara: (idCamara, datos) =>
        peticion(`/camaras/${idCamara}`, { method: 'PUT', body: JSON.stringify(datos) }),

    eliminarCamara: (idCamara) =>
        peticion(`/camaras/${idCamara}`, { method: 'DELETE' }),

    listarEventos: (limite = 50) => peticion(`/eventos/?limite=${limite}`),

    actualizarEstadoEvento: (idEvento, estado) =>
        peticion(`/eventos/${idEvento}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) }),

    estadisticasEventos: () => peticion('/eventos/estadisticas'),

    mapaCalor: () => peticion('/analisis/mapa-calor'),

    listarLocalidades: () => peticion('/localidades/'),
};