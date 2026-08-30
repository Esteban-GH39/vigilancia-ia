import { useEffect, useRef, useState } from 'react';

export function useVideoStream(idCamara, activo) {
    const [urlFrame, setUrlFrame] = useState(null);
    const wsRef = useRef(null);
    const urlAnteriorRef = useRef(null);

    useEffect(() => {
        if (!activo) return undefined;

        const protocolo = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = import.meta.env.VITE_API_URL
            ? new URL(import.meta.env.VITE_API_URL).host
            : window.location.host;
        const ws = new WebSocket(`${protocolo}://${host}/ws/video/${idCamara}`);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;

        ws.onmessage = (evento) => {
        const blob = new Blob([evento.data], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);

        if (urlAnteriorRef.current) URL.revokeObjectURL(urlAnteriorRef.current);
        urlAnteriorRef.current = url;
        setUrlFrame(url);
        };

        return () => {
        ws.close();
        if (urlAnteriorRef.current) URL.revokeObjectURL(urlAnteriorRef.current);
        };
    }, [idCamara, activo]);

    return urlFrame;
}