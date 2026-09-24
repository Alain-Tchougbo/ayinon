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
        name: "AYINON — Le Gardien Numerique de la Terre",
        short_name: "AYINON",
        description: "Plateforme de securisation et gouvernance fonciere de la Republique du Benin",
        start_url: "/",
        display: "standalone",
        background_color: "#0b3d24",
        theme_color: "#0b3d24",
        lang: "fr",
        icons: [
          { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
          { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
