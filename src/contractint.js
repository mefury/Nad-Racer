import React from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export const gameContractAddress = "0x390c90cD763c5A3cD93C24985CF03dD2c9125008";

export const gameContractABI = [
  // Game Functions
  {
    "inputs": [
      { "internalType": "uint256", "name": "score", "type": "uint256" }
    ],
    "name": "claimPoints",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "startGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "mintShip2NFT",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "resetLeaderboard",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // View Functions
  {
    "inputs": [
      { "internalType": "address", "name": "player", "type": "address" }
    ],
    "name": "getPlayerData",
    "outputs": [
      { "internalType": "uint256", "name": "totalPoints", "type": "uint256" },
      { "internalType": "uint256", "name": "highestScore", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLeaderboard",
    "outputs": [
      {
        "components": [
          { "internalType": "address", "name": "playerAddress", "type": "address" },
          { "internalType": "uint256", "name": "highestScore", "type": "uint256" }
        ],
        "internalType": "struct NadRacerGame.LeaderboardEntry[10]",
        "name": "",
        "type": "tuple[10]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getNPName",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getNPSymbol",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "player", "type": "address" }
    ],
    "name": "ownsShip2NFT",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // Events
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" }
    ],
    "name": "GameStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "points", "type": "uint256" },
      { "indexed": false, "internalType": "bool", "name": "newHighScore", "type": "bool" }
    ],
    "name": "PointsClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "newHighScore", "type": "uint256" }
    ],
    "name": "HighScoreUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "highestScore", "type": "uint256" },
      { "indexed": false, "internalType": "uint8", "name": "rank", "type": "uint8" }
    ],
    "name": "LeaderboardUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "TokenTransfer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "Ship2NFTMinted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  }
];

// ConnectedContent Component - Handles wallet connection and game start
export function ConnectedContent({ startGame, finalScore, resetGame }) {
  const { isConnected } = useAccount();
  const { writeContract } = useWriteContract();

  const handleStartGame = () => {
    if (isConnected) {
      writeContract({
        address: gameContractAddress,
        abi: gameContractABI,
        functionName: "startGame",
        chainId: 10143,
      }, {
        onSuccess: () => {
          console.log("Game started on-chain");
          startGame();
        },
        onError: (error) => console.error("Start game failed:", error),
      });
    } else {
      startGame();
    }
  };

  if (finalScore !== undefined) {
    return (
      <button
        className="px-12 py-4 text-xl md:text-2xl bg-transparent border border-[var(--monad-off-white)]/30 text-[var(--monad-off-white)] rounded-lg hover:text-[var(--monad-purple)] transition-all duration-300 w-full max-w-xs"
        onClick={resetGame}
      >
        Back to Menu
      </button>
    );
  }

  return isConnected ? (
    <button
      className="px-12 py-4 text-xl md:text-2xl bg-transparent border border-[var(--monad-off-white)]/30 text-[var(--monad-off-white)] rounded-lg hover:text-[var(--monad-purple)] transition-all duration-300 w-full max-w-xs"
      onClick={handleStartGame}
    >
      Play
    </button>
  ) : (
    <ConnectButton />
  );
}

// ProfileInfo Component - Redesigned as a card with adjusted positioning for mobile
export function ProfileInfo() {
  const { address, isConnected } = useAccount();
  const { data: playerData } = useReadContract({
    address: gameContractAddress,
    abi: gameContractABI,
    functionName: "getPlayerData",
    args: [address],
    enabled: !!address && isConnected,
    chainId: 10143,
  });

  // If not connected or no player data, hide the component
  if (!isConnected || !playerData) return null;

  // Format NP tokens and high score for display
  const npTokens = playerData[0] ? (Number(playerData[0]) / 10**18).toFixed(2) : "0.00";
  const highScore = playerData[1] ? playerData[1].toString() : "0";

  return (
    // Fixed positioning with adjusted bottom spacing for mobile responsiveness
    // - 'bottom-36' (9rem/144px) on mobile ensures it clears the bottom navbar (at bottom-12/3rem/48px) with ~96px gap
    // - 'md:bottom-16' (4rem/64px) preserves original desktop positioning
    <div className="fixed bottom-36 md:bottom-16 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-sm bg-transparent p-4 sm:p-6 rounded-xl border border-[var(--monad-off-white)]/30">
      <h2 className="text-xl text-[var(--monad-off-white)] mb-4 text-center">PLAYER INFO</h2>
      <div className="text-sm sm:text-base text-[var(--monad-off-white)] space-y-2">
        {/* Wallet Address */}
        <p className="flex justify-between">
          <span className="font-bold">Wallet:</span>
          <span className="font-mono truncate">{address.slice(0, 6)}...{address.slice(-4)}</span>
        </p>
        {/* NP Token Balance */}
        <p className="flex justify-between">
          <span className="font-bold">NP Balance:</span>
          <span>{npTokens}</span>
        </p>
        {/* Highest Score */}
        <p className="flex justify-between">
          <span className="font-bold">Highest Score:</span>
          <span>{highScore}</span>
        </p>
      </div>
    </div>
  );
}