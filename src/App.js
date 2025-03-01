// App.js
"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import RacingScene from "./racingscene"
import "./App.css"
import {
  WagmiProvider,
  useAccount,
  useReadContract,
  useWriteContract,
  useConnect,
  useDisconnect,
  useWaitForTransactionReceipt,
} from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { wagmiConfig } from "./web3Config"
import { formatEther } from "ethers/lib/utils"

// Toggle this to false to hide the direct play button for git push
const SHOW_DIRECT_PLAY_BUTTON = false

// Set up QueryClient for React Query
const queryClient = new QueryClient()

// Smart contract details
const gameContractAddress = "0x196A747398D43389E23126ad60C58200Ded0Ba3C" // Current working CA
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
]

// Custom hook to manage game state
function useGameState() {
  const [gameState, setGameState] = useState("start") // Current game state: start, playing, gameover
  const [score, setScore] = useState(0) // Current score during gameplay
  const [health, setHealth] = useState(3) // Player health (3 lives)
  const [highScore, setHighScore] = useState(0) // Highest score achieved

  // Start a new game session
  const startGame = useCallback(() => {
    console.log("Starting game: Setting gameState to 'playing'")
    setGameState("playing")
    setScore(0)
    setHealth(3)
  }, [])

  // End the game with the final score
  const endGame = useCallback((finalScore) => {
    console.log("Ending game: Setting gameState to 'gameover' with finalScore", finalScore)
    setGameState("gameover")
    setHighScore((prev) => Math.max(prev, finalScore))
  }, [])

  // Reset the game to the start screen
  const resetGame = useCallback(() => {
    console.log("Resetting game: Setting gameState to 'start'")
    setGameState("start")
    setScore(0)
    setHealth(3)
  }, [])

  // Memoized setters for score and health
  const memoizedSetScore = useCallback((newScoreFunc) => setScore(newScoreFunc), [])
  const memoizedSetHealth = useCallback((newHealthFunc) => setHealth(newHealthFunc), [])

  // Log game state changes for debugging
  useEffect(() => {
    console.log("Game State Updated:", { gameState, score, health })
  }, [gameState, score, health])

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
  }
}

