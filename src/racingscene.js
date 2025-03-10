// racingscene.js
// Manages the 3D environment and rendering for the racing game using Three.js.
// Integrates an infinite starfield with configurable spreads, a textured skydome, sound effects, and dynamic game logic.
// Updated to use time-based delta for consistent movement speed across varying refresh rates, while preserving original spawning logic.

import React, { useEffect, useRef } from "react"; // React hooks for component lifecycle and refs
import * as THREE from "three"; // THREE.js for 3D rendering
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"; // Loader for GLTF 3D models
// eslint-disable-next-line no-unused-vars
import { CONFIG, resetGameState, spawnObstacle, spawnCoins, updateShipMovement, handleCollisions, applyBlinkEffect, spawnNewObjects } from "./racingLogic"; // Game logic and config, suppress unused vars warning

// RacingScene component renders the 3D game scene and handles animation loop
function RacingScene({ score, setScore, setHealth, health, endGame, gameState, controlsRef, selectedShip }) {
  const mountRef = useRef(null);              // Ref to DOM element where renderer is mounted
  const animationFrameId = useRef(null);      // Stores animation frame ID for cleanup
  const sceneRef = useRef(null);              // Reference to the Three.js scene object
  const rocketGroupRef = useRef(null);        // Group containing the ship model for positioning and rotation
  const obstaclesRef = useRef([]);            // Array storing obstacle objects in the scene
  const coinsRef = useRef([]);                // Array storing coin group objects in the scene
  const trackLinesRef = useRef([]);           // Array storing track border line objects
  const rendererRef = useRef(null);           // Reference to the Three.js renderer
  const cameraRef = useRef(null);             // Reference to the Three.js camera
  const speedRef = useRef({ lateral: 0, boost: 0 }); // Object tracking ship speeds (lateral and boost)
  const nextSpawnZRef = useRef(-CONFIG.SPAWN_INTERVAL); // Next Z position for spawning objects ahead of ship
  const prevGameStateRef = useRef(null);      // Tracks previous game state to detect transitions
  const modelLoadedRef = useRef(false);       // Flag indicating if the ship model has loaded
  const originalMaterialsRef = useRef(new Map()); // Stores original materials for blink effect restoration
  const skydomeRef = useRef(null);            // Reference to the skydome mesh
  const isInitialStartRef = useRef(true);     // Flag for initial game start to reset properly
  const starsRef = useRef(null);              // Reference to starfield particles
  const engineSoundRef = useRef(null);        // Reference to engine sound audio object
  const lastTimeRef = useRef(performance.now()); // Tracks time of last frame for delta calculation

  // useEffect hook initializes the scene and manages its lifecycle
  useEffect(() => {
    console.log("RacingScene useEffect triggered with gameState:", gameState, "selectedShip:", selectedShip);

    // --- Scene Setup ---
    let scene = sceneRef.current || new THREE.Scene(); // Reuse or create a new scene
    sceneRef.current = scene;

    // --- Camera Setup ---
    const camera = cameraRef.current || new THREE.PerspectiveCamera(
      CONFIG.CAMERA_FOV,              // Field of view
      window.innerWidth / window.innerHeight, // Aspect ratio
      CONFIG.CAMERA_NEAR,             // Near clipping plane
      CONFIG.CAMERA_FAR               // Far clipping plane
    ); // Reuse or create a perspective camera
    cameraRef.current = camera;
    const shipConfig = CONFIG.SHIPS[selectedShip]; // Get configuration for the selected ship
    camera.position.set(
      CONFIG.CAMERA_X_OFFSET,         // Lateral offset from ship
      CONFIG.CAMERA_Y_OFFSET,         // Height above ship
      shipConfig.POSITION_Z + CONFIG.CAMERA_Z_OFFSET // Distance behind ship
    ); // Set initial camera position
    camera.rotation.set(CONFIG.CAMERA_PITCH, CONFIG.CAMERA_YAW, CONFIG.CAMERA_ROLL); // Set initial camera orientation

    // --- Renderer Setup ---
    const renderer = rendererRef.current || new THREE.WebGLRenderer({ antialias: true }); // Reuse or create renderer with antialiasing
    renderer.setSize(window.innerWidth, window.innerHeight); // Match renderer size to window
    renderer.shadowMap.enabled = true; // Enable shadow rendering
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows for better quality
    rendererRef.current = renderer;
    const mount = mountRef.current;
    if (mount && !mount.contains(renderer.domElement)) {
      mount.appendChild(renderer.domElement); // Attach renderer canvas to DOM if not already present
    }

    // --- Lighting Setup ---
    if (!scene.children.some(child => child instanceof THREE.AmbientLight)) {
      const ambientLight = new THREE.AmbientLight(
        CONFIG.AMBIENT_LIGHT_COLOR,    // Bluish ambient color
        CONFIG.AMBIENT_LIGHT_INTENSITY * CONFIG.LIGHT_INTENSITY // Adjusted intensity
      );
      scene.add(ambientLight); // Add ambient light to scene
    }
    if (!scene.children.some(child => child instanceof THREE.DirectionalLight)) {
      const dirLight = new THREE.DirectionalLight(
        CONFIG.DIR_LIGHT_COLOR,        // Warm white color
        CONFIG.DIR_LIGHT_INTENSITY * CONFIG.LIGHT_INTENSITY // Adjusted intensity
      );
      dirLight.position.set(
        CONFIG.DIR_LIGHT_POSITION_X,  // X position
        CONFIG.DIR_LIGHT_POSITION_Y,  // Y position (above)
        CONFIG.DIR_LIGHT_POSITION_Z   // Z position (behind)
      );
      dirLight.castShadow = true;     // Enable shadow casting
      dirLight.shadow.bias = CONFIG.SHADOW_BIAS; // Adjust shadow bias to reduce artifacts
      dirLight.shadow.mapSize.set(CONFIG.SHADOW_MAP_SIZE, CONFIG.SHADOW_MAP_SIZE); // High-res shadow map
      scene.add(dirLight); // Add directional light to scene
    }

    // --- Skydome Setup with Texture ---
    if (!skydomeRef.current) {
      const textureLoader = new THREE.TextureLoader();
      const skydomeTexture = textureLoader.load(CONFIG.SKYDOME_TEXTURE_PATH); // Load space background texture
      skydomeTexture.wrapS = THREE.RepeatWrapping; // Repeat texture horizontally
      skydomeTexture.wrapT = THREE.RepeatWrapping; // Repeat texture vertically
      const skydome = new THREE.Mesh(
        new THREE.SphereGeometry(CONFIG.SKYDOME_RADIUS, CONFIG.SKYDOME_SEGMENTS, CONFIG.SKYDOME_SEGMENTS), // Large sphere
        new THREE.MeshPhongMaterial({
          map: skydomeTexture,         // Apply texture
          color: CONFIG.SKYDOME_COLOR, // Fallback color
          emissive: CONFIG.SKYDOME_EMISSIVE, // Emissive color (none by default)
          emissiveIntensity: CONFIG.SKYDOME_EMISSIVE_INTENSITY, // Emissive intensity
          transparent: true,
          opacity: CONFIG.SKYDOME_OPACITY, // Full opacity
          side: THREE.BackSide         // Render inside of sphere for sky effect
        })
      );
      skydome.scale.set(CONFIG.SKYDOME_SCALE_X, CONFIG.SKYDOME_SCALE_Y, CONFIG.SKYDOME_SCALE_Z); // Apply scale
      scene.add(skydome);
      skydomeRef.current = skydome;
      console.log("Skydome initialized with texture:", CONFIG.SKYDOME_TEXTURE_PATH);
    }

    // --- Track Border Lines Setup ---
    if (!trackLinesRef.current.length) {
      const lineMaterial = new THREE.LineBasicMaterial({ color: CONFIG.TRACK_COLOR }); // White line material
      const leftLineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-CONFIG.TRACK_WIDTH / 2, shipConfig.POSITION_Y, -1000), // Start far behind
        new THREE.Vector3(-CONFIG.TRACK_WIDTH / 2, shipConfig.POSITION_Y, 1000)   // End far ahead
      ]); // Left track border
      const rightLineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(CONFIG.TRACK_WIDTH / 2, shipConfig.POSITION_Y, -1000),
        new THREE.Vector3(CONFIG.TRACK_WIDTH / 2, shipConfig.POSITION_Y, 1000)
      ]); // Right track border
      const leftLine = new THREE.Line(leftLineGeometry, lineMaterial);
      const rightLine = new THREE.Line(rightLineGeometry, lineMaterial);
      leftLine.scale.set(1, CONFIG.TRACK_LINE_THICKNESS, 1); // Thicken line visually
      rightLine.scale.set(1, CONFIG.TRACK_LINE_THICKNESS, 1);
      leftLine.visible = CONFIG.TRACK_LINES_VISIBLE; // Toggle visibility
      rightLine.visible = CONFIG.TRACK_LINES_VISIBLE;
      scene.add(leftLine);
      scene.add(rightLine);
      trackLinesRef.current = [leftLine, rightLine];
      console.log("Track lines initialized");
    }

    // --- Ship Setup ---
    let rocketGroup = rocketGroupRef.current || new THREE.Group(); // Reuse or create group for ship
    rocketGroupRef.current = rocketGroup;
    if (!scene.children.includes(rocketGroup)) {
      rocketGroup.position.set(shipConfig.POSITION_X, shipConfig.POSITION_Y, shipConfig.POSITION_Z); // Set initial position
      rocketGroup.rotation.set(shipConfig.ROTATION_X, 0, shipConfig.ROTATION_Z); // Apply only X and Z from config, Y handled by model
      scene.add(rocketGroup);
    }

    // Load ship model asynchronously if not already loaded
    if (!modelLoadedRef.current && gameState === "playing") {
      const gltfLoader = new GLTFLoader();
      gltfLoader.loadAsync(`/${shipConfig.GLTF_PATH}`).then((gltf) => {
        const model = gltf.scene; // Extract the 3D model
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true; // Enable shadow casting
            child.receiveShadow = true; // Enable shadow receiving
            if (child.material) originalMaterialsRef.current.set(child, child.material.clone()); // Store original material for blinking
          }
        });
        const box = new THREE.Box3().setFromObject(model); // Compute bounding box
        const size = new THREE.Vector3();
        box.getSize(size); // Get model dimensions
        const uniformScale = Math.min(
          shipConfig.TARGET_WIDTH / size.x,   // Scale to target width
          shipConfig.TARGET_HEIGHT / size.y,  // Scale to target height
          shipConfig.TARGET_LENGTH / size.z   // Scale to target length
        ) * shipConfig.SCALE; // Apply uniform scale factor
        model.scale.set(uniformScale, uniformScale, uniformScale);
        model.position.set(0, 0, 0); // Center within rocketGroup

        // Adjust model rotation based on selected ship
        if (selectedShip === "SHIP_1") {
          model.rotation.y = shipConfig.ROTATION_Y; // Apply Math.PI to face negative Z
          console.log("Ship 1 model rotation set to:", shipConfig.ROTATION_Y);
        } else if (selectedShip === "SHIP_2") {
          model.rotation.y = -Math.PI / 2; // Face negative Z from positive X
          console.log("Ship 2 model adjusted: rotation.y = -Math.PI/2 to face forward");
        }

        rocketGroup.add(model);
        rocketGroup.castShadow = true;
        modelLoadedRef.current = true;
        console.log(`Ship model loaded: ${selectedShip} from ${shipConfig.GLTF_PATH}`);
      }).catch((error) => console.error("GLTF load error:", error));
    }

    // --- Starfield Setup ---
    if (!starsRef.current) {
      const starsGeometry = new THREE.BufferGeometry();
      const starPositions = new Float32Array(CONFIG.STARFIELD_COUNT * 3); // Buffer for star positions
      for (let i = 0; i < CONFIG.STARFIELD_COUNT; i++) {
        starPositions[i * 3] = (Math.random() - 0.5) * CONFIG.STARFIELD_SPREAD_X; // Random X position
        starPositions[i * 3 + 1] = (Math.random() - 0.5) * CONFIG.STARFIELD_SPREAD_Y; // Random Y position
        starPositions[i * 3 + 2] = shipConfig.POSITION_Z - (Math.random() * CONFIG.STARFIELD_SPREAD_Z); // Random Z ahead
      }
      starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      const starsMaterial = new THREE.PointsMaterial({
        color: CONFIG.STARFIELD_COLOR,    // White stars
        size: CONFIG.STARFIELD_SIZE,      // Star size
        sizeAttenuation: true             // Size reduces with distance
      });
      const stars = new THREE.Points(starsGeometry, starsMaterial);
      scene.add(stars);
      starsRef.current = stars;
      console.log("Starfield initialized with", CONFIG.STARFIELD_COUNT, "stars");
    }

    // --- Engine Sound Setup ---
    if (!engineSoundRef.current) {
      engineSoundRef.current = new Audio(CONFIG.SOUND.ENGINE_PATH); // Load engine sound file
      engineSoundRef.current.loop = CONFIG.SOUND.ENGINE_LOOP; // Enable looping
      engineSoundRef.current.volume = CONFIG.SOUND.ENGINE_VOLUME; // Set default volume
      console.log("Engine sound initialized with path:", CONFIG.SOUND.ENGINE_PATH);
    }

    // --- Game State Transition Handling ---
    if (gameState === "playing" && 
        (prevGameStateRef.current === "start" || prevGameStateRef.current === "gameover" || prevGameStateRef.current === "shipselect") && 
        modelLoadedRef.current) {
      resetGameState(scene, rocketGroup, obstaclesRef, coinsRef, isInitialStartRef.current, selectedShip); // Reset game state
      speedRef.current = { lateral: 0, boost: 0 }; // Reset movement speeds
      nextSpawnZRef.current = rocketGroup.position.z - CONFIG.SPAWN_INTERVAL; // Set spawn point ahead of ship
      isInitialStartRef.current = false; // Mark initial start as complete
      engineSoundRef.current.play().catch((e) => console.error("Engine sound play error:", e)); // Play engine sound
      console.log("Game started - Speed:", speedRef.current, "Controls:", controlsRef.current);
    } else if (gameState !== "playing" && prevGameStateRef.current === "playing") {
      engineSoundRef.current.pause(); // Pause sound when game stops
      engineSoundRef.current.currentTime = 0; // Reset sound to start
      console.log("Game paused/stopped - Engine sound paused");
    }
    prevGameStateRef.current = gameState; // Update previous state

    let blinkCount = 0; // Counter for ship blink effect on collision

    // --- Keyboard Event Listeners ---
    const onKeyDown = (e) => {
      if (gameState !== "playing" || !modelLoadedRef.current) return; // Ignore if not playing or model not loaded
      if (e.key === "ArrowLeft") controlsRef.current.left = true; // Move left
      if (e.key === "ArrowRight") controlsRef.current.right = true; // Move right
      if (e.key === " ") controlsRef.current.boost = true; // Activate boost
      console.log("Key down:", e.key, "Controls:", { ...controlsRef.current });
    };

    const onKeyUp = (e) => {
      if (gameState !== "playing" || !modelLoadedRef.current) return;
      if (e.key === "ArrowLeft") controlsRef.current.left = false; // Stop moving left
      if (e.key === "ArrowRight") controlsRef.current.right = false; // Stop moving right
      if (e.key === " ") controlsRef.current.boost = false; // Deactivate boost
      console.log("Key up:", e.key, "Controls:", { ...controlsRef.current });
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    // --- Animation Loop ---
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate); // Request next frame

      const currentTime = performance.now(); // Current time in milliseconds
      const delta = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1); // Delta time in seconds, capped at 0.1s to prevent large jumps
      lastTimeRef.current = currentTime; // Update last frame time
      const deltaScale = delta * 60; // Normalize to 60 FPS baseline for original tuning

      if (gameState === "playing" && rocketGroup) {
        // Update ship movement with selected ship and delta time for consistent speed
        updateShipMovement(rocketGroup, speedRef, controlsRef, selectedShip, delta);

        // Handle collisions and apply blink effect
        blinkCount = handleCollisions(
          rocketGroup, obstaclesRef, coinsRef, scene, setHealth, endGame, score, setScore, shipConfig.COLLISION_RADIUS
        );
        blinkCount = applyBlinkEffect(rocketGroup, blinkCount, originalMaterialsRef);

        // Adjust engine sound volume based on boost state, scaled by delta
        if (controlsRef.current.boost && engineSoundRef.current.volume < CONFIG.SOUND.ENGINE_VOLUME * 1.5) {
          engineSoundRef.current.volume = Math.min(
            CONFIG.SOUND.ENGINE_VOLUME * 1.5, engineSoundRef.current.volume + 0.05 * deltaScale
          ); // Increase volume during boost
          console.log("Boost on - Engine volume:", engineSoundRef.current.volume);
        } else if (!controlsRef.current.boost && engineSoundRef.current.volume > CONFIG.SOUND.ENGINE_VOLUME) {
          engineSoundRef.current.volume = Math.max(
            CONFIG.SOUND.ENGINE_VOLUME, engineSoundRef.current.volume - 0.05 * deltaScale
          ); // Decrease volume when boost off
          console.log("Boost off - Engine volume:", engineSoundRef.current.volume);
        }

        // Log ship position and controls for debugging
        console.log("Ship X:", rocketGroup.position.x, "Speed:", { ...speedRef.current }, "Controls:", { ...controlsRef.current });

        // Update camera to follow ship
        camera.position.set(
          rocketGroup.position.x + CONFIG.CAMERA_X_OFFSET,
          CONFIG.CAMERA_Y_OFFSET,
          rocketGroup.position.z + CONFIG.CAMERA_Z_OFFSET
        );
        camera.lookAt(rocketGroup.position.x, shipConfig.POSITION_Y, rocketGroup.position.z - 20); // Look ahead of ship

        // Update skydome position and rotation, scaled by delta
        skydomeRef.current.position.set(0, 0, rocketGroup.position.z); // Center on ship Z
        skydomeRef.current.rotation.x += CONFIG.SKYDOME_ROTATION_SPEED_X * deltaScale;
        skydomeRef.current.rotation.y += CONFIG.SKYDOME_ROTATION_SPEED_Y * deltaScale; // Slow rotation for effect
        skydomeRef.current.rotation.z += CONFIG.SKYDOME_ROTATION_SPEED_Z * deltaScale;

        // Update track lines to follow ship
        trackLinesRef.current.forEach(line => {
          line.position.z = rocketGroup.position.z; // Keep lines aligned with ship
          line.visible = CONFIG.TRACK_LINES_VISIBLE;
        });

        // Spawn new objects as ship progresses (original logic preserved)
        spawnNewObjects(rocketGroup, nextSpawnZRef, obstaclesRef, coinsRef, scene);

        // Update starfield positions for continuous effect, scaled by delta
        if (starsRef.current) {
          const positions = starsRef.current.geometry.attributes.position.array;
          const shipZ = rocketGroup.position.z;
          for (let i = 2; i < positions.length; i += 3) {
            positions[i] += CONFIG.STARFIELD_SPEED * deltaScale; // Move stars toward ship (positive Z)
            if (positions[i] > shipZ + CONFIG.STARFIELD_SPREAD_Z / 2) {
              positions[i] = shipZ - CONFIG.STARFIELD_SPREAD_Z / 2; // Reset to far ahead
              positions[i - 2] = (Math.random() - 0.5) * CONFIG.STARFIELD_SPREAD_X; // Random X
              positions[i - 1] = (Math.random() - 0.5) * CONFIG.STARFIELD_SPREAD_Y; // Random Y
            }
          }
          starsRef.current.geometry.attributes.position.needsUpdate = true; // Flag for update
        }

        // Log object counts for debugging
        console.log("Obstacles:", obstaclesRef.current.length, "Coins:", coinsRef.current.length);
      }

      renderer.render(scene, camera); // Render the scene
    };
    animate(); // Start animation loop

    // --- Cleanup on Unmount ---
    return () => {
      console.log("Cleaning up RacingScene...");
      document.removeEventListener("keydown", onKeyDown); // Remove key listeners
      document.removeEventListener("keyup", onKeyUp);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); // Stop animation
      if (engineSoundRef.current) {
        engineSoundRef.current.pause(); // Stop sound
        engineSoundRef.current = null;
        console.log("Engine sound cleaned up");
      }
      // Note: Renderer and scene are not disposed here to allow reuse; adjust if full cleanup needed
    };
  }, [gameState, endGame, setScore, setHealth, health, score, controlsRef, selectedShip]); // Dependencies for useEffect

  // Render the mount point for the Three.js canvas
  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
}

export default RacingScene;