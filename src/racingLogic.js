// racingLogic.js
// Core game logic for a 3D racing game, managing ship movement, object spawning, collisions, and updates.
// Enhanced with configurable starfield spreads, detailed skydome controls, and multiple ship options with dedicated configurations.

import * as THREE from "three"; // Import THREE.js for 3D operations

// Configuration object defining all customizable parameters for the game, organized by category
export const CONFIG = {
  // --- Track Configuration ---
  TRACK_WIDTH: 50,               // Width of the racing track in world units
  TRACK_COLOR: 0xFFFFFF,         // Color of the track border lines (white)
  TRACK_LINE_THICKNESS: 4.2,     // Thickness scaling factor for track border lines
  TRACK_LINES_VISIBLE: true,     // Toggle visibility of track border lines

  // --- Ship Configurations ---
  SHIPS: {
    SHIP_1: {
      GLTF_PATH: "models/ship/scene.gltf",     // Path to Ship 1's GLTF model file
      TARGET_LENGTH: 6.0,                      // Desired length of the ship model after scaling
      TARGET_WIDTH: 3.0,                       // Desired width of the ship model after scaling
      TARGET_HEIGHT: 1.2,                      // Desired height of the ship model after scaling
      SCALE: 5,                                // Base scaling factor applied to the model
      COLLISION_RADIUS: 5.0,                   // Radius for collision detection with obstacles and coins
      POSITION_X: 0.0,                         // Initial X position of the ship (centered)
      POSITION_Y: 2.0,                         // Initial Y position (height above track)
      POSITION_Z: 0,                           // Initial Z position (starting point)
      ROTATION_X: 0,                           // Initial X rotation in radians (no tilt)
      ROTATION_Y: Math.PI,                     // Initial Y rotation to face forward (negative Z, 180 degrees)
      ROTATION_Z: 0,                           // Initial Z rotation (no roll)
      ROLL_AXIS: "z",                          // Axis for rolling effect (Z for horizontal tilt)
    },
    SHIP_2: {
      GLTF_PATH: "models/ship2/scene.gltf",    // Path to Ship 2's GLTF model file
      TARGET_LENGTH: 6.0,                      // Desired length of the ship model after scaling
      TARGET_WIDTH: 3.0,                       // Desired width of the ship model after scaling
      TARGET_HEIGHT: 1.2,                      // Desired height of the ship model after scaling
      SCALE: 5,                                // Base scaling factor applied to the model
      COLLISION_RADIUS: 5.0,                   // Radius for collision detection with obstacles and coins
      POSITION_X: 0.0,                         // Initial X position of the ship (centered)
      POSITION_Y: 1,                         // Initial Y position (height above track)
      POSITION_Z: 0,                           // Initial Z position (starting point)
      ROTATION_X: 0,                           // Initial X rotation in radians (no tilt)
      ROTATION_Y: -Math.PI / 2,                // Initial Y rotation to face forward (negative Z from positive X, -90 degrees)
      ROTATION_Z: 0,                           // Initial Z rotation (no roll)
      ROLL_AXIS: "z",                          // Axis for rolling effect (Z for horizontal tilt)
    },
  },

  // --- Movement and Physics ---
  MAX_LATERAL_SPEED: 0.7,        // Maximum speed the ship can move left or right
  FORWARD_SPEED: 1.7,              // Constant forward movement speed along Z-axis
  BOOST_SPEED: 2.5,              // Additional speed when boost is activated
  ACCELERATION: 0.075,           // Rate of lateral acceleration per frame
  FRICTION: 0.88,                // Friction factor to slow lateral movement (0-1, lower = more friction)
  LATERAL_BOUNDS: 0,             // Calculated later as half of TRACK_WIDTH to limit lateral movement
  ROTATION_SENSITIVITY: 0.5,     // Sensitivity of ship roll based on lateral speed
  DISABLE_Z_MOVEMENT: false,     // Debug option to disable forward Z movement if true

  // --- Camera Settings ---
  CAMERA_FOV: 75,                // Field of view for the perspective camera in degrees
  CAMERA_NEAR: 0.1,              // Near clipping plane distance
  CAMERA_FAR: 1000,              // Far clipping plane distance
  CAMERA_X_OFFSET: 0,            // Lateral offset of camera from ship’s X position
  CAMERA_Y_OFFSET: 20,           // Height of camera above the ship
  CAMERA_Z_OFFSET: 15,           // Distance of camera behind the ship along Z-axis
  CAMERA_PITCH: -Math.PI / 4,    // Downward tilt of camera in radians (-45 degrees)
  CAMERA_YAW: 0,                 // Horizontal rotation of camera (none)
  CAMERA_ROLL: 0,                // Roll rotation of camera (none)

  // --- Lighting Settings ---
  LIGHT_INTENSITY: 5.0,          // Global multiplier for light intensities
  AMBIENT_LIGHT_COLOR: 0x404060, // Color of ambient light (bluish-gray)
  AMBIENT_LIGHT_INTENSITY: 5.0,  // Intensity of ambient light
  DIR_LIGHT_COLOR: 0xfff0e0,     // Color of directional light (warm white)
  DIR_LIGHT_INTENSITY: 3.0,      // Intensity of directional light
  DIR_LIGHT_POSITION_X: 15,      // X position of directional light source
  DIR_LIGHT_POSITION_Y: 20,      // Y position of directional light (above scene)
  DIR_LIGHT_POSITION_Z: -10,     // Z position of directional light (behind ship)
  SHADOW_BIAS: -0.0001,          // Shadow bias to reduce shadow artifacts
  SHADOW_MAP_SIZE: 2048,         // Resolution of shadow map for quality (width and height)

  // --- Skydome Settings ---
  SKYDOME_RADIUS: 500,           // Radius of the skydome sphere
  SKYDOME_COLOR: 0x200052,       // Base color of skydome if texture fails (dark purple)
  SKYDOME_TEXTURE_PATH: "/textures/space.jpg", // Path to space background texture
  SKYDOME_SEGMENTS: 64,          // Number of segments for skydome sphere (higher = smoother)
  SKYDOME_OPACITY: 1.0,          // Opacity of skydome material (1.0 = fully opaque)
  SKYDOME_EMISSIVE: 0x000000,    // Emissive color of skydome (none by default)
  SKYDOME_EMISSIVE_INTENSITY: 0.0, // Intensity of emissive effect (none by default)
  SKYDOME_ROTATION_SPEED_X: 0.0, // Rotation speed around X-axis (none)
  SKYDOME_ROTATION_SPEED_Y: 0.001, // Slow rotation around Y-axis for dynamic effect
  SKYDOME_ROTATION_SPEED_Z: 0.0, // Rotation speed around Z-axis (none)
  SKYDOME_SCALE_X: 1.0,          // Scale factor for skydome along X-axis
  SKYDOME_SCALE_Y: 1.0,          // Scale factor for skydome along Y-axis
  SKYDOME_SCALE_Z: 1.0,          // Scale factor for skydome along Z-axis

  // --- Coin Settings ---
  COIN_RADIUS: 0.8,              // Base radius of coin geometry
  COIN_THICKNESS: 0.2,           // Thickness of coin geometry
  COIN_SIZE: 2.2,                // Scaling factor applied to coin radius and thickness
  COIN_COLOR: 0xFFD700,          // Color of coins (gold)
  COIN_SPAWN_RATE: 0.7,          // Probability of spawning coins each interval (0-1)
  COIN_SPAWN_DISTANCE: 100,      // Distance ahead of ship where coins spawn
  COIN_SPAWN_Y_OFFSET: 1.0,      // Vertical offset above track for coin placement
  COIN_SPAWN_Z_SPACING: 3,       // Spacing between coins in a row along Z-axis
  COIN_ROW_LENGTH_MIN: 3,        // Minimum number of coins in a spawned row
  COIN_ROW_LENGTH_MAX: 7,        // Maximum number of coins in a spawned row
  COIN_COLLISION_RADIUS: 2.0,    // Radius for coin collision detection

  // --- Obstacle Settings ---
  OBSTACLE_SCALE: 5.0,           // Uniform scaling factor for all obstacle types
  OBSTACLE_SPAWN_RATE: 0.5,      // Probability of spawning an obstacle each interval (0-1)
  OBSTACLE_SPAWN_DISTANCE: 150,  // Distance ahead of ship where obstacles spawn
  OBSTACLE_SPAWN_Y_OFFSET: 2.0,  // Vertical offset above track for obstacle placement
  OBSTACLE_COLLISION_RADIUS: 4.0, // Radius for obstacle collision detection
  OBSTACLE_CUBE_COLOR: 0x00FF00, // Color of cube-shaped obstacles (green)
  OBSTACLE_ASTEROID_COLOR: 0x666666, // Color of asteroid-shaped obstacles (gray)
  OBSTACLE_SPIKY_SPHERE_COLOR: 0xFF0000, // Color of spiky sphere obstacles (red)

  // --- Spawning Mechanics ---
  SPAWN_INTERVAL: 50,            // Distance between consecutive spawn points along Z-axis
  DESPAWN_DISTANCE: 100,         // Distance behind ship where objects are removed

  // --- Starfield Settings ---
  STARFIELD_COUNT: 30000,        // Total number of stars in the starfield
  STARFIELD_SIZE: 1.5,           // Size of each star particle
  STARFIELD_COLOR: 0xffffff,     // Color of stars (white)
  STARFIELD_SPEED: 1.5,          // Speed at which stars move toward the ship
  STARFIELD_SPREAD_X: 1000,      // Width of starfield distribution along X-axis
  STARFIELD_SPREAD_Y: 1000,      // Height of starfield distribution along Y-axis
  STARFIELD_SPREAD_Z: 20000,     // Depth of starfield distribution along Z-axis

  // --- Sound Settings ---
  SOUND: {
    ENGINE_VOLUME: 0.5,          // Volume level for engine sound (0-1)
    ENGINE_LOOP: true,           // Whether engine sound loops continuously
    ENGINE_PATH: "/sounds/engine.mp3", // Path to engine sound file
    GAMEBG_VOLUME: 0.3,          // Volume level for background music (0-1)
    GAMEBG_LOOP: true,           // Whether background music loops continuously
    GAMEBG_PATH: "/sounds/gamebg.mp3", // Path to background music file
  },
};

