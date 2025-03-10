"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import RacingScene from "./racingscene";
import BackgroundScene from "./background";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { wagmiConfig } from "./web3Config";
import { Navbar, SectionContent, Footer } from "./components";
import { gameContractAddress, gameContractABI } from "./contractint";

// Constants for game configuration
const SHOW_DIRECT_PLAY_BUTTON = false; // Option to show a direct play button bypassing wallet connection
const queryClient = new QueryClient(); // Query client for React Query
const APP_VERSION = "1.1.0"; // Version of the app displayed in footer

// Sound configuration for background music and engine effects
const SOUND_CONFIG = {
  GAMEBG_VOLUME: 0.2, // Volume for background music
  ENGINE_VOLUME: 0.1, // Base volume for engine sound
  ENGINE_BOOST_MULTIPLIER: 2.5, // Multiplier for engine sound when boosting
};

// Ship options for selection screen
const SHIP_OPTIONS = [
  { id: "SHIP_1", name: "Nad 105", preview: "/models/ship1.png", isFree: true }, // Free ship
  { id: "SHIP_2", name: "Bumble Ship", preview: "/models/ship2.png", isFree: false, npCost: 10000 * 10**18 }, // NFT-locked ship
];

// Custom hook to manage game state
function useGameState() {
  const [gameState, setGameState] = useState("start"); // Tracks current game state (start, shipselect, playing, gameover)
  const [score, setScore] = useState(0); // Current score during gameplay
  const [health, setHealth] = useState(3); // Player health during gameplay
  const [selectedShip, setSelectedShip] = useState("SHIP_1"); // Selected ship ID

  // Start game by moving to ship selection (triggered by ConnectedContent)
  const startGame = useCallback(() => {
    console.log("Proceeding to ship selection...");
    setGameState("shipselect");
  }, []);

  // Begin gameplay with selected ship
  const startPlaying = useCallback(() => {
    console.log("Starting game with ship:", selectedShip);
    setGameState("playing");
    setScore(0);
    setHealth(3);
  }, [selectedShip]);

  // End game and transition to gameover state
  const endGame = useCallback((finalScore) => {
    console.log("Game over with score:", finalScore);
    setScore(finalScore); // Set final score for claiming
    setGameState("gameover");
  }, []);

  // Reset game state to initial values
  const resetGame = useCallback(() => {
    console.log("Resetting to main menu...");
    setGameState("start");
    setScore(0);
    setHealth(3);
    setSelectedShip("SHIP_1");
  }, []);

  // Memoized setters for performance
  const memoizedSetScore = useCallback((newScoreFunc) => setScore(newScoreFunc), []);
  const memoizedSetHealth = useCallback((newHealthFunc) => setHealth(newHealthFunc), []);

  // Log state changes for debugging
  useEffect(() => {
    console.log("Game State:", { gameState, score, health, selectedShip });
  }, [gameState, score, health, selectedShip]);

  return {
    gameState,
    score,
    health,
    selectedShip,
    setSelectedShip,
    startGame,
    startPlaying,
    endGame,
    resetGame,
    setScore: memoizedSetScore,
    setHealth: memoizedSetHealth,
  };
}

// Powered by Monad logo component
export function PoweredByMonad() {
  return (
    <div className="flex items-center gap-2 text-[var(--monad-off-white)] opacity-80 text-xs sm:text-sm">
      <span>Powered by</span>
      <img src="/monad.svg" alt="Monad" className="h-4 sm:h-5 md:h-6" />
    </div>
  );
}

