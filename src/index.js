// Console log control - disable all console logs in production
// Define DEBUG as a global variable so it can be accessed from anywhere
window.DEBUG = false; // Set to true during development, false in production

(() => {
  if (!window.DEBUG) {
    // Store original console methods
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    };
    
    // Override console methods to be no-ops (do nothing)
    console.log = console.warn = console.info = console.debug = () => {};
    console.error = () => {}; // Comment this line to keep error logging
    
    // Method to temporarily restore logging if needed for debugging
    window.enableLogs = () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
      console.log('Console logging restored temporarily');
    };
    
    // Method to disable logs again
    window.disableLogs = () => {
      console.log = console.warn = console.info = console.debug = () => {};
      console.error = () => {};
    };
  }
})();

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@rainbow-me/rainbowkit/styles.css"; // RainbowKit styles
import "./index.css"; // Tailwind styles
import { WagmiProvider, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";

// Define Monad Testnet
const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  network: "monad-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
    public: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "MonadExplorer",
      url: "https://testnet-monadexplorer.com",
    },
  },
};

// Create Wagmi config
const wagmiConfig = getDefaultConfig({
  appName: "Nad Racer",
  projectId: "d36429d3e8e962f876225f24844a4f8f",
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
});

// Create a client for React Query
const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        <App />
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);