// Calculate lateral bounds based on track width after config initialization
CONFIG.LATERAL_BOUNDS = CONFIG.TRACK_WIDTH / 2;

// Resets the game state, clearing obstacles and coins, and repositioning the ship
export const resetGameState = (scene, rocketGroup, obstaclesRef, coinsRef, initialStart = false, selectedShip) => {
  console.log("Resetting game state...");
  obstaclesRef.current.forEach((obstacle) => scene.remove(obstacle));
  obstaclesRef.current = [];
  coinsRef.current.forEach((coin) => scene.remove(coin));
  coinsRef.current = [];

  const shipConfig = CONFIG.SHIPS[selectedShip];
  if (initialStart) {
    rocketGroup.position.set(shipConfig.POSITION_X, shipConfig.POSITION_Y, shipConfig.POSITION_Z);
    rocketGroup.rotation.set(shipConfig.ROTATION_X, shipConfig.ROTATION_Y, shipConfig.ROTATION_Z);
  }

  let spawnZ = rocketGroup.position.z - CONFIG.SPAWN_INTERVAL;
  for (let i = 0; i < 10; i++) {
    spawnObstacle(spawnZ, scene, obstaclesRef, rocketGroup.position.z);
    spawnCoins(spawnZ, scene, coinsRef, rocketGroup.position.z);
    spawnZ -= CONFIG.SPAWN_INTERVAL;
  }
};

