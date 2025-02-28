// App.js
import React, { useState, useCallback, useEffect, useMemo } from "react";
import RacingScene from "./racingscene";
import "./App.css";
import {
  WagmiProvider,
  useAccount,
  useReadContract,
  useWriteContract,
  useConnect,
  useDisconnect,
  useWaitForTransactionReceipt,
} from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "./web3Config";
import { formatEther } from "ethers/lib/utils";

// Set up QueryClient for React Query
const queryClient = new QueryClient();

// Smart contract details
const gameContractAddress = "0x196A747398D43389E23126ad60C58200Ded0Ba3C"; // Current working CA
const gameContractABI = [
  {
    inputs: [],
    name: "startGame",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "points", type: "uint256" }],
    name: "recordAndClaimPoints",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getLeaderboard",
    outputs: [
      {
        components: [
          { internalType: "address", name: "playerAddress", type: "address" },
          { internalType: "uint256", name: "points", type: "uint256" },
        ],
        internalType: "struct NadPoints.Player[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "getTotalPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

// Custom hook to manage game state
function useGameState() {
  const [gameState, setGameState] = useState("start"); // Current game state: start, playing, gameover
  const [score, setScore] = useState(0); // Current score during gameplay
  const [health, setHealth] = useState(3); // Player health (3 lives)
  const [highScore, setHighScore] = useState(0); // Highest score achieved

  // Start a new game session
  const startGame = useCallback(() => {
    console.log("Starting game: Setting gameState to 'playing'");
    setGameState("playing");
    setScore(0);
    setHealth(3);
  }, []);

  // End the game with the final score
  const endGame = useCallback((finalScore) => {
    console.log("Ending game: Setting gameState to 'gameover' with finalScore", finalScore);
    setGameState("gameover");
    setHighScore((prev) => Math.max(prev, finalScore));
  }, []);

  // Reset the game to the start screen
  const resetGame = useCallback(() => {
    console.log("Resetting game: Setting gameState to 'start'");
    setGameState("start");
    setScore(0);
    setHealth(3);
  }, []);

  // Memoized setters for score and health
  const memoizedSetScore = useCallback((newScoreFunc) => setScore(newScoreFunc), []);
  const memoizedSetHealth = useCallback((newHealthFunc) => setHealth(newHealthFunc), []);

  // Log game state changes for debugging
  useEffect(() => {
    console.log("Game State Updated:", { gameState, score, health });
  }, [gameState, score, health]);

  return {
    gameState,
    score,
    health,
    highScore,
    startGame,
    endGame,
    resetGame,
    setScore: memoizedSetScore,
    setHealth: memoizedSetHealth,
  };
}

// Main App component
function App() {
  const {
    gameState,
    score,
    health,
    highScore,
    startGame,
    endGame,
    resetGame,
    setScore,
    setHealth,
  } = useGameState();
  const [showWalletPopup, setShowWalletPopup] = useState(false); // State for wallet connection popup

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <div className="app">
          {/* 3D racing scene */}
          <RacingScene
            score={score}
            setScore={setScore}
            setHealth={setHealth}
            health={health}
            endGame={endGame}
            gameState={gameState}
          />
          {/* Wallet connect/disconnect button */}
          <WalletConnect setShowWalletPopup={setShowWalletPopup} />
          {/* Wallet selection popup */}
          {showWalletPopup && (
            <WalletPopup setShowWalletPopup={setShowWalletPopup} />
          )}
          {/* Main screen with title, start button, leaderboard, and player info */}
          {gameState === "start" && (
            <div className="main-screen">
              <div className="center-content">
                <h1 className="title">Nad Racer</h1>
                <ConnectedContent
                  startGame={startGame}
                  contractAddress={gameContractAddress}
                  contractABI={gameContractABI}
                />
              </div>
              <Leaderboard contractAddress={gameContractAddress} contractABI={gameContractABI} />
              <div className="profile-info">
                <ConnectedContent
                  contractAddress={gameContractAddress}
                  contractABI={gameContractABI}
                  showPlayerInfo={true}
                />
              </div>
            </div>
          )}
          {/* HUD displaying score and health during gameplay */}
          {gameState === "playing" && (
            <div className="hud">
              <p>Score: {score}</p>
              <p>Health: {"❤️ ".repeat(health)}</p>
            </div>
          )}
          {/* End screen with final score and options */}
          {gameState === "gameover" && (
            <div className="end-screen">
              <h1>Game Over</h1>
              <p>Final Score: {score}</p>
              <p>High Score: {highScore}</p>
              <ConnectedContent
                finalScore={score}
                contractAddress={gameContractAddress}
                contractABI={gameContractABI}
                resetGame={resetGame}
                startGame={startGame}
              />
            </div>
          )}
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// Wallet connection/disconnection component
function WalletConnect({ setShowWalletPopup }) {
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <div className="wallet-connect">
      {isConnected ? (
        <button onClick={disconnect}>Disconnect</button>
      ) : (
        <button onClick={() => setShowWalletPopup(true)}>Connect Wallet</button>
      )}
    </div>
  );
}

// Wallet selection popup component
function WalletPopup({ setShowWalletPopup }) {
  const { connect, connectors } = useConnect();

  return (
    <div className="wallet-popup">
      <h2>Select Wallet</h2>
      <button
        onClick={() => {
          connect({ connector: connectors[0] });
          setShowWalletPopup(false);
        }}
      >
        MetaMask
      </button>
      <button
        onClick={() => {
          connect({ connector: connectors[1] });
          setShowWalletPopup(false);
        }}
      >
        Phantom
      </button>
    </div>
  );
}

// Leaderboard component displaying top 10 players
function Leaderboard({ contractAddress, contractABI }) {
  const { address } = useAccount();
  const { data: leaderboardData } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "getLeaderboard",
    chainId: 10143,
  });

  const leaderboard = useMemo(() => leaderboardData || [], [leaderboardData]);

  // Log leaderboard data and user address for debugging
  useEffect(() => {
    console.log("Leaderboard Data:", leaderboard);
    console.log("User Address:", address);
    leaderboard.forEach((player, index) => {
      console.log(`Leaderboard Entry ${index + 1}:`, {
        address: player.playerAddress,
        points: formatEther(player.points),
      });
    });
  }, [leaderboard, address]);

  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      <ul>
        {leaderboard.map((player, index) => (
          <li key={player.playerAddress}>
            {index + 1}. {player.playerAddress.slice(2, 8)}...{player.playerAddress.slice(-4)}: {Number(formatEther(player.points)).toFixed(2)} NP
          </li>
        ))}
      </ul>
    </div>
  );
}

