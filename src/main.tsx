import { Buffer } from "buffer";
(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer ??= Buffer;

import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SolanaWalletProvider } from "./providers/SolanaWalletProvider";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <SolanaWalletProvider>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </SolanaWalletProvider>,
);
