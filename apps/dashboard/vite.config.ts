import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@solana/web3.js") || id.includes("@solana/spl-token"))
            return "solana-core";
          if (id.includes("@solana/wallet-adapter")) return "solana-wallet";
          if (id.includes("@coral-xyz/anchor")) return "anchor";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("recharts")) return "charts";
          if (id.includes("react-router")) return "router";
          return undefined;
        },
      },
    },
  },
}));