// Component for game controls and player info
function ConnectedContent({ startGame, finalScore, contractAddress, contractABI, resetGame, showPlayerInfo }) {
  const { address, isConnected, chainId } = useAccount();
  const { data: totalPoints } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "getTotalPoints",
    args: [address],
    enabled: isConnected,
    chainId: 10143,
  });

  const { writeContract: startGameWrite, data: startTxHash, isPending: isStarting } = useWriteContract();
  const { writeContract: recordAndClaimWrite, data: claimTxHash, isPending: isClaiming, error: claimError } = useWriteContract();

  const { isSuccess: startTxConfirmed } = useWaitForTransactionReceipt({
    hash: startTxHash,
    chainId: 10143,
  });

  const { isSuccess: claimTxConfirmed } = useWaitForTransactionReceipt({
    hash: claimTxHash,
    chainId: 10143,
  });

  // State to hide Claim button after confirmation
  const [pointsClaimed, setPointsClaimed] = useState(false);

  // Start game after transaction confirmation
  useEffect(() => {
    if (startTxConfirmed && startGame) {
      console.log("Start transaction confirmed, starting game");
      startGame();
    }
  }, [startTxConfirmed, startGame]);

  // Log claim errors and success, hide button after claim
  useEffect(() => {
    if (claimError) {
      console.error("Claim Points Error:", claimError);
    }
    if (claimTxConfirmed) {
      console.log("Points recorded and claimed successfully");
      setPointsClaimed(true); // Hide Claim button
      queryClient.invalidateQueries(["getTotalPoints", address]); // Refresh points
    }
  }, [claimError, claimTxConfirmed, address]);

  // Initiate startGame transaction
  const handleStartGame = () => {
    if (chainId !== 10143) {
      alert("Please switch to Monad Testnet");
      return;
    }
    console.log("Initiating startGame transaction");
    startGameWrite({
      address: contractAddress,
      abi: contractABI,
      functionName: "startGame",
      chainId: 10143,
    });
  };

  // Initiate recordAndClaimPoints transaction
  const handleRecordAndClaim = () => {
    if (chainId !== 10143) {
      alert("Please switch to Monad Testnet");
      return;
    }
    if (finalScore > 0) {
      console.log("Initiating recordAndClaimPoints transaction with points:", finalScore);
      recordAndClaimWrite({
        address: contractAddress,
        abi: contractABI,
        functionName: "recordAndClaimPoints",
        args: [finalScore],
        chainId: 10143,
      });
    }
  };

  const playerTotalPoints = totalPoints ? formatEther(totalPoints) : "0";

  // Log total points for debugging
  useEffect(() => {
    console.log("Player Total Points (getTotalPoints):", playerTotalPoints);
  }, [playerTotalPoints]);

  // Display player info on home screen
  if (showPlayerInfo && isConnected) {
    return (
      <>
        <p>Wallet: {address?.slice(2, 8)}...{address?.slice(-4)}</p>
        <p>Your Points: {Number(playerTotalPoints).toFixed(2)} NP</p> {/* Changed to "Your Points" */}
      </>
    );
  }

  return (
    <>
      {!finalScore && (
        <button
          className="start-button"
          onClick={handleStartGame}
          disabled={isStarting || !isConnected || chainId !== 10143}
        >
          {isStarting ? "Starting..." : "Start Game"}
        </button>
      )}
      {finalScore > 0 && (
        <div className="button-group">
          {/* Show Claim button only if not yet claimed */}
          {!pointsClaimed && (
            <button onClick={handleRecordAndClaim} disabled={isClaiming}>
              {isClaiming ? "Claiming..." : "Claim Points"}
            </button>
          )}
          <button onClick={handleStartGame} disabled={isStarting || !isConnected || chainId !== 10143}>
            {isStarting ? "Starting..." : "Play Again"}
          </button>
          <button onClick={resetGame}>Main Menu</button>
        </div>
      )}
    </>
  );
}

export default App;