// web3Config.js
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

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

// Updated config with only MetaMask-compatible injected connector
const wagmiConfig = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
  connectors: [
    injected(), // Generic injected connector that works with MetaMask and compatible wallets
  ],
  autoConnect: true,
});

// Robust chain switching/adding logic
async function setupNetwork() {
  if (!window.ethereum) {
    console.error("No Ethereum provider detected. Please install MetaMask.");
    return false;
  }

  try {
    // First try to switch to Monad Testnet
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x279f" }],
    });
    return true;
  } catch (switchError) {
    // If chain not added (error code 4902), add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x279f",
            chainName: "Monad Testnet",
            rpcUrls: ["https://testnet-rpc.monad.xyz"],
            nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
            blockExplorerUrls: ["https://testnet-monadexplorer.com"],
          }],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add Monad Testnet:", addError);
        return false;
      }
    }
    console.error("Failed to switch to Monad Testnet:", switchError);
    return false;
  }
}

// Execute network setup when module loads
setupNetwork();

export { wagmiConfig, monadTestnet as chains };