// racingConfig.js
// No need to import THREE since it's not used here

export const CONFIG = {
  // 3D Space Configuration
  SPACE_WIDTH: 20, // Increased from 14 to 20 for wider X-axis space
  SPACE_HEIGHT: 15, // Increased from 10 to 15 for taller Y-axis space
  SPACE_DEPTH: 1200, // Increased from 1000 to 1200 for deeper Z-axis space
  SPACE_SCALE: 1.0, // Uniform scale factor for the entire 3D space (affects all objects)

  // Colors (no texture properties for ship, as GLTF handles textures)
  PILOT_AREA_COLOR: 0xffffff, // White for pilot area
  BACKGROUND_COLOR: 0x000022, // Deep space blue background (kept dark for contrast)
  STAR_OBSTACLE_COLOR: 0xffff00, // Yellow for star obstacles (glowing)
  ASTEROID_COLOR: 0x666666, // Gray for asteroids (rocky)

  // Coin Controllers
  COIN_COLOR: 0xFFD700, // Golden color for coins
  COIN_BORDER_COLOR: 0xB8860B, // Darker gold for coin border
  COIN_RADIUS: 0.8, // Radius of coins
  COIN_THICKNESS: 0.2, // Thickness of coins
  COIN_SIZE: 1.2, // Scale factor for coin size
  COIN_BORDER_THICKNESS: 0.1, // Thickness of the coin border
  COIN_SPAWN_X_RANGE: 0.9, // Percentage of SPACE_WIDTH for coin X placement (0-1)
  COIN_SPAWN_Y_RANGE: 0.9, // Percentage of SPACE_HEIGHT for coin Y placement (0-1)
  COIN_SPAWN_Z_START_OFFSET: -60, // Starting Z offset from spawn point
  COIN_ROW_SPACING: 2.5, // Distance between coins in a row
  COIN_ROW_COUNTS: [3, 5, 10], // Possible coin row lengths (like Temple Run)
  COIN_SPAWN_CHANCE: 0.7, // Chance of spawning coins at each interval (0-1)
  COIN_COLLISION_RADIUS: 1.5, // Increased to 1.5 for more reliable detection (was 1.2)

  // Ship Controllers (Updated for GLTF model)
  SHIP_GLTF_PATH: "scene.gltf", // Path to the GLTF file in public folder (update for any GLTF model, no /models/ prefix)
  SHIP_TARGET_LENGTH: 6.0, // Desired length of the ship (adjust based on model)
  SHIP_TARGET_WIDTH: 3.0, // Desired width of the ship (adjust based on model)
  SHIP_TARGET_HEIGHT: 1.2, // Desired height of the ship (adjust based on model)
  SHIP_SCALE: 1, // Uniform scale factor for ship size
  SHIP_POSITION_X: 0.0, // Initial X position of the ship (left/right)
  SHIP_POSITION_Y: 2.0, // Initial Y position of the ship (height)
  SHIP_POSITION_Z: 0.0, // Initial Z position of the ship (forward/backward)
  SHIP_ROTATION_X: 0, // No rotation around X-axis (keeps it upright)
  SHIP_ROTATION_Y: Math.PI / 1, // 90 degrees around Y-axis (confirmed working)
  SHIP_ROTATION_Z: 0, // No rotation around Z-axis
  SHIP_COLLISION_RADIUS: 2.5, // Increased to 2.5 for more reliable detection (was 2.0)

  // Custom Lighting Controllers
  LIGHT_INTENSITY: 5.0, // Global light intensity multiplier
  AMBIENT_LIGHT_COLOR: 0x404060, // Slightly brighter bluish ambient light
  AMBIENT_LIGHT_INTENSITY: 1.0, // Base illumination intensity
  POINT_LIGHT_COLOR: 0xffffff, // White point light to highlight rocket
  POINT_LIGHT_INTENSITY: 8.0, // Shine intensity
  POINT_LIGHT_DISTANCE: 25, // Range of point light
  POINT_LIGHT_DECAY: 1.2, // Decay for broader reach
  SPOT_LIGHT_COLOR: 0xf0f0ff, // Cooler white for glossy highlights
  SPOT_LIGHT_INTENSITY: 6.0, // Vibrant reflection intensity
  SPOT_LIGHT_ANGLE: Math.PI / 4, // Angle of spot light cone
  SPOT_LIGHT_PENUMBRA: 0.3, // Softer edge for natural falloff
  SPOT_LIGHT_DISTANCE: 60, // Range of spot light
  SPOT_LIGHT_POSITION_Y: 20, // Height of spot light above scene
  DIR_LIGHT_COLOR: 0xfff0e0, // Warmer, brighter white for sun-like glow
  DIR_LIGHT_INTENSITY: 3.0, // Brightness and flare intensity
  DIR_LIGHT_POSITION_X: 15, // X position for angled sunlight
  DIR_LIGHT_POSITION_Y: 20, // Y position for broader coverage
  DIR_LIGHT_POSITION_Z: -10, // Z position to cast light forward
  SHADOW_BIAS: -0.0001, // Shadow bias for cleaner shadows
  SHADOW_MAP_SIZE: 2048, // Resolution of shadow map

  // NEW Starfield controllers (replacing old ones)
  STAR_COUNT: 12000,       // Much higher initial count
  STAR_SPREAD_X: 16000,    // Wider spread
  STAR_SPREAD_Y: 16000,    // Wider spread
  STAR_SPREAD_Z: 16000,    // Wider spread
  STAR_SIZE: 0.2,          // Smaller stars for better performance with higher count
  STAR_DENSITY: 2.0,       // Higher density
  STAR_COLOR: 0xffffff,    // Color of stars (adjustable: use hex values, e.g., 0xff0000 for red)
  STAR_OPACITY: 0.8,       // Transparency of stars (adjustable: 0.0 to 1.0, 1.0 is fully opaque)
  STAR_GLOW: true,         // Whether stars have a glowing effect (adjustable: true/false for additive blending)
  STAR_BUFFER_ZONE: 500,   // Distance ahead/behind rocket where stars regenerate (adjustable: smaller values increase frequency)
  STAR_MIN_DISTANCE: 100,  // Minimum distance from rocket to place stars (adjustable: prevents stars spawning too close)

  // Particle effect properties
  COIN_PARTICLE_COLOR: 0xffff00, // Yellow for coin sparkles
  COIN_PARTICLE_SIZE: 0.3, // Size of coin particles
  COIN_PARTICLE_COUNT: 15, // Particles per collection
  COIN_PARTICLE_LIFETIME: 0.8, // Lifetime in seconds
  COLLISION_PARTICLE_COLOR: 0xff0000, // Red for collision burst
  COLLISION_PARTICLE_SIZE: 0.4, // Size of collision particles
  COLLISION_PARTICLE_COUNT: 30, // Particles per collision
  COLLISION_PARTICLE_LIFETIME: 1.0, // Lifetime in seconds

  // Obstacle Controllers
  OBSTACLE_SCALE_MIN: 2.0, // Minimum scale factor for obstacles
  OBSTACLE_SCALE_MAX: 4.0, // Maximum scale factor for obstacles
  OBSTACLE_SPAWN_X_RANGE: 0.9, // Percentage of SPACE_WIDTH for obstacle X placement (0-1)
  OBSTACLE_SPAWN_Y_RANGE: 0.9, // Percentage of SPACE_HEIGHT for obstacle Y placement (0-1)
  OBSTACLE_SPAWN_Z_RANGE: 50, // Depth range ahead for obstacle spawning
  OBSTACLE_SPAWN_CHANCE: 0.8, // Chance of spawning an obstacle at each interval (0-1)
  OBSTACLE_COLLISION_RADIUS: 2.5, // Increased to 2.5 for more reliable detection (was 2.0)

  // Camera
  CAMERA_FOV: 75, // Field of view
  CAMERA_NEAR: 0.1, // Near clipping plane
  CAMERA_FAR: 2000, // Far clipping plane
  CAMERA_Y_OFFSET: 6, // Height above rocket
  CAMERA_Z_OFFSET: 8, // Distance behind rocket

  // Movement
  MAX_LATERAL_SPEED: 0.6, // Max speed side-to-side (X)
  MAX_VERTICAL_SPEED: 0.6, // Max speed up/down (Y)
  BOOST_SPEED: 1.2, // Additional speed during boost (Z)
  FORWARD_SPEED: 0.6, // Base forward speed (Z, automatic)
  ACCELERATION: 0.015, // Rate of acceleration (lateral and vertical)
  FRICTION: 0.90, // Slowdown factor for lateral and vertical
  LATERAL_BOUNDS: 10.0, // Increased to 10.0 (half of SPACE_WIDTH) for wider movement
  VERTICAL_BOUNDS: 7.5, // Increased to 7.5 (half of SPACE_HEIGHT) for taller movement

  // Gameplay
  OBSTACLE_SPAWN_LIMIT: 5, // Max obstacles on screen
  COIN_SPAWN_LIMIT: 10, // Max coin groups on screen
  SPAWN_INTERVAL: 100, // Z distance between spawns
  DESPAWN_DISTANCE: 20, // Distance behind rocket to despawn

  // Skydome Controllers
  SKYDOME_RADIUS: 1900, // Slightly less than CAMERA_FAR for visibility
  SKYDOME_TEXTURE_PATH: "/textures/space_texture.jpg", // Path to your space texture in public folder
  SKYDOME_ROTATION_SPEED_X: 0.0001, // Rotation speed around X-axis
  SKYDOME_ROTATION_SPEED_Y: 0.0002, // Rotation speed around Y-axis
  SKYDOME_ROTATION_SPEED_Z: 0.00005, // Rotation speed around Z-axis
  SKYDOME_BRIGHTNESS: 1.5, // Multiplier for texture brightness
};