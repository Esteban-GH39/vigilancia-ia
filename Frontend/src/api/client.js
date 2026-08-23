const BASE_API = '/api';

function obtenerToken() {
    return sessionStorage.getItem('token');
}

async function peticion(ruta, opciones ={}) {
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

    iniciarCamara: (idCamara, fuente = '0') =>
        peticion(`/camaras/${idCamara}/iniciar?fuente=${fuente}`, { method: 'POST' }),

    detenerCamara: (idCamara) =>
        peticion(`/camaras/${idCamara}/detener`, { method: 'POST' }),

    estadoCamara: (idCamara) => peticion(`/camaras/${idCamara}/estado`),

    listarCamaras: () => peticion('/camaras/'),

    listarEventos: (limite = 50) => peticion(`/eventos/?limite=${limite}`),
};