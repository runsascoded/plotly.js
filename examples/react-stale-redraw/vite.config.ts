import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// react-stale-redraw → port 5273 (arbitrary, avoid common defaults).
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5273,
        host: true,
        strictPort: true,
    },
});
