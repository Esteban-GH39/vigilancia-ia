import { useEffect, useState } from 'react';

export function useAlertas(idCamara, activo) {
    const [alertas, setAlertas] = useState([]);
    useEffect(() => {
        if (!activo) return undefined;
        const protocolo = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${protocolo}://${window.location.host}/api/alertas/ws/${idCamara}`);
        ws.onmessage = (evento) => {
            const alerta = JSON.parse(evento.data);
            setAlertas((previas) => [alerta, ...previas].slice(0, 50));
        };
        return () => ws.close();
    }, [idCamara, activo]);
    return alertas
}