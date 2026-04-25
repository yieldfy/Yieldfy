import "./polyfills";

import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SolanaWalletProvider } from "./providers/SolanaWalletProvider";
import { NetworkProvider } from "./providers/NetworkProvider";
import { NotificationsProvider } from "./providers/NotificationsProvider";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <NetworkProvider>
    <NotificationsProvider>
      <SolanaWalletProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </SolanaWalletProvider>
    </NotificationsProvider>
  </NetworkProvider>,
);
