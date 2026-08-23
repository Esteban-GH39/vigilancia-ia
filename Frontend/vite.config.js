import { defineConfig } from "vite";
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        // El front corre en 5173 y el back en el 8000 (especificado en el doc)
        port: 5173,
        proxy: {
            '/api': 'http://localhost:8000',
            '/ws': {
                target: 'ws://localhost:8000',
                ws: true,
            },
        },
    },
});