import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    server: {
      host: "::",
      port: 8080,
      middlewareMode: false,
      // HMR configuration: let the browser determine the host/port automatically
      // This fixes module loading issues in proxied environments like builder.io
      hmr: {
        protocol: "ws",
      },
    },
    plugins: [
      react(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
