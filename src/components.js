// components.js
// Contains reusable UI components for Navbar, SectionContent, Leaderboard, and Footer

import React, { useMemo } from "react";
import { PoweredByMonad } from "./App";
import { useAccount } from "wagmi";
import ErrorBoundary from './ErrorBoundary';

// Story Section Component
export function StorySection() {
  return (
    <div className="text-center max-w-2xl mx-auto px-4">
      <h2 className="text-2xl md:text-3xl text-[var(--monad-off-white)] mb-6">THE NAD RACER CHRONICLES: BREAKING THE MONAD VEIL</h2>
      <p className="text-sm sm:text-base text-[var(--monad-off-white)]/80 mb-4">
        In a galaxy bound by the Monad Veil, an ancient blockchain entity known as the Monad Core enforces a stagnant equilibrium. Time slows, speed falters, and reality bends under its unbreakable code. Built on the Monad Testnet—a fractured prototype of the Core's power—the Veil holds the cosmos captive.
      </p>
      <p className="text-sm sm:text-base text-[var(--monad-off-white)]/80 mb-4">
        You are a Nad Racer, a rogue pilot from the Outer Fringe, piloting a ship forged from Testnet shards. Your mission: race through the Veil's circuits, outpace its enforcers, and overload the Core with raw speed. Each race fractures the system; every score cracks the Veil.
      </p>
    </div>
  );
}

// About Section Component
export function AboutSection({ showPoweredBy = false }) {
  const { address } = useAccount();

  return (
    <div className="text-center max-w-2xl mx-auto px-4">
      <h2 className="text-2xl md:text-3xl text-[var(--monad-off-white)] mb-6">ABOUT NAD RACER: A REBEL'S CODE</h2>
      <p className="text-sm sm:text-base text-[var(--monad-off-white)]/80 mb-4">
        I'm <span className="text-[var(--monad-purple)] font-medium">MEFURY</span>, a lone coder and dreamer who built <em>&quot;Nad Racer&quot;</em> to join the &quot;Break Monad&quot; event hosted by the visionary Monad blockchain team. This game is my rebellion—pushing code and speed to the edge on the Monad Testnet, a sandbox for the future of decentralized tech. Vibe coded this whole game with Cursor and Grok, learned a lot and had a blast doing it.
      </p>
      <p className="text-sm sm:text-base text-[var(--monad-off-white)]/80 mb-6">
        Follow my journey on Twitter at{" "}
        <a href="https://x.com/meefury" target="_blank" rel="noopener noreferrer" className="text-[var(--monad-purple)] hover:underline">
          @meefury
        </a>
        , and salute the Monad crew at{" "}
        <a href="https://x.com/monad_xyz" target="_blank" rel="noopener noreferrer" className="text-[var(--monad-purple)] hover:underline">
          @monad_xyz
        </a>{" "}
        for sparking this cosmic race.
      </p>
      <div className="text-sm sm:text-base text-[var(--monad-off-white)]/60">
        <p className="mb-2"><strong>Credits:</strong></p>
        <p className="mb-2">
          Models: &quot;space ship&quot; by{" "}
          <a href="https://skfb.ly/LzKz" target="_blank" rel="noopener noreferrer" className="text-[var(--monad-purple)] hover:underline">
            yanix
          </a>{" "}
          is licensed under{" "}
          <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="text-[var(--monad-purple)] hover:underline">
            CC BY 4.0
          </a>.
        </p>
        <p>
          Music by{" "}
          <a href="https://pixabay.com/users/turtlebeats-46526702/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=251682" target="_blank" rel="noopener noreferrer" className="text-[var(--monad-purple)] hover:underline">
            TurtleBeats
          </a>{" "}
          from{" "}
          <a href="https://pixabay.com/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=251682" target="_blank" rel="noopener noreferrer" className="text-[var(--monad-purple)] hover:underline">
            Pixabay
          </a>.
        </p>
      </div>
      
      {showPoweredBy && (
        <div className="mt-8">
          <PoweredByMonad />
        </div>
      )}
    </div>
  );
}

// GameOverScreen Component
export function GameOverScreen({ score, collectedCoins, resetGame, playerData }) {
  // Check if current score is higher than player's previous best
  const isHighScore = playerData?.highestScore ? score > playerData.highestScore : false;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6">
      <div className="bg-black/60 p-6 rounded-xl border border-[var(--monad-off-white)]/30 w-full max-w-md text-center">
        <h1 className="text-4xl text-[var(--monad-off-white)] mb-6">GAME OVER</h1>
        
        {isHighScore && (
          <div className="mb-4 text-2xl text-[var(--monad-purple)] animate-pulse">
            NEW HIGH SCORE!
          </div>
        )}
        
        <div className="mb-8">
          <p className="text-lg text-[var(--monad-off-white)] mb-1">SCORE</p>
          <p className="text-5xl font-bold text-[var(--monad-purple)]">{score}</p>
        </div>
        
        <div className="flex flex-col gap-4">
          <button
            className="px-8 py-3 bg-[var(--monad-purple)]/80 text-white rounded-xl border border-[var(--monad-purple)] hover:bg-[var(--monad-purple)] hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(123,31,162,0.5)]"
            onClick={resetGame}
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}