// Spawns an obstacle at a specified Z position ahead of the ship
export const spawnObstacle = (zBase, scene, obstaclesRef) => {
  if (!scene) return;
  if (Math.random() > CONFIG.OBSTACLE_SPAWN_RATE) return;

  const xPos = (Math.random() - 0.5) * CONFIG.TRACK_WIDTH;
  const spawnZ = zBase - CONFIG.OBSTACLE_SPAWN_DISTANCE;

  const type = Math.floor(Math.random() * 3);
  let obstacle;
  if (type === 0) {
    obstacle = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshPhongMaterial({ color: CONFIG.OBSTACLE_CUBE_COLOR })
    );
  } else if (type === 1) {
    obstacle = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1),
      new THREE.MeshPhongMaterial({ color: CONFIG.OBSTACLE_ASTEROID_COLOR })
    );
  } else {
    obstacle = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshPhongMaterial({ color: CONFIG.OBSTACLE_SPIKY_SPHERE_COLOR })
    );
  }

  obstacle.scale.set(CONFIG.OBSTACLE_SCALE, CONFIG.OBSTACLE_SCALE, CONFIG.OBSTACLE_SCALE);
  obstacle.position.set(xPos, CONFIG.SHIPS.SHIP_1.POSITION_Y + CONFIG.OBSTACLE_SPAWN_Y_OFFSET, spawnZ);
  obstacle.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  obstacle.castShadow = true;
  scene.add(obstacle);
  obstaclesRef.current.push(obstacle);
  console.log(`Spawned obstacle at (${xPos}, ${spawnZ})`);
};

