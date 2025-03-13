"use client";

import React, { useState, useEffect, useRef } from "react";
import RacingScene from "./racingscene";
import BackgroundScene from "./background";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { 
  Navbar, 
  Footer, 
  GameOverScreen, 
  StoryPage,
  AboutPage,
  LeaderboardPage 
} from "./components";
import { processTokens, checkPlayerRegistration, registerPlayer, saveScore, getLeaderboard } from "./backendService";
import { audioSystem } from './audioSystem';

// Enable or disable console logs globally - set to false for production
const DEBUG = false;

// Setup console log control - this affects all files that use console methods
(() => {
  if (!DEBUG) {
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
    
    // Keep error logging for critical errors, comment next line to disable all logs completely
    // console.error = originalConsole.error;
    console.error = () => {};
    
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

// Constants for game configuration
const APP_VERSION = "1.2.0 Beta"; // Version of the app displayed in footer
const SHOW_DIRECT_PLAY_BUTTON = false; // Option to show a direct play button bypassing wallet connection

// Ship options for selection screen
const SHIP_OPTIONS = [
  { id: "SHIP_1", name: "Speeder", preview: "/models/ship1.png", isFree: true },
  { id: "SHIP_2", name: "Bumble Ship", preview: "/models/ship2.png", isFree: false, npCost: 10000 * 10**18 }, // NFT-locked ship
];

// Powered by Monad logo component
export function PoweredByMonad() {
  return (
    <div className="flex items-center gap-2 text-[var(--monad-off-white)] opacity-80 text-xs sm:text-sm">
      <span>Powered by</span>
      <img src="/monad.svg" alt="Monad" className="h-4 sm:h-5 md:h-6" />
    </div>
  );
}

// Registration component for new users
function RegistrationForm({ walletAddress, onRegistrationComplete }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || username.length < 3 || username.length > 20) {
      setError("Username must be between 3 and 20 characters");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const result = await registerPlayer(walletAddress, username);
      
      if (result.success) {
        onRegistrationComplete(result.player);
      } else {
        setError(result.error || "Registration failed. Please try again.");
      }
    } catch (error) {
      setError("An error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-black/50 p-6 rounded-xl border border-[var(--monad-off-white)]/30 w-full max-w-md">
      <h2 className="text-2xl text-[var(--monad-off-white)] mb-4">Welcome to NAD RACER</h2>
      <p className="text-[var(--monad-off-white)] mb-6">Choose a username to get started:</p>
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username (3-20 characters)"
          className="w-full p-3 bg-black/30 text-[var(--monad-off-white)] border border-[var(--monad-off-white)]/30 rounded-lg mb-4"
        />
        
        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-6 py-3 bg-[var(--monad-purple)] text-[var(--monad-off-white)] rounded-lg hover:bg-[var(--monad-purple)]/80 transition-all duration-300"
        >
          {isLoading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
}

// ConnectedContent Component - Handles wallet connection and game start
function ConnectedContent({ startGame, finalScore, resetGame }) {
  const { isConnected, address } = useAccount();
  // eslint-disable-next-line no-unused-vars
  const [playerData, setPlayerData] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if player is registered when wallet connects
  useEffect(() => {
    const checkRegistration = async () => {
      if (isConnected && address) {
        setIsLoading(true);
        try {
          const result = await checkPlayerRegistration(address);
          setIsRegistered(result.registered);
          if (result.registered) {
            setPlayerData(result.player);
          }
        } catch (error) {
          console.error("Failed to check registration:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsRegistered(false);
        setPlayerData(null);
        setIsLoading(false);
      }
    };

    checkRegistration();
  }, [isConnected, address]);

  const handleRegistrationComplete = (player) => {
    setIsRegistered(true);
    setPlayerData(player);
  };

  const handleStartGame = () => {
      startGame();
  };

  // Show back to menu button after game ends
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

  if (isConnected) {
    if (isLoading) {
      return <div className="text-[var(--monad-off-white)] text-xl">Loading...</div>;
    }
    
    if (!isRegistered) {
      return <RegistrationForm walletAddress={address} onRegistrationComplete={handleRegistrationComplete} />;
    }
    
    return (
      <button
        className="px-12 py-4 text-xl md:text-2xl bg-black/40 border-2 border-[var(--monad-purple)] text-[var(--monad-off-white)] rounded-lg hover:bg-[var(--monad-purple)]/20 hover:shadow-[0_0_15px_rgba(131,110,249,0.6)] transition-all duration-300 w-full max-w-xs font-[var(--title-font)]"
        onClick={handleStartGame}
      >
        PLAY
      </button>
    );
  }

  return null;
}

// ProfileInfo Component - Displays player info from backend
function ProfileInfo() {
  const { isConnected, address } = useAccount();
  // eslint-disable-next-line no-unused-vars
  const [playerData, setPlayerData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mintStatus, setMintStatus] = useState(null); // null, 'success', 'error'
  const [statusMessage, setStatusMessage] = useState('');

  // Function to fetch player data from backend
  const fetchPlayerData = async () => {
    if (isConnected && address) {
      setIsLoading(true);
      try {
        const result = await checkPlayerRegistration(address);
        if (result.registered) {
          setPlayerData(result.player);
        } else {
          setPlayerData(null);
        }
      } catch (error) {
        console.error("Failed to fetch player data:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setPlayerData(null);
      setIsLoading(false);
    }
  };

  // Fetch player data when wallet status changes
  useEffect(() => {
    fetchPlayerData();
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="bg-black/50 p-4 rounded-xl border border-[var(--monad-off-white)]/30">
        <p className="text-center text-[var(--monad-off-white)] text-lg">Connect wallet to see your stats</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-black/50 p-4 rounded-xl border border-[var(--monad-off-white)]/30">
        <p className="text-center text-[var(--monad-off-white)] text-lg">Loading player data...</p>
      </div>
    );
  }

  if (!playerData) {
    return (
      <div className="bg-black/50 p-4 rounded-xl border border-[var(--monad-off-white)]/30">
        <p className="text-center text-[var(--monad-off-white)] text-lg">No player data found</p>
      </div>
    );
  }

  return (
    <div className="bg-black/60 p-5 rounded-xl border border-[var(--monad-purple)]/40 shadow-[0_0_10px_rgba(131,110,249,0.2)]">
      <div className="mb-4">
        <h3 className="text-[var(--monad-purple)] text-lg font-bold">PILOT INFO</h3>
        <p className="text-[var(--monad-off-white)] text-xl">{playerData.username}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[var(--monad-off-white)] text-sm">NP BALANCE</p>
          <p className="text-[var(--monad-purple)] text-xl font-bold">{playerData.totalPoints}</p>
        </div>
        <div>
          <p className="text-[var(--monad-off-white)] text-sm">HIGH SCORE</p>
          <p className="text-[var(--monad-purple)] text-xl font-bold">{playerData.highestScore}</p>
        </div>
      </div>
      
      {/* Token mint test button removed */}
    </div>
  );
}

// GameContent Component - Contains all game screens and logic
function GameContent({ gameState, score, health, selectedShip, setSelectedShip, startGame, startPlaying, endGame, resetGame, setScore, setHealth, currentSection }) {
  const { isConnected, address } = useAccount();
  const [collectedCoins, setCollectedCoins] = useState(0);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [playerData, setPlayerData] = useState(null);
  
  // Fetch player data when component mounts if connected
  useEffect(() => {
    if (isConnected && address) {
      const fetchPlayerData = async () => {
        try {
          const result = await checkPlayerRegistration(address);
          if (result.registered) {
            setPlayerData(result.player);
          }
        } catch (error) {
          console.error("Failed to fetch player data:", error);
        }
      };
      fetchPlayerData();
    }
  }, [isConnected, address]);
  
  // Handle coin collection during gameplay
  const handleCoinCollection = async (coinValue = 1) => {
    setCollectedCoins(prevCoins => {
      const newValue = prevCoins + coinValue;
      console.log(`🪙 GameContent: Collected coins: ${newValue}`);
      return newValue;
    });
    
    if (isConnected && address) {
      try {
        console.log(`💰 GameContent: Processing ${coinValue} token(s) for wallet: ${address}`);
        const result = await processTokens(address, coinValue);
        console.log(`✅ GameContent: Token processing result:`, result);
      } catch (error) {
        console.error("❌ GameContent: Failed to process token:", error);
      }
    } else {
      console.warn("⚠️ GameContent: No wallet connected when collecting coin");
    }
  };

  // Save score at the end of the game
  const saveGameScore = async () => {
    if (isConnected && address && score > 0) {
      try {
        const result = await saveScore(address, score);
        console.log("Score saved:", result);
      } catch (error) {
        console.error("Failed to save score:", error);
      }
    }
  };
  
  // Leaderboard section
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const data = await getLeaderboard();
      setLeaderboard(data);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Fetch leaderboard when section changes
  useEffect(() => {
    if (gameState === "start" && currentSection === "leaderboard") {
      fetchLeaderboard();
    }
  }, [gameState, currentSection]);

  // Game over screen
  if (gameState === "gameover") {
    // Save score when game ends
    useEffect(() => {
      saveGameScore();
    }, []);
    
    return (
      <GameOverScreen 
        score={score} 
        collectedCoins={collectedCoins} 
        resetGame={resetGame} 
        playerData={playerData} 
      />
    );
  }

  // Story section
  if (gameState === "start" && currentSection === "story") {
    return <StoryPage />;
  }

  // About section
  if (gameState === "start" && currentSection === "about") {
    return <AboutPage />;
  }

  // Leaderboard section
  if (gameState === "start" && currentSection === "leaderboard") {
    return <LeaderboardPage leaderboard={leaderboard} leaderboardLoading={leaderboardLoading} />;
  }

  return null;
}

// Component to store wallet address in window object for token processing
function WalletAddressListener() {
  const { isConnected, address } = useAccount();

  // Update window.walletAddress when connection status changes
  useEffect(() => {
    if (isConnected && address) {
      console.log("🔑 WalletAddressListener: Setting wallet address:", address);
      window.walletAddress = address;
    } else {
      console.log("❌ WalletAddressListener: Clearing wallet address");
      window.walletAddress = null;
    }
  }, [isConnected, address]);

  return null;
}

// Add a LoadingScreen component
function LoadingScreen({ onLoaded }) {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("INITIALIZING");
  const assetsToLoad = [
    // Images and UI elements
    '/models/ship1.png', '/models/ship2.png',
    '/textures/space.jpg',
    '/svg/fire.svg', '/svg/right.svg', '/svg/left.svg', 
    '/svg/play.svg', '/svg/about.svg', '/svg/story.svg', 
    '/svg/leaderboard.svg', '/svg/shop.svg',
    
    // Sound files
    '/sounds/crash.mp3', '/sounds/coin.mp3', 
    '/sounds/gamebg.mp3', '/sounds/engine.mp3',
    
    // 3D models
    '/models/ship/scene.gltf', '/models/ship/scene.bin',
    '/models/ship2/scene.gltf', '/models/ship2/scene.bin'
  ];
  
  // Change loading text based on progress
  useEffect(() => {
    if (progress < 25) {
      setLoadingText("INITIALIZING");
    } else if (progress < 50) {
      setLoadingText("LOADING ASSETS");
    } else if (progress < 75) {
      setLoadingText("PREPARING ENGINES");
    } else {
      setLoadingText("READY TO LAUNCH");
    }
  }, [progress]);

  useEffect(() => {
    let loadedAssets = 0;

    const updateProgress = () => {
      loadedAssets += 1;
      setProgress((loadedAssets / assetsToLoad.length) * 100);
      if (loadedAssets === assetsToLoad.length) {
        setTimeout(() => onLoaded(), 500); // Small delay for smooth transition
      }
    };

    // Preload all assets
    assetsToLoad.forEach((asset) => {
      if (asset.endsWith('.mp3')) {
        // Handle audio files
        const audio = new Audio();
        audio.src = asset;
        audio.addEventListener('canplaythrough', updateProgress, { once: true });
        audio.addEventListener('error', updateProgress, { once: true });
        audio.load();
      } else if (asset.endsWith('.gltf') || asset.endsWith('.bin')) {
        // For 3D models, we'll just count them as loaded after a timeout
        // since we can't directly preload them like images
        setTimeout(updateProgress, 100);
      } else {
        // Handle image files
        const img = new Image();
        img.src = asset;
        img.onload = updateProgress;
        img.onerror = updateProgress;
      }
    });
  }, [onLoaded]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black z-50">
      <div className="text-center px-6 max-w-md w-full flex flex-col items-center">
        {/* Game title with stylized appearance */}
        <h1 className="game-title text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-[var(--monad-off-white)] to-[var(--monad-purple)] font-bold drop-shadow-[0_0_10px_rgba(131,110,249,0.5)] mb-2">NAD RACER</h1>
        
        {/* Animated subtitle */}
        <div className="flex justify-center mb-8 w-full">
          <p className="text-[var(--monad-off-white)]/80 text-sm uppercase tracking-[0.3em]">{loadingText}</p>
          <span className="animate-pulse">...</span>
        </div>
        
        {/* Loading progress container with glow effect */}
        <div className="w-64 h-3 bg-black/40 rounded-full overflow-hidden border border-[var(--monad-off-white)]/20 shadow-[0_0_10px_rgba(131,110,249,0.2)] relative mx-auto">
          {/* Animated loading bar */}
          <div 
            className="h-full bg-gradient-to-r from-[var(--monad-purple)]/80 to-[var(--monad-purple)] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
          
          {/* Glow effect at the end of the loading bar */}
          <div 
            className="absolute top-0 bottom-0 w-4 bg-[var(--monad-purple)]/50 blur-sm transition-all duration-300"
            style={{ left: `calc(${progress}% - 16px)`, opacity: progress > 5 ? 1 : 0 }}
          ></div>
        </div>
        
        {/* Loading percentage */}
        <p className="mt-3 text-xs text-[var(--monad-off-white)]/60">{Math.round(progress)}%</p>
      </div>
    </div>
  );
}

function App() {
  const [gameState, setGameState] = useState("start"); // Tracks current game state
  const [score, setScore] = useState(0); // Current score during gameplay
  const [health, setHealth] = useState(3); // Player health during gameplay
  const [selectedShip, setSelectedShip] = useState("SHIP_1"); // Selected ship ID
  const controlsRef = useRef({ left: false, right: false, boost: false });
  const [currentSection, setCurrentSection] = useState("play");
  const [collectedCoins, setCollectedCoins] = useState(0);
  const [lastTxStatus, setLastTxStatus] = useState(null);
  const [txHistory, setTxHistory] = useState([]);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [fps, setFps] = useState(0); // Add FPS state
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() }); // Add FPS tracking ref
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  
  // Initialize audio system
  useEffect(() => {
    const initAudio = async () => {
      try {
        const result = await audioSystem.init();
        setAudioInitialized(result);
        console.log('🎵 Audio initialization result:', result);
      } catch (error) {
        console.error('❌ Audio initialization error:', error);
      }
    };

    initAudio();
    
    return () => {
      audioSystem.dispose();
    };
  }, []);

  // Handle game state changes for audio
  useEffect(() => {
    const handleGameAudio = async () => {
      if (gameState === "playing") {
        console.log('🎵 Starting game audio for state:', gameState);
        
        try {
          // Ensure user interaction is handled
          await audioSystem.handleUserInteraction();
          
          // Ensure audio is initialized
          if (!audioInitialized) {
            const result = await audioSystem.init();
            setAudioInitialized(result);
          }
          
          // Ensure audio context is resumed
          if (audioSystem.audioContext?.state === 'suspended') {
            await audioSystem.audioContext.resume();
          }
          
          // Stop any existing sounds first
          audioSystem.stopBackgroundMusic();
          audioSystem.stopEngineSound();
          
          // Small delay to ensure cleanup is complete
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Start background music first
          audioSystem.startBackgroundMusic();
          
          // Small delay before starting engine sound
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Start engine sound
          audioSystem.startEngineSound();
          
          // Debug log active sources
          console.log('🎵 Active sources after start:', Array.from(audioSystem.activeSources.keys()));
          
        } catch (error) {
          console.error('❌ Error managing game audio:', error);
        }
      } else if (gameState !== "playing") {
        console.log('🎵 Stopping game audio for state:', gameState);
        audioSystem.stopBackgroundMusic();
        audioSystem.stopEngineSound();
      }
    };

    handleGameAudio();
  }, [gameState, audioInitialized]);

  // Add FPS tracking effect
  useEffect(() => {
    if (gameState !== "playing") return;
    
    let animationFrameId;
    const updateFPS = () => {
      const now = performance.now();
      const delta = now - fpsRef.current.lastTime;
      
      fpsRef.current.frames++;
      
      if (delta >= 1000) {
        setFps(Math.round((fpsRef.current.frames * 1000) / delta));
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = now;
      }
      
      animationFrameId = requestAnimationFrame(updateFPS);
    };
    
    animationFrameId = requestAnimationFrame(updateFPS);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState]);

  // Modify startPlaying to handle audio initialization
  const startPlaying = async () => {
    try {
      console.log("Game starting: Playing state");
      
      // Reset game state
      setScore(0);
      setHealth(3);
      setCollectedCoins(0);
      
      // Reset controls
      if (controlsRef.current) {
        controlsRef.current.left = false;
        controlsRef.current.right = false;
        controlsRef.current.boost = false;
      }

      // Handle user interaction and ensure audio is ready
      await audioSystem.handleUserInteraction();
      
      if (!audioInitialized) {
        const result = await audioSystem.init();
        setAudioInitialized(result);
      }

      // Resume audio context if needed
      if (audioSystem.audioContext?.state === 'suspended') {
        await audioSystem.audioContext.resume();
      }

      // Set game state to trigger audio
      setGameState("playing");
      console.log("Game started: Playing state with ship:", selectedShip);
    } catch (error) {
      console.error('❌ Error starting game:', error);
    }
  };

  // Add click handler for ship selection screen
  const handleShipSelect = async (shipId) => {
    // Ensure audio is initialized on ship selection click
    await audioSystem.handleUserInteraction();
    setSelectedShip(shipId);
  };

  // Keep the testAudio function for internal use
  const testAudio = async () => {
    console.log('🎵 Testing audio system...');
    audioSystem.debugSoundBuffers();
    
    // Test all sounds
    audioSystem.playCoinSound();
    setTimeout(() => audioSystem.playCrashSound(), 500);
    setTimeout(() => {
      audioSystem.startBackgroundMusic();
      audioSystem.startEngineSound();
    }, 1000);
    
    // Stop looping sounds after 3 seconds
    setTimeout(() => {
      audioSystem.stopBackgroundMusic();
      audioSystem.stopEngineSound();
    }, 4000);
  };

  // Modify handleGameCoinCollection to include both collection and minting notifications
  const handleGameCoinCollection = async (coinValue) => {
    console.log("🎮 App: Coin collected in racing scene, value:", coinValue);
    setCollectedCoins(prevCoins => prevCoins + coinValue);
    
    // Play coin sound
    audioSystem.playCoinSound();
    
    // Show immediate collection notification
    setTxHistory(prevHistory => [
      {
        id: Date.now(),
        success: true,
        message: `Collected ${coinValue} NP`,
        type: 'collection',
        timestamp: Date.now()
      },
      ...prevHistory
    ].slice(0, 5));
    
    const walletToUse = window.walletAddress;
    console.log("🎮 App: Using wallet address for minting:", walletToUse);
    
    if (walletToUse) {
      try {
        console.log("🎮 App: Processing token for wallet:", walletToUse);
        const result = await processTokens(walletToUse, coinValue);
        console.log("🎮 App: Token processing result:", result);
        
        // Show minting notification
        if (result.success) {
          setTxHistory(prevHistory => [
            {
              id: Date.now() + 1,
              success: true,
              message: `Minting ${coinValue} NP`,
              type: 'minting',
              timestamp: Date.now()
            },
            ...prevHistory
          ].slice(0, 5));
        }
      } catch (error) {
        console.error("🎮 App: Failed to process token:", error);
        // Show error notification
        setTxHistory(prevHistory => [
          {
            id: Date.now() + 1,
            success: false,
            message: "Minting failed",
            type: 'error',
            timestamp: Date.now()
          },
          ...prevHistory
        ].slice(0, 5));
      }
    }
  };

  // Modify handleObstacleHit to include sound
  const handleObstacleHit = () => {
    console.log("🎮 App: Obstacle hit in racing scene");
    audioSystem.playCrashSound();
  };

  // Game state functions
  const startGame = () => {
    setGameState("shipselect");
    console.log("Game starting: Ship selection screen");
  };

  const endGame = () => {
    setGameState("gameover");
    console.log("Game over with score:", score);
  };

  const resetGame = () => {
    setGameState("start");
    setCurrentSection("play");
    
    // Reset controls
    if (controlsRef.current) {
      controlsRef.current.left = false;
      controlsRef.current.right = false;
      controlsRef.current.boost = false;
    }
    
    console.log("Game reset to start screen");
  };

  // Determine health bar color
  const getHealthColor = (health) => {
    if (health === 3) return "bg-green-500";
    if (health === 2) return "bg-orange-500";
    return "bg-red-500";
  };

  if (!assetsLoaded) {
    return <LoadingScreen onLoaded={() => setAssetsLoaded(true)} />;
  }

  return (
    <div className={`relative w-screen h-screen ${gameState === "playing" ? "overflow-hidden" : "overflow-auto"} bg-[var(--monad-black)] text-[var(--monad-off-white)]`}>
      <WalletAddressListener />
      <BackgroundScene />
      
      {/* Racing scene during gameplay */}
      {gameState === "playing" && (
        <RacingScene
          score={score}
          setScore={setScore}
          setHealth={setHealth}
          health={health}
          endGame={endGame}
          gameState={gameState}
          controlsRef={controlsRef}
          selectedShip={selectedShip}
          onCoinCollect={handleGameCoinCollection}
          onObstacleHit={handleObstacleHit}
        />
      )}
      
      <Navbar
        gameState={gameState}
        setCurrentSection={setCurrentSection}
        currentSection={currentSection}
      />
      
      {/* Start screen */}
      {gameState === "start" && (
        <React.Fragment>
          <div className="absolute inset-0 z-10 flex flex-col min-h-screen">
            <div className="flex-grow flex flex-col justify-center items-center p-6">
              {currentSection === "play" && (
                <div className="flex flex-col items-center w-11/12 max-w-md space-y-8">
                  <h1 className="game-title text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-[var(--monad-off-white)] to-[var(--monad-purple)] font-bold drop-shadow-[0_0_10px_rgba(131,110,249,0.5)]">NAD RACER</h1>
                  <div className="flex flex-col items-center gap-6 w-full">
                    <ConnectedContent startGame={startGame} />
                    {SHOW_DIRECT_PLAY_BUTTON && (
                      <button
                        className="px-12 py-4 text-xl md:text-2xl bg-black/40 border-2 border-[var(--monad-purple)] text-[var(--monad-off-white)] rounded-lg hover:bg-[var(--monad-purple)]/20 hover:shadow-[0_0_15px_rgba(131,110,249,0.6)] transition-all duration-300 w-full max-w-xs font-[var(--title-font)]"
                        onClick={startGame}
                      >
                        PLAY DIRECTLY
                      </button>
                    )}
                  </div>
                  <div className="w-full mt-4 md:mt-16 px-4 sm:px-0">
                    <ProfileInfo />
                  </div>
                </div>
              )}
              {currentSection !== "play" && (
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
                  currentSection={currentSection}
                />
              )}
            </div>
          </div>
          <div className="absolute top-4 right-4 z-20">
            <ConnectButton />
          </div>
        </React.Fragment>
      )}
      
      {/* Ship selection screen - Improved for mobile responsiveness */}
      {gameState === "shipselect" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 sm:p-6 pb-32 sm:pb-20 md:pb-6 overflow-y-auto bg-gradient-to-b from-black/20 to-[var(--monad-blue)]/20 backdrop-blur-sm">
          <div className="max-w-4xl w-full flex flex-col items-center">
            <h1 className="text-2xl sm:text-3xl md:text-5xl text-[var(--monad-off-white)] mb-4 sm:mb-6 font-title relative">
              <span className="absolute -left-4 sm:-left-6 md:-left-10 top-1/2 transform -translate-y-1/2 opacity-30 text-base sm:text-lg md:text-2xl hidden sm:inline">&#x2726;</span>
              SELECT YOUR SHIP
              <span className="absolute -right-4 sm:-right-6 md:-right-10 top-1/2 transform -translate-y-1/2 opacity-30 text-base sm:text-lg md:text-2xl hidden sm:inline">&#x2726;</span>
            </h1>
            
            {/* Small screen layout - Horizontal */}
            <div className="md:hidden w-full">
              <div className="flex flex-col items-center">
                {/* Current ship display */}
                {SHIP_OPTIONS.map((ship) => (
                  ship.id === selectedShip && (
                    <div key={ship.id} className="w-full">
                      <div className="relative w-full h-40 mb-3 overflow-hidden rounded-lg bg-gradient-to-b from-transparent to-black/20">
                        <img 
                          src={ship.preview} 
                          alt={ship.name} 
                          className="w-full h-full object-contain" 
                        />
                        <div className="absolute inset-0 bg-[var(--monad-purple)]/5 border border-[var(--monad-purple)]/20 rounded-lg">
                          <div className="absolute -top-10 -left-10 w-16 h-16 bg-[var(--monad-purple)]/10 rounded-full blur-xl"></div>
                          <div className="absolute -bottom-10 -right-10 w-16 h-16 bg-[var(--monad-purple)]/10 rounded-full blur-xl"></div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center mb-4">
                        <h3 className="text-xl font-bold text-[var(--monad-off-white)] mb-1">{ship.name}</h3>
                        <div className="flex items-center justify-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <span 
                              key={i} 
                              className={`w-1 h-5 rounded-full ${
                                i < 3 
                                  ? "bg-[var(--monad-purple)]" 
                                  : "bg-[var(--monad-off-white)]/20"
                              }`}
                            ></span>
                          ))}
                        </div>
                        <p className="text-xs text-[var(--monad-off-white)]/70 text-center">
                          {ship.id === "SHIP_1" ? "Sleek and aerodynamic design" : "Rugged and distinctive styling"}
                        </p>
                      </div>
                    </div>
                  )
                ))}
                
                {/* Ship selection indicators/buttons */}
                <div className="flex justify-center space-x-3 mb-4">
                  {SHIP_OPTIONS.map((ship) => (
                    <button
                      key={ship.id}
                      onClick={() => handleShipSelect(ship.id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
                        ${selectedShip === ship.id 
                          ? "bg-[var(--monad-purple)]/30 border-2 border-[var(--monad-purple)]" 
                          : "bg-black/30 border border-[var(--monad-off-white)]/30"
                        }`}
                    >
                      <span className="text-xs font-bold">{ship.id === "SHIP_1" ? "1" : "2"}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Controls and Launch Button - Always visible and accessible */}
              <div className="mt-2">
                <p className="text-xs text-[var(--monad-off-white)]/70 text-center mb-3">
                  Controls: Arrow Keys/AD to move, Space/W to boost
                </p>
                
                <button
                  className="w-full px-8 py-3 text-lg bg-[var(--monad-purple)]/20 border-2 border-[var(--monad-purple)] text-[var(--monad-off-white)] rounded-xl hover:bg-[var(--monad-purple)]/40 transition-all duration-300 shadow-[0_0_15px_rgba(131,110,249,0.3)] mb-2"
                  onClick={startPlaying}
                >
                  <span className="inline-block">Launch Mission</span>
                </button>
                
                <p className="text-xs text-[var(--monad-off-white)]/50 text-center">
                  All ships have identical performance.
                </p>
              </div>
            </div>
            
            {/* Larger screen layout - Grid (unchanged) */}
            <div className="hidden md:block w-full">
              <div className="grid grid-cols-2 gap-8 w-full">
                {SHIP_OPTIONS.map((ship) => (
                  <div
                    key={ship.id}
                    className={`relative group bg-black/40 p-5 rounded-xl border-2 backdrop-blur-md cursor-pointer transition-all duration-300 transform hover:scale-[1.02] 
                      ${selectedShip === ship.id 
                        ? "border-[var(--monad-purple)] shadow-[0_0_15px_rgba(131,110,249,0.6)]" 
                        : "border-[var(--monad-off-white)]/20 hover:border-[var(--monad-off-white)]/60"
                      }`}
                    onClick={() => handleShipSelect(ship.id)}
                  >
                    <div className="relative w-full h-48 lg:h-56 mb-4 overflow-hidden rounded-lg bg-gradient-to-b from-transparent to-black/20">
                      <img 
                        src={ship.preview} 
                        alt={ship.name} 
                        className={`w-full h-full object-contain transition-transform duration-700 
                          ${selectedShip === ship.id ? "scale-110" : "group-hover:scale-105"}`} 
                      />
                      
                      {selectedShip === ship.id && (
                        <div className="absolute inset-0 bg-[var(--monad-purple)]/5 border border-[var(--monad-purple)]/20 rounded-lg flex items-center justify-center">
                          <div className="absolute -top-10 -left-10 w-20 h-20 bg-[var(--monad-purple)]/10 rounded-full blur-xl"></div>
                          <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-[var(--monad-purple)]/10 rounded-full blur-xl"></div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <h3 className="text-xl sm:text-2xl font-bold text-[var(--monad-off-white)] mb-2">{ship.name}</h3>
                      <div className="flex items-center justify-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <span 
                            key={i} 
                            className={`w-1.5 h-6 rounded-full ${
                              i < 3 
                                ? "bg-[var(--monad-purple)]" 
                                : "bg-[var(--monad-off-white)]/20"
                            }`}
                          ></span>
                        ))}
                      </div>
                      <p className="text-sm text-[var(--monad-off-white)]/70">
                        {ship.id === "SHIP_1" ? "Sleek and aerodynamic design" : "Rugged and distinctive styling"}
                      </p>
                    </div>
                    
                    {selectedShip === ship.id && (
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                        <div className="w-4 h-4 rotate-45 bg-[var(--monad-purple)]"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <p className="mt-6 text-sm text-[var(--monad-off-white)]/70 text-center">
                Controls: Arrow Keys/AD to move, Space/W to boost
              </p>
              
              <button
                className="mt-6 md:mt-8 px-12 py-4 text-xl md:text-2xl bg-[var(--monad-purple)]/20 border-2 border-[var(--monad-purple)] text-[var(--monad-off-white)] rounded-xl hover:bg-[var(--monad-purple)]/40 transition-all duration-300 w-full max-w-xs shadow-[0_0_15px_rgba(131,110,249,0.3)] mx-auto block"
                onClick={startPlaying}
              >
                <span className="inline-block">Launch Mission</span>
              </button>
              
              <p className="mt-4 text-sm text-[var(--monad-off-white)]/50 text-center max-w-md mx-auto mb-6 sm:mb-0">
                Choose your ship's appearance. All ships have identical performance.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* In-game HUD */}
      {gameState === "playing" && (
        <React.Fragment>
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
          
          {/* FPS Counter */}
          <div className="absolute top-28 left-4 text-xs text-[var(--monad-off-white)]/80">
            FPS: {fps}
          </div>
        </React.Fragment>
      )}
      
      {/* Transaction Status Bar - Updated Design */}
      {gameState === "playing" && (
        <div className="absolute top-4 right-4 z-10 max-w-[200px]">
          <div className="flex flex-col items-end space-y-1.5">
            {txHistory.map((tx) => {
              const ageMs = Date.now() - tx.timestamp;
              const opacity = Math.max(0, 1 - ageMs / 5000);
              
              if (opacity <= 0) return null;
              
              // Determine notification style based on type
              let style = {
                collection: {
                  text: "text-[var(--monad-purple)]",
                  dot: "bg-[var(--monad-purple)]"
                },
                minting: {
                  text: "text-yellow-400",
                  dot: "bg-yellow-400"
                },
                error: {
                  text: "text-red-400",
                  dot: "bg-red-400"
                }
              }[tx.type] || {
                text: "text-[var(--monad-purple)]",
                dot: "bg-[var(--monad-purple)]"
              };
              
              return (
                <div 
                  key={tx.id} 
                  className="flex items-center bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-[var(--monad-off-white)]/10" 
                  style={{ opacity }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${style.text}`}>{tx.message}</span>
                    {tx.txHash && (
                      <span className="text-[10px] text-[var(--monad-off-white)]/60">{tx.txHash}</span>
                    )}
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                  </div>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>
      )}
      
      {/* Mobile controls */}
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
          currentSection={currentSection}
        />
      )}
      
      <Footer appVersion={APP_VERSION} gameState={gameState} />
    </div>
  );
}

export default App; 