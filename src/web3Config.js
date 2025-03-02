import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";

export const monadTestnet = {
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

export const wagmiConfig = getDefaultConfig({
  appName: "Nad Racer",
  projectId: "d36429d3e8e962f876225f24844a4f8f",
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
});

async function setupNetwork() {
  if (!window.ethereum) {
    console.error("No Ethereum provider detected. Please install MetaMask.");
    return false;
  }
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x279f" }],
    });
    return true;
  } catch (switchError) {
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

setupNetwork();

export { monadTestnet as chains };