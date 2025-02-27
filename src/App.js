// App.js
import React, { useState, useCallback, useEffect } from "react";
import RacingScene from "./racingscene";
import "./App.css";
import {
  WagmiProvider,
  useAccount,
  useReadContract,
  useWriteContract,
  useConnect,
} from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "./web3Config";
import { formatEther, parseEther } from "ethers/lib/utils";

// Toggle for dev play button visibility
const SHOW_DEV_PLAY = false; // Set to false to hide "Direct Play" button

// Set up QueryClient for React Query
const queryClient = new QueryClient();

// Smart contract details
const gameContractAddress = "0x35A0b55A86f55832FD85Bd8F093883Ca81fcf9ac";
const gameContractABI = [
  {
    inputs: [],
    name: "enterGame",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "score", type: "uint256" }],
    name: "claimPoints",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getLeaderboard",
    outputs: [
      { internalType: "address[]", name: "", type: "address[]" },
      { internalType: "uint256[]", name: "", type: "uint256[]" },
    ],
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
  {
    inputs: [],
    name: "entryFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

function useGameState() {
  const [gameState, setGameState] = useState("start");
  const [score, setScore] = useState(0); // Current session score
  const [totalPoints, setTotalPoints] = useState(0); // Total points to claim after game over
  const [health, setHealth] = useState(3);
  const [highScore, setHighScore] = useState(0);
  const [isEntered, setIsEntered] = useState(false); // Tracks entry fee payment

  // Start game after entry fee
  const startGame = useCallback(() => {
    if (isEntered) {
      console.log("Starting game: Setting gameState to 'playing'");
      setGameState("playing");
      setScore(0);
      setHealth(3);
    } else {
      console.log("Cannot start game: isEntered is false");
    }
  }, [isEntered]);

  // End game and set total points
  const endGame = useCallback((finalScore) => {
    console.log("Ending game: Setting gameState to 'gameover' with finalScore", finalScore);
    setGameState("gameover");
    setTotalPoints(finalScore);
    setHighScore((prev) => Math.max(prev, finalScore));
  }, []);

  // Reset to start screen
  const resetGame = useCallback(() => {
    console.log("Resetting game: Setting gameState to 'start'");
    setGameState("start");
    setScore(0);
    setTotalPoints(0);
    setHealth(3);
    setIsEntered(false);
  }, []);

  const memoizedSetScore = useCallback((newScoreFunc) => setScore(newScoreFunc), []);
  const memoizedSetHealth = useCallback((newHealthFunc) => setHealth(newHealthFunc), []);

  // Direct play for dev testing (bypasses entry fee)
  const directPlay = useCallback(() => {
    console.log("Direct Play: Setting isEntered to true and gameState to 'playing'");
    setIsEntered(true);
    setGameState("playing");
    setScore(0);
    setHealth(3);
  }, []);

  useEffect(() => {
    console.log("Game State Updated:", { gameState, isEntered, score, health });
  }, [gameState, isEntered, score, health]);

  return {
    gameState,
    score,
    totalPoints,
    health,
    highScore,
    isEntered,
    setIsEntered,
    startGame,
    endGame,
    resetGame,
    setScore: memoizedSetScore,
    setHealth: memoizedSetHealth,
    directPlay,
  };
}

function App() {
  const {
    gameState,
    score,
    totalPoints,
    health,
    highScore,
    isEntered,
    setIsEntered,
    startGame,
    endGame,
    resetGame,
    setScore,
    setHealth,
    directPlay,
  } = useGameState();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <div className="app">
          <RacingScene
            score={score}
            setScore={setScore}
            setHealth={setHealth}
            health={health}
            endGame={endGame}
            gameState={gameState}
          />
          {gameState === "start" && (
            <div className="menu">
              <h1>Nad Racer</h1>
              <p>High Score: {highScore}</p>
              <ConnectedContent
                isEntered={isEntered}
                setIsEntered={setIsEntered}
                startGame={startGame}
                contractAddress={gameContractAddress}
                contractABI={gameContractABI}
                showLeaderboard={true} // Leaderboard shown only here (commented out below)
              />
              {SHOW_DEV_PLAY && (
                <button onClick={directPlay} style={{ marginTop: "10px", background: "#00ff00" }}>
                  Direct Play (Dev Only)
                </button>
              )}
            </div>
          )}
          {gameState === "playing" && (
            <div className="hud">
              <p>Score: {score}</p>
              <p>Health: {"❤️ ".repeat(health)}</p>
              {/* Removed ConnectedContent with "Enter Game" button */}
            </div>
          )}
          {gameState === "gameover" && (
            <div className="menu">
              <h1>Game Over</h1>
              <p>Final Score: {score}</p>
              <p>Total Points to Claim: {totalPoints}</p>
              <p>High Score: {highScore}</p>
              <ConnectedContent
                totalPoints={totalPoints}
                contractAddress={gameContractAddress}
                contractABI={gameContractABI}
                showLeaderboard={false} // No leaderboard on game over
              />
              {/* Removed Replay button */}
              <button onClick={resetGame}>Main Menu</button>
            </div>
          )}
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function ConnectedContent({
  isEntered,
  setIsEntered,
  startGame,
  totalPoints,
  contractAddress,
  contractABI,
  showLeaderboard, // New prop to control leaderboard visibility
}) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();

  const { data: entryFee } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "entryFee",
    enabled: isConnected,
  });
  // Commented out leaderboard for now
  /*
  const { data: leaderboardData } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "getLeaderboard",
    enabled: isConnected && showLeaderboard,
  });
  */
  const { data: balance } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "balanceOf",
    args: [address],
    enabled: isConnected,
  });
  const { writeContract: enterGameWrite, isPending: isEntering, error: enterGameError } = useWriteContract();
  const { writeContract: claimPointsWrite, isPending: isClaiming } = useWriteContract();

  useEffect(() => {
    console.log("Connected:", isConnected, "Chain ID:", chainId, "Address:", address);
    console.log("Entry Fee:", entryFee ? formatEther(entryFee) : "undefined");
    console.log("enterGameError:", enterGameError);
  }, [isConnected, chainId, address, entryFee, enterGameError]);

  // Commented out leaderboard processing
  /*
  const leaderboard = leaderboardData
    ? { players: leaderboardData[0], balances: leaderboardData[1] }
    : { players: [], balances: [] };
  */
  const playerBalance = balance ? formatEther(balance) : "0";

  const handleEnterGame = () => {
    console.log("Initiating enterGame transaction");
    enterGameWrite({
      address: contractAddress,
      abi: contractABI,
      functionName: "enterGame",
      value: entryFee || parseEther("0.01"),
    }, {
      onSuccess: (data) => {
        console.log("Transaction successful:", data);
        setIsEntered(true);
        startGame();
      },
      onError: (error) => {
        console.error("Transaction failed:", error);
        alert("Transaction failed. Please try again."); // Notify user
      },
    });
  };

  const handleClaimPoints = () => {
    console.log("Initiating claimPoints transaction with points:", totalPoints);
    claimPointsWrite({
      address: contractAddress,
      abi: contractABI,
      functionName: "claimPoints",
      args: [totalPoints || 0],
    }, {
      onSuccess: () => console.log("Points claimed successfully"),
      onError: (error) => console.error("Claim points failed:", error),
    });
  };

  return (
    <>
      {!isConnected && (
        <button onClick={() => connect({ connector: connectors[0] })} disabled={isPending}>
          {isPending ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
      {isConnected && (
        <>
          <p>Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
          <p>Your Points: {playerBalance} NRP</p> {/* Updated to NRP */}
          {!isEntered && (
            <button onClick={handleEnterGame} disabled={isEntering}>
              {isEntering ? "Entering..." : "Enter Game (0.01 MON)"}
            </button>
          )}
          {isEntered && totalPoints === undefined && startGame && (
            <button onClick={startGame}>Play</button>
          )}
          {totalPoints > 0 && (
            <button onClick={handleClaimPoints} disabled={isClaiming}>
              {isClaiming ? "Claiming..." : "Claim Points"}
            </button>
          )}
          {/* Commented out leaderboard for now */}
          {/*
          {showLeaderboard && (
            <div style={{ marginTop: "20px" }}>
              <h2>Leaderboard</h2>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {leaderboard.players.map((player, index) =>
                  player !== "0x0000000000000000000000000000000000000000" ? (
                    <li key={player}>
                      {player.slice(0, 6)}...{player.slice(-4)}:{" "}
                      {formatEther(leaderboard.balances[index])} NRP
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          )}
          */}
        </>
      )}
    </>
  );
}

export default App;