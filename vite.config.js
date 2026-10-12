import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { minioStoragePlugin } from "./server/productStorage.js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), minioStoragePlugin()],
  server: {
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
  test: { setupFiles: ["./tests/setup.js"], include: ["tests/**/*.test.{js,jsx}"] },
});
