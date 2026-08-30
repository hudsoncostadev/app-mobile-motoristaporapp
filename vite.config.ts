import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { apiPlugin } from "./src/server/apiPlugin";

export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
});
