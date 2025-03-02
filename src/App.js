"use client";

// Core React imports with useMemo added for optimization
import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
// Component imports
import RacingScene from "./racingscene";
// Wagmi imports for Web3 functionality
import {
  WagmiProvider,
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
// React Query for data fetching
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Web3 config
import { wagmiConfig } from "./web3Config";
// RainbowKit for wallet UI
import { RainbowKitProvider, ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit";
// Ethers utility for formatting BigInt values
import { formatEther } from "ethers/lib/utils";

// Enable dev mode "Play Directly" button
const SHOW_DIRECT_PLAY_BUTTON = false;
// Initialize QueryClient for React Query
const queryClient = new QueryClient();

// App version constant
const APP_VERSION = "1.0.5";

// Smart contract details
const gameContractAddress = "0x196A747398D43389E23126ad60C58200Ded0Ba3C";
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
  const [gameState, setGameState] = useState("start"); // Initial state is "start"
  const [score, setScore] = useState(0); // Tracks current game score
  const [health, setHealth] = useState(3); // Tracks player health
  const [highScore, setHighScore] = useState(0); // Tracks highest score achieved

  // Start a new game
  const startGame = useCallback(() => {
    console.log("Starting game: Setting gameState to 'playing'");
    setGameState("playing");
    setScore(0);
    setHealth(3);
  }, []);

  // End the current game with a final score
  const endGame = useCallback((finalScore) => {
    console.log("Ending game: Setting gameState to 'gameover' with finalScore", finalScore);
    setGameState("gameover");
    setHighScore((prev) => Math.max(prev, finalScore));
  }, []);

  // Reset game to start screen
  const resetGame = useCallback(() => {
    console.log("Resetting game: Setting gameState to 'start'");
    setGameState("start");
    setScore(0);
    setHealth(3);
  }, []);

  // Memoized setters to avoid unnecessary re-renders
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

// Component to display "Powered by Monad" branding with responsive scaling
function PoweredByMonad() {
  return (
    <div className="flex items-center gap-2 text-[var(--monad-off-white)] opacity-80 text-xs sm:text-sm md:text-base">
      <span>Powered by</span>
      <img src="/monad.svg" alt="Monad" className="h-4 sm:h-5 md:h-6" />
    </div>
  );
}

// Main App component
function App() {
  const { gameState, score, health, highScore, startGame, endGame, resetGame, setScore, setHealth } = useGameState();
  const joystickRef = useRef({ active: false, x: 0, y: 0, baseX: 0, baseY: 0 }); // Ref for joystick state
  const boostRef = useRef(false); // Ref for boost state
  const knobRef = useRef(null); // Ref for joystick knob DOM element
  const joystickContainerRef = useRef(null); // Ref for joystick container DOM element

  // Log when the App component mounts
  useEffect(() => {
    console.log("App component mounted");
  }, []);

  // Simulate keyboard events for mobile controls
  const simulateKeyEvent = useCallback((key, type) => {
    const event = new KeyboardEvent(type, { key });
    document.dispatchEvent(event);
  }, []);

  // Handle joystick start event (touch begin)
  const handleJoystickStart = useCallback(
    (e) => {
      if (gameState !== "playing") return;
      const touch = e.touches[0];
      joystickRef.current.active = true;
      joystickRef.current.baseX = touch.clientX;
      joystickRef.current.baseY = touch.clientY;
      joystickRef.current.x = touch.clientX;
      joystickRef.current.y = touch.clientY;
    },
    [gameState]
  );

  // Handle joystick movement (touch move)
  const handleJoystickMove = useCallback(
    (e) => {
      if (!joystickRef.current.active || gameState !== "playing") return;
      e.preventDefault();
      const touch = e.touches[0];
      joystickRef.current.x = touch.clientX;
      joystickRef.current.y = touch.clientY;

      const dx = joystickRef.current.x - joystickRef.current.baseX;
      const dy = joystickRef.current.y - joystickRef.current.baseY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = 40;

      if (knobRef.current) {
        const clampedDx = Math.max(-maxDistance, Math.min(maxDistance, dx));
        const clampedDy = Math.max(-maxDistance, Math.min(maxDistance, dy));
        knobRef.current.style.transform = `translate(${clampedDx}px, ${clampedDy}px)`;
      }

      if (distance > 10) {
        if (dx < -maxDistance / 2) simulateKeyEvent("ArrowLeft", "keydown");
        else if (dx > maxDistance / 2) simulateKeyEvent("ArrowRight", "keydown");
        else {
          simulateKeyEvent("ArrowLeft", "keyup");
          simulateKeyEvent("ArrowRight", "keyup");
        }
        if (dy < -maxDistance / 2) simulateKeyEvent("ArrowUp", "keydown");
        else if (dy > maxDistance / 2) simulateKeyEvent("ArrowDown", "keydown");
        else {
          simulateKeyEvent("ArrowUp", "keyup");
          simulateKeyEvent("ArrowDown", "keyup");
        }
      }
    },
    [gameState, simulateKeyEvent]
  );

  // Handle joystick end event (touch end)
  const handleJoystickEnd = useCallback(() => {
    if (!joystickRef.current.active) return;
    joystickRef.current.active = false;
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(0px, 0px)`;
    }
    simulateKeyEvent("ArrowLeft", "keyup");
    simulateKeyEvent("ArrowRight", "keyup");
    simulateKeyEvent("ArrowUp", "keyup");
    simulateKeyEvent("ArrowDown", "keyup");
  }, [simulateKeyEvent]);

  // Handle boost button start (touch begin)
  const handleBoostStart = useCallback(() => {
    if (gameState !== "playing") return;
    boostRef.current = true;
    simulateKeyEvent(" ", "keydown");
  }, [gameState, simulateKeyEvent]);

  // Handle boost button end (touch end)
  const handleBoostEnd = useCallback(() => {
    if (!boostRef.current) return;
    boostRef.current = false;
    simulateKeyEvent(" ", "keyup");
  }, [simulateKeyEvent]);

  // Attach touch event listeners for joystick
  useEffect(() => {
    const joystickContainer = joystickContainerRef.current;
    if (!joystickContainer) return;

    const startHandler = (e) => handleJoystickStart(e);
    const moveHandler = (e) => handleJoystickMove(e);
    const endHandler = (e) => handleJoystickEnd(e);

    joystickContainer.addEventListener("touchstart", startHandler, { passive: false });
    joystickContainer.addEventListener("touchmove", moveHandler, { passive: false });
    joystickContainer.addEventListener("touchend", endHandler, { passive: false });
    joystickContainer.addEventListener("touchcancel", endHandler, { passive: false });

    // Cleanup event listeners on unmount
    return () => {
      joystickContainer.removeEventListener("touchstart", startHandler);
      joystickContainer.removeEventListener("touchmove", moveHandler);
      joystickContainer.removeEventListener("touchend", endHandler);
      joystickContainer.removeEventListener("touchcancel", endHandler);
    };
  }, [handleJoystickStart, handleJoystickMove, handleJoystickEnd]);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {/* Main container with dynamic overflow and background */}
          <div
            className={`relative w-screen h-screen ${
              gameState === "playing" ? "overflow-hidden" : "overflow-auto"
            } bg-[var(--monad-black)] text-[var(--monad-off-white)] font-sans`}
          >
            {/* 3D Racing Scene - Always rendered for cinematic effect on start screen */}
            <RacingScene
              score={score}
              setScore={setScore}
              setHealth={setHealth}
              health={health}
              endGame={endGame}
              gameState={gameState}
            />
            {/* Wallet Connect Button */}
            <div className="absolute top-4 right-4 z-20">
              <ConnectButton />
            </div>

            {/* Start Screen */}
            {gameState === "start" && (
              <div className="absolute inset-0 w-full min-h-screen flex flex-col items-center justify-center z-10 p-6 bg-transparent">
                <div className="flex flex-col items-center w-full max-w-4xl gap-8">
                  <h1 className="text-5xl md:text-7xl font-bold text-[var(--monad-purple)] tracking-wide animate-pulse drop-shadow-lg">
                    NAD RACER
                  </h1>
                  <div className="flex flex-col items-center gap-6">
                    <ConnectedContent
                      startGame={startGame}
                      contractAddress={gameContractAddress}
                      contractABI={gameContractABI}
                    />
                    {SHOW_DIRECT_PLAY_BUTTON && (
                      <button
                        className="px-12 py-4 text-xl md:text-2xl bg-[var(--monad-berry)] hover:bg-[var(--monad-berry)]/80 text-[var(--monad-off-white)] rounded-lg shadow-lg transition-all duration-300 hover:scale-105 w-full max-w-xs"
                        onClick={startGame}
                      >
                        Play Directly
                      </button>
                    )}
                  </div>
                  <ProfileInfo contractAddress={gameContractAddress} contractABI={gameContractABI} />
                </div>
                <Leaderboard contractAddress={gameContractAddress} contractABI={gameContractABI} />
              </div>
            )}

            {/* Playing Screen HUD */}
            {gameState === "playing" && (
              <>
                {/* Score and Health HUD */}
                <div className="absolute top-4 left-4 bg-[var(--monad-black)]/90 p-4 rounded-xl shadow-lg border border-[var(--monad-purple)]/50 z-10 min-w-[200px]">
                  <p className="mb-3 text-lg flex justify-between items-center">
                    <span className="font-semibold text-[var(--monad-purple)]">Score</span>
                    <span className="text-[var(--monad-off-white)] font-bold">{score}</span>
                  </p>
                  <p className="text-lg flex justify-between items-center">
                    <span className="font-semibold text-[var(--monad-purple)]">Health</span>
                    <span className="flex gap-2">
                      {Array(health)
                        .fill()
                        .map((_, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 bg-[var(--monad-berry)] rounded-full shadow-md animate-pulse"
                          ></div>
                        ))}
                    </span>
                  </p>
                </div>
                {/* Mobile Joystick */}
                <div
                  className="fixed bottom-12 left-4 w-24 h-24 z-50 block md:hidden"
                  ref={joystickContainerRef}
                >
                  <div className="w-full h-full bg-[var(--monad-blue)]/50 rounded-full border-2 border-[var(--monad-purple)] shadow-lg relative">
                    <div
                      className="w-10 h-10 bg-[var(--monad-purple)] rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-md"
                      ref={knobRef}
                    ></div>
                  </div>
                </div>
                {/* Mobile Boost Button */}
                <div className="fixed bottom-12 right-4 z-50 block md:hidden">
                  <button
                    className="w-16 h-16 bg-[var(--monad-berry)] rounded-full text-[var(--monad-off-white)] text-2xl font-bold shadow-lg transition-all duration-200 flex items-center justify-center active:scale-95"
                    onTouchStart={handleBoostStart}
                    onTouchEnd={handleBoostEnd}
                  >
                    <span className="text-3xl">🔥</span>
                  </button>
                </div>
              </>
            )}

            {/* Game Over Screen */}
            {gameState === "gameover" && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-[var(--monad-blue)] to-[var(--monad-black)] p-8 rounded-2xl shadow-2xl z-10 w-full max-w-lg border border-[var(--monad-purple)]/50">
                <h1 className="text-4xl md:text-5xl font-bold text-[var(--monad-off-white)] mb-6 tracking-wide drop-shadow-md">
                  Game Over
                </h1>
                <div className="grid grid-cols-2 gap-6 mb-8 bg-[var(--monad-black)]/80 p-6 rounded-xl border border-[var(--monad-berry)]/30">
                  <div className="text-center">
                    <p className="text-sm uppercase text-[var(--monad-purple)] font-medium">
                      Final Score
                    </p>
                    <p className="text-3xl font-bold text-[var(--monad-off-white)]">{score}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm uppercase text-[var(--monad-purple)] font-medium">
                      High Score
                    </p>
                    <p className="text-3xl font-bold text-[var(--monad-off-white)]">{highScore}</p>
                  </div>
                </div>
                <ConnectedContent
                  startGame={startGame}
                  finalScore={score}
                  contractAddress={gameContractAddress}
                  contractABI={gameContractABI}
                  resetGame={resetGame}
                />
              </div>
            )}

            {/* Footer Elements - Visible on all screens */}
            {/* Version Info on the left */}
            <div className="fixed bottom-4 left-4 z-20 text-[var(--monad-off-white)] opacity-80 text-xs sm:text-sm md:text-base">
              Version: {APP_VERSION}
            </div>
            {/* Powered by Monad on the right with responsive scaling */}
            <div className="fixed bottom-4 right-4 z-20">
              <PoweredByMonad />
            </div>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// Leaderboard component to display top players
function Leaderboard({ contractAddress, contractABI }) {
  const { address } = useAccount();
  const { data: leaderboardData } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "getLeaderboard",
    chainId: 10143,
  });

  const leaderboard = useMemo(() => leaderboardData || [], [leaderboardData]);

  // Log leaderboard data for debugging
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
    <div className="w-full max-w-sm bg-[var(--monad-black)]/90 p-4 sm:p-6 rounded-xl shadow-lg border border-[var(--monad-purple)]/30 max-h-[500px] overflow-y-auto overflow-x-hidden mt-6 md:absolute md:left-6 md:top-1/2 md:-translate-y-1/2">
      <h2 className="text-xl sm:text-2xl font-semibold text-center text-[var(--monad-purple)] mb-4">
        Leaderboard
      </h2>
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-[var(--monad-berry)]/30">
            <th className="p-2 text-left text-[var(--monad-off-white)]">Rank</th>
            <th className="p-2 text-left text-[var(--monad-off-white)]">Player</th>
            <th className="p-2 text-right text-[var(--monad-off-white)]">Points</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((player, index) => (
            <tr
              key={player.playerAddress}
              className="hover:bg-[var(--monad-blue)]/20 transition-colors"
            >
              <td className="p-2 font-bold text-[var(--monad-purple)]">{index + 1}</td>
              <td className="p-2 font-mono text-[var(--monad-off-white)]">
                {player.playerAddress.slice(2, 8)}...{player.playerAddress.slice(-4)}
              </td>
              <td className="p-2 font-bold text-right text-[var(--monad-off-white)]">
                {Number(formatEther(player.points)).toFixed(2)} NP
              </td>
            </tr>
          ))}
          {leaderboard.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center p-4 text-[var(--monad-off-white)]">
                No players yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Profile Info component for connected players
function ProfileInfo({ contractAddress, contractABI }) {
  const { address, isConnected } = useAccount();
  const { data: totalPoints } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "getTotalPoints",
    args: [address],
    enabled: !!isConnected,
    chainId: 10143,
  });

  const playerTotalPoints = totalPoints ? formatEther(totalPoints) : "0";

  if (!isConnected) return null;

  return (
    <div className="w-full max-w-sm bg-[var(--monad-black)]/90 p-4 sm:p-6 rounded-xl shadow-lg border border-[var(--monad-purple)]/30 text-center mt-6 md:absolute md:bottom-6 md:left-1/2 md:-translate-x-1/2">
      <h3 className="text-base sm:text-lg font-semibold text-[var(--monad-purple)] mb-4">
        Player Profile
      </h3>
      <div className="space-y-4">
        <p className="flex justify-between items-center">
          <span className="font-medium text-[var(--monad-off-white)] text-xs sm:text-sm">
            Wallet
          </span>
          <span className="font-mono text-xs sm:text-sm bg-[var(--monad-blue)]/50 px-2 py-1 rounded text-[var(--monad-off-white)]">
            {address?.slice(2, 8)}...{address?.slice(-4)}
          </span>
        </p>
        <p className="flex justify-between items-center">
          <span className="font-medium text-[var(--monad-off-white)] text-xs sm:text-sm">
            Your Points
          </span>
          <span className="font-mono text-xs sm:text-sm bg-[var(--monad-purple)]/50 px-2 py-1 rounded text-[var(--monad-off-white)]">
            {Number(playerTotalPoints).toFixed(2)} NP
          </span>
        </p>
      </div>
    </div>
  );
}

// Component for game controls and Web3 interactions
function ConnectedContent({ startGame, finalScore, contractAddress, contractABI, resetGame }) {
  const { isConnected, chainId } = useAccount();
  const { writeContract: startGameWrite, data: startTxHash, isPending: isStarting } =
    useWriteContract();
  const {
    writeContract: recordAndClaimWrite,
    data: claimTxHash,
    isPending: isClaiming,
    error: claimError,
  } = useWriteContract();
  const { isSuccess: startTxConfirmed } = useWaitForTransactionReceipt({
    hash: startTxHash,
    chainId: 10143,
  });
  const { isSuccess: claimTxConfirmed } = useWaitForTransactionReceipt({
    hash: claimTxHash,
    chainId: 10143,
  });
  const { openConnectModal, connectModalOpen } = useConnectModal();
  const [pointsClaimed, setPointsClaimed] = useState(false);

  // Start game after transaction confirmation
  useEffect(() => {
    if (startTxConfirmed && startGame) {
      console.log("Start transaction confirmed, starting game");
      startGame();
    }
  }, [startTxConfirmed, startGame]);

  // Handle claim points feedback
  useEffect(() => {
    if (claimError) console.error("Claim Points Error:", claimError);
    if (claimTxConfirmed) {
      console.log("Points recorded and claimed successfully");
      setPointsClaimed(true);
      queryClient.invalidateQueries(["getTotalPoints"]);
    }
  }, [claimError, claimTxConfirmed]);

  // Handle start game logic
  const handleStartGame = useCallback(() => {
    if (!isConnected) {
      console.log("Wallet not connected, opening RainbowKit connect modal...");
      if (openConnectModal) openConnectModal();
      return;
    }
    if (chainId !== 10143) {
      alert("Please switch to Monad Testnet (Chain ID: 10143)");
      return;
    }
    console.log("Initiating startGame transaction");
    startGameWrite({
      address: contractAddress,
      abi: contractABI,
      functionName: "startGame",
    });
  }, [isConnected, chainId, startGameWrite, contractAddress, contractABI, openConnectModal]);

  // Handle claiming points
  const handleRecordAndClaim = useCallback(() => {
    if (chainId !== 10143) {
      alert("Please switch to Monad Testnet (Chain ID: 10143)");
      return;
    }
    if (finalScore > 0) {
      console.log("Initiating recordAndClaimPoints transaction with points:", finalScore);
      recordAndClaimWrite({
        address: contractAddress,
        abi: contractABI,
        functionName: "recordAndClaimPoints",
        args: [BigInt(finalScore)],
      });
    }
  }, [chainId, finalScore, recordAndClaimWrite, contractAddress, contractABI]);

  return (
    <>
      {finalScore === undefined ? (
        // Start screen button
        <button
          className={`mt-6 px-12 py-4 text-2xl bg-[var(--monad-purple)] hover:bg-[var(--monad-purple)]/80 text-[var(--monad-off-white)] rounded-lg shadow-lg transition-all duration-300 hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed w-full max-w-xs`}
          onClick={handleStartGame}
          disabled={isStarting || connectModalOpen || (isConnected && chainId !== 10143)}
        >
          {connectModalOpen
            ? "Connecting..."
            : isStarting
            ? "Starting..."
            : isConnected
            ? "Start Game"
            : "Connect to Play"}
        </button>
      ) : (
        // Game over screen buttons
        <div className="flex flex-col gap-4 md:flex-row md:gap-6 justify-center mt-6">
          {finalScore > 0 && !pointsClaimed && (
            <button
              className="px-6 py-3 text-lg md:text-xl font-semibold bg-[var(--monad-berry)] hover:bg-[var(--monad-berry)]/80 text-[var(--monad-off-white)] rounded-lg shadow-lg transition-all duration-300 hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed w-full md:w-auto"
              onClick={handleRecordAndClaim}
              disabled={isClaiming}
            >
              {isClaiming ? "Claiming..." : "Claim Points"}
            </button>
          )}
          <button
            className="px-6 py-3 text-lg md:text-xl font-semibold bg-[var(--monad-purple)] hover:bg-[var(--monad-purple)]/80 text-[var(--monad-off-white)] rounded-lg shadow-lg transition-all duration-300 hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed w-full md:w-auto"
            onClick={handleStartGame}
            disabled={isStarting || (isConnected && chainId !== 10143)}
          >
            {isStarting ? "Starting..." : "Play Again"}
          </button>
          <button
            className="px-6 py-3 text-lg md:text-xl font-semibold bg-[var(--monad-off-white)] hover:bg-[var(--monad-off-white)]/80 text-[var(--monad-black)] rounded-lg shadow-lg transition-all duration-300 hover:scale-105 w-full md:w-auto"
            onClick={resetGame}
          >
            Main Menu
          </button>
        </div>
      )}
    </>
  );
}

export default App;