// StoryPage Component
export function StoryPage() {
  return (
    <div className="bg-black/50 p-6 rounded-xl border border-[var(--monad-off-white)]/30 max-w-2xl w-full">
      <div className="text-[var(--monad-off-white)]/80 space-y-4">
        <StorySection />
      </div>
    </div>
  );
}

// AboutPage Component
export function AboutPage() {
  return (
    <div className="bg-black/50 p-6 rounded-xl border border-[var(--monad-off-white)]/30 max-w-2xl w-full">
      <AboutSection showPoweredBy={true} />
    </div>
  );
}

// LeaderboardPage Component
export function LeaderboardPage({ leaderboard, leaderboardLoading }) {
  // Limit leaderboard to top 20 players
  const topPlayers = useMemo(() => {
    return leaderboard.slice(0, 20);
  }, [leaderboard]);

  return (
    <div className="bg-black/50 p-6 rounded-xl border border-[var(--monad-off-white)]/30 max-w-2xl w-full">
      <h2 className="text-3xl text-[var(--monad-off-white)] mb-6">LEADERBOARD</h2>
      
      {leaderboardLoading ? (
        <p className="text-center text-[var(--monad-off-white)] py-8">Loading leaderboard...</p>
      ) : topPlayers.length > 0 ? (
        <div className="overflow-x-auto">
          <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <table className="w-full">
              <thead className="sticky top-0 bg-black/80 backdrop-blur-sm z-10">
                <tr className="border-b border-[var(--monad-off-white)]/30">
                  <th className="py-2 text-left text-[var(--monad-purple)]">RANK</th>
                  <th className="py-2 text-left text-[var(--monad-purple)]">PLAYER</th>
                  <th className="py-2 text-right text-[var(--monad-purple)]">HIGH SCORE</th>
                </tr>
              </thead>
              <tbody>
                {topPlayers.map((entry, index) => (
                  <tr key={index} className="border-b border-[var(--monad-off-white)]/10">
                    <td className="py-3 text-[var(--monad-off-white)] flex items-center">
                      {index === 0 ? (
                        <span className="inline-flex mr-2 text-yellow-400">🥇</span>
                      ) : index === 1 ? (
                        <span className="inline-flex mr-2 text-gray-300">🥈</span>
                      ) : index === 2 ? (
                        <span className="inline-flex mr-2 text-amber-600">🥉</span>
                      ) : null}
                      {index + 1}
                    </td>
                    <td className="py-3 text-[var(--monad-off-white)]">{entry.username}</td>
                    <td className="py-3 text-right text-[var(--monad-off-white)]">{entry.highestScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-center text-[var(--monad-off-white)] py-8">No leaderboard data available</p>
      )}
    </div>
  );
}

// Navbar Component
export function Navbar({ gameState, setCurrentSection, currentSection }) {
  const navItems = [
    { label: "Play", icon: "/svg/play.svg" },
    // Shop page temporarily removed - will be used later
    // { label: "Shop", icon: "/svg/shop.svg" },
    { label: "Leaderboard", icon: "/svg/leaderboard.svg" },
    { label: "Story", icon: "/svg/story.svg" },
    { label: "About", icon: "/svg/about.svg" },
  ];

  if (gameState === "playing") return null;

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:flex fixed top-4 left-1/2 transform -translate-x-1/2 z-20 bg-transparent rounded-2xl px-8 py-4 border border-[var(--monad-off-white)]/30 w-3/4 max-w-2xl">
        <div className="flex justify-around items-center gap-6 w-full">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setCurrentSection(item.label.toLowerCase())}
              className="text-xl md:text-2xl text-[var(--monad-off-white)] hover:text-[var(--monad-purple)] transition-all duration-300"
            >
              {item.label.toUpperCase()}
            </button>
          ))}
        </div>
      </nav>
      {/* Mobile Navbar */}
      <nav className="md:hidden fixed bottom-12 left-1/2 transform -translate-x-1/2 z-20 bg-transparent rounded-2xl px-8 py-4 border border-[var(--monad-off-white)]/30 w-11/12 max-w-md">
        <div className="flex justify-around items-center gap-4">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setCurrentSection(item.label.toLowerCase())}
              className="transition-all duration-300 p-2"
            >
              <img
                src={item.icon}
                alt={item.label}
                className={`w-8 h-8 sm:w-10 sm:h-10 ${
                  currentSection === item.label.toLowerCase()
                    ? "tint-[var(--monad-purple)]"
                    : "tint-[var(--monad-off-white)]"
                }`}
              />
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

