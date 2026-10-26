import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const backend = env.VITE_API_PROXY_TARGET || "http://localhost:5000";
  return {
    plugins: [react()],
    optimizeDeps: { entries: ["index.html"] },
    server: {
      proxy: Object.fromEntries(
        ["/api", "/admin", "/uploads"].map((path) => [
          path,
          { target: backend, changeOrigin: true },
        ]),
      ),
      watch: { ignored: ["**/.minio/**"] },
      fs: {
        deny: [
          ".minio/**",
          "**/.minio/**",
          ".env",
          ".env.*",
          "*.{crt,pem}",
          "**/.git/**",
        ],
      },
    },
  };
});
