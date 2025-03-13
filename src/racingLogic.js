// racingLogic.js
// Core game logic for a 3D racing game, managing ship movement, object spawning, collisions, and updates.
// Enhanced with configurable starfield spreads, detailed skydome controls, and multiple ship options with dedicated configurations.
// Updated to use time-based delta for consistent movement speed across varying refresh rates, while preserving original spawning logic.

import * as THREE from "three"; // Import THREE.js for 3D operations
import { processTokens } from "./backendService";

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
      USE_CUSTOM_GEOMETRY: true,  // Flag to use custom Three.js geometry instead of GLTF
      SHIP_TYPE: 'speeder',       // Type identifier for the custom ship
      TARGET_LENGTH: 8.0,                      // Length appropriate for jet design
      TARGET_WIDTH: 6.0,                       // Width for wings
      TARGET_HEIGHT: 2.0,                      // Height adjusted for jet profile
      SCALE: 2,                              // Scale factor for the ship
      COLLISION_RADIUS: 5.0,                   // Radius for collision detection with obstacles and coins
      POSITION_X: 0.0,                         // Initial X position of the ship (centered)
      POSITION_Y: 2.2,                         // Height above track
      POSITION_Z: 0,                           // Initial Z position (starting point)
      ROTATION_X: 0,                           // Initial X rotation in radians (no tilt)
      ROTATION_Y: 0,                           // Initial Y rotation in radians (forward)
      ROTATION_Z: 0,                           // Initial Z rotation (no roll)
      ROLL_AXIS: "z",                          // Axis for rolling effect (Z for horizontal tilt)
    },
    SHIP_2: {
      USE_CUSTOM_GEOMETRY: true,  // Flag to use custom Three.js geometry instead of GLTF
      SHIP_TYPE: 'bumble',        // Type identifier for the custom ship
      TARGET_LENGTH: 6.0,                      // Desired length of the ship model after scaling
      TARGET_WIDTH: 3.0,                       // Desired width of the ship model after scaling
      TARGET_HEIGHT: 1.2,                      // Desired height of the ship model after scaling
      SCALE: 2,                             // Base scaling factor for the custom model
      COLLISION_RADIUS: 5.0,                   // Radius for collision detection with obstacles and coins
      POSITION_X: 0.0,                         // Initial X position of the ship (centered)
      POSITION_Y: 1,                           // Initial Y position (height above track)
      POSITION_Z: 0,                           // Initial Z position (starting point)
      ROTATION_X: 0,                           // Initial X rotation in radians (no tilt)
      ROTATION_Y: 0,                          // Initial Y rotation in radians (forward)
      ROTATION_Z: 0,                           // Initial Z rotation (no roll)
      ROLL_AXIS: "z",                          // Axis for rolling effect (Z for horizontal tilt)
      USE_LOW_DETAIL: true,                    // Flag to use lower detail rendering for performance
      OPTIMIZE_MATERIALS: true,                // Flag to apply material optimizations
      TEXTURE_QUALITY: 'low',                  // Use lower quality textures
      SHADOW_CASTING: false,                   // Disable shadow casting for better performance
    },
  },

  // --- Movement and Physics ---
  MAX_LATERAL_SPEED: 0.7,        // Maximum speed the ship can move left or right per second
  FORWARD_SPEED: 2.3,            // Constant forward movement speed along Z-axis per second
  BOOST_SPEED: 2.5,              // Additional speed when boost is activated per second
  ACCELERATION: 0.085,           // Rate of lateral acceleration per frame (scaled by delta)
  FRICTION: 0.88,                // Friction factor to slow lateral movement per frame (0-1, lower = more friction)
  LATERAL_BOUNDS: 0,             // Calculated later as half of TRACK_WIDTH to limit lateral movement
  ROTATION_SENSITIVITY: 0.5,     // Sensitivity of ship roll based on lateral speed
  DISABLE_Z_MOVEMENT: false,     // Debug option to disable forward Z movement if true

  // --- Camera Settings ---
  CAMERA_FOV: 100,                // Field of view for the perspective camera in degrees
  CAMERA_NEAR: 0.1,              // Near clipping plane distance
  CAMERA_FAR: 1000,              // Far clipping plane distance
  CAMERA_X_OFFSET: 0,            // Lateral offset of camera from ship's X position
  CAMERA_Y_OFFSET: 20,           // Height of camera above the ship
  CAMERA_Z_OFFSET: 15,           // Distance of camera behind the ship along Z-axis
  CAMERA_PITCH: -Math.PI / 4,    // Downward tilt of camera in radians (-45 degrees)
  CAMERA_YAW: 0,                 // Horizontal rotation of camera (none)
  CAMERA_ROLL: 0,                // Roll rotation of camera (none)

  // --- Lighting Settings ---
  LIGHT_INTENSITY: 6.0,          // Increased global multiplier for light intensities to brighten the scene
  AMBIENT_LIGHT_COLOR: 0x2a2a4c, // Slightly brighter ambient light (deep space blue) for better visibility
  AMBIENT_LIGHT_INTENSITY: 2.5,  // Higher ambient light for better overall illumination
  DIR_LIGHT_COLOR: 0xd2baff,     // Brighter purple-tinted directional light for better visibility
  DIR_LIGHT_INTENSITY: 5.0,      // Increased intensity for main directional light
  DIR_LIGHT_POSITION_X: 25,      // Adjusted X position for better angle
  DIR_LIGHT_POSITION_Y: 40,      // Height of directional light
  DIR_LIGHT_POSITION_Z: -15,     // Positioned more toward the front to illuminate oncoming obstacles
  SHADOW_BIAS: -0.0001,          // Shadow bias to reduce shadow artifacts
  SHADOW_MAP_SIZE: 2048,         // Resolution of shadow map for quality (width and height)

  // --- Skydome Settings ---
  SKYDOME_RADIUS: 500,           // Radius of the skydome sphere
  SKYDOME_COLOR: 0x000033,       // Base color of skydome if texture fails (deep space blue)
  SKYDOME_TEXTURE_PATH: "/textures/space.jpg", // Path to space background texture
  SKYDOME_SEGMENTS: 96,          // Increased segments for smoother spherical shape
  SKYDOME_OPACITY: 1.0,          // Opacity of skydome material (1.0 = fully opaque)
  SKYDOME_EMISSIVE: 0x000033,    // Slight emissive color for space glow effect
  SKYDOME_EMISSIVE_INTENSITY: 0.2, // Moderate emissive intensity for subtle glow
  SKYDOME_ROTATION_SPEED_X: 0.0001, // Very slow X-axis rotation for subtle movement
  SKYDOME_ROTATION_SPEED_Y: 0.0002, // Slow Y-axis rotation for dynamic effect
  SKYDOME_ROTATION_SPEED_Z: 0.0, // No Z-axis rotation
  SKYDOME_SCALE_X: 1.0,          // No X stretching
  SKYDOME_SCALE_Y: 1.0,          // No Y stretching
  SKYDOME_SCALE_Z: 1.0,          // No Z stretching

  // --- Coin Settings ---
  COIN_RADIUS: 0.8,              // Base radius of coin geometry
  COIN_THICKNESS: 0.2,           // Thickness of coin geometry
  COIN_SIZE: 5.2,                // Scaling factor applied to coin radius and thickness
  COIN_COLOR: 0x200052,          // Center color of coins (dark purple)
  COIN_BORDER_COLOR: 0x836EF9,   // Border color of coins (lighter purple)
  COIN_BORDER_THICKNESS: 0.25,   // Thickness of the coin border as a fraction of total radius
  COIN_EMISSIVE: 0xffaa00,       // Emissive color for coin glow
  COIN_EMISSIVE_INTENSITY: 0.6,  // Intensity of coin glow
  COIN_SPAWN_RATE: 0.3,          // Probability of spawning coins each interval (0-1)
  COIN_SPAWN_DISTANCE: 100,      // Distance ahead of ship where coins spawn
  COIN_SPAWN_Y_OFFSET: 1.0,      // Vertical offset above track for coin placement
  COIN_COLLISION_RADIUS: 2.0,    // Radius for coin collision detection

  // --- Obstacle Settings ---
  OBSTACLE_SCALE: 5.0,           // Uniform scaling factor for all obstacle types
  OBSTACLE_SPAWN_RATE: 0.5,      // Probability of spawning an obstacle each interval (0-1)
  OBSTACLE_SPAWN_DISTANCE: 150,  // Distance ahead of ship where obstacles spawn
  OBSTACLE_SPAWN_Y_OFFSET: 2.0,  // Vertical offset above track for obstacle placement
  OBSTACLE_COLLISION_RADIUS: 4.0, // Radius for obstacle collision detection
  OBSTACLE_CUBE_COLOR: 0xA0055D, // Color of cube-shaped obstacles (magenta pink)
  OBSTACLE_ASTEROID_COLOR: 0x666666, // Color of asteroid-shaped obstacles (gray)
  OBSTACLE_SPIKY_SPHERE_COLOR: 0xFF0000, // Color of spiky sphere obstacles (red)

  // --- Spawning Mechanics ---
  SPAWN_INTERVAL: 50,            // Distance between consecutive spawn points along Z-axis
  DESPAWN_DISTANCE: 100,         // Distance behind ship where objects are removed

  // --- Starfield Settings ---
  STARFIELD_COUNT: 40000,        // Increased number of stars for a denser field
  STARFIELD_SIZE: 1.8,           // Slightly larger stars for better visibility
  STARFIELD_COLOR: 0xffffff,     // Base star color (white)
  STARFIELD_SPEED: 1.8,          // Increased speed for more dynamic feel
  STARFIELD_SPREAD_X: 1200,      // Wider starfield distribution along X-axis
  STARFIELD_SPREAD_Y: 1200,      // Higher starfield distribution along Y-axis
  STARFIELD_SPREAD_Z: 25000,     // Deeper starfield distribution along Z-axis
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
    spawnObstacle(spawnZ, scene, obstaclesRef);
    spawnCoins(spawnZ, scene, coinsRef, obstaclesRef);
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
  
  // Create obstacle based on type with improved designs
  if (type === 0) {
    // Redesigned CUBE - Black shiny cube with spikes on 4 sides
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshStandardMaterial({ 
      color: CONFIG.OBSTACLE_CUBE_COLOR, // Use config color
      metalness: 0.9,
      roughness: 0.1,
      emissive: CONFIG.OBSTACLE_CUBE_COLOR, // Use same color for emissive
      emissiveIntensity: 0.1
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    
    // Create a group for the cube and its spikes
    const cubeGroup = new THREE.Group();
    cubeGroup.add(cube);
    
    // Add 4 cone spikes to the sides (not top/bottom)
    const spikeGeometry = new THREE.ConeGeometry(0.35, 0.8, 8);
    const spikeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(CONFIG.OBSTACLE_CUBE_COLOR).multiplyScalar(0.8).getHex(), // Slightly darker shade of the cube color
      metalness: 0.8,
      roughness: 0.2
    });
    
    // Front spike
    const frontSpike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    frontSpike.position.set(0, 0, 0.9);
    frontSpike.rotation.x = Math.PI / 2;
    cubeGroup.add(frontSpike);
    
    // Back spike
    const backSpike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    backSpike.position.set(0, 0, -0.9);
    backSpike.rotation.x = -Math.PI / 2;
    cubeGroup.add(backSpike);
    
    // Left spike
    const leftSpike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    leftSpike.position.set(-0.9, 0, 0);
    leftSpike.rotation.z = Math.PI / 2;
    cubeGroup.add(leftSpike);
    
    // Right spike
    const rightSpike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    rightSpike.position.set(0.9, 0, 0);
    rightSpike.rotation.z = -Math.PI / 2;
    cubeGroup.add(rightSpike);
    
    // Animation properties for rotation
    cubeGroup.userData = {
      rotationSpeed: {
        x: 0.01,
        y: 0.03, // Faster y-axis rotation for spinning effect
        z: 0.01
      },
      type: 'cube',
      spinAxis: Math.random() > 0.5 ? 'y' : 'x' // Randomly choose spinning axis
    };
    
    obstacle = cubeGroup;
  } else if (type === 1) {
    // Enhanced ASTEROID - Improved asteroid with rougher surface and crater details
    const asteroidGeometry = new THREE.DodecahedronGeometry(1, 1);
    
    // Apply random vertex displacement for more asteroid-like appearance
    const positionAttribute = asteroidGeometry.getAttribute('position');
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      const z = positionAttribute.getZ(i);
      
      // Calculate vertex length
      const length = Math.sqrt(x * x + y * y + z * z);
      
      // Normalize and add random bumps
      const bumpScale = 0.2 * Math.random();
      const normalize = 1 / length;
      
      positionAttribute.setX(i, (x * normalize) * (1 + bumpScale));
      positionAttribute.setY(i, (y * normalize) * (1 + bumpScale));
      positionAttribute.setZ(i, (z * normalize) * (1 + bumpScale));
    }
    asteroidGeometry.computeVertexNormals();
    
    // Create a textured material
    const asteroidMaterial = new THREE.MeshStandardMaterial({
      color: CONFIG.OBSTACLE_ASTEROID_COLOR, // Use config color
      metalness: 0.1,
      roughness: 0.9,
      flatShading: true
    });
    
    obstacle = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
    
    // Add animation properties
    obstacle.userData = {
      rotationSpeed: {
        x: 0.005 + Math.random() * 0.01,
        y: 0.005 + Math.random() * 0.01,
        z: 0.005 + Math.random() * 0.01
      },
      type: 'asteroid'
    };
  } else {
    // Enhanced SPIKY SPHERE - Actually spiky now!
    const baseGeometry = new THREE.IcosahedronGeometry(0.8, 0);
    const spikesMaterial = new THREE.MeshStandardMaterial({
      color: CONFIG.OBSTACLE_SPIKY_SPHERE_COLOR, // Use config color
      emissive: new THREE.Color(CONFIG.OBSTACLE_SPIKY_SPHERE_COLOR).multiplyScalar(0.7).getHex(), // Emissive based on config color
      emissiveIntensity: 0.3,
      metalness: 0.2,
      roughness: 0.6
    });
    
    // Create spikes group
    const spikeyGroup = new THREE.Group();
    
    // Add base sphere
    const base = new THREE.Mesh(baseGeometry, spikesMaterial);
    spikeyGroup.add(base);
    
    // Get vertices from icosahedron to place spikes
    const vertices = [];
    const positionAttribute = baseGeometry.getAttribute('position');
    
    // Create unique vertices list
    for (let i = 0; i < positionAttribute.count; i++) {
      const vertex = new THREE.Vector3();
      vertex.fromBufferAttribute(positionAttribute, i);
      
      // Check if vertex is already in list to avoid duplicates
      let isDuplicate = false;
      for (const v of vertices) {
        if (v.distanceTo(vertex) < 0.01) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        vertices.push(vertex);
      }
    }
    
    // Add spikes at each vertex
    for (const vertex of vertices) {
      const spikeLength = 0.7;
      const spikeGeometry = new THREE.ConeGeometry(0.2, spikeLength, 8);
      const spike = new THREE.Mesh(spikeGeometry, spikesMaterial);
      
      // Position at vertex
      spike.position.copy(vertex);
      
      // Orient spike outward
      const direction = vertex.clone().normalize();
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      
      // Position spike so base is at sphere surface
      spike.position.copy(direction.multiplyScalar(0.8 + spikeLength/2));
      
      spikeyGroup.add(spike);
    }
    
    obstacle = spikeyGroup;
    
    // Add animation properties
    obstacle.userData = {
      rotationSpeed: {
        x: 0.015,
        y: 0.02,
        z: 0.01
      },
      spinPhase: Math.random() * Math.PI * 2,
      spinAmount: 0.2 + Math.random() * 0.3,
      type: 'spiky'
    };
  }

  obstacle.scale.set(CONFIG.OBSTACLE_SCALE, CONFIG.OBSTACLE_SCALE, CONFIG.OBSTACLE_SCALE);
  obstacle.position.set(xPos, CONFIG.SHIPS.SHIP_1.POSITION_Y + CONFIG.OBSTACLE_SPAWN_Y_OFFSET, spawnZ);
  obstacle.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  obstacle.castShadow = true;
  scene.add(obstacle);
  obstaclesRef.current.push(obstacle);
  
  // Store position for collision checks
  obstacle.userData.position = { x: xPos, z: spawnZ };
  obstacle.userData.radius = CONFIG.OBSTACLE_COLLISION_RADIUS;
  
  console.log(`Spawned obstacle at (${xPos}, ${spawnZ})`);
  
  return obstacle;
};

