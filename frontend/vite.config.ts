import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  publicDir: "../logos",
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["Gemini_Generated_Image_p50z2sp50z2sp50z-Picsart-AiImageEnhancer.svg", "pwa-192.png", "pwa-512.png"],
      manifest: {
        name: "RSS Feed Manager",
        short_name: "RSS Feeds",
        description: "Organize, read, and manage your RSS subscriptions in one place.",
        theme_color: "#f6f8fb",
        background_color: "#f6f8fb",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "portrait",
        categories: ["news", "productivity", "utilities"],
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          {
            name: "Top News",
            short_name: "Top News",
            description: "See the latest top news",
            url: "/?view=topnews",
            icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Bookmarks",
            short_name: "Bookmarks",
            description: "Open bookmarked articles",
            url: "/?view=bookmarks",
            icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Discover",
            short_name: "Discover",
            description: "Find new feeds",
            url: "/?view=discover",
            icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