// Main App component
function App() {
  const { gameState, score, health, highScore, startGame, endGame, resetGame, setScore, setHealth } = useGameState()
  const joystickRef = useRef({ active: false, x: 0, y: 0, baseX: 0, baseY: 0 })
  const boostRef = useRef(false)
  const knobRef = useRef(null) // Ref for the joystick knob DOM element
  const joystickContainerRef = useRef(null) // Ref for the joystick container DOM element

  // Simulate keyboard events for mobile controls
  const simulateKeyEvent = (key, type) => {
    const event = new KeyboardEvent(type, { key })
    document.dispatchEvent(event)
  }

  // Joystick touch handlers
  const handleJoystickStart = (e) => {
    if (gameState !== "playing") return
    const touch = e.touches[0]
    joystickRef.current.active = true
    joystickRef.current.baseX = touch.clientX
    joystickRef.current.baseY = touch.clientY
    joystickRef.current.x = touch.clientX
    joystickRef.current.y = touch.clientY
    console.log("Joystick Start:", { x: touch.clientX, y: touch.clientY })
  }

  const handleJoystickMove = (e) => {
    if (!joystickRef.current.active || gameState !== "playing") return
    e.preventDefault()
    const touch = e.touches[0]
    joystickRef.current.x = touch.clientX
    joystickRef.current.y = touch.clientY

    const dx = joystickRef.current.x - joystickRef.current.baseX
    const dy = joystickRef.current.y - joystickRef.current.baseY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const maxDistance = 40 // Joystick range

    // Move the knob visually
    if (knobRef.current) {
      const clampedDx = Math.max(-maxDistance, Math.min(maxDistance, dx))
      const clampedDy = Math.max(-maxDistance, Math.min(maxDistance, dy))
      knobRef.current.style.transform = `translate(${clampedDx}px, ${clampedDy}px)`
    }

    if (distance > 10) { // Dead zone
      if (dx < -maxDistance / 2) simulateKeyEvent("ArrowLeft", "keydown")
      else if (dx > maxDistance / 2) simulateKeyEvent("ArrowRight", "keydown")
      else {
        simulateKeyEvent("ArrowLeft", "keyup")
        simulateKeyEvent("ArrowRight", "keyup")
      }

      if (dy < -maxDistance / 2) simulateKeyEvent("ArrowUp", "keydown")
      else if (dy > maxDistance / 2) simulateKeyEvent("ArrowDown", "keydown")
      else {
        simulateKeyEvent("ArrowUp", "keyup")
        simulateKeyEvent("ArrowDown", "keyup")
      }
    }
  }

  const handleJoystickEnd = (e) => {
    if (!joystickRef.current.active) return
    joystickRef.current.active = false
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(0px, 0px)` // Reset knob position
      console.log("Joystick End: Knob reset to center")
    }
    simulateKeyEvent("ArrowLeft", "keyup")
    simulateKeyEvent("ArrowRight", "keyup")
    simulateKeyEvent("ArrowUp", "keyup")
    simulateKeyEvent("ArrowDown", "keyup")
  }

  // Boost button handlers
  const handleBoostStart = () => {
    if (gameState !== "playing") return
    boostRef.current = true
    simulateKeyEvent(" ", "keydown")
  }

  const handleBoostEnd = () => {
    if (!boostRef.current) return
    boostRef.current = false
    simulateKeyEvent(" ", "keyup")
  }

  // Add event listeners with passive: false to allow preventDefault
  useEffect(() => {
    const joystickContainer = joystickContainerRef.current
    if (!joystickContainer) return

    const startHandler = (e) => handleJoystickStart(e)
    const moveHandler = (e) => handleJoystickMove(e)
    const endHandler = (e) => handleJoystickEnd(e)

    joystickContainer.addEventListener("touchstart", startHandler, { passive: false })
    joystickContainer.addEventListener("touchmove", moveHandler, { passive: false })
    joystickContainer.addEventListener("touchend", endHandler, { passive: false })
    joystickContainer.addEventListener("touchcancel", endHandler, { passive: false }) // Handle unexpected touch cancellations

    return () => {
      joystickContainer.removeEventListener("touchstart", startHandler, { passive: false })
      joystickContainer.removeEventListener("touchmove", moveHandler, { passive: false })
      joystickContainer.removeEventListener("touchend", endHandler, { passive: false })
      joystickContainer.removeEventListener("touchcancel", endHandler, { passive: false })
    }
  }, [gameState])

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
          <WalletConnect />
          {/* Main screen with title, start button, leaderboard, and player info */}
          {gameState === "start" && (
            <div className="main-screen">
              {/* Center content container for home screen elements */}
              <div className="center-content">
                <h1 className="title">NAD RACER</h1>
                <ConnectedContent
                  startGame={startGame}
                  contractAddress={gameContractAddress}
                  contractABI={gameContractABI}
                />
                {SHOW_DIRECT_PLAY_BUTTON && (
                  <button className="direct-play-button" onClick={startGame}>
                    Play Directly
                  </button>
                )}
                <ProfileInfo contractAddress={gameContractAddress} contractABI={gameContractABI} />
              </div>
              {/* Leaderboard placed outside center-content for desktop absolute positioning */}
              <Leaderboard contractAddress={gameContractAddress} contractABI={gameContractABI} />
            </div>
          )}
          {/* HUD displaying score and health during gameplay */}
          {gameState === "playing" && (
            <>
              <div className="hud">
                <p>
                  <span>Score</span>
                  <span>{score}</span>
                </p>
                <p>
                  <span>Health</span>
                  <span className="hud-health">
                    {Array(health)
                      .fill()
                      .map((_, i) => (
                        <div key={i} className="health-icon"></div>
                      ))}
                  </span>
                </p>
              </div>
              {/* Mobile controls */}
              <div
                className="joystick-container"
                ref={joystickContainerRef}
              >
                <div className="joystick-base">
                  <div className="joystick-knob" ref={knobRef}></div>
                </div>
              </div>
              <div className="boost-button-container">
                <button
                  className="boost-button"
                  onTouchStart={handleBoostStart}
                  onTouchEnd={handleBoostEnd}
                >
                  <span className="fire-icon">🔥</span>
                </button>
              </div>
            </>
          )}
          {/* End screen with final score and options */}
          {gameState === "gameover" && (
            <div className="end-screen">
              <h1>Game Over</h1>
              <div className="end-screen-stats">
                <div className="end-screen-stat">
                  <div className="end-screen-stat-label">Final Score</div>
                  <div className="end-screen-stat-value">{score}</div>
                </div>
                <div className="end-screen-stat">
                  <div className="end-screen-stat-label">High Score</div>
                  <div className="end-screen-stat-value">{highScore}</div>
                </div>
              </div>
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
  )
}

// Wallet connection/disconnection component
function WalletConnect() {
  const { isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  const handleConnect = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to play Nad Racer")
      return
    }

    try {
      await connect({ connector: connectors[0] }) // Use the injected connector
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      alert("Failed to connect wallet. Please try again.")
    }
  }

  return (
    <div className="wallet-connect">
      {isConnected ? (
        <button onClick={disconnect}>Disconnect</button>
      ) : (
        <button onClick={handleConnect} disabled={isPending}>
          {isPending ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
    </div>
  )
}

// Leaderboard component displaying top 10 players
function Leaderboard({ contractAddress, contractABI }) {
  const { address } = useAccount()
  const { data: leaderboardData } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "getLeaderboard",
    chainId: 10143,
  })

  const leaderboard = useMemo(() => leaderboardData || [], [leaderboardData])

  // Log leaderboard data and user address for debugging
  useEffect(() => {
    console.log("Leaderboard Data:", leaderboard)
    console.log("User Address:", address)
    leaderboard.forEach((player, index) => {
      console.log(`Leaderboard Entry ${index + 1}:`, {
        address: player.playerAddress,
        points: formatEther(player.points),
      })
    })
  }, [leaderboard, address])

  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((player, index) => (
            <tr key={player.playerAddress}>
              <td className="leaderboard-rank">{index + 1}</td>
              <td className="leaderboard-address">
                {player.playerAddress.slice(2, 8)}...{player.playerAddress.slice(-4)}
              </td>
              <td className="leaderboard-points">{Number(formatEther(player.points)).toFixed(2)} NP</td>
            </tr>
          ))}
          {leaderboard.length === 0 && (
            <tr>
              <td colSpan={3} style={{ textAlign: "center", padding: "20px 0" }}>
                No players yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// Profile Info component
function ProfileInfo({ contractAddress, contractABI }) {
  const { address, isConnected } = useAccount()
  const { data: totalPoints } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "getTotalPoints",
    args: [address],
    enabled: isConnected,
    chainId: 10143,
  })

  const playerTotalPoints = totalPoints ? formatEther(totalPoints) : "0"

  // Only render if connected
  if (!isConnected) return null

  return (
    <div className="profile-info">
      <h3 className="profile-info-title">Player Profile</h3>
      <p>
        <span>Wallet</span>
        <span>
          {address?.slice(2, 8)}...{address?.slice(-4)}
        </span>
      </p>
      <p>
        <span>Your Points</span>
        <span>{Number(playerTotalPoints).toFixed(2)} NP</span>
      </p>
    </div>
  )
}

// Component for game controls and player info
function ConnectedContent({ startGame, finalScore, contractAddress, contractABI, resetGame, showPlayerInfo }) {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { writeContract: startGameWrite, data: startTxHash, isPending: isStarting } = useWriteContract()
  const {
    writeContract: recordAndClaimWrite,
    data: claimTxHash,
    isPending: isClaiming,
    error: claimError,
  } = useWriteContract()

  const { isSuccess: startTxConfirmed } = useWaitForTransactionReceipt({
    hash: startTxHash,
    chainId: 10143,
  })

  const { isSuccess: claimTxConfirmed } = useWaitForTransactionReceipt({
    hash: claimTxHash,
    chainId: 10143,
  })

  // State to hide Claim button after confirmation
  const [pointsClaimed, setPointsClaimed] = useState(false)

  // Start game after transaction confirmation
  useEffect(() => {
    if (startTxConfirmed && startGame) {
      console.log("Start transaction confirmed, starting game")
      startGame()
    }
  }, [startTxConfirmed, startGame])

  // Log claim errors and success, hide button after claim
  useEffect(() => {
    if (claimError) {
      console.error("Claim Points Error:", claimError)
    }
    if (claimTxConfirmed) {
      console.log("Points recorded and claimed successfully")
      setPointsClaimed(true) // Hide Claim button
      queryClient.invalidateQueries(["getTotalPoints", address]) // Refresh points
    }
  }, [claimError, claimTxConfirmed, address])

  // Handle wallet connection from either button
  const handleConnect = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to play Nad Racer")
      return
    }
    try {
      await connect({ connector: connectors[0] })
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      alert("Failed to connect wallet. Please try again.")
    }
  }

  // Initiate startGame transaction
  const handleStartGame = () => {
    if (chainId !== 10143) {
      alert("Please switch to Monad Testnet")
      return
    }
    console.log("Initiating startGame transaction")
    startGameWrite({
      address: contractAddress,
      abi: contractABI,
      functionName: "startGame",
      chainId: 10143,
    })
  }

  // Initiate recordAndClaimPoints transaction
  const handleRecordAndClaim = () => {
    if (chainId !== 10143) {
      alert("Please switch to Monad Testnet")
      return
    }
    if (finalScore > 0) {
      console.log("Initiating recordAndClaimPoints transaction with points:", finalScore)
      recordAndClaimWrite({
        address: contractAddress,
        abi: contractABI,
        functionName: "recordAndClaimPoints",
        args: [finalScore],
        chainId: 10143,
      })
    }
  }

  // Main start button behavior
  return (
    <>
      {!finalScore && (
        <button
          className="start-button"
          onClick={isConnected ? handleStartGame : handleConnect}
          disabled={isStarting || isConnecting || (isConnected && chainId !== 10143)}
        >
          {isConnecting ? "Connecting..." : isStarting ? "Starting..." : isConnected ? "Start Game" : "Connect"}
        </button>
      )}
      {finalScore > 0 && (
        <div className="button-group">
          {/* Show Claim button only if not yet claimed */}
          {!pointsClaimed && (
            <button className="claim-button" onClick={handleRecordAndClaim} disabled={isClaiming}>
              {isClaiming ? "Claiming..." : "Claim Points"}
            </button>
          )}
          <button onClick={handleStartGame} disabled={isStarting || !isConnected || chainId !== 10143}>
            {isStarting ? "Starting..." : "Play Again"}
          </button>
          <button className="menu-button" onClick={resetGame}>
            Main Menu
          </button>
        </div>
      )}
    </>
  )
}

export default App