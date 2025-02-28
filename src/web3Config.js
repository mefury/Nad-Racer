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

const wagmiConfig = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
  connectors: [
    injected({ target: "metaMask" }), // MetaMask
    injected({ target: "phantom" }),  // Phantom
  ],
  autoConnect: true,
});

if (window.ethereum) {
  window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0x279f" }],
  }).catch((error) => {
    if (error.code === 4902) {
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

export { wagmiConfig, monadTestnet as chains };