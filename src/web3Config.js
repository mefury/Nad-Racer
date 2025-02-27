// web3Config.js
import { createConfig, http, injected } from "wagmi";

const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  network: "monad-testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "MonadExplorer", url: "https://testnet-monadexplorer.com" },
  },
};

const wagmiConfig = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
  connectors: [injected()],
  autoConnect: true,
});

// Switch to Monad Testnet if not already on it
if (window.ethereum) {
  window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0x279f" }], // Hex for 10143
  }).catch((error) => {
    if (error.code === 4902) { // Chain not added
      window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x279f",
          chainName: "Monad Testnet",
          rpcUrls: ["https://testnet-rpc.monad.xyz"],
          nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
          blockExplorerUrls: ["https://testnet-monadexplorer.com"],
        }],
      });
    }
  });
}

console.log("wagmiConfig initialized:", {
  chains: wagmiConfig.chains,
  transports: wagmiConfig.transports,
});

export { wagmiConfig, monadTestnet as chains };