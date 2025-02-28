// racingscene.js
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

// RacingScene component renders the 3D racing game scene using Three.js
function RacingScene({ score, setScore, setHealth, health, endGame, gameState }) {
  // Refs for managing Three.js objects and game state
  const mountRef = useRef(null); // DOM element to mount the renderer
  const animationFrameId = useRef(null); // ID for animation frame to clean up on unmount
  const sceneRef = useRef(null); // Reference to the Three.js scene
  const rocketGroupRef = useRef(null); // Reference to the rocket object group
  const obstaclesRef = useRef([]); // Array to store obstacle references
  const coinsRef = useRef([]); // Array to store coin references
  const roadSegmentsRef = useRef([]); // Array to store road segment references
  const rendererRef = useRef(null); // Reference to the Three.js renderer
  const cameraRef = useRef(null); // Reference to the Three.js camera
  const isInitialized = useRef(false); // Flag to prevent multiple initializations
  const controlsRef = useRef({ left: false, right: false, boost: false }); // Player controls state
  const speedRef = useRef({ lateral: 0, forward: 0.5, boost: 0 }); // Movement speed state
  const nextSpawnZRef = useRef(-100); // Z position for next obstacle/coin spawn
  const prevGameStateRef = useRef(null); // Tracks previous game state for transitions
  const particlesRef = useRef({
    normal: [], // Normal exhaust particles
    boost: [], // Boost exhaust particles
    coin: [], // Coin collection particles
    collision: [], // Collision particles
  });
  const modelLoadedRef = useRef(false); // Tracks when the rocket model is loaded

  // Configuration object for all game parameters
  const CONFIG = {
    // Texture properties for glossy look (applied to all objects using glossyMaterialProps)
    TEXTURE_ROUGHNESS: 0.01, // Controls surface smoothness (0 = ultra smooth, 1 = rough)
    TEXTURE_METALNESS: 0.7, // Controls metallic appearance (0 = non-metal, 1 = full metal)
    TEXTURE_REFLECTIVITY: 1.0, // Controls reflection strength (0 = none, 1 = full)
    TEXTURE_CLEARCOAT: 1.0, // Adds glossy top layer (0 = none, 1 = full)
    TEXTURE_CLEARCOAT_ROUGHNESS: 0.05, // Roughness of clearcoat layer (0 = smooth, 1 = rough)

    // Colors
    ROAD_COLOR: 0x10002b, // Dark gray for road
    BORDER_COLOR: 0x7b2cbf, // Lighter gray for borders
    LINE_COLOR: 0x9d4edd, // White for road lines
    ROCKET_COLOR: 0x9966ff, // Purple for ship body
    EXHAUST_COLOR: 0x663399, // Dark purple for exhaust
    PILOT_AREA_COLOR: 0xffffff, // White for pilot area
    BACKGROUND_COLOR: 0x000022, // Deep space blue background
    DRUM_COLOR: 0x4682b4, // Steel blue for drums
    BOX_COLOR: 0x8b4513, // Brown for boxes

    // Coin Controllers
    COIN_COLOR: 0xFFD700, // Golden color for coins
    COIN_BORDER_COLOR: 0xB8860B, // Darker gold for coin border
    COIN_RADIUS: 0.8, // Radius of coins
    COIN_THICKNESS: 0.2, // Thickness of coins
    COIN_SIZE: 1.2, // Scale factor for coin size
    COIN_BORDER_THICKNESS: 0.1, // Thickness of the coin border
    COIN_POSITION_Y: 0.6, // Height above road (floating, was 0.5)
    COIN_POSITION_X_OFFSET: 0.25, // Lateral offset multiplier (0-1) from road center
    COIN_POSITION_Z_START_OFFSET: -60, // Starting Z offset from spawn point
    COIN_ROW_SPACING: 2.5, // Distance between coins in a row
    COIN_ROW_MIN_COUNT: 5, // Minimum number of coins in a row
    COIN_ROW_MAX_COUNT: 10, // Maximum number of coins in a row
    COIN_SPAWN_CHANCE_LEFT: 0.5, // Probability of spawning on left side (0-1)
    COIN_FLOAT_AMPLITUDE: 0, // Vertical float animation amplitude
    COIN_FLOAT_SPEED: 0, // Speed of float animation (radians per second)

    // Ship Controllers (Updated for OBJ model)
    SHIP_OBJ_PATH: "/models/raptor.obj", // Path to the OBJ file in public folder
    SHIP_TARGET_LENGTH: 6.0, // Desired length of the ship
    SHIP_TARGET_WIDTH: 3.0, // Desired width of the ship
    SHIP_TARGET_HEIGHT: 1.2, // Desired height of the ship
    SHIP_POSITION_Y: 2.0, // Vertical offset above the road
    SHIP_ROTATION_X: Math.PI / 2, // Rotation around X-axis (adjust based on model orientation)
    SHIP_ROTATION_Y: 0, // Rotation around Y-axis
    SHIP_ROTATION_Z: 0, // Rotation around Z-axis

    // Exhaust Particle Position Offsets
    EXHAUST_OFFSET_X: 0.0, // X offset from ship center for exhaust particles
    EXHAUST_OFFSET_Y: 0.0, // Y offset from ship base for exhaust particles
    EXHAUST_OFFSET_Z: 5.5, // Z offset from ship center (negative = rear, based on SHIP_TARGET_LENGTH / 2)

    // Previous Ship Controllers (kept for reference, not used with OBJ)
    SHIP_LENGTH: 4.0, // Total length of the jet from nose to tail
    SHIP_WIDTH: 2.0, // Maximum width of the jet (midsection)
    SHIP_HEIGHT: 0.8, // Height of the jet (low profile)
    SHIP_NOSE_LENGTH: 1.0, // Length of the nose section
    SHIP_NOSE_WIDTH: 0.4, // Width of the nose (narrow)
    EXHAUST_SIZE: 0.5, // Diameter of the single exhaust
    PILOT_AREA_WIDTH: 0.6, // Width of the pilot area
    PILOT_AREA_HEIGHT: 0.3, // Height of the pilot area (canopy)
    PILOT_AREA_LENGTH: 0.8, // Length of the pilot area

    // Custom Lighting Controllers
    LIGHT_INTENSITY: 4.0, // Global light intensity multiplier
    AMBIENT_LIGHT_COLOR: 0x404040, // Dim gray ambient light for subtle base illumination
    AMBIENT_LIGHT_INTENSITY: 0.3, // Low intensity to avoid washing out glossiness
    POINT_LIGHT_COLOR: 0xffffff, // White point light to highlight rocket
    POINT_LIGHT_INTENSITY: 5.0, // Strong intensity for rocket shine
    POINT_LIGHT_DISTANCE: 20, // Distance of point light effect
    POINT_LIGHT_DECAY: 2, // Decay rate for point light falloff
    SPOT_LIGHT_COLOR: 0xffffff, // White spot light for strong illumination and shadows
    SPOT_LIGHT_INTENSITY: 3.0, // High intensity for glossy reflections
    SPOT_LIGHT_ANGLE: Math.PI / 4, // Angle of spot light cone
    SPOT_LIGHT_PENUMBRA: 0.2, // Soft edge of spot light
    SPOT_LIGHT_DISTANCE: 50, // Distance of spot light effect
    SPOT_LIGHT_POSITION_Y: 20, // Height of spot light above scene
    DIR_LIGHT_COLOR: 0xaaaaaa, // Soft white directional light for space glow
    DIR_LIGHT_INTENSITY: 1.5, // Moderate intensity for broad illumination
    DIR_LIGHT_POSITION_X: 10, // X position of directional light
    DIR_LIGHT_POSITION_Y: 15, // Y position of directional light
    DIR_LIGHT_POSITION_Z: 10, // Z position of directional light
    SHADOW_BIAS: -0.0001, // Shadow bias for cleaner shadows
    SHADOW_MAP_SIZE: 2048, // Resolution of shadow map for sharpness

    // Starfield controllers
    STAR_COUNT: 5000, // Total number of stars
    STAR_RANGE: 5000, // Range of starfield in all directions
    STAR_SIZE: 2, // Size of star particles
    STAR_REPEAT_DISTANCE: 1000, // Distance at which stars repeat (like road segments)

    // Particle effect properties
    NORMAL_PARTICLE_COLOR: 0x9966ff, // Purple for normal movement (matches ship)
    NORMAL_PARTICLE_SIZE: 0.2, // Small size for subtle effect
    NORMAL_PARTICLE_COUNT: 20, // Number of particles per frame for normal movement
    NORMAL_PARTICLE_LIFETIME: 0.3, // Short lifetime for quick fade
    BOOST_PARTICLE_COLOR: 0xff4500, // Orange-red for boost trail
    BOOST_PARTICLE_SIZE: 0.3, // Size of boost particles
    BOOST_PARTICLE_COUNT: 20, // Number of particles per frame
    BOOST_PARTICLE_LIFETIME: 0.5, // Lifetime in seconds
    COIN_PARTICLE_COLOR: 0xffff00, // Yellow for coin sparkles
    COIN_PARTICLE_SIZE: 0.3, // Size of coin particles
    COIN_PARTICLE_COUNT: 15, // Number of particles per collection
    COIN_PARTICLE_LIFETIME: 0.8, // Lifetime in seconds
    COLLISION_PARTICLE_COLOR: 0xff0000, // Red for collision burst
    COLLISION_PARTICLE_SIZE: 0.4, // Size of collision particles
    COLLISION_PARTICLE_COUNT: 30, // Number of particles per collision
    COLLISION_PARTICLE_LIFETIME: 1.0, // Lifetime in seconds

    // Sizes
    ROAD_WIDTH: 14, // Width of the road
    ROAD_LENGTH: 300, // Length of each road segment
    BORDER_WIDTH: 0.7, // Width of road borders
    BORDER_HEIGHT: 1, // Height of road borders
    DRUM_RADIUS: 1.5, // Radius of drum obstacles
    DRUM_HEIGHT: 3, // Height of drum obstacles
    BOX_SIZE: 3, // Size of box obstacles (cube)

    // Camera
    CAMERA_FOV: 75, // Field of view
    CAMERA_NEAR: 0.1, // Near clipping plane
    CAMERA_FAR: 1000, // Far clipping plane
    CAMERA_Y_OFFSET: 8, // Height above rocket
    CAMERA_Z_OFFSET: 10, // Distance behind rocket

    // Movement
    MAX_LATERAL_SPEED: 0.3, // Max speed side-to-side
    BOOST_SPEED: 0.9, // Speed during boost
    FORWARD_SPEED: 0.6, // Base forward speed
    ACCELERATION: 0.005, // Rate of lateral acceleration
    FRICTION: 0.92, // Slowdown factor
    LATERAL_BOUNDS: 6.5, // Max X position (adjusted for road width)

    // Gameplay
    OBSTACLE_SPAWN_LIMIT: 5, // Max obstacles on screen
    COIN_SPAWN_LIMIT: 10, // Max coins on screen
    SPAWN_INTERVAL: 100, // Z distance between spawns
    DESPAWN_DISTANCE: 20, // Distance behind rocket to despawn
  };

  // Function to define glossy material properties with environment map for reflections
  const glossyMaterialProps = (envMap) => ({
    metalness: CONFIG.TEXTURE_METALNESS,
    roughness: CONFIG.TEXTURE_ROUGHNESS,
    reflectivity: CONFIG.TEXTURE_REFLECTIVITY,
    clearcoat: CONFIG.TEXTURE_CLEARCOAT,
    clearcoatRoughness: CONFIG.TEXTURE_CLEARCOAT_ROUGHNESS,
    envMap,
  });

  // Function to create a road segment with borders and a center line
  const createRoadSegment = (zOffset) => {
    const scene = sceneRef.current;
    // Create road plane
    const roadGeometry = new THREE.PlaneGeometry(CONFIG.ROAD_WIDTH, CONFIG.ROAD_LENGTH, 1, 1);
    const roadMaterial = new THREE.MeshPhysicalMaterial({
      color: CONFIG.ROAD_COLOR,
      ...glossyMaterialProps(scene.environment),
    });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2; // Rotate to lie flat
    road.position.z = zOffset; // Position along Z-axis
    road.receiveShadow = true; // Enable shadow reception
    scene.add(road);

    // Create road borders
    const borderGeometry = new THREE.BoxGeometry(CONFIG.BORDER_WIDTH, CONFIG.BORDER_HEIGHT, CONFIG.ROAD_LENGTH);
    const borderMaterial = new THREE.MeshPhysicalMaterial({
      color: CONFIG.BORDER_COLOR,
      ...glossyMaterialProps(scene.environment),
    });
    const leftBorder = new THREE.Mesh(borderGeometry, borderMaterial);
    const rightBorder = new THREE.Mesh(borderGeometry, borderMaterial);
    leftBorder.position.set(-CONFIG.ROAD_WIDTH / 2, CONFIG.BORDER_HEIGHT / 2, zOffset); // Left side
    rightBorder.position.set(CONFIG.ROAD_WIDTH / 2, CONFIG.BORDER_HEIGHT / 2, zOffset); // Right side
    leftBorder.castShadow = true; // Enable shadow casting
    rightBorder.castShadow = true;
    scene.add(leftBorder, rightBorder);

    // Create center line
    const lineGeometry = new THREE.PlaneGeometry(0.3, CONFIG.ROAD_LENGTH);
    const lineMaterial = new THREE.MeshPhongMaterial({ color: CONFIG.LINE_COLOR });
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.rotation.x = -Math.PI / 2; // Rotate to lie flat
    line.position.z = zOffset;
    line.position.y = 0.01; // Slightly above road to avoid z-fighting
    scene.add(line);

    return { road, leftBorder, rightBorder, line }; // Return segment components
  };

  // Reset the game state when starting or restarting
  const resetGameState = () => {
    const scene = sceneRef.current;
    const rocketGroup = rocketGroupRef.current;

    // Remove all obstacles from the scene
    obstaclesRef.current.forEach((obstacle) => scene.remove(obstacle));
    obstaclesRef.current = [];

    // Remove all coins from the scene
    coinsRef.current.forEach((coin) => scene.remove(coin));
    coinsRef.current = [];

    // Clear all particle effects
    Object.values(particlesRef.current).forEach((particleList) => {
      particleList.forEach((particle) => scene.remove(particle.mesh));
      particleList.length = 0;
    });

    // Reset rocket position and rotation
    rocketGroup.position.set(0, CONFIG.SHIP_POSITION_Y, 0);
    rocketGroup.rotation.set(CONFIG.SHIP_ROTATION_X, CONFIG.SHIP_ROTATION_Y, CONFIG.SHIP_ROTATION_Z);
    speedRef.current = { lateral: 0, forward: CONFIG.FORWARD_SPEED, boost: 0 }; // Reset speeds
    controlsRef.current = { left: false, right: false, boost: false }; // Reset controls

    // Remove old road segments
    roadSegmentsRef.current.forEach((segment) =>
      scene.remove(segment.road, segment.leftBorder, segment.rightBorder, segment.line)
    );
    roadSegmentsRef.current = [];
    const segmentsAhead = 3; // Number of segments ahead and behind
    // Generate initial road segments
    for (let i = -segmentsAhead; i <= segmentsAhead; i++) {
      roadSegmentsRef.current.push(createRoadSegment(i * CONFIG.ROAD_LENGTH));
    }

    nextSpawnZRef.current = -CONFIG.SPAWN_INTERVAL; // Reset spawn position
  };

  // Update starfield positions to create an infinite scrolling effect
  const updateStars = (rocketZ, starField) => {
    starField.children.forEach((stars) => {
      const positions = stars.geometry.attributes.position.array;
      for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
        const i3 = i * 3;
        let z = positions[i3 + 2];
        // Reposition stars that move out of range
        if (z > rocketZ + CONFIG.STAR_REPEAT_DISTANCE / 2) {
          z -= CONFIG.STAR_REPEAT_DISTANCE;
          positions[i3] = (Math.random() - 0.5) * CONFIG.STAR_RANGE; // Random X
          positions[i3 + 1] = (Math.random() - 0.5) * CONFIG.STAR_RANGE; // Random Y
          positions[i3 + 2] = z;
        } else if (z < rocketZ - CONFIG.STAR_REPEAT_DISTANCE / 2) {
          z += CONFIG.STAR_REPEAT_DISTANCE;
          positions[i3] = (Math.random() - 0.5) * CONFIG.STAR_RANGE;
          positions[i3 + 1] = (Math.random() - 0.5) * CONFIG.STAR_RANGE;
          positions[i3 + 2] = z;
        }
      }
      stars.geometry.attributes.position.needsUpdate = true; // Update star positions
    });
  };

  // Create particle effects for exhaust, boost, coins, and collisions
  const createParticles = (count, color, size, lifetime, position, velocities) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3); // Position array for particles
    const velocitiesArray = new Float32Array(count * 3); // Velocity array for movement
    const lifetimes = []; // Lifetime array for each particle

    // Initialize particle properties
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = position.x + (Math.random() - 0.5) * 0.5; // Random X offset
      positions[i3 + 1] = position.y + (Math.random() - 0.5) * 0.5; // Random Y offset
      positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.5; // Random Z offset
      velocitiesArray[i3] = velocities.x + (Math.random() - 0.5) * 0.2; // Random X velocity
      velocitiesArray[i3 + 1] = velocities.y + (Math.random() - 0.5) * 0.2; // Random Y velocity
      velocitiesArray[i3 + 2] = velocities.z + (Math.random() - 0.5) * 0.2; // Random Z velocity
      lifetimes[i] = lifetime * (0.5 + Math.random() * 0.5); // Vary lifetime slightly
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color, // Particle color
      size, // Particle size
      sizeAttenuation: true, // Size reduces with distance
      transparent: true, // Enable transparency
      opacity: 1.0, // Initial opacity
    });
    const particles = new THREE.Points(geometry, material);
    sceneRef.current.add(particles);

    return { mesh: particles, velocities: velocitiesArray, lifetimes, initialLifetimes: [...lifetimes] };
  };

  // Update particle positions and lifetimes
  const updateParticles = (particles, type, deltaTime) => {
    const positions = particles.mesh.geometry.attributes.position.array;
    const toRemove = []; // Indices of particles to remove

    // Update each particle
    for (let i = 0; i < particles.lifetimes.length; i++) {
      const i3 = i * 3;
      particles.lifetimes[i] -= deltaTime; // Decrease lifetime
      if (particles.lifetimes[i] <= 0) {
        toRemove.push(i); // Mark for removal if lifetime ends
        continue;
      }

      // Update position based on velocity
      positions[i3] += particles.velocities[i3] * deltaTime * 10;
      positions[i3 + 1] += particles.velocities[i3 + 1] * deltaTime * 10;
      positions[i3 + 2] += particles.velocities[i3 + 2] * deltaTime * 10;

      const alpha = particles.lifetimes[i] / particles.initialLifetimes[i]; // Calculate fade
      particles.mesh.material.opacity = Math.max(0, alpha); // Fade out
    }

    particles.mesh.geometry.attributes.position.needsUpdate = true; // Update positions

    // Remove expired particles
    if (toRemove.length > 0) {
      toRemove.reverse().forEach((index) => {
        for (let j = 0; j < 3; j++) {
          positions[index * 3 + j] = positions[(particles.lifetimes.length - 1) * 3 + j];
          particles.velocities[index * 3 + j] =
            particles.velocities[(particles.lifetimes.length - 1) * 3 + j];
        }
        particles.lifetimes[index] = particles.lifetimes[particles.lifetimes.length - 1];
        particles.initialLifetimes[index] =
          particles.initialLifetimes[particles.lifetimes.length - 1];
        particles.lifetimes.pop();
        particles.initialLifetimes.pop();
      });
      if (particles.lifetimes.length === 0) {
        sceneRef.current.remove(particles.mesh); // Remove particle system if empty
        particles.mesh.geometry.dispose();
        particles.mesh.material.dispose();
        const particleIndex = particlesRef.current[type].indexOf(particles);
        if (particleIndex !== -1) {
          particlesRef.current[type].splice(particleIndex, 1); // Remove from ref
        }
      }
    }
  };

  // Main useEffect hook for scene setup and animation
  useEffect(() => {
    // Prevent multiple initializations
    if (!isInitialized.current) {
      isInitialized.current = true;

      // Initialize Three.js scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      scene.background = new THREE.Color(CONFIG.BACKGROUND_COLOR); // Set background color

      // Set up camera
      const camera = new THREE.PerspectiveCamera(
        CONFIG.CAMERA_FOV,
        window.innerWidth / window.innerHeight,
        CONFIG.CAMERA_NEAR,
        CONFIG.CAMERA_FAR
      );
      cameraRef.current = camera;
      camera.position.set(0, CONFIG.SHIP_POSITION_Y + CONFIG.CAMERA_Y_OFFSET, CONFIG.CAMERA_Z_OFFSET); // Initial camera position
      camera.lookAt(0, CONFIG.SHIP_POSITION_Y, 0); // Look at rocket

      // Set up renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true; // Enable shadows
      renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadow type
      rendererRef.current = renderer;
      const mount = mountRef.current;
      if (mount) {
        mount.appendChild(renderer.domElement); // Attach renderer to DOM
      }

      // Add environment map for reflections
      const envTexture = new THREE.TextureLoader().load(
        "https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr"
      );
      envTexture.mapping = THREE.EquirectangularReflectionMapping;
      envTexture.colorSpace = THREE.SRGBColorSpace;
      scene.environment = envTexture; // Apply environment map

      // Add ambient light
      const ambientLight = new THREE.AmbientLight(
        CONFIG.AMBIENT_LIGHT_COLOR,
        CONFIG.AMBIENT_LIGHT_INTENSITY * CONFIG.LIGHT_INTENSITY
      );
      scene.add(ambientLight);

      // Add point light for rocket
      const pointLight = new THREE.PointLight(
        CONFIG.POINT_LIGHT_COLOR,
        CONFIG.POINT_LIGHT_INTENSITY * CONFIG.LIGHT_INTENSITY,
        CONFIG.POINT_LIGHT_DISTANCE,
        CONFIG.POINT_LIGHT_DECAY
      );
      pointLight.position.set(0, 5, 0); // Position above rocket
      scene.add(pointLight);

      // Add spotlight for shadows and gloss
      const spotLight = new THREE.SpotLight(
        CONFIG.SPOT_LIGHT_COLOR,
        CONFIG.SPOT_LIGHT_INTENSITY * CONFIG.LIGHT_INTENSITY,
        CONFIG.SPOT_LIGHT_DISTANCE,
        CONFIG.SPOT_LIGHT_ANGLE,
        CONFIG.SPOT_LIGHT_PENUMBRA
      );
      spotLight.position.set(0, CONFIG.SPOT_LIGHT_POSITION_Y, 0); // High above scene
      spotLight.castShadow = true; // Enable shadow casting
      spotLight.shadow.bias = CONFIG.SHADOW_BIAS;
      spotLight.shadow.mapSize.width = CONFIG.SHADOW_MAP_SIZE;
      spotLight.shadow.mapSize.height = CONFIG.SHADOW_MAP_SIZE;
      scene.add(spotLight);

      // Add directional light for broad illumination
      const dirLight = new THREE.DirectionalLight(
        CONFIG.DIR_LIGHT_COLOR,
        CONFIG.DIR_LIGHT_INTENSITY * CONFIG.LIGHT_INTENSITY
      );
      dirLight.position.set(CONFIG.DIR_LIGHT_POSITION_X, CONFIG.DIR_LIGHT_POSITION_Y, CONFIG.DIR_LIGHT_POSITION_Z);
      scene.add(dirLight);

      // Create starfield
      const starField = new THREE.Group();
      const starGeometry = new THREE.BufferGeometry();
      const starPositions = new Float32Array(CONFIG.STAR_COUNT * 3);
      const starColors = new Float32Array(CONFIG.STAR_COUNT * 3);
      const starMaterials = [
        new THREE.PointsMaterial({ color: 0xffffff, size: CONFIG.STAR_SIZE, sizeAttenuation: true }), // White stars
        new THREE.PointsMaterial({ color: 0xffff00, size: CONFIG.STAR_SIZE, sizeAttenuation: true }), // Yellow stars
        new THREE.PointsMaterial({ color: 0xff0000, size: CONFIG.STAR_SIZE, sizeAttenuation: true }), // Red stars
        new THREE.PointsMaterial({ color: 0x0000ff, size: CONFIG.STAR_SIZE, sizeAttenuation: true }), // Blue stars
      ];
      for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
        const i3 = i * 3;
        starPositions[i3] = (Math.random() - 0.5) * CONFIG.STAR_RANGE; // Random X
        starPositions[i3 + 1] = (Math.random() - 0.5) * CONFIG.STAR_RANGE; // Random Y
        starPositions[i3 + 2] = (Math.random() - 0.5) * CONFIG.STAR_RANGE; // Random Z
        const rand = Math.random();
        let color;
        if (rand < 0.7) color = new THREE.Color(0xffffff); // 70% white
        else if (rand < 0.8) color = new THREE.Color(0xffff00); // 10% yellow
        else if (rand < 0.9) color = new THREE.Color(0xff0000); // 10% red
        else color = new THREE.Color(0x0000ff); // 10% blue
        starColors[i3] = color.r;
        starColors[i3 + 1] = color.g;
        starColors[i3 + 2] = color.b;
      }
      starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
      starField.add(
        new THREE.Points(starGeometry, starMaterials[0]),
        new THREE.Points(starGeometry.clone(), starMaterials[1]),
        new THREE.Points(starGeometry.clone(), starMaterials[2]),
        new THREE.Points(starGeometry.clone(), starMaterials[3])
      );
      scene.add(starField);

      // Create rocket group for OBJ model
      const rocketGroup = new THREE.Group();
      rocketGroupRef.current = rocketGroup;

      // Load rocket OBJ model
      const objLoader = new OBJLoader();
      objLoader.load(
        CONFIG.SHIP_OBJ_PATH,
        (obj) => {
          obj.traverse((child) => {
            if (child.isMesh) {
              child.material = new THREE.MeshPhysicalMaterial({
                color: CONFIG.ROCKET_COLOR,
                ...glossyMaterialProps(scene.environment),
              });
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          const box = new THREE.Box3().setFromObject(obj);
          const size = new THREE.Vector3();
          box.getSize(size);
          console.log("Raw model size:", size); // Log raw dimensions

          // Scale model to target dimensions
          const scaleX = CONFIG.SHIP_TARGET_WIDTH / size.x;
          const scaleY = CONFIG.SHIP_TARGET_HEIGHT / size.y;
          const scaleZ = CONFIG.SHIP_TARGET_LENGTH / size.z;
          const uniformScale = Math.min(scaleX, scaleY, scaleZ);
          obj.scale.set(uniformScale, uniformScale, uniformScale);

          // Center and position model
          const center = new THREE.Vector3();
          box.getCenter(center);
          obj.position.sub(center.multiplyScalar(uniformScale));
          obj.position.y = CONFIG.SHIP_POSITION_Y;

          obj.rotation.set(CONFIG.SHIP_ROTATION_X, CONFIG.SHIP_ROTATION_Y, CONFIG.SHIP_ROTATION_Z); // Apply rotation

          rocketGroup.add(obj);
          rocketGroup.position.set(0, CONFIG.SHIP_POSITION_Y, 0);
          rocketGroup.castShadow = true;
          scene.add(rocketGroup);

          // Initialize road segments
          const segmentsAhead = 3;
          for (let i = -segmentsAhead; i <= segmentsAhead; i++) {
            roadSegmentsRef.current.push(createRoadSegment(i * CONFIG.ROAD_LENGTH));
          }

          modelLoadedRef.current = true; // Mark model as loaded
        },
        (xhr) => console.log((xhr.loaded / xhr.total) * 100 + "% loaded"), // Loading progress
        (error) => console.error("Error loading OBJ model:", error) // Error handling
      );
    }

    // References to scene elements for animation
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const rocketGroup = rocketGroupRef.current;
    let obstacles = obstaclesRef.current;
    let coins = coinsRef.current;
    let roadSegments = roadSegmentsRef.current;
    const segmentLength = CONFIG.ROAD_LENGTH;

    // Reset game state on start or game over
    if (
      gameState === "playing" &&
      (prevGameStateRef.current === "start" || prevGameStateRef.current === "gameover") &&
      modelLoadedRef.current
    ) {
      resetGameState();
    }
    prevGameStateRef.current = gameState;

    // Spawn obstacles (drums or boxes)
    const spawnObstacle = (zBase) => {
      const xPos = (Math.random() - 0.5) * (CONFIG.ROAD_WIDTH - 2); // Random X position within road
      const type = Math.random() < 0.5 ? "drum" : "box"; // Randomly choose type
      let obstacle;

      if (type === "drum") {
        const drumGeometry = new THREE.CylinderGeometry(
          CONFIG.DRUM_RADIUS,
          CONFIG.DRUM_RADIUS,
          CONFIG.DRUM_HEIGHT,
          32
        );
        const drumMaterial = new THREE.MeshPhysicalMaterial({
          color: CONFIG.DRUM_COLOR,
          ...glossyMaterialProps(scene.environment),
        });
        obstacle = new THREE.Mesh(drumGeometry, drumMaterial);
        obstacle.position.set(xPos, CONFIG.DRUM_HEIGHT / 2, zBase - Math.random() * 50); // Random Z offset
      } else {
        const boxGeometry = new THREE.BoxGeometry(CONFIG.BOX_SIZE, CONFIG.BOX_SIZE, CONFIG.BOX_SIZE);
        const boxMaterial = new THREE.MeshPhysicalMaterial({
          color: CONFIG.BOX_COLOR,
          ...glossyMaterialProps(scene.environment),
        });
        obstacle = new THREE.Mesh(boxGeometry, boxMaterial);
        obstacle.position.set(xPos, CONFIG.BOX_SIZE / 2, zBase - Math.random() * 50);
      }

      obstacle.rotation.y = Math.random() * Math.PI; // Random rotation
      obstacle.castShadow = true;
      scene.add(obstacle);
      obstacles.push(obstacle);
    };

    // Geometry and material for coins (reused for efficiency)
    const coinGeometry = new THREE.CylinderGeometry(
      CONFIG.COIN_RADIUS * CONFIG.COIN_SIZE,
      CONFIG.COIN_RADIUS * CONFIG.COIN_SIZE,
      CONFIG.COIN_THICKNESS * CONFIG.COIN_SIZE,
      32
    );
    const coinMaterial = new THREE.MeshPhysicalMaterial({
      color: CONFIG.COIN_COLOR,
      ...glossyMaterialProps(scene.environment), // Shiny glossy material like the ship
    });
    // Coin border geometry and material
    const coinBorderGeometry = new THREE.CylinderGeometry(
      CONFIG.COIN_RADIUS * CONFIG.COIN_SIZE + CONFIG.COIN_BORDER_THICKNESS,
      CONFIG.COIN_RADIUS * CONFIG.COIN_SIZE + CONFIG.COIN_BORDER_THICKNESS,
      CONFIG.COIN_THICKNESS * CONFIG.COIN_SIZE * 0.5, // Thinner than coin body
      32
    );
    const coinBorderMaterial = new THREE.MeshPhysicalMaterial({
      color: CONFIG.COIN_BORDER_COLOR,
      ...glossyMaterialProps(scene.environment),
    });

    // Spawn coins in a row (Temple Run style) with floating effect
    const spawnCoins = (zBase) => {
      const coinCount = Math.floor(Math.random() * (CONFIG.COIN_ROW_MAX_COUNT - CONFIG.COIN_ROW_MIN_COUNT + 1)) + CONFIG.COIN_ROW_MIN_COUNT;
      const side = Math.random() < CONFIG.COIN_SPAWN_CHANCE_LEFT ? -1 : 1; // Left or right based on chance
      const xPos = side * (CONFIG.ROAD_WIDTH * CONFIG.COIN_POSITION_X_OFFSET); // X position with offset
      const startZ = zBase + CONFIG.COIN_POSITION_Z_START_OFFSET; // Starting Z position

      for (let i = 0; i < coinCount; i++) {
        const coinGroup = new THREE.Group(); // Group for coin and border
        const coin = new THREE.Mesh(coinGeometry, coinMaterial);
        const coinBorder = new THREE.Mesh(coinBorderGeometry, coinBorderMaterial);

        coin.position.y = CONFIG.COIN_POSITION_Y; // Base height above road
        coinBorder.position.y = CONFIG.COIN_POSITION_Y; // Align border with coin
        coin.rotation.x = Math.PI / 2; // Stand upright
        coinBorder.rotation.x = Math.PI / 2;

        coinGroup.add(coin, coinBorder);
        coinGroup.position.set(xPos, 0, startZ - i * CONFIG.COIN_ROW_SPACING); // Place in a row
        coinGroup.castShadow = true;
        coinGroup.userData = { baseY: CONFIG.COIN_POSITION_Y, timeOffset: Math.random() * Math.PI * 2 }; // For floating animation
        scene.add(coinGroup);
        coins.push(coinGroup);
      }
    };

    // Initial spawn when game starts
    let nextSpawnZ = nextSpawnZRef.current;
    if (gameState === "playing" && obstacles.length === 0 && coins.length === 0 && modelLoadedRef.current) {
      for (let i = 0; i < 3; i++) {
        spawnObstacle(nextSpawnZ); // Spawn initial obstacles
        spawnCoins(nextSpawnZ); // Spawn initial coins
        nextSpawnZ -= CONFIG.SPAWN_INTERVAL;
      }
      nextSpawnZRef.current = nextSpawnZ;
    }

    // Control and animation variables
    const controls = controlsRef.current;
    const speed = speedRef.current;
    let blinkCount = 0; // For rocket blink effect on collision
    const redMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff0000,
      ...glossyMaterialProps(scene.environment),
    });
    const rocketMaterial = new THREE.MeshPhysicalMaterial({
      color: CONFIG.ROCKET_COLOR,
      ...glossyMaterialProps(scene.environment),
    });

    // Keyboard controls
    const onKeyDown = (e) => {
      if (gameState !== "playing" || !modelLoadedRef.current) return;
      if (e.key === "ArrowLeft") controls.left = true;
      if (e.key === "ArrowRight") controls.right = true;
      if (e.key === " ") controls.boost = true;
    };
    const onKeyUp = (e) => {
      if (gameState !== "playing" || !modelLoadedRef.current) return;
      if (e.key === "ArrowLeft") controls.left = false;
      if (e.key === "ArrowRight") controls.right = false;
      if (e.key === " ") controls.boost = false;
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    // Animation loop
    let lastTime = performance.now();
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate); // Request next frame

      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000; // Time delta in seconds
      lastTime = currentTime;

      // Update camera position to follow rocket
      const targetPosition = modelLoadedRef.current
        ? rocketGroup.position
        : new THREE.Vector3(0, CONFIG.SHIP_POSITION_Y, 0);
      camera.position.set(
        targetPosition.x,
        targetPosition.y + CONFIG.CAMERA_Y_OFFSET,
        targetPosition.z + CONFIG.CAMERA_Z_OFFSET
      );
      camera.lookAt(targetPosition);

      // Render if model isn’t loaded yet
      if (!modelLoadedRef.current) {
        renderer.render(scene, camera);
        return;
      }

      // Game logic when playing
      if (gameState === "playing") {
        // Handle lateral movement
        if (controls.left) speed.lateral -= CONFIG.ACCELERATION;
        if (controls.right) speed.lateral += CONFIG.ACCELERATION;
        speed.lateral = Math.max(-CONFIG.MAX_LATERAL_SPEED, Math.min(CONFIG.MAX_LATERAL_SPEED, speed.lateral));
        speed.lateral *= CONFIG.FRICTION; // Apply friction
        speed.boost = controls.boost ? CONFIG.BOOST_SPEED : Math.max(0, speed.boost - 0.02); // Boost decay

        // Update rocket position
        rocketGroup.position.x += speed.lateral;
        rocketGroup.position.x = Math.max(-CONFIG.LATERAL_BOUNDS, Math.min(CONFIG.LATERAL_BOUNDS, rocketGroup.position.x));
        rocketGroup.position.z -= speed.forward + speed.boost; // Move forward

        // Tilt rocket based on lateral speed
        rocketGroup.rotation.z = -speed.lateral * 0.5;

        // Move point light with rocket
        const pointLight = scene.children.find((child) => child instanceof THREE.PointLight);
        if (pointLight) {
          pointLight.position.set(rocketGroup.position.x, rocketGroup.position.y + 5, rocketGroup.position.z);
        }

        // Generate exhaust particles
        const exhaustPos = new THREE.Vector3(
          rocketGroup.position.x + CONFIG.EXHAUST_OFFSET_X,
          rocketGroup.position.y + CONFIG.EXHAUST_OFFSET_Y,
          rocketGroup.position.z + CONFIG.EXHAUST_OFFSET_Z
        );
        const normalVelocities = new THREE.Vector3(0, 0, -0.5);
        const normalParticles = createParticles(
          CONFIG.NORMAL_PARTICLE_COUNT,
          CONFIG.NORMAL_PARTICLE_COLOR,
          CONFIG.NORMAL_PARTICLE_SIZE,
          CONFIG.NORMAL_PARTICLE_LIFETIME,
          exhaustPos,
          normalVelocities
        );
        particlesRef.current.normal.push(normalParticles);

        // Generate boost particles
        if (controls.boost) {
          const boostVelocities = new THREE.Vector3(0, 0, -1);
          const boostParticles = createParticles(
            CONFIG.BOOST_PARTICLE_COUNT,
            CONFIG.BOOST_PARTICLE_COLOR,
            CONFIG.BOOST_PARTICLE_SIZE,
            CONFIG.BOOST_PARTICLE_LIFETIME,
            exhaustPos,
            boostVelocities
          );
          particlesRef.current.boost.push(boostParticles);
        }

        // Infinite road generation
        const farthestZ = roadSegments[roadSegments.length - 1].road.position.z;
        if (rocketGroup.position.z < farthestZ + segmentLength) {
          const newZ = farthestZ - segmentLength;
          roadSegments.push(createRoadSegment(newZ)); // Add new segment ahead
        }
        const nearestZ = roadSegments[0].road.position.z;
        if (rocketGroup.position.z < nearestZ - segmentLength * 2) {
          const oldSegment = roadSegments.shift(); // Remove old segment behind
          scene.remove(oldSegment.road, oldSegment.leftBorder, oldSegment.rightBorder, oldSegment.line);
        }

        // Update coin floating animation
        coins.forEach((coinGroup) => {
          const floatOffset = Math.sin(currentTime * CONFIG.COIN_FLOAT_SPEED + coinGroup.userData.timeOffset) * CONFIG.COIN_FLOAT_AMPLITUDE;
          coinGroup.position.y = coinGroup.userData.baseY + floatOffset;
        });

        // Collision detection with obstacles
        const rocketBox = new THREE.Box3().setFromObject(rocketGroup).expandByScalar(0.2);
        obstacles.forEach((obstacle, i) => {
          const obstacleBox = new THREE.Box3().setFromObject(obstacle);
          if (rocketBox.intersectsBox(obstacleBox) && blinkCount === 0) {
            scene.remove(obstacle);
            obstacles.splice(i, 1); // Remove collided obstacle

            // Generate collision particles
            const collisionPosition = obstacle.position.clone();
            const collisionVelocities = new THREE.Vector3(0, 1, 0);
            const collisionParticles = createParticles(
              CONFIG.COLLISION_PARTICLE_COUNT,
              CONFIG.COLLISION_PARTICLE_COLOR,
              CONFIG.COLLISION_PARTICLE_SIZE,
              CONFIG.COLLISION_PARTICLE_LIFETIME,
              collisionPosition,
              collisionVelocities
            );
            particlesRef.current.collision.push(collisionParticles);

            // Update health and end game if necessary
            setHealth((prev) => {
              const newHealth = prev - 1;
              if (newHealth <= 0) {
                endGame(score); // Pass final score to endGame
                return 0;
              }
              blinkCount = 4; // Trigger blink effect
              return newHealth;
            });
          }
          // Despawn obstacles behind rocket
          if (obstacle.position.z > rocketGroup.position.z + CONFIG.DESPAWN_DISTANCE) {
            scene.remove(obstacle);
            obstacles.splice(i, 1);
          }
        });

        // Coin collection (no mid-game minting)
        coins.forEach((coinGroup, i) => {
          const coinBox = new THREE.Box3().setFromObject(coinGroup).expandByScalar(0.3);
          if (rocketBox.intersectsBox(coinBox)) {
            coinGroup.visible = false;
            scene.remove(coinGroup);
            coins.splice(i, 1); // Remove collected coin group
            setScore((prev) => prev + 10); // Increase score

            // Generate coin collection particles
            const coinPosition = coinGroup.position.clone();
            const coinVelocities = new THREE.Vector3(0, 0.5, 0);
            const coinParticles = createParticles(
              CONFIG.COIN_PARTICLE_COUNT,
              CONFIG.COIN_PARTICLE_COLOR,
              CONFIG.COIN_PARTICLE_SIZE,
              CONFIG.COIN_PARTICLE_LIFETIME,
              coinPosition,
              coinVelocities
            );
            particlesRef.current.coin.push(coinParticles);
          }
          // Despawn coins behind rocket
          if (coinGroup.position.z > rocketGroup.position.z + CONFIG.DESPAWN_DISTANCE) {
            coinGroup.visible = false;
            scene.remove(coinGroup);
            coins.splice(i, 1);
          }
        });

        // Blink effect on collision
        if (blinkCount > 0) {
          blinkCount--;
          const isRed = Math.floor(blinkCount / 2) % 2 === 0;
          rocketGroup.traverse((child) => {
            if (child.isMesh) child.material = isRed ? redMaterial : rocketMaterial; // Toggle color
          });
        } else {
          rocketGroup.traverse((child) => {
            if (child.isMesh) child.material = rocketMaterial; // Reset to normal
          });
        }

        // Spawn new obstacles and coins
        if (rocketGroup.position.z < nextSpawnZ + CONFIG.SPAWN_INTERVAL) {
          if (obstacles.length < CONFIG.OBSTACLE_SPAWN_LIMIT) spawnObstacle(nextSpawnZ);
          if (coins.length < CONFIG.COIN_SPAWN_LIMIT) spawnCoins(nextSpawnZ);
          nextSpawnZ -= CONFIG.SPAWN_INTERVAL;
          nextSpawnZRef.current = nextSpawnZ;
        }

        // Update all particle effects
        ["normal", "boost", "coin", "collision"].forEach((type) => {
          particlesRef.current[type].forEach((particles) => updateParticles(particles, type, deltaTime));
        });
      }

      // Update starfield
      const starField = scene.children.find(
        (child) => child.type === "Group" && child.children[0].type === "Points"
      );
      if (starField) updateStars(rocketGroup.position.z, starField);

      // Render the scene
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup on unmount
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); // Stop animation
    };
  }, [gameState, endGame, setScore, setHealth, health, score]); // Dependencies for useEffect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // CONFIG and internal functions (e.g., createRoadSegment) are omitted from dependencies
  // as they are constant or defined within the component and don’t change between renders

  return <div ref={mountRef} />; // Render the mount point for Three.js
}

export default RacingScene;