// Helper function to check if a position would collide with any obstacles
const isCollidingWithObstacles = (x, z, obstaclesRef, minDistance = CONFIG.OBSTACLE_COLLISION_RADIUS + CONFIG.COIN_COLLISION_RADIUS) => {
  if (!obstaclesRef || !obstaclesRef.current || obstaclesRef.current.length === 0) return false;
  
  for (const obstacle of obstaclesRef.current) {
    const obstaclePos = obstacle.position;
    const dx = obstaclePos.x - x;
    const dz = obstaclePos.z - z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < minDistance) {
      return true; // Would collide
    }
  }
  
  return false; // No collision
};

// Spawns a single coin at a specified Z position ahead of the ship (replacing the row of coins)
export const spawnCoins = (zBase, scene, coinsRef, obstaclesRef) => {
  if (!scene) return;
  if (Math.random() > CONFIG.COIN_SPAWN_RATE) return;

  // Try up to 5 positions to find one that doesn't collide with obstacles
  let attempts = 0;
  let xPos, spawnZ;
  let coinPlaced = false;
  
  while (attempts < 5 && !coinPlaced) {
    const side = Math.random() < 0.5 ? -1 : 1;
    xPos = side * (CONFIG.TRACK_WIDTH / 4 * (0.5 + Math.random() * 0.7)); // Add some variation
    spawnZ = zBase - CONFIG.COIN_SPAWN_DISTANCE - (Math.random() * 20); // Add some Z variation
    
    // Check if this position would collide with any obstacles
    if (!isCollidingWithObstacles(xPos, spawnZ, obstaclesRef)) {
      coinPlaced = true;
    }
    
    attempts++;
  }
  
  // If all attempts failed, don't spawn a coin
  if (!coinPlaced) {
    console.log("Failed to find non-colliding position for coin");
    return;
  }
  
  // Create a group to hold both parts of the coin
  const coinGroup = new THREE.Group();
  
  // Calculate the border and inner radii
  const outerRadius = CONFIG.COIN_RADIUS * CONFIG.COIN_SIZE;
  const innerRadius = outerRadius * (1 - CONFIG.COIN_BORDER_THICKNESS);
  
  // Create the outer border coin (full coin with border color)
  const borderGeometry = new THREE.CylinderGeometry(
    outerRadius,
    outerRadius,
    CONFIG.COIN_THICKNESS * CONFIG.COIN_SIZE,
    32
  );
  
  const borderMaterial = new THREE.MeshStandardMaterial({ 
    color: CONFIG.COIN_BORDER_COLOR, 
    metalness: 0.8,
    roughness: 0.3,
    emissive: CONFIG.COIN_EMISSIVE, 
    emissiveIntensity: CONFIG.COIN_EMISSIVE_INTENSITY * 0.7
  });
  
  const borderCoin = new THREE.Mesh(borderGeometry, borderMaterial);
  coinGroup.add(borderCoin);
  
  // Create the inner coin (smaller cylinder with the center color)
  const innerGeometry = new THREE.CylinderGeometry(
    innerRadius,
    innerRadius,
    CONFIG.COIN_THICKNESS * CONFIG.COIN_SIZE * 1.01, // Slightly thicker to prevent z-fighting
    32
  );
  
  const innerMaterial = new THREE.MeshStandardMaterial({ 
    color: CONFIG.COIN_COLOR, 
    metalness: 0.7,
    roughness: 0.4,
    emissive: CONFIG.COIN_COLOR, 
    emissiveIntensity: 0.2
  });
  
  const innerCoin = new THREE.Mesh(innerGeometry, innerMaterial);
  coinGroup.add(innerCoin);
  
  // Rotate the entire coin group so it faces the camera
  coinGroup.rotation.x = Math.PI / 2;
  coinGroup.position.set(xPos, CONFIG.SHIPS.SHIP_1.POSITION_Y + CONFIG.COIN_SPAWN_Y_OFFSET, spawnZ);
  coinGroup.castShadow = true;
  
  // Add rotation animation properties
  coinGroup.userData = {
    rotationSpeed: { y: 0.03 },
    type: 'coin'
  };
  
  scene.add(coinGroup);
  coinsRef.current.push(coinGroup);
  console.log(`Spawned coin at (${xPos}, ${spawnZ})`);
};