// Spawns a row of coins at a specified Z position ahead of the ship
export const spawnCoins = (zBase, scene, coinsRef) => {
  if (!scene) return;
  if (Math.random() > CONFIG.COIN_SPAWN_RATE) return;

  const side = Math.random() < 0.5 ? -1 : 1;
  const xPos = side * (CONFIG.TRACK_WIDTH / 4);
  const spawnZ = zBase - CONFIG.COIN_SPAWN_DISTANCE;

  const coinCount = CONFIG.COIN_ROW_LENGTH_MIN + Math.floor(Math.random() * (CONFIG.COIN_ROW_LENGTH_MAX - CONFIG.COIN_ROW_LENGTH_MIN + 1));
  
  const coinGeometry = new THREE.CylinderGeometry(
    CONFIG.COIN_RADIUS * CONFIG.COIN_SIZE,
    CONFIG.COIN_RADIUS * CONFIG.COIN_SIZE,
    CONFIG.COIN_THICKNESS * CONFIG.COIN_SIZE,
    32
  );
  const coinMaterial = new THREE.MeshPhongMaterial({ color: CONFIG.COIN_COLOR });

  const coinGroup = new THREE.Group();
  for (let i = 0; i < coinCount; i++) {
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    coin.rotation.x = Math.PI / 2;
    coin.position.z = -i * CONFIG.COIN_SPAWN_Z_SPACING;
    coinGroup.add(coin);
  }
  coinGroup.position.set(xPos, CONFIG.SHIPS.SHIP_1.POSITION_Y + CONFIG.COIN_SPAWN_Y_OFFSET, spawnZ);
  coinGroup.castShadow = true;
  scene.add(coinGroup);
  coinsRef.current.push(coinGroup);
  console.log(`Spawned ${coinCount} coins at (${xPos}, ${spawnZ})`);
};

// Updates ship movement based on controls, applying roll on ship-specific axis
export const updateShipMovement = (rocketGroup, speedRef, controlsRef, selectedShip) => {
  if (controlsRef.current.left && !controlsRef.current.right) {
    speedRef.current.lateral -= CONFIG.ACCELERATION; // Accelerate left
  } else if (controlsRef.current.right && !controlsRef.current.left) {
    speedRef.current.lateral += CONFIG.ACCELERATION; // Accelerate right
  }
  speedRef.current.lateral = Math.max(-CONFIG.MAX_LATERAL_SPEED, Math.min(CONFIG.MAX_LATERAL_SPEED, speedRef.current.lateral));
  speedRef.current.lateral *= CONFIG.FRICTION;
  speedRef.current.boost = controlsRef.current.boost ? CONFIG.BOOST_SPEED : Math.max(0, speedRef.current.boost - 0.02);

  const newX = rocketGroup.position.x + speedRef.current.lateral;
  rocketGroup.position.x = Math.max(-CONFIG.LATERAL_BOUNDS, Math.min(CONFIG.LATERAL_BOUNDS, newX));
  
  if (!CONFIG.DISABLE_Z_MOVEMENT) {
    rocketGroup.position.z -= CONFIG.FORWARD_SPEED + speedRef.current.boost;
  }

  const shipConfig = CONFIG.SHIPS[selectedShip];
  const rollValue = -speedRef.current.lateral * CONFIG.ROTATION_SENSITIVITY; // Negative lateral = tilt left/down
  if (shipConfig.ROLL_AXIS === "z") {
    rocketGroup.rotation.z = rollValue; // Roll around Z-axis for both ships
  } else if (shipConfig.ROLL_AXIS === "x") {
    rocketGroup.rotation.x = rollValue; // Kept for reference, not used currently
  }
};