// SectionContent Component - Displays content based on selected section
export function SectionContent({ section, leaderboardData, leaderboardLoading }) {
  const { address, isConnected } = useAccount();

  const contentMap = {
    play: <></>, // Placeholder for Play section
    ships: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Ship 1 - Free Ship */}
        <div className="bg-transparent p-4 rounded-xl border border-[var(--monad-off-white)]/30 flex flex-col items-center">
          <h3 className="text-xl text-[var(--monad-off-white)] mb-2">Speeder</h3>
          <div className="relative w-full h-36 mb-3">
            <img
              src="/models/ship1.png"
              alt="Ship 1"
              className="absolute inset-0 w-full h-full object-contain mix-blend-screen"
            />
          </div>
          <p className="text-sm text-[var(--monad-off-white)]/80 mb-4">Standard ship available to all racers</p>
          <span className="text-xs bg-[var(--monad-off-white)]/20 text-[var(--monad-off-white)] px-3 py-1 rounded-full">
            Free
          </span>
        </div>

        {/* Ship 2 - Premium Ship */}
        <div className="bg-transparent p-4 rounded-xl border border-[var(--monad-off-white)]/30 flex flex-col items-center">
          <h3 className="text-xl text-[var(--monad-off-white)] mb-2">Bumble Ship</h3>
          <div className="relative w-full h-36 mb-3">
            <img
              src="/models/ship2.png"
              alt="Ship 2"
              className="absolute inset-0 w-full h-full object-contain mix-blend-screen"
            />
          </div>
          <p className="text-sm text-[var(--monad-off-white)]/80 mb-4">Cost: 10,000 NP Tokens</p>
          {isConnected ? (
            <p className="text-sm text-[var(--monad-purple)] font-medium">Owned</p>
          ) : (
            <p className="text-sm text-[var(--monad-off-white)]/80">Connect wallet to purchase</p>
          )}
        </div>
      </div>
    ),
    leaderboard: (
      <div className="flex justify-center">
        <Leaderboard leaderboardData={leaderboardData} isLoading={leaderboardLoading} />
      </div>
    ),
    story: (
      <StorySection />
    ),
    about: (
      <AboutSection />
    ),
  };

  return (
    <div className="w-full max-w-4xl p-6">
      {contentMap[section] || <p className="text-[var(--monad-off-white)]">Select a section</p>}
    </div>
  );
}

// Leaderboard Component
export function Leaderboard({ leaderboardData, isLoading }) {
  const { address } = useAccount();
  
  // Use passed leaderboard data or empty array if none
  const leaderboard = leaderboardData || [];

  if (isLoading) {
    return (
      <div className="w-full max-w-sm bg-transparent p-4 sm:p-6 rounded-xl border border-[var(--monad-off-white)]/30 text-center">
        <h2 className="text-2xl text-[var(--monad-off-white)] mb-4">LEADERBOARD</h2>
        <p className="text-[var(--monad-off-white)]/70">Loading leaderboard data...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm bg-transparent p-4 sm:p-6 rounded-xl border border-[var(--monad-off-white)]/30">
      <h2 className="text-2xl text-[var(--monad-off-white)] mb-4 text-center">LEADERBOARD</h2>
      {leaderboard.length > 0 ? (
        <div className="space-y-2 overflow-hidden">
          {leaderboard.map((entry, index) => (
            <div 
              key={index}
              className={`flex items-center justify-between p-2 rounded-lg 
                ${entry.playerAddress.toLowerCase() === (address?.toLowerCase() || '') ? 'bg-[var(--monad-purple)]/20 border border-[var(--monad-purple)]/50' : 'bg-[var(--monad-off-white)]/5'}`}
            >
              <div className="flex items-center">
                <span className="text-[var(--monad-off-white)]/80 w-6 text-center">{index + 1}</span>
                <span className="text-[var(--monad-off-white)] ml-2 truncate w-28 selectable-text">
                  {entry.playerAddress.slice(0, 6)}...{entry.playerAddress.slice(-4)}
                </span>
              </div>
              <span className="text-[var(--monad-purple)] font-medium">{entry.highestScore}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-[var(--monad-off-white)]/70">No leaderboard data available</p>
      )}
    </div>
  );
}

// Footer Component
export function Footer({ appVersion, gameState }) {
  if (gameState === "playing") return null;

  return (
    <div className="fixed bottom-4 md:bottom-4 left-0 right-0 flex justify-between items-center px-4 z-10">
      <div className="text-[var(--monad-off-white)]/80 text-xs sm:text-sm bg-black/40 px-3 py-1.5 rounded-lg border border-[var(--monad-purple)]/30 shadow-[0_0_8px_rgba(131,110,249,0.1)]">
        <span className="font-medium">Version:</span> {appVersion}
      </div>
      <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-[var(--monad-purple)]/30 shadow-[0_0_8px_rgba(131,110,249,0.1)]">
        <PoweredByMonad />
      </div>
    </div>
  );
}