// Updates ship movement based on controls, applying roll on ship-specific axis, scaled by delta time
export const updateShipMovement = (rocketGroup, speedRef, controlsRef, selectedShip, delta) => {
  const deltaScale = delta * 60; // Normalize to 60 FPS baseline for original tuning

  if (controlsRef.current.left && !controlsRef.current.right) {
    speedRef.current.lateral -= CONFIG.ACCELERATION * deltaScale; // Accelerate left, scaled by delta
  } else if (controlsRef.current.right && !controlsRef.current.left) {
    speedRef.current.lateral += CONFIG.ACCELERATION * deltaScale; // Accelerate right, scaled by delta
  }
  speedRef.current.lateral = Math.max(-CONFIG.MAX_LATERAL_SPEED, Math.min(CONFIG.MAX_LATERAL_SPEED, speedRef.current.lateral));
  speedRef.current.lateral *= Math.pow(CONFIG.FRICTION, deltaScale); // Apply friction exponentially, scaled by delta
  speedRef.current.boost = controlsRef.current.boost ? CONFIG.BOOST_SPEED : Math.max(0, speedRef.current.boost - 0.02 * deltaScale); // Boost decay scaled by delta

  const newX = rocketGroup.position.x + speedRef.current.lateral * deltaScale; // Lateral movement scaled by delta
  rocketGroup.position.x = Math.max(-CONFIG.LATERAL_BOUNDS, Math.min(CONFIG.LATERAL_BOUNDS, newX));
  
  if (!CONFIG.DISABLE_Z_MOVEMENT) {
    rocketGroup.position.z -= (CONFIG.FORWARD_SPEED + speedRef.current.boost) * deltaScale; // Forward movement scaled by delta
  }

  const shipConfig = CONFIG.SHIPS[selectedShip];
  const rollValue = -speedRef.current.lateral * CONFIG.ROTATION_SENSITIVITY; // Roll based on lateral speed (not time-dependent)
  if (shipConfig.ROLL_AXIS === "z") {
    rocketGroup.rotation.z = rollValue; // Roll around Z-axis for both ships
  } else if (shipConfig.ROLL_AXIS === "x") {
    rocketGroup.rotation.x = rollValue; // Kept for reference, not used currently
  }
};

