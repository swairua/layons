import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  const isDeployed = process.env.NODE_ENV === "production" || typeof window === "undefined";

  return {
    server: {
      host: "::",
      port: 8080,
      middlewareMode: false,
      hmr: isDev ? false : {
        protocol: "wss",
        host: undefined,
        port: undefined,
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
