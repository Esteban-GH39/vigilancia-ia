const BASE_API = '/api';

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

    mapaCalor: () => peticion('/analisis/mapa-calor'),

    listarLocalidades: () => peticion('/localidades/'),
};