// Handles collisions between ship and obstacles/coins, updating health and score
export const handleCollisions = (rocketGroup, obstaclesRef, coinsRef, scene, setHealth, endGame, score, setScore, shipCollisionRadius) => {
  let blinkCount = 0;
  let coinsToRemove = [];
  let obstaclesToRemove = [];

  obstaclesRef.current.forEach((obstacle, index) => {
    const distance = rocketGroup.position.distanceTo(obstacle.position);
    if (distance < shipCollisionRadius + CONFIG.OBSTACLE_COLLISION_RADIUS) {
      obstaclesToRemove.push(index);
      scene.remove(obstacle);
      setHealth((prev) => {
        const newHealth = prev - 1;
        if (newHealth <= 0) endGame(score);
        blinkCount = 4;
        return Math.max(0, newHealth);
      });
    } else if (obstacle.position.z > rocketGroup.position.z + CONFIG.DESPAWN_DISTANCE) {
      obstaclesToRemove.push(index);
      scene.remove(obstacle);
    }
  });

  coinsRef.current.forEach((coinGroup, index) => {
    const distance = rocketGroup.position.distanceTo(coinGroup.position);
    if (distance < shipCollisionRadius + CONFIG.COIN_COLLISION_RADIUS) {
      coinsToRemove.push(index);
      const coinCount = coinGroup.children.length;
      scene.remove(coinGroup);
      setScore((prev) => {
        const newScore = prev + 10 * coinCount;
        console.log(`Coin collision: Added ${10 * coinCount} points, New Score: ${newScore}`);
        return newScore;
      });
    } else if (coinGroup.position.z > rocketGroup.position.z + CONFIG.DESPAWN_DISTANCE) {
      coinsToRemove.push(index);
      scene.remove(coinGroup);
    }
  });

  obstaclesRef.current = obstaclesRef.current.filter((_, index) => !obstaclesToRemove.includes(index));
  coinsRef.current = coinsRef.current.filter((_, index) => !coinsToRemove.includes(index));

  return blinkCount;
};

// Applies a blinking effect to the ship on collision
export const applyBlinkEffect = (rocketGroup, blinkCount, originalMaterialsRef) => {
  if (blinkCount > 0) {
    blinkCount--;
    const isRed = Math.floor(blinkCount / 2) % 2 === 0;
    rocketGroup.traverse((child) => {
      if (child.isMesh && child.material) {
        if (isRed) {
          child.material.color.set(0xff0000);
        } else {
          const originalMaterial = originalMaterialsRef.current.get(child);
          if (originalMaterial) child.material.color.copy(originalMaterial.color);
        }
      }
    });
  }
  return blinkCount;
};

// Spawns new obstacles and coins as the ship progresses
export const spawnNewObjects = (rocketGroup, nextSpawnZRef, obstaclesRef, coinsRef, scene) => {
  let nextSpawnZ = nextSpawnZRef.current;
  if (rocketGroup.position.z < nextSpawnZ) {
    spawnObstacle(nextSpawnZ, scene, obstaclesRef);
    spawnCoins(nextSpawnZ, scene, coinsRef);
    nextSpawnZ -= CONFIG.SPAWN_INTERVAL;
    nextSpawnZRef.current = nextSpawnZ;
  }
};