// Handles collisions between ship and obstacles/coins, updating health and score
export const handleCollisions = (rocketGroup, obstaclesRef, coinsRef, scene, setHealth, endGame, score, setScore, shipCollisionRadius, onCoinCollect, onObstacleHit) => {
  if (!rocketGroup || !scene) return { blinkCount: 0, obstacleHit: false, coinCollected: false };

  // Debug logging for callbacks
  if (onCoinCollect === undefined) {
    console.warn("❌ handleCollisions - onCoinCollect callback is undefined!");
  }
  
  if (onObstacleHit === undefined) {
    console.warn("❌ handleCollisions - onObstacleHit callback is undefined!");
  }

  const shipPosition = new THREE.Vector3();
  rocketGroup.getWorldPosition(shipPosition);
  
  let coinCollected = false;

  // Check coin collisions
  for (let i = coinsRef.current.length - 1; i >= 0; i--) {
    const coin = coinsRef.current[i];
    
    // Get coin position - simplified to work with all coin types
    const coinPosition = new THREE.Vector3();
    coin.getWorldPosition(coinPosition);
    
    const distance = shipPosition.distanceTo(coinPosition);
    if (distance < CONFIG.COIN_COLLISION_RADIUS + shipCollisionRadius) {
      // Remove this coin from the scene and update score
      scene.remove(coin);
      coinsRef.current.splice(i, 1);
      setScore(prevScore => prevScore + 1);
      
      // Set flag for coin collection
      coinCollected = true;
      
      // Call the callback function for coin collection
      if (typeof onCoinCollect === 'function') {
        console.log("✨ racingLogic: Coin collected! Calling onCoinCollect callback...");
        try {
          onCoinCollect(1); // Pass coin value
        } catch (e) {
          console.error("❌ racingLogic: Error calling onCoinCollect:", e);
        }
      } else {
        console.warn("⚠️ racingLogic: Coin collected but onCoinCollect is not a function:", onCoinCollect);
      }
    }
  }

  let blinkCount = 0;
  let obstacleHit = false;
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
        obstacleHit = true;
        
        // Call the callback function for obstacle hit
        if (typeof onObstacleHit === 'function') {
          console.log("💥 racingLogic: Obstacle hit! Calling onObstacleHit callback...");
          try {
            onObstacleHit();
          } catch (e) {
            console.error("❌ racingLogic: Error calling onObstacleHit:", e);
          }
        } else {
          console.warn("⚠️ racingLogic: Obstacle hit but onObstacleHit is not a function:", onObstacleHit);
        }
        
        return Math.max(0, newHealth);
      });
    } else if (obstacle.position.z > rocketGroup.position.z + CONFIG.DESPAWN_DISTANCE) {
      obstaclesToRemove.push(index);
      scene.remove(obstacle);
    }
  });

  obstaclesRef.current = obstaclesRef.current.filter((_, index) => !obstaclesToRemove.includes(index));

  return { blinkCount, obstacleHit, coinCollected };
};

