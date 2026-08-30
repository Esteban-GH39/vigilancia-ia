import { useEffect, useState } from 'react';

export function useAlertas(idCamara, activo) {
    const [alertas, setAlertas] = useState([]);
    useEffect(() => {
        if (!activo) return undefined;
        const protocolo = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = import.meta.env.VITE_API_URL
            ? new URL(import.meta.env.VITE_API_URL).host
            : window.location.host;
        const ws = new WebSocket(`${protocolo}://${host}/api/alertas/ws/${idCamara}`);
        ws.onmessage = (evento) => {
            const alerta = JSON.parse(evento.data);
            setAlertas((previas) => [alerta, ...previas].slice(0, 50));
        };
        return () => ws.close();
    }, [idCamara, activo]);
    return alertas
}