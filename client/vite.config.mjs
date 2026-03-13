"use strict";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    plugins: [react()],
    root: __dirname,
    build: {
        outDir: "../dist/client",
        emptyOutDir: true,
    },
    server: {
        proxy: {
            "/api": "http://localhost:3000",
        },
    },
});