// ConnectedContent Component - Handles wallet connection and game start
function ConnectedContent({ startGame, finalScore, resetGame }) {
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

// ProfileInfo Component - Consistent width with homepage elements
function ProfileInfo() {
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
    <div className="w-full py-3 px-6 md:py-6 md:px-8 rounded-xl border border-[var(--monad-off-white)]/30">
      <h2 className="text-xl text-[var(--monad-off-white)] mb-4 text-center">PLAYER INFO</h2>
      <div className="text-sm sm:text-base text-[var(--monad-off-white)] space-y-2">
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

// Child component to handle game content and Web3 logic
function GameContent({ gameState, score, health, selectedShip, setSelectedShip, startGame, startPlaying, endGame, resetGame, setScore, setHealth }) {
  const controlsRef = useRef({ left: false, right: false, boost: false }); // Ref for mobile controls
  const gameBgSoundRef = useRef(null); // Ref for background music
  const engineSoundRef = useRef(null); // Ref for engine sound
  const [currentSection, setCurrentSection] = useState("play"); // Current section in main menu

  // Get the connected wallet address
  const { address, isConnected } = useAccount();

  // Fetch on-chain player data (totalPoints, highestScore)
  const { data: playerData } = useReadContract({
    address: gameContractAddress,
    abi: gameContractABI,
    functionName: "getPlayerData",
    args: [address],
    enabled: !!isConnected && !!address,
    chainId: 10143, // Monad Testnet
  });

  // Check if player owns Ship 2 NFT
  const { data: ownsShip2 } = useReadContract({
    address: gameContractAddress,
    abi: gameContractABI,
    functionName: "ownsShip2NFT",
    args: [address],
    enabled: !!isConnected && !!address,
    chainId: 10143,
  });

  // Extract on-chain data
  const onChainHighScore = playerData ? Number(playerData[1]) : 0;
  const npTokens = playerData ? Number(playerData[0]) : 0;
  const hasShip2 = ownsShip2 || false;

  // Mint Ship 2 NFT
  const { writeContract } = useWriteContract();
  const mintShip2NFT = () => {
    writeContract({
      address: gameContractAddress,
      abi: gameContractABI,
      functionName: "mintShip2NFT",
      chainId: 10143,
    });
  };

  // Claim points on game over
  const claimPoints = () => {
    if (isConnected && score > 0) {
      writeContract({
        address: gameContractAddress,
        abi: gameContractABI,
        functionName: "claimPoints",
        args: [score],
        chainId: 10143,
      }, {
        onSuccess: () => {
          console.log("Points claimed:", score);
          resetGame(); // Reset after claiming
        },
        onError: (error) => console.error("Claim points failed:", error),
      });
    }
  };

  // Initialize audio elements
  useEffect(() => {
    if (!gameBgSoundRef.current) {
      gameBgSoundRef.current = new Audio("/sounds/gamebg.mp3");
      gameBgSoundRef.current.loop = true;
      gameBgSoundRef.current.volume = SOUND_CONFIG.GAMEBG_VOLUME;
      console.log("Game background music initialized");
    }
    if (!engineSoundRef.current) {
      engineSoundRef.current = new Audio("/sounds/engine.mp3");
      engineSoundRef.current.loop = true;
      engineSoundRef.current.volume = SOUND_CONFIG.ENGINE_VOLUME;
      console.log("Engine sound initialized");
    }
  }, []);

  // Manage audio playback based on game state
  useEffect(() => {
    if (gameState === "playing") {
      if (gameBgSoundRef.current && gameBgSoundRef.current.paused) gameBgSoundRef.current.play().catch((e) => console.error("Background music error:", e));
      if (engineSoundRef.current && engineSoundRef.current.paused) engineSoundRef.current.play().catch((e) => console.error("Engine sound error:", e));
    } else {
      if (gameBgSoundRef.current && !gameBgSoundRef.current.paused) {
        gameBgSoundRef.current.pause();
        gameBgSoundRef.current.currentTime = 0;
      }
      if (engineSoundRef.current && !engineSoundRef.current.paused) {
        engineSoundRef.current.pause();
        engineSoundRef.current.currentTime = 0;
      }
    }
    if (gameState === "playing" && engineSoundRef.current) {
      const targetVolume = controlsRef.current.boost
        ? SOUND_CONFIG.ENGINE_VOLUME * SOUND_CONFIG.ENGINE_BOOST_MULTIPLIER
        : SOUND_CONFIG.ENGINE_VOLUME;
      engineSoundRef.current.volume = Math.min(1, Math.max(0, engineSoundRef.current.volume + (targetVolume - engineSoundRef.current.volume) * 0.1));
    }
  }, [gameState, controlsRef.current.boost]);

  // Reset controls when not playing
  useEffect(() => {
    if (gameState !== "playing") {
      controlsRef.current = { left: false, right: false, boost: false };
      console.log("Controls reset:", controlsRef.current);
    }
  }, [gameState]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (gameBgSoundRef.current) gameBgSoundRef.current.pause();
      if (engineSoundRef.current) engineSoundRef.current.pause();
    };
  }, []);

  // Determine health bar color
  const getHealthColor = (health) => {
    if (health === 3) return "bg-green-500";
    if (health === 2) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <>
      {/* Background scene for visual effect */}
      <BackgroundScene />
      
      {/* Racing scene rendered during gameplay */}
      {gameState === "playing" && (
        <RacingScene
          key="racing-scene"
          score={score}
          setScore={setScore}
          health={health}
          setHealth={setHealth}
          endGame={endGame}
          gameState={gameState}
          controlsRef={controlsRef}
          selectedShip={selectedShip}
        />
      )}
      
      {/* Navigation bar for main menu */}
      <Navbar
        gameState={gameState}
        setCurrentSection={setCurrentSection}
        currentSection={currentSection}
      />
      
      {/* Start screen with centered title and play button */}
      {gameState === "start" && (
        <>
          {/* Full-screen container with centered content */}
          <div className="absolute inset-0 z-10 flex flex-col min-h-screen">
            {/* Centered content */}
            <div className="flex-grow flex flex-col justify-center items-center p-6">
              {currentSection === "play" && (
                <div className="flex flex-col items-center w-11/12 max-w-md space-y-8">
                  {/* Game title centered */}
                  <h1 className="game-title text-5xl md:text-6xl text-[var(--monad-off-white)] font-bold">NAD RACER</h1>
                  {/* Play buttons section */}
                  <div className="flex flex-col items-center gap-6 w-full">
                    <ConnectedContent startGame={startGame} />
                    {SHOW_DIRECT_PLAY_BUTTON && (
                      <button
                        className="px-12 py-4 text-xl md:text-2xl bg-transparent border border-[var(--monad-off-white)]/30 text-[var(--monad-off-white)] rounded-lg hover:text-[var(--monad-purple)] transition-all duration-300 w-full max-w-xs"
                        onClick={startGame}
                      >
                        Play Directly
                      </button>
                    )}
                  </div>
                  {/* ProfileInfo with subtle spacing */}
                  <div className="w-full mt-4 md:mt-16">
                    <ProfileInfo />
                  </div>
                </div>
              )}
              {/* Other sections content */}
              {currentSection !== "play" && (
                <SectionContent section={currentSection} />
              )}
            </div>
          </div>
          {/* Wallet connect button in top right */}
          <div className="absolute top-4 right-4 z-20">
            <ConnectButton />
          </div>
        </>
      )}
      
      {/* Ship selection screen */}
      {gameState === "shipselect" && (
        <div className="absolute inset-0 flex flex-col items-center justify-start z-10 p-6 pb-32 md:pb-6 overflow-y-auto">
          <h1 className="text-4xl md:text-5xl text-[var(--monad-off-white)] mb-8 mt-4 md:mt-20">SELECT YOUR SHIP</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full">
            {SHIP_OPTIONS.map((ship) => (
              <div
                key={ship.id}
                className={`bg-transparent p-4 rounded-xl border ${
                  selectedShip === ship.id ? "border-[var(--monad-purple)]" : "border-[var(--monad-off-white)]/30"
                } ${ship.isFree || hasShip2 ? "cursor-pointer" : "cursor-not-allowed opacity-50"} hover:border-[var(--monad-purple)] transition-all duration-300`}
                onClick={() => (ship.isFree || hasShip2) && setSelectedShip(ship.id)}
              >
                <img src={ship.preview} alt={ship.name} className="w-full h-48 object-contain mb-4" />
                <p className="text-xl text-center text-[var(--monad-off-white)]">{ship.name}</p>
                {!ship.isFree && !hasShip2 && (
                  <div className="text-center mt-2">
                    <p className="text-sm text-[var(--monad-off-white)]/80">Cost: 10,000 NP Tokens</p>
                    {isConnected ? (
                      npTokens >= ship.npCost ? (
                        <button
                          className="mt-2 px-4 py-2 text-sm bg-transparent border border-[var(--monad-purple)] text-[var(--monad-purple)] rounded-lg hover:bg-[var(--monad-purple)]/20 transition-all duration-300 w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            mintShip2NFT();
                          }}
                        >
                          Mint NFT
                        </button>
                      ) : (
                        <p className="mt-2 text-sm text-red-500">Insufficient NP Tokens</p>
                      )
                    ) : (
                      <p className="mt-2 text-sm text-[var(--monad-off-white)]/80">Connect wallet to unlock</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            className="mt-8 px-12 py-4 text-xl md:text-2xl bg-transparent border border-[var(--monad-off-white)]/30 text-[var(--monad-off-white)] rounded-lg hover:text-[var(--monad-purple)] transition-all duration-300 w-full max-w-xs"
            onClick={startPlaying}
          >
            Confirm Selection
          </button>
        </div>
      )}
      
      {/* In-game HUD */}
      {gameState === "playing" && (
        <div className="absolute top-4 left-4 bg-transparent p-4 rounded-xl border border-[var(--monad-off-white)]/30 z-10">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-4xl md:text-5xl text-[var(--monad-off-white)]">{score}</span>
            </div>
            <div>
              <div className="flex gap-1">
                {Array(9)
                  .fill()
                  .map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-8 rounded-full ${i < health * 3 ? getHealthColor(health) : "bg-gray-700"}`}
                    ></div>
                  ))}
              </div>
              <p className="text-xs uppercase text-[var(--monad-off-white)] mt-1">HEALTH</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile controls during gameplay */}
      {gameState === "playing" && (
        <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-50 flex justify-between w-11/12 max-w-md md:hidden touch-none">
          <button
            className="w-20 h-20 bg-transparent border border-[var(--monad-off-white)]/30 rounded-full transition-all duration-300 flex items-center justify-center active:scale-95 hover:text-[var(--monad-purple)] touch-none select-none"
            onTouchStart={(e) => {
              e.preventDefault();
              controlsRef.current.left = true;
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              controlsRef.current.left = false;
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              controlsRef.current.left = false;
            }}
          >
            <img src="/svg/left.svg" alt="Left" className="w-10 h-10 pointer-events-none" draggable="false" />
          </button>
          <button
            className="w-20 h-20 bg-transparent border border-[var(--monad-off-white)]/30 rounded-full transition-all duration-300 flex items-center justify-center active:scale-95 hover:text-[var(--monad-purple)] touch-none select-none"
            onTouchStart={(e) => {
              e.preventDefault();
              controlsRef.current.boost = true;
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              controlsRef.current.boost = false;
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              controlsRef.current.boost = false;
            }}
          >
            <img src="/svg/fire.svg" alt="Boost" className="w-10 h-10 pointer-events-none" draggable="false" />
          </button>
          <button
            className="w-20 h-20 bg-transparent border border-[var(--monad-off-white)]/30 rounded-full transition-all duration-300 flex items-center justify-center active:scale-95 hover:text-[var(--monad-purple)] touch-none select-none"
            onTouchStart={(e) => {
              e.preventDefault();
              controlsRef.current.right = true;
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              controlsRef.current.right = false;
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              controlsRef.current.right = false;
            }}
          >
            <img src="/svg/right.svg" alt="Right" className="w-10 h-10 pointer-events-none" draggable="false" />
          </button>
        </div>
      )}
      
      {/* Game over screen */}
      {gameState === "gameover" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-transparent p-8 rounded-2xl border border-[var(--monad-off-white)]/30 z-10 w-full max-w-md">
          <h1 className="text-5xl md:text-6xl text-[var(--monad-off-white)] mb-6 text-center font-bold">GAME OVER</h1>
          {score > onChainHighScore && onChainHighScore > 0 && (
            <p className="text-xl md:text-2xl text-[var(--monad-purple)] mb-6 text-center">
              Congratulations for breaking your previous high score!
            </p>
          )}
          <div className="text-center mb-4">
            <p className="text-sm uppercase text-[var(--monad-off-white)]/80 font-medium">Final Score</p>
            <p className="text-6xl md:text-7xl text-[var(--monad-off-white)] font-bold">{score}</p>
          </div>
          <div className="text-center mb-8">
            <p className="text-xs uppercase text-[var(--monad-off-white)]/80 font-medium">Previous High Score</p>
            <p className="text-xl md:text-2xl text-[var(--monad-off-white)]">{onChainHighScore}</p>
          </div>
          <div className="flex flex-col gap-4 justify-center items-center">
            {isConnected && score > 0 && (
              <button
                className="px-12 py-4 text-xl md:text-2xl bg-transparent border border-[var(--monad-purple   border-[var(--monad-purple)] text-[var(--monad-purple)] rounded-lg hover:bg-[var(--monad-purple)]/20 transition-all duration-300 w-full max-w-xs"
                onClick={claimPoints}
              >
                Claim Points
              </button>
            )}
            <ConnectedContent startGame={startGame} finalScore={score} resetGame={resetGame} />
          </div>
        </div>
      )}
      
      {/* Footer with version and Monad branding */}
      <Footer appVersion={APP_VERSION} gameState={gameState} />
    </>
  );
}

function App() {
  const { gameState, score, health, selectedShip, setSelectedShip, startGame, startPlaying, endGame, resetGame, setScore, setHealth } = useGameState();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div
            className={`relative w-screen h-screen ${
              gameState === "playing" ? "overflow-hidden" : "overflow-auto"
            } bg-[var(--monad-black)] text-[var(--monad-off-white)]`}
          >
            <GameContent
              gameState={gameState}
              score={score}
              health={health}
              selectedShip={selectedShip}
              setSelectedShip={setSelectedShip}
              startGame={startGame}
              startPlaying={startPlaying}
              endGame={endGame}
              resetGame={resetGame}
              setScore={setScore}
              setHealth={setHealth}
            />
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;