// Applies a blinking effect to the ship on collision
export const applyBlinkEffect = (rocketGroup, blinkCount, originalMaterialsRef) => {
  if (blinkCount > 0) {
    blinkCount--; // Decrement blink counter (frame-based, not time-based for simplicity)
    const isRed = Math.floor(blinkCount / 2) % 2 === 0;
    rocketGroup.traverse((child) => {
      if (child.isMesh && child.material) {
        if (isRed) {
          child.material.color.set(0xff0000); // Red during blink
        } else {
          const originalMaterial = originalMaterialsRef.current.get(child);
          if (originalMaterial) child.material.color.copy(originalMaterial.color); // Restore original color
        }
      }
    });
  }
  return blinkCount;
};

// Spawns new obstacles and coins as the ship progresses (original logic preserved)
export const spawnNewObjects = (rocketGroup, nextSpawnZRef, obstaclesRef, coinsRef, scene) => {
  let nextSpawnZ = nextSpawnZRef.current;
  if (rocketGroup.position.z < nextSpawnZ) { // Original condition based on position
    spawnObstacle(nextSpawnZ, scene, obstaclesRef);
    spawnCoins(nextSpawnZ, scene, coinsRef, obstaclesRef); // Pass obstaclesRef to check for collisions
    nextSpawnZ -= CONFIG.SPAWN_INTERVAL;
    nextSpawnZRef.current = nextSpawnZ;
  }
};

