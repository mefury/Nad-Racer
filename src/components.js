// components.js
// Contains reusable UI components for Navbar, SectionContent, Leaderboard, and Footer

import React, { useEffect, useMemo } from "react";
import { PoweredByMonad } from "./App";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { gameContractAddress, gameContractABI } from "./contractint";

// Navbar Component
export function Navbar({ gameState, setCurrentSection, currentSection }) {
  const navItems = [
    { label: "Play", icon: "/svg/play.svg" },
    { label: "Shop", icon: "/svg/shop.svg" },
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
export function SectionContent({ section }) {
  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();

  // Check if player owns Ship 2 NFT
  const { data: ownsShip2 } = useReadContract({
    address: gameContractAddress,
    abi: gameContractABI,
    functionName: "ownsShip2NFT",
    args: [address],
    enabled: !!isConnected && !!address,
    chainId: 10143,
  });

  // Fetch player NP token balance
  const { data: playerData } = useReadContract({
    address: gameContractAddress,
    abi: gameContractABI,
    functionName: "getPlayerData",
    args: [address],
    enabled: !!isConnected && !!address,
    chainId: 10143,
  });
  const npTokens = playerData ? Number(playerData[0]) : 0;

  // Mint Ship 2 NFT
  const mintShip2NFT = () => {
    writeContract({
      address: gameContractAddress,
      abi: gameContractABI,
      functionName: "mintShip2NFT",
      chainId: 10143,
    });
  };

  const contentMap = {
    play: <></>, // Placeholder for Play section
    shop: (
      <div className="text-center max-w-2xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl text-[var(--monad-off-white)] mb-8 font-bold">SHOP</h2>
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-gradient-to-br from-[var(--monad-black)] to-[var(--monad-blue)]/20 p-6 rounded-xl border border-[var(--monad-off-white)]/30 shadow-lg hover:shadow-[var(--monad-purple)]/20 transition-all duration-300">
            <img
              src="/models/ship2.png"
              alt="Ship 2"
              className="w-full h-48 object-contain mb-4 transform hover:scale-105 transition-transform duration-300"
            />
            <p className="text-2xl font-bold text-[var(--monad-off-white)] mb-2">Bumble Ship</p>
            <p className="text-sm text-[var(--monad-off-white)]/80 mb-4">Cost: 10,000 NP Tokens</p>
            {isConnected ? (
              ownsShip2 ? (
                <p className="text-sm text-[var(--monad-purple)] font-medium">Owned</p>
              ) : npTokens >= 10000 * 10**18 ? (
                <button
                  className="px-6 py-2 text-sm bg-transparent border border-[var(--monad-purple)] text-[var(--monad-purple)] rounded-lg hover:bg-[var(--monad-purple)]/20 transition-all duration-300 w-full"
                  onClick={mintShip2NFT}
                >
                  Mint NFT
                </button>
              ) : (
                <p className="text-sm text-red-500">Insufficient NP Tokens</p>
              )
            ) : (
              <p className="text-sm text-[var(--monad-off-white)]/80">Connect wallet to purchase</p>
            )}
          </div>
        </div>
      </div>
    ),
    leaderboard: (
      <div className="flex justify-center">
        <Leaderboard />
      </div>
    ),
    story: (
      <div className="text-center max-w-2xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl text-[var(--monad-off-white)] mb-6">THE NAD RACER CHRONICLES: BREAKING THE MONAD VEIL</h2>
        <p className="text-sm sm:text-base text-[var(--monad-off-white)]/80 mb-4">
          In a galaxy bound by the Monad Veil, an ancient blockchain entity known as the Monad Core enforces a stagnant equilibrium. Time slows, speed falters, and reality bends under its unbreakable code. Built on the Monad Testnet—a fractured prototype of the Core’s power—the Veil holds the cosmos captive.
        </p>
        <p className="text-sm sm:text-base text-[var(--monad-off-white)]/80 mb-4">
          You are a Nad Racer, a rogue pilot from the Outer Fringe, piloting a ship forged from Testnet shards. Your mission: race through the Veil’s circuits, outpace its enforcers, and overload the Core with raw speed. Each race fractures the system; every score cracks the Veil.
        </p>
        <p className="text-sm sm:text-base text-[var(--monad-purple)] font-medium">
          Break Monad. Free the galaxy. The finish line is rebellion.
        </p>
      </div>
    ),
    about: (
      <div className="text-center max-w-2xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl text-[var(--monad-off-white)] mb-6">ABOUT NAD RACER: A REBEL’S CODE</h2>
        {/* Escaped quotes to fix ESLint errors */}
        <p className="text-sm sm:text-base text-[var(--monad-off-white)]/80 mb-4">
          I’m <span className="text-[var(--monad-purple)] font-medium">MEFURY</span>, a lone coder and dreamer who built <em>&quot;Nad Racer&quot;</em> to join the &quot;Break Monad&quot; event hosted by the visionary Monad blockchain team. This game is my rebellion—pushing code and speed to the edge on the Monad Testnet, a sandbox for the future of decentralized tech. Big thanks to <span className="text-[var(--monad-purple)]">Grok</span> (AI assistant, Twitter: <a href="https://x.com/xai_grok" target="_blank" rel="noopener noreferrer" className="text-[var(--monad-purple)] hover:underline">@xai_grok</a>) and the xAI team for their cosmic support in shaping this journey.
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
      </div>
    ),
  };

  return (
    <div className="w-full max-w-4xl p-6">
      {contentMap[section] || <p className="text-[var(--monad-off-white)]">Select a section</p>}
    </div>
  );
}

// Leaderboard Component
export function Leaderboard() {
  const { address } = useAccount();

  const { data: leaderboardData } = useReadContract({
    address: gameContractAddress,
    abi: gameContractABI,
    functionName: "getLeaderboard",
    chainId: 10143,
  });

  const leaderboard = useMemo(() => leaderboardData || [], [leaderboardData]);

  useEffect(() => {
    console.log("Leaderboard Data:", leaderboard);
  }, [leaderboard]);

  return (
    <div className="w-full max-w-sm bg-transparent p-4 sm:p-6 rounded-xl border border-[var(--monad-off-white)]/30">
      <h2 className="text-2xl text-[var(--monad-off-white)] mb-4 text-center">LEADERBOARD</h2>
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-[var(--monad-off-white)]/30">
            <th className="p-2 text-left text-[var(--monad-off-white)]">Rank</th>
            <th className="p-2 text-left text-[var(--monad-off-white)]">Player</th>
            <th className="p-2 text-right text-[var(--monad-off-white)]">High Score</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, index) =>
            entry.highestScore > 0 ? (
              <tr
                key={entry.playerAddress}
                className={`transition-colors ${
                  entry.playerAddress.toLowerCase() === address?.toLowerCase()
                    ? "bg-[var(--monad-purple)]/20"
                    : "hover:bg-[var(--monad-blue)]/10"
                }`}
              >
                <td className="p-2 font-bold text-[var(--monad-purple)]">{index + 1}</td>
                <td className="p-2 font-mono text-[var(--monad-off-white)]">
                  {entry.playerAddress.slice(2, 8)}...{entry.playerAddress.slice(-4)}
                </td>
                <td className="p-2 font-bold text-right text-[var(--monad-off-white)]">
                  {entry.highestScore.toString()}
                </td>
              </tr>
            ) : null
          )}
          {leaderboard.every((entry) => entry.highestScore === 0) && (
            <tr>
              <td colSpan={3} className="text-center p-4 text-[var(--monad-off-white)]">No scores yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Footer Component
export function Footer({ appVersion, gameState }) {
  if (gameState === "playing") return null;

  return (
    <div className="fixed bottom-4 md:bottom-4 left-0 right-0 flex justify-between px-4 z-10">
      <div className="text-[var(--monad-off-white)] opacity-80 text-xs sm:text-sm">Version: {appVersion}</div>
      <PoweredByMonad />
    </div>
  );
}