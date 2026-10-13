import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { minioStoragePlugin } from "./server/productStorage.js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), minioStoragePlugin()],
  optimizeDeps: { entries: ["index.html"] },
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
  test: {
    // UI tests need more time on Windows while local services are running.
    testTimeout: 15000,
    dir: "./tests",
    setupFiles: ["./tests/setup.js"],
    include: ["**/*.test.{js,jsx}"],
  },
});
