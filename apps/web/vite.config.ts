import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: {
    alias: {
      // Pointe directement vers la source TS de @ayinon/shared plutot que son dist/ CommonJS :
      // Vite/esbuild la transpile alors comme n'importe quel fichier source (ESM natif,
      // tree-shakeable), ce qui evite les soucis d'interop CJS->ESM au build de production.
      "@ayinon/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)),
    },
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            // Consultation cadastrale en cache-first-avec-secours-reseau : la carte reste
            // utilisable en brousse/zone blanche avec les dernieres donnees synchronisees.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/parcelles"),
            handler: "NetworkFirst",
            options: {
              cacheName: "ayinon-parcelles-cache",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        id: "/",
        name: "AYINON - Le Gardien Numerique de la Terre",
        short_name: "AYINON",
        description: "Plateforme de securisation et gouvernance fonciere de la Republique du Benin",
        start_url: "/",
        display: "standalone",
        background_color: "#0f3d2e",
        theme_color: "#0f3d2e",
        lang: "fr",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    // Configurable via variables d'environnement (defauts inchanges) : utile quand les ports
    // 3000/5173 sont deja pris par un autre projet sur le meme poste.
    port: process.env.WEB_PORT ? Number(process.env.WEB_PORT) : 5173,
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.API_PORT ?? 3000}`,
        changeOrigin: true,
      },
    },
  },
});
