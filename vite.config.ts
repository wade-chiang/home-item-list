import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 開發時（pnpm dev）把 API 請求轉到本機的 PocketBase，前端在開發與部署時都連 "/"。
    // 只影響 dev server，不影響 vite build 的產物（CLAUDE.md 紀律 2）。
    proxy: {
      "/api": "http://127.0.0.1:8090",
    },
  },
});
