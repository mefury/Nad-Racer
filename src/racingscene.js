// racingscene.js
// Manages the 3D environment and rendering for the racing game using Three.js.
// Integrates an infinite starfield with configurable spreads, a textured skydome, and dynamic game logic.
// Updated to use time-based delta for consistent movement speed across varying refresh rates, while preserving original spawning logic.

import React, { useEffect, useRef, useState, useCallback } from "react"; // React hooks for component lifecycle and refs
import * as THREE from "three"; // THREE.js for 3D rendering
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"; // Loader for GLTF 3D models
// AudioSystem import removed
// eslint-disable-next-line no-unused-vars
import { CONFIG, resetGameState, spawnObstacle, spawnCoins, updateShipMovement, handleCollisions, applyBlinkEffect, spawnNewObjects, updateObstacleAnimations, updateCoinAnimations } from "./racingLogic"; // Game logic and config, suppress unused vars warning

// RacingScene component renders the 3D game scene and handles animation loop
function RacingScene({ score, setScore, setHealth, health, endGame, gameState, controlsRef, selectedShip, onCoinCollect, onObstacleHit }) {
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
  const lastTimeRef = useRef(performance.now()); // Tracks time of last frame for delta calculation
  const prevScoreRef = useRef(score);         // Tracks previous score for comparison
  
  // Audio system initialization removed
  
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
        CONFIG.AMBIENT_LIGHT_COLOR,    // Space ambient color
        CONFIG.AMBIENT_LIGHT_INTENSITY * CONFIG.LIGHT_INTENSITY // Adjusted intensity
      );
      scene.add(ambientLight); // Add ambient light to scene
    }
    
    if (!scene.children.some(child => child instanceof THREE.DirectionalLight)) {
      const dirLight = new THREE.DirectionalLight(
        CONFIG.DIR_LIGHT_COLOR,        // Purple-tinted color
        CONFIG.DIR_LIGHT_INTENSITY * CONFIG.LIGHT_INTENSITY // Adjusted intensity
      );
      dirLight.position.set(
        CONFIG.DIR_LIGHT_POSITION_X,  // X position
        CONFIG.DIR_LIGHT_POSITION_Y,  // Y position (above)
        CONFIG.DIR_LIGHT_POSITION_Z   // Z position
      );
      dirLight.castShadow = true;     // Enable shadow casting
      dirLight.shadow.bias = CONFIG.SHADOW_BIAS; // Adjust shadow bias to reduce artifacts
      dirLight.shadow.mapSize.set(CONFIG.SHADOW_MAP_SIZE, CONFIG.SHADOW_MAP_SIZE); // High-res shadow map
      scene.add(dirLight); // Add directional light to scene
      
      // Add a spotlight to illuminate the track ahead for better visibility of obstacles and coins
      const spotLight = new THREE.SpotLight(0xffffff, 4.0, 200, Math.PI / 4, 0.5, 1);
      spotLight.position.set(0, 40, -20); // Position above and slightly behind camera
      spotLight.target.position.set(0, 0, -50); // Target ahead of the ship
      scene.add(spotLight);
      scene.add(spotLight.target);
      
      // Makes the spotlight move with the ship
      const updateSpotlightPosition = () => {
        const shipPos = rocketGroup?.position;
        if (shipPos) {
          spotLight.position.set(shipPos.x, shipPos.y + 40, shipPos.z + 10);
          spotLight.target.position.set(shipPos.x, shipPos.y, shipPos.z - 50);
        }
      };
      
      // Store the function on the scene to access it in animation loop
      scene.userData.updateSpotlightPosition = updateSpotlightPosition;
    }

    // --- Skydome Setup with Texture ---
    if (!skydomeRef.current) {
      const textureLoader = new THREE.TextureLoader();
      const skydomeTexture = textureLoader.load(CONFIG.SKYDOME_TEXTURE_PATH, (texture) => {
        // Improve texture quality and prevent stretching
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        console.log("Skydome texture loaded with anisotropy:", texture.anisotropy);
      }); 
      skydomeTexture.wrapS = THREE.RepeatWrapping; // Repeat texture horizontally
      skydomeTexture.wrapT = THREE.RepeatWrapping; // Repeat texture vertically
      // Use fewer repeats to avoid visible texture stretching
      skydomeTexture.repeat.set(1, 1);
      
      const skydome = new THREE.Mesh(
        new THREE.SphereGeometry(CONFIG.SKYDOME_RADIUS, CONFIG.SKYDOME_SEGMENTS, CONFIG.SKYDOME_SEGMENTS), // Higher quality sphere
        new THREE.MeshPhongMaterial({
          map: skydomeTexture,         // Apply texture
          color: CONFIG.SKYDOME_COLOR, // Fallback color
          emissive: CONFIG.SKYDOME_EMISSIVE, // Emissive color for subtle glow
          emissiveIntensity: CONFIG.SKYDOME_EMISSIVE_INTENSITY, // Emissive intensity
          transparent: true,
          opacity: CONFIG.SKYDOME_OPACITY, // Full opacity
          side: THREE.BackSide,        // Render inside of sphere for sky effect
          fog: false                   // Skydome should not be affected by fog
        })
      );
      skydome.scale.set(CONFIG.SKYDOME_SCALE_X, CONFIG.SKYDOME_SCALE_Y, CONFIG.SKYDOME_SCALE_Z); // Apply scale
      scene.add(skydome);
      skydomeRef.current = skydome;
      console.log("Skydome initialized with texture:", CONFIG.SKYDOME_TEXTURE_PATH);
      
      // Add subtle space fog for depth effect
      scene.fog = new THREE.FogExp2(0x000033, 0.0005);
      
      // Add a few distant star point lights for ambiance
      const createDistantStar = (x, y, z, intensity, color) => {
        const light = new THREE.PointLight(color, intensity, 150);
        light.position.set(x, y, z);
        scene.add(light);
        return light;
      };
      
      // Create a few distant stars with different colors
      createDistantStar(200, 100, -100, 0.5, 0x8866ff);  // Purple-ish distant star
      createDistantStar(-250, 50, -150, 0.3, 0x6688ff);  // Blue-ish distant star
      createDistantStar(0, -100, -200, 0.2, 0xffaa66);   // Orange-ish distant star
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
      const starColors = new Float32Array(CONFIG.STARFIELD_COUNT * 3); // Buffer for star colors
      const starSizes = new Float32Array(CONFIG.STARFIELD_COUNT); // Buffer for varied star sizes
      
      // Star color variety - cooler and warmer stars
      const starColorOptions = [
        new THREE.Color(0xFFFFFF), // Pure white
        new THREE.Color(0xCCDDFF), // Bluish white
        new THREE.Color(0xFFEEDD), // Warm white
        new THREE.Color(0xFFDD88), // Yellow-ish
        new THREE.Color(0xAACCFF), // Light blue
        new THREE.Color(0xFFAAAA)  // Light red
      ];
      
      for (let i = 0; i < CONFIG.STARFIELD_COUNT; i++) {
        starPositions[i * 3] = (Math.random() - 0.5) * CONFIG.STARFIELD_SPREAD_X; // Random X position
        starPositions[i * 3 + 1] = (Math.random() - 0.5) * CONFIG.STARFIELD_SPREAD_Y; // Random Y position
        starPositions[i * 3 + 2] = shipConfig.POSITION_Z - (Math.random() * CONFIG.STARFIELD_SPREAD_Z); // Random Z ahead
        
        // Assign random color from options
        const colorIndex = Math.floor(Math.random() * starColorOptions.length);
        const color = starColorOptions[colorIndex];
        starColors[i * 3] = color.r;
        starColors[i * 3 + 1] = color.g;
        starColors[i * 3 + 2] = color.b;
        
        // Assign random size with bias toward smaller stars (realistic distribution)
        const sizeBias = Math.random() * Math.random(); // Bias toward smaller values
        starSizes[i] = CONFIG.STARFIELD_SIZE * (0.5 + sizeBias * 1.5); // Range from 50% to 200% of base size
      }
      
      starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      starsGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
      starsGeometry.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));
      
      const starsMaterial = new THREE.PointsMaterial({
        size: CONFIG.STARFIELD_SIZE,
        sizeAttenuation: true,           // Size reduces with distance
        vertexColors: true,              // Use vertex colors for variety
        transparent: true,
        opacity: 0.8,                    // Slight transparency for softer look
        map: createStarSprite()          // Use a circular sprite for better-looking stars
      });
      
      const stars = new THREE.Points(starsGeometry, starsMaterial);
      scene.add(stars);
      starsRef.current = stars;
      console.log("Enhanced starfield initialized with", CONFIG.STARFIELD_COUNT, "stars");
    }

    // Create a circular sprite for stars with a soft glow
    function createStarSprite() {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      
      // Draw a radial gradient for a better-looking star
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');  // Core of star
      gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)'); // Mid of star
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');  // Edge of star
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }

    // --- Game State Transition Handling ---
    if (gameState === "playing" && 
        (prevGameStateRef.current === "start" || prevGameStateRef.current === "gameover" || prevGameStateRef.current === "shipselect") && 
        modelLoadedRef.current) {
      resetGameState(scene, rocketGroup, obstaclesRef, coinsRef, isInitialStartRef.current, selectedShip); // Reset game state
      speedRef.current = { lateral: 0, boost: 0 }; // Reset movement speeds
      nextSpawnZRef.current = rocketGroup.position.z - CONFIG.SPAWN_INTERVAL; // Set spawn point ahead of ship
      isInitialStartRef.current = false; // Mark initial start as complete
      console.log("Game started - Speed:", speedRef.current, "Controls:", controlsRef.current);
    } else if (gameState !== "playing" && prevGameStateRef.current === "playing") {
      console.log("Game paused or ended");
    }
    prevGameStateRef.current = gameState; // Update previous state

    let blinkCount = 0; // Counter for ship blink effect on collision

    // --- Keyboard Event Listeners ---
    const onKeyDown = (e) => {
      if (gameState !== "playing" || !modelLoadedRef.current) return; // Ignore if not playing or model not loaded
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") controlsRef.current.left = true; // Move left (arrow or A key)
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") controlsRef.current.right = true; // Move right (arrow or D key)
      if (e.key === " " || e.key === "w" || e.key === "W") controlsRef.current.boost = true; // Activate boost (space or W key)
      console.log("Key down:", e.key, "Controls:", { ...controlsRef.current });
    };

    const onKeyUp = (e) => {
      if (gameState !== "playing" || !modelLoadedRef.current) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") controlsRef.current.left = false; // Stop moving left
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") controlsRef.current.right = false; // Stop moving right
      if (e.key === " " || e.key === "w" || e.key === "W") controlsRef.current.boost = false; // Deactivate boost
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

        // Handle collisions with obstacles and coins
        const collisionResult = handleCollisions(
          rocketGroup, obstaclesRef, coinsRef, scene, setHealth, endGame, score, setScore, shipConfig.COLLISION_RADIUS, onCoinCollect, onObstacleHit
        );
        
        // Apply blinking effect if ship was hit
        if (collisionResult.blinkCount > 0) {
          blinkCount = collisionResult.blinkCount;
        }
        
        // Apply the blinking effect to the ship
        blinkCount = applyBlinkEffect(rocketGroup, blinkCount, originalMaterialsRef);
        
        // Update obstacle animations
        updateObstacleAnimations(obstaclesRef, delta);
        
        // Update coin animations for better visibility
        updateCoinAnimations(coinsRef, delta);
        
        // Log ship position and controls for debugging
        console.log("Ship X:", rocketGroup.position.x, "Speed:", { ...speedRef.current }, "Controls:", { ...controlsRef.current });

        // Update camera to follow ship
        camera.position.set(
          rocketGroup.position.x + CONFIG.CAMERA_X_OFFSET,
          CONFIG.CAMERA_Y_OFFSET,
          rocketGroup.position.z + CONFIG.CAMERA_Z_OFFSET
        );
        camera.lookAt(rocketGroup.position.x, shipConfig.POSITION_Y, rocketGroup.position.z - 20); // Look ahead of ship
        
        // Update spotlight position to follow ship and illuminate the track ahead
        if (scene.userData.updateSpotlightPosition) {
          scene.userData.updateSpotlightPosition();
        }

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

        // Update starfield positions for continuous effect with improved variation
        if (starsRef.current) {
          const positions = starsRef.current.geometry.attributes.position.array;
          const sizes = starsRef.current.geometry.attributes.size.array;
          const shipZ = rocketGroup.position.z;
          
          for (let i = 0, j = 0; i < positions.length; i += 3, j++) {
            // Move stars toward ship with varied speeds based on size
            const speed = CONFIG.STARFIELD_SPEED * (0.8 + (sizes[j] / CONFIG.STARFIELD_SIZE) * 0.4);
            positions[i + 2] += speed * deltaScale; 
            
            // Reset stars when they pass behind the ship
            if (positions[i + 2] > shipZ + CONFIG.STARFIELD_SPREAD_Z / 4) {
              positions[i] = (Math.random() - 0.5) * CONFIG.STARFIELD_SPREAD_X; // Random X
              positions[i + 1] = (Math.random() - 0.5) * CONFIG.STARFIELD_SPREAD_Y; // Random Y
              positions[i + 2] = shipZ - CONFIG.STARFIELD_SPREAD_Z; // Far ahead of ship
              
              // Occasionally twinkle stars by randomly changing their size
              if (Math.random() < 0.05) {
                const sizeBias = Math.random() * Math.random();
                sizes[j] = CONFIG.STARFIELD_SIZE * (0.5 + sizeBias * 1.5);
              }
            }
          }
          starsRef.current.geometry.attributes.position.needsUpdate = true;
          starsRef.current.geometry.attributes.size.needsUpdate = true;
        }

        // Log object counts for debugging
        console.log("Obstacles:", obstaclesRef.current.length, "Coins:", coinsRef.current.length);

        // Log if a coin was recently collected (debug only)
        if (score > prevScoreRef.current) {
          console.log("🚀 RacingScene - Score increased from", prevScoreRef.current, "to", score, "- onCoinCollect:", !!onCoinCollect);
          prevScoreRef.current = score;
        }
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
      
      // Audio cleanup code removed
      
      // Note: Renderer and scene are not disposed here to allow reuse; adjust if full cleanup needed
    };
  }, [gameState, endGame, setScore, setHealth, health, score, controlsRef, selectedShip, onCoinCollect, onObstacleHit]); // Removed soundsInitializedRef.current dependency

  // Render the mount point for the Three.js canvas
  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
}

export default RacingScene;