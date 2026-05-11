import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// bar-stale-fill → port 5274 (one above react-stale-redraw to avoid collision).
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5274,
        host: true,
        strictPort: true,
    },
});
