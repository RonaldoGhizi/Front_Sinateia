import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Em desenvolvimento, /api vai para a API do Sinatéia (uvicorn na porta 8000).
// Assim o navegador fala com um endereço só e a API não precisa de CORS.
const API = process.env.SINATEIA_API_URL ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: API, changeOrigin: true, rewrite: (caminho) => caminho.replace(/^\/api/, "") },
    },
  },
});