// Add a new function to update obstacle animations
export const updateObstacleAnimations = (obstaclesRef, delta) => {
  if (!obstaclesRef?.current?.length) return;
  
  obstaclesRef.current.forEach(obstacle => {
    if (!obstacle.userData) return;
    
    // Apply rotation animation
    if (obstacle.userData.rotationSpeed) {
      obstacle.rotation.x += obstacle.userData.rotationSpeed.x * delta;
      obstacle.rotation.y += obstacle.userData.rotationSpeed.y * delta;
      obstacle.rotation.z += obstacle.userData.rotationSpeed.z * delta;
    }
    
    // Apply specific animations by type
    if (obstacle.userData.type === 'cube') {
      // Spinning cube animation - replace pulse glow effect
      const spinAxis = obstacle.userData.spinAxis || 'y';
      if (spinAxis === 'y') {
        obstacle.rotation.y += 0.05 * delta; // Faster y rotation for spin effect
      } else {
        obstacle.rotation.x += 0.05 * delta; // Alternative x rotation spin
      }
    } 
    else if (obstacle.userData.type === 'spiky') {
      // Spiky sphere "breathing" animation
      obstacle.userData.spinPhase += 0.02 * delta;
      const spinValue = Math.sin(obstacle.userData.spinPhase) * obstacle.userData.spinAmount;
      
      // Apply subtle "breathing" scale to spikes
      for (let i = 1; i < obstacle.children.length; i++) {
        const spike = obstacle.children[i];
        spike.scale.set(
          1 + spinValue * 0.1,
          1 + Math.abs(spinValue) * 0.3,
          1 + spinValue * 0.1
        );
      }
    }
  });
};

// Add a new function to update coin animations (similar to updateObstacleAnimations)
export const updateCoinAnimations = (coinsRef, delta) => {
  if (!coinsRef?.current?.length) return;
  
  coinsRef.current.forEach(coin => {
    if (!coin.userData || coin.userData.type !== 'coin') return;
    
    // Rotate the coin for a spinning effect
    coin.rotation.y += (coin.userData.rotationSpeed.y || 0.03) * delta;
  });
};