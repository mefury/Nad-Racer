// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NadRacerGame is ERC721, Ownable {
    // --- State Variables ---
    address public gameOwner; // Contract deployer for admin purposes

    // Player data structure
    struct Player {
        uint256 totalPoints;   // Total NP tokens accumulated (synced with npBalance)
        uint256 highestScore;  // Highest score achieved in a single game
        bool exists;           // Flag to check if player has registered
    }

    // Mapping to store player data by address
    mapping(address => Player) public players;

    // Leaderboard entry structure
    struct LeaderboardEntry {
        address playerAddress;
        uint256 highestScore;
    }

    // Fixed-size array for top 10 leaderboard
    LeaderboardEntry[10] public leaderboard;

    // ERC-20-like Token variables (soulbound NP tokens)
    string private npName = "Nad Points";
    string private npSymbol = "NP";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public npBalance;

    // NFT-specific variables
    uint256 public constant SHIP_2_NP_COST = 10000 * 10**18; // 10,000 NP tokens, adjusted for decimals
    uint256 public nftSupply; // Tracks total NFTs minted
    mapping(address => bool) public hasMintedShip2; // Tracks if a player has minted their Ship 2 NFT

    // Events for frontend integration
    event GameStarted(address indexed player);
    event PointsClaimed(address indexed player, uint256 points, bool newHighScore);
    event HighScoreUpdated(address indexed player, uint256 newHighScore);
    event LeaderboardUpdated(address indexed player, uint256 highestScore, uint8 rank);
    event TokenTransfer(address indexed from, address indexed to, uint256 value); // For NP tokens
    event Ship2NFTMinted(address indexed player, uint256 tokenId); // NFT mint event

    // --- Constructor ---
    constructor() ERC721("NadRacerShip", "NRS") Ownable(msg.sender) {
        gameOwner = msg.sender;
    }

    // --- Modifiers ---
    modifier onlyGameOwner() {
        require(msg.sender == gameOwner, "Only game owner can call this function");
        _;
    }

    // --- Internal Token Functions ---

    // Mint NP tokens (soulbound, separate from ERC721 _mint)
    function _mintNP(address to, uint256 amount) internal {
        require(to != address(0), "Cannot mint to zero address");
        totalSupply += amount;
        npBalance[to] += amount;
        emit TokenTransfer(address(0), to, amount);
    }

    // Burn NP tokens (for NFT purchases)
    function _burnNP(address from, uint256 amount) internal {
        require(from != address(0), "Cannot burn from zero address");
        require(npBalance[from] >= amount, "Insufficient NP tokens");
        totalSupply -= amount;
        npBalance[from] -= amount;
        emit TokenTransfer(from, address(0), amount);
    }

    // --- Game Functions ---

    // Starts a game with a signature (no gas fee, just event emission)
    function startGame() external {
        emit GameStarted(msg.sender);

        if (!players[msg.sender].exists) {
            players[msg.sender] = Player({
                totalPoints: 0,
                highestScore: 0,
                exists: true
            });
        }
    }

    // Claims points and updates high score in one transaction
    function claimPoints(uint256 score) external {
        require(score > 0, "Score must be greater than zero");
        require(players[msg.sender].exists, "Player must start a game first");

        Player storage player = players[msg.sender];
        bool isNewHighScore = score > player.highestScore;

        // Mint NP tokens (1 score = 1 NP token, adjusted for decimals)
        uint256 pointsToMint = score * 10**uint256(decimals);
        _mintNP(msg.sender, pointsToMint);
        player.totalPoints = npBalance[msg.sender]; // Sync with token balance

        // Update high score and leaderboard if applicable
        if (isNewHighScore) {
            player.highestScore = score;
            emit HighScoreUpdated(msg.sender, score);
            updateLeaderboard(msg.sender, score);
        }

        emit PointsClaimed(msg.sender, score, isNewHighScore);
    }

    // Updates leaderboard: updates existing entry or adds new one if player qualifies
    function updateLeaderboard(address player, uint256 score) internal {
        bool playerExists = false;
        uint8 existingIndex = 0;

        for (uint8 i = 0; i < 10; i++) {
            if (leaderboard[i].playerAddress == player && leaderboard[i].highestScore > 0) {
                playerExists = true;
                existingIndex = i;
                break;
            }
        }

        if (playerExists) {
            if (score > leaderboard[existingIndex].highestScore) {
                leaderboard[existingIndex].highestScore = score;
                for (uint8 i = existingIndex; i > 0; i--) {
                    if (leaderboard[i].highestScore > leaderboard[i - 1].highestScore) {
                        LeaderboardEntry memory temp = leaderboard[i];
                        leaderboard[i] = leaderboard[i - 1];
                        leaderboard[i - 1] = temp;
                    } else {
                        break;
                    }
                }
                emit LeaderboardUpdated(player, score, existingIndex);
            }
        } else {
            for (uint8 i = 0; i < 10; i++) {
                if (score > leaderboard[i].highestScore) {
                    for (uint8 j = 9; j > i; j--) {
                        leaderboard[j] = leaderboard[j - 1];
                    }
                    leaderboard[i] = LeaderboardEntry(player, score);
                    emit LeaderboardUpdated(player, score, i);
                    break;
                }
            }
        }
    }

    // --- NFT Functions ---

    // Mint Ship 2 NFT and deduct 10,000 NP tokens
    function mintShip2NFT() external {
        require(npBalance[msg.sender] >= SHIP_2_NP_COST, "Insufficient NP tokens");
        require(players[msg.sender].exists, "Player must start a game first");
        require(!hasMintedShip2[msg.sender], "Player has already minted Ship 2 NFT");

        _burnNP(msg.sender, SHIP_2_NP_COST);
        players[msg.sender].totalPoints = npBalance[msg.sender];

        uint256 newTokenId = nftSupply + 1; // Dynamic tokenId
        _safeMint(msg.sender, newTokenId);
        hasMintedShip2[msg.sender] = true;
        nftSupply += 1;

        emit Ship2NFTMinted(msg.sender, newTokenId);
    }

    // Check if a player owns Ship 2 NFT
    function ownsShip2NFT(address player) external view returns (bool) {
        return hasMintedShip2[player];
    }

    // Override ERC-721 transfer functions to make NFT soulbound
    function transferFrom(address, address, uint256) public virtual override {
        revert("Ship NFTs are soulbound and non-transferable");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public virtual override {
        revert("Ship NFTs are soulbound and non-transferable");
    }

    // --- View Functions ---

    // Get player data (totalPoints reflects NP token balance)
    function getPlayerData(address player) external view returns (uint256 totalPoints, uint256 highestScore) {
        Player memory p = players[player];
        return (npBalance[player], p.highestScore);
    }

    // Get leaderboard data
    function getLeaderboard() external view returns (LeaderboardEntry[10] memory) {
        return leaderboard;
    }

    // Getter for NP token name
    function getNPName() external view returns (string memory) {
        return npName;
    }

    // Getter for NP token symbol
    function getNPSymbol() external view returns (string memory) {
        return npSymbol;
    }

    // --- Administrative Functions ---

    // Reset leaderboard (for testing)
    function resetLeaderboard() external onlyGameOwner {
        for (uint8 i = 0; i < 10; i++) {
            leaderboard[i] = LeaderboardEntry(address(0), 0);
        }
    }
}


// CA: 0x390c90cD763c5A3cD93C24985CF03dD2c9125008