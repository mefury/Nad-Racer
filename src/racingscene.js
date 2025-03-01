// RacingScene.js
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { CONFIG } from "./racingConfig";

function RacingScene({ score, setScore, setHealth, health, endGame, gameState }) {
  const mountRef = useRef(null);
  const animationFrameId = useRef(null);
  const sceneRef = useRef(null);
  const rocketGroupRef = useRef(null);
  const obstaclesRef = useRef([]);
  const coinsRef = useRef([]);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef({ left: false, right: false, up: false, down: false, boost: false });
  const speedRef = useRef({ lateral: 0, vertical: 0, boost: 0 });
  const nextSpawnZRef = useRef(-100);
  const prevGameStateRef = useRef(null);
  const particlesRef = useRef({
    coin: [],
    collision: [],
  });
  const modelLoadedRef = useRef(false);
  const starFieldRef = useRef(null);
  const skydomeRef = useRef(null);
  const cameraZPositionRef = useRef(CONFIG.SHIP_POSITION_Z + CONFIG.CAMERA_Z_OFFSET);

  useEffect(() => {
    console.log("useEffect triggered with gameState:", gameState);

    // Initialize or reuse scene
    let scene = sceneRef.current;
    if (!scene) {
      scene = new THREE.Scene();
      sceneRef.current = scene;
      console.log("New scene created");
    }

    const camera = cameraRef.current || new THREE.PerspectiveCamera(
      CONFIG.CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      CONFIG.CAMERA_NEAR,
      CONFIG.CAMERA_FAR
    );
    cameraRef.current = camera;
    camera.position.set(0, CONFIG.CAMERA_Y_OFFSET, cameraZPositionRef.current);
    camera.lookAt(0, 0, 0);

    const renderer = rendererRef.current || new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    const mount = mountRef.current;
    if (mount && !mount.contains(renderer.domElement)) {
      mount.appendChild(renderer.domElement);
    }

    if (!scene.environment) {
      const envTexture = new THREE.TextureLoader().load(
        "https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr"
      );
      envTexture.mapping = THREE.EquirectangularReflectionMapping;
      envTexture.colorSpace = THREE.SRGBColorSpace;
      scene.environment = envTexture;
    }

    if (!scene.children.some(child => child instanceof THREE.AmbientLight)) {
      const ambientLight = new THREE.AmbientLight(
        CONFIG.AMBIENT_LIGHT_COLOR,
        CONFIG.AMBIENT_LIGHT_INTENSITY * CONFIG.LIGHT_INTENSITY
      );
      scene.add(ambientLight);
    }

    if (!scene.children.some(child => child instanceof THREE.DirectionalLight)) {
      const dirLight = new THREE.DirectionalLight(
        CONFIG.DIR_LIGHT_COLOR,
        CONFIG.DIR_LIGHT_INTENSITY * CONFIG.LIGHT_INTENSITY
      );
      dirLight.position.set(CONFIG.DIR_LIGHT_POSITION_X, CONFIG.DIR_LIGHT_POSITION_Y, CONFIG.DIR_LIGHT_POSITION_Z);
      dirLight.castShadow = true;
      dirLight.shadow.bias = CONFIG.SHADOW_BIAS;
      dirLight.shadow.mapSize.width = CONFIG.SHADOW_MAP_SIZE;
      dirLight.shadow.mapSize.height = CONFIG.SHADOW_MAP_SIZE;
      scene.add(dirLight);
    }

    // Initialize or reuse starfield
    if (!starFieldRef.current) {
      const starField = new THREE.Group();
      const starGeometry = new THREE.BufferGeometry();
      const starPositions = new Float32Array(CONFIG.STAR_COUNT * CONFIG.STAR_DENSITY * 3);

      for (let i = 0; i < CONFIG.STAR_COUNT * CONFIG.STAR_DENSITY; i++) {
        const i3 = i * 3;
        starPositions[i3] = (Math.random() - 0.5) * CONFIG.STAR_SPREAD_X;
        starPositions[i3 + 1] = (Math.random() - 0.5) * CONFIG.STAR_SPREAD_Y;
        starPositions[i3 + 2] = (Math.random() - 0.5) * CONFIG.STAR_SPREAD_Z;
      }
      starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));

      const starMaterial = new THREE.PointsMaterial({
        color: CONFIG.STAR_COLOR,
        size: CONFIG.STAR_SIZE,
        sizeAttenuation: true,
        transparent: true,
        opacity: CONFIG.STAR_OPACITY,
        blending: CONFIG.STAR_GLOW ? THREE.AdditiveBlending : THREE.NormalBlending,
      });

      const stars = new THREE.Points(starGeometry, starMaterial);
      starField.add(stars);
      scene.add(starField);
      starFieldRef.current = starField;
      console.log("Starfield initialized with", CONFIG.STAR_COUNT * CONFIG.STAR_DENSITY, "stars");
    } else if (!scene.children.includes(starFieldRef.current)) {
      scene.add(starFieldRef.current);
      console.log("Starfield re-added to scene");
    }

    // Initialize or reuse skydome
    if (!skydomeRef.current) {
      const skyGeometry = new THREE.SphereGeometry(CONFIG.SKYDOME_RADIUS, 32, 32);
      const skyTexture = new THREE.TextureLoader().load(
        CONFIG.SKYDOME_TEXTURE_PATH,
        () => console.log("Skydome texture loaded successfully"),
        undefined,
        (error) => console.error("Failed to load skydome texture:", error)
      );
      skyTexture.colorSpace = THREE.SRGBColorSpace;
      skyTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const skyMaterial = new THREE.MeshPhongMaterial({
        map: skyTexture,
        side: THREE.BackSide,
        emissive: 0x101020,
        emissiveIntensity: CONFIG.SKYDOME_BRIGHTNESS,
      });
      const skydome = new THREE.Mesh(skyGeometry, skyMaterial);
      scene.add(skydome);
      skydomeRef.current = skydome;
    } else if (!scene.children.includes(skydomeRef.current)) {
      scene.add(skydomeRef.current);
    }

    const rocketGroup = rocketGroupRef.current || new THREE.Group();
    if (!scene.children.includes(rocketGroup)) {
      scene.add(rocketGroup);
    }
    rocketGroupRef.current = rocketGroup;

    if (!modelLoadedRef.current && gameState === "playing") {
      const gltfLoader = new GLTFLoader();
      console.log("Attempting to load GLTF from:", window.location.origin + "/models/" + CONFIG.SHIP_GLTF_PATH);
      gltfLoader
        .loadAsync("/models/" + CONFIG.SHIP_GLTF_PATH)
        .then((gltf) => {
          console.log("GLTF loaded successfully:", gltf);
          const model = gltf.scene;

          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.envMap = scene.environment;
              }
            }
          });

          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const scaleX = CONFIG.SHIP_TARGET_WIDTH / size.x;
          const scaleY = CONFIG.SHIP_TARGET_HEIGHT / size.y;
          const scaleZ = CONFIG.SHIP_TARGET_LENGTH / size.z;
          const uniformScale = Math.min(scaleX, scaleY, scaleZ) * CONFIG.SHIP_SCALE;
          model.scale.set(uniformScale, uniformScale, uniformScale);

          box.setFromObject(model);
          const center = new THREE.Vector3();
          box.getCenter(center);
          model.position.sub(center.multiplyScalar(uniformScale));
          model.position.set(0, 0, 0);

          model.rotation.set(CONFIG.SHIP_ROTATION_X, CONFIG.SHIP_ROTATION_Y, CONFIG.SHIP_ROTATION_Z);

          rocketGroup.add(model);
          rocketGroup.position.set(CONFIG.SHIP_POSITION_X, CONFIG.SHIP_POSITION_Y, CONFIG.SHIP_POSITION_Z);
          rocketGroup.castShadow = true;

          modelLoadedRef.current = true;
          console.log("Model added to scene successfully");

          let nextSpawnZ = nextSpawnZRef.current;
          for (let i = 0; i < 3; i++) {
            spawnObstacle(nextSpawnZ);
            spawnCoins(nextSpawnZ);
            nextSpawnZ -= CONFIG.SPAWN_INTERVAL;
          }
          nextSpawnZRef.current = nextSpawnZ;
        })
        .catch((error) => {
          console.error("Error loading GLTF model:", error);
          const placeholderGeometry = new THREE.BoxGeometry(
            CONFIG.SHIP_TARGET_WIDTH,
            CONFIG.SHIP_TARGET_HEIGHT,
            CONFIG.SHIP_TARGET_LENGTH
          );
          const placeholderMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
          const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
          placeholder.scale.set(CONFIG.SHIP_SCALE, CONFIG.SHIP_SCALE, CONFIG.SHIP_SCALE);
          rocketGroup.add(placeholder);
          rocketGroup.position.set(CONFIG.SHIP_POSITION_X, CONFIG.SHIP_POSITION_Y, CONFIG.SHIP_POSITION_Z);
          rocketGroup.rotation.set(CONFIG.SHIP_ROTATION_X, CONFIG.SHIP_ROTATION_Y, CONFIG.SHIP_ROTATION_Z);
          rocketGroup.castShadow = true;

          modelLoadedRef.current = true;

          let nextSpawnZ = nextSpawnZRef.current;
          for (let i = 0; i < 3; i++) {
            spawnObstacle(nextSpawnZ);
            spawnCoins(nextSpawnZ);
            nextSpawnZ -= CONFIG.SPAWN_INTERVAL;
          }
          nextSpawnZRef.current = nextSpawnZ;
        });
    }

    const resetGameState = () => {
      const scene = sceneRef.current;
      const rocketGroup = rocketGroupRef.current;
    
      console.log("Resetting game state...");
    
      obstaclesRef.current.forEach((obstacle) => {
        if (scene.children.includes(obstacle)) scene.remove(obstacle);
      });
      obstaclesRef.current = [];
      coinsRef.current.forEach((coin) => {
        if (scene.children.includes(coin)) scene.remove(coin);
      });
      coinsRef.current = [];
      Object.values(particlesRef.current).forEach((particleList) => {
        particleList.forEach((particle) => {
          if (scene.children.includes(particle.mesh)) scene.remove(particle.mesh);
        });
        particleList.length = 0;
      });
    
      if (!rocketGroup.children.length) {
        const placeholderGeometry = new THREE.BoxGeometry(
          CONFIG.SHIP_TARGET_WIDTH,
          CONFIG.SHIP_TARGET_HEIGHT,
          CONFIG.SHIP_TARGET_LENGTH
        );
        const placeholderMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
        placeholder.scale.set(CONFIG.SHIP_SCALE, CONFIG.SHIP_SCALE, CONFIG.SHIP_SCALE);
        rocketGroup.add(placeholder);
      }
    
      rocketGroup.position.set(CONFIG.SHIP_POSITION_X, CONFIG.SHIP_POSITION_Y, CONFIG.SHIP_POSITION_Z);
      rocketGroup.rotation.set(CONFIG.SHIP_ROTATION_X, CONFIG.SHIP_ROTATION_Y, CONFIG.SHIP_ROTATION_Z);
    
      rocketGroup.traverse((child) => {
        if (child.isMesh || child.isGroup) {
          child.rotation.set(CONFIG.SHIP_ROTATION_X, CONFIG.SHIP_ROTATION_Y, CONFIG.SHIP_ROTATION_Z);
        }
      });
    
      speedRef.current = { lateral: 0, vertical: 0, boost: 0 };
      controlsRef.current = { left: false, right: false, up: false, down: false, boost: false };
    
      nextSpawnZRef.current = -CONFIG.SPAWN_INTERVAL;
    
      let nextSpawnZ = nextSpawnZRef.current;
      for (let i = 0; i < 3; i++) {
        spawnObstacle(nextSpawnZ);
        spawnCoins(nextSpawnZ);
        nextSpawnZ -= CONFIG.SPAWN_INTERVAL;
      }
      nextSpawnZRef.current = nextSpawnZ;
    
      cameraZPositionRef.current = CONFIG.SHIP_POSITION_Z + CONFIG.CAMERA_Z_OFFSET;
    };

    const updateStars = (rocketZ) => {
      const starField = starFieldRef.current;
      if (!starField) return;

      const cameraZ = rocketZ + CONFIG.CAMERA_Z_OFFSET;
      const nearZ = cameraZ - CONFIG.CAMERA_FAR + 100;
      const farZ = cameraZ + CONFIG.CAMERA_Z_OFFSET;

      starField.children.forEach((stars) => {
        const positions = stars.geometry.attributes.position.array;
        const starCount = CONFIG.STAR_COUNT * CONFIG.STAR_DENSITY;

        for (let i = 0; i < starCount; i++) {
          const i3 = i * 3;
          const starZ = positions[i3 + 2];

          if (starZ < nearZ || starZ > farZ) {
            positions[i3] = (Math.random() - 0.5) * CONFIG.STAR_SPREAD_X;
            positions[i3 + 1] = (Math.random() - 0.5) * CONFIG.STAR_SPREAD_Y;
            positions[i3 + 2] = nearZ + Math.random() * (farZ - nearZ);
          }
        }
        stars.geometry.attributes.position.needsUpdate = true;

        if (Math.random() < 0.01) {
          const zs = Array.from({ length: starCount }, (_, i) => positions[i * 3 + 2]);
          console.log("Star Z range:", Math.min(...zs), Math.max(...zs), "Camera Z:", cameraZ, "Near Z:", nearZ, "Far Z:", farZ);
        }
      });

      // Ensure starfield is visible and in scene
      starField.visible = true;
      if (!scene.children.includes(starField)) {
        scene.add(starField);
        console.log("Starfield forcibly re-added to scene");
      }
    };

    const updateSkydome = (zPosition, deltaTime) => {
      const skydome = skydomeRef.current;
      if (!skydome) return;
      skydome.position.set(0, 0, zPosition);
      skydome.rotation.x += CONFIG.SKYDOME_ROTATION_SPEED_X * deltaTime;
      skydome.rotation.y += CONFIG.SKYDOME_ROTATION_SPEED_Y * deltaTime;
      skydome.rotation.z += CONFIG.SKYDOME_ROTATION_SPEED_Z * deltaTime;
      skydome.visible = true;
    };

    const spawnObstacle = (zBase) => {
      if (Math.random() > CONFIG.OBSTACLE_SPAWN_CHANCE) return;
      const xPos = (Math.random() - 0.5) * CONFIG.SPACE_WIDTH * CONFIG.OBSTACLE_SPAWN_X_RANGE;
      const yPos = (Math.random() - 0.5) * CONFIG.SPACE_HEIGHT * CONFIG.OBSTACLE_SPAWN_Y_RANGE;
      const zPos = zBase - Math.random() * CONFIG.OBSTACLE_SPAWN_Z_RANGE;
      const type = Math.random() < 0.5 ? "star" : "asteroid";
      let obstacle;

      if (type === "star") {
        const starGeometry = new THREE.IcosahedronGeometry(1, 1);
        const starMaterial = new THREE.MeshPhongMaterial({ color: CONFIG.STAR_OBSTACLE_COLOR, emissive: 0xffff00, emissiveIntensity: 0.5 });
        obstacle = new THREE.Mesh(starGeometry, starMaterial);
        const scale = CONFIG.OBSTACLE_SCALE_MIN + Math.random() * (CONFIG.OBSTACLE_SCALE_MAX - CONFIG.OBSTACLE_SCALE_MIN);
        obstacle.scale.set(scale, scale, scale);
      } else {
        const asteroidGeometry = new THREE.DodecahedronGeometry(1);
        const asteroidMaterial = new THREE.MeshPhongMaterial({ color: CONFIG.ASTEROID_COLOR });
        obstacle = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
        const scale = CONFIG.OBSTACLE_SCALE_MIN + Math.random() * (CONFIG.OBSTACLE_SCALE_MAX - CONFIG.OBSTACLE_SCALE_MIN);
        obstacle.scale.set(scale, scale, scale);
      }

      obstacle.position.set(xPos, yPos, zPos);
      obstacle.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      obstacle.castShadow = true;
      sceneRef.current.add(obstacle);
      obstaclesRef.current.push(obstacle);
    };

    const spawnCoins = (zBase) => {
      if (Math.random() > CONFIG.COIN_SPAWN_CHANCE) return;
      const coinCount = CONFIG.COIN_ROW_COUNTS[Math.floor(Math.random() * CONFIG.COIN_ROW_COUNTS.length)];
      const xPos = (Math.random() - 0.5) * CONFIG.SPACE_WIDTH * CONFIG.COIN_SPAWN_X_RANGE;
      const yPos = (Math.random() - 0.5) * CONFIG.SPACE_HEIGHT * CONFIG.COIN_SPAWN_Y_RANGE;
      const startZ = zBase + CONFIG.COIN_SPAWN_Z_START_OFFSET;

      const coinGeometry = new THREE.CylinderGeometry(
        CONFIG.COIN_RADIUS * CONFIG.COIN_SIZE,
        CONFIG.COIN_RADIUS * CONFIG.COIN_SIZE,
        CONFIG.COIN_THICKNESS * CONFIG.COIN_SIZE,
        32
      );
      const coinMaterial = new THREE.MeshPhongMaterial({ color: CONFIG.COIN_COLOR });
      const coinBorderGeometry = new THREE.CylinderGeometry(
        CONFIG.COIN_RADIUS * CONFIG.COIN_SIZE + CONFIG.COIN_BORDER_THICKNESS,
        CONFIG.COIN_RADIUS * CONFIG.COIN_SIZE + CONFIG.COIN_BORDER_THICKNESS,
        CONFIG.COIN_THICKNESS * CONFIG.COIN_SIZE * 0.5,
        32
      );
      const coinBorderMaterial = new THREE.MeshPhongMaterial({ color: CONFIG.COIN_BORDER_COLOR });

      for (let i = 0; i < coinCount; i++) {
        const coinGroup = new THREE.Group();
        const coin = new THREE.Mesh(coinGeometry, coinMaterial);
        const coinBorder = new THREE.Mesh(coinBorderGeometry, coinBorderMaterial);

        coin.position.y = 0;
        coinBorder.position.y = 0;
        coin.rotation.x = Math.PI / 2;
        coinBorder.rotation.x = Math.PI / 2;

        coinGroup.add(coin, coinBorder);
        coinGroup.position.set(xPos, yPos, startZ - i * CONFIG.COIN_ROW_SPACING);
        coinGroup.castShadow = true;
        sceneRef.current.add(coinGroup);
        coinsRef.current.push(coinGroup);
      }
    };

    const createParticles = (count, color, size, lifetime, position, speed, scale) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const velocitiesArray = new Float32Array(count * 3);
      const lifetimes = [];

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] = position.x + (Math.random() - 0.5) * 0.5;
        positions[i3 + 1] = position.y + (Math.random() - 0.5) * 0.5;
        positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.5;
        velocitiesArray[i3] = (Math.random() - 0.5) * 0.2;
        velocitiesArray[i3 + 1] = (Math.random() - 0.5) * 0.2;
        velocitiesArray[i3 + 2] = speed + (Math.random() - 0.5) * 0.2;
        lifetimes[i] = lifetime * (0.5 + Math.random() * 0.5);
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color,
        size: size * scale,
        sizeAttenuation: true,
        transparent: true,
        opacity: 1.0,
      });
      const particles = new THREE.Points(geometry, material);
      sceneRef.current.add(particles);

      return { mesh: particles, velocities: velocitiesArray, lifetimes, initialLifetimes: [...lifetimes] };
    };

    const updateParticles = (particles, type, deltaTime) => {
      const positions = particles.mesh.geometry.attributes.position.array;
      const toRemove = [];

      for (let i = 0; i < particles.lifetimes.length; i++) {
        const i3 = i * 3;
        particles.lifetimes[i] -= deltaTime;
        if (particles.lifetimes[i] <= 0) {
          toRemove.push(i);
          continue;
        }

        positions[i3] += particles.velocities[i3] * deltaTime * 10;
        positions[i3 + 1] += particles.velocities[i3 + 1] * deltaTime * 10;
        positions[i3 + 2] += particles.velocities[i3 + 2] * deltaTime * 10;

        const alpha = particles.lifetimes[i] / particles.initialLifetimes[i];
        particles.mesh.material.opacity = Math.max(0, alpha);
      }

      particles.mesh.geometry.attributes.position.needsUpdate = true;

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
          sceneRef.current.remove(particles.mesh);
          particles.mesh.geometry.dispose();
          particles.mesh.material.dispose();
          const particleIndex = particlesRef.current[type].indexOf(particles);
          if (particleIndex !== -1) {
            particlesRef.current[type].splice(particleIndex, 1);
          }
        }
      }
    };

    if (gameState === "playing" && (prevGameStateRef.current === "start" || prevGameStateRef.current === "gameover") && modelLoadedRef.current) {
      resetGameState();
    }
    prevGameStateRef.current = gameState;

    const controls = controlsRef.current;
    const speed = speedRef.current;
    let blinkCount = 0;

    const onKeyDown = (e) => {
      if (gameState !== "playing" || !modelLoadedRef.current) return;
      if (e.key === "ArrowLeft") controls.left = true;
      if (e.key === "ArrowRight") controls.right = true;
      if (e.key === "ArrowUp") controls.up = true;
      if (e.key === "ArrowDown") controls.down = true;
      if (e.key === " ") controls.boost = true;
    };
    const onKeyUp = (e) => {
      if (gameState !== "playing" || !modelLoadedRef.current) return;
      if (e.key === "ArrowLeft") controls.left = false;
      if (e.key === "ArrowRight") controls.right = false;
      if (e.key === "ArrowUp") controls.up = false;
      if (e.key === "ArrowDown") controls.down = false;
      if (e.key === " ") controls.boost = false;
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    let lastTime = performance.now();
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);

      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (gameState === "start") {
        cameraZPositionRef.current -= 0.3;
        camera.position.set(0, CONFIG.CAMERA_Y_OFFSET, cameraZPositionRef.current);
        camera.lookAt(0, 0, cameraZPositionRef.current - 100);
        updateStars(cameraZPositionRef.current);
        updateSkydome(cameraZPositionRef.current, deltaTime);

        rocketGroup.visible = false;
        starFieldRef.current.visible = true;
        obstaclesRef.current.forEach(obstacle => obstacle.visible = false);
        coinsRef.current.forEach(coin => coin.visible = false);
        Object.values(particlesRef.current).forEach(particleList => {
          particleList.forEach(particle => particle.mesh.visible = false);
        });
      } else if (gameState === "playing") {
        const targetPosition = modelLoadedRef.current
          ? rocketGroup.position
          : new THREE.Vector3(CONFIG.SHIP_POSITION_X, CONFIG.SHIP_POSITION_Y, CONFIG.SHIP_POSITION_Z);
        camera.position.set(
          targetPosition.x,
          targetPosition.y + CONFIG.CAMERA_Y_OFFSET,
          targetPosition.z + CONFIG.CAMERA_Z_OFFSET
        );
        camera.lookAt(targetPosition);

        rocketGroup.visible = true;
        starFieldRef.current.visible = true;

        if (!modelLoadedRef.current) {
          renderer.render(scene, camera);
          return;
        }

        if (controls.left) speed.lateral -= CONFIG.ACCELERATION;
        if (controls.right) speed.lateral += CONFIG.ACCELERATION;
        speed.lateral = Math.max(-CONFIG.MAX_LATERAL_SPEED, Math.min(CONFIG.MAX_LATERAL_SPEED, speed.lateral));
        speed.lateral *= CONFIG.FRICTION;

        if (controls.up) speed.vertical += CONFIG.ACCELERATION;
        if (controls.down) speed.vertical -= CONFIG.ACCELERATION;
        speed.vertical = Math.max(-CONFIG.MAX_VERTICAL_SPEED, Math.min(CONFIG.MAX_VERTICAL_SPEED, speed.vertical));
        speed.vertical *= CONFIG.FRICTION;

        speed.boost = controls.boost ? CONFIG.BOOST_SPEED : Math.max(0, speed.boost - 0.02);

        rocketGroup.position.x += speed.lateral;
        rocketGroup.position.x = Math.max(-CONFIG.LATERAL_BOUNDS, Math.min(CONFIG.LATERAL_BOUNDS, rocketGroup.position.x));
        rocketGroup.position.y += speed.vertical;
        rocketGroup.position.y = Math.max(
          CONFIG.SHIP_POSITION_Y - CONFIG.VERTICAL_BOUNDS,
          Math.min(CONFIG.SHIP_POSITION_Y + CONFIG.VERTICAL_BOUNDS, rocketGroup.position.y)
        );
        rocketGroup.position.z -= CONFIG.FORWARD_SPEED + speed.boost;

        rocketGroup.rotation.z = -speed.lateral * 0.5;
        rocketGroup.rotation.x = speed.vertical * 0.5;

        const pointLight = scene.children.find((child) => child instanceof THREE.PointLight);
        if (pointLight) {
          pointLight.position.set(rocketGroup.position.x, rocketGroup.position.y + 5, rocketGroup.position.z);
        }

        obstaclesRef.current.forEach((obstacle, i) => {
          obstacle.visible = true;
          const obstaclePos = obstacle.position;
          const distance = rocketGroup.position.distanceTo(obstaclePos);
          if (distance < CONFIG.SHIP_COLLISION_RADIUS + CONFIG.OBSTACLE_COLLISION_RADIUS && blinkCount === 0) {
            scene.remove(obstacle);
            obstaclesRef.current.splice(i, 1);

            const collisionPosition = obstaclePos.clone();
            const collisionParticles = createParticles(
              CONFIG.COLLISION_PARTICLE_COUNT,
              CONFIG.COLLISION_PARTICLE_COLOR,
              CONFIG.COLLISION_PARTICLE_SIZE,
              CONFIG.COLLISION_PARTICLE_LIFETIME,
              collisionPosition,
              1.0,
              1.0
            );
            particlesRef.current.collision.push(collisionParticles);

            setHealth((prev) => {
              const newHealth = prev - 1;
              if (newHealth <= 0) {
                endGame(score);
                return 0;
              }
              blinkCount = 4;
              return newHealth;
            });
          }
          if (obstaclePos.z > rocketGroup.position.z + CONFIG.DESPAWN_DISTANCE) {
            scene.remove(obstacle);
            obstaclesRef.current.splice(i, 1);
          }
        });

        coinsRef.current.forEach((coinGroup, i) => {
          coinGroup.visible = true;
          const coinPos = coinGroup.position;
          const distance = rocketGroup.position.distanceTo(coinPos);
          if (distance < CONFIG.SHIP_COLLISION_RADIUS + CONFIG.COIN_COLLISION_RADIUS) {
            coinGroup.visible = false;
            scene.remove(coinGroup);
            coinsRef.current.splice(i, 1);
            setScore((prev) => prev + 10);

            const coinPosition = coinPos.clone();
            const coinParticles = createParticles(
              CONFIG.COIN_PARTICLE_COUNT,
              CONFIG.COIN_PARTICLE_COLOR,
              CONFIG.COIN_PARTICLE_SIZE,
              CONFIG.COIN_PARTICLE_LIFETIME,
              coinPosition,
              0.5,
              1.0
            );
            particlesRef.current.coin.push(coinParticles);
          }
          if (coinPos.z > rocketGroup.position.z + CONFIG.DESPAWN_DISTANCE) {
            coinGroup.visible = false;
            scene.remove(coinGroup);
            coinsRef.current.splice(i, 1);
          }
        });

        if (blinkCount > 0) {
          blinkCount--;
          const isRed = Math.floor(blinkCount / 2) % 2 === 0;
          rocketGroup.traverse((child) => {
            if (child.isMesh) {
              if (isRed) {
                const redMat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
                child.material = redMat;
              } else {
                const defaultMat = new THREE.MeshPhongMaterial({ color: 0x9966ff });
                child.material = defaultMat;
              }
            }
          });
        }

        let nextSpawnZ = nextSpawnZRef.current;
        if (rocketGroup.position.z < nextSpawnZ + CONFIG.SPAWN_INTERVAL) {
          if (obstaclesRef.current.length < CONFIG.OBSTACLE_SPAWN_LIMIT) spawnObstacle(nextSpawnZ);
          if (coinsRef.current.length < CONFIG.COIN_SPAWN_LIMIT) spawnCoins(nextSpawnZ);
          nextSpawnZ -= CONFIG.SPAWN_INTERVAL;
          nextSpawnZRef.current = nextSpawnZ;
        }

        ["coin", "collision"].forEach((type) => {
          particlesRef.current[type].forEach((particles) => {
            particles.mesh.visible = true;
            updateParticles(particles, type, deltaTime);
          });
        });

        updateStars(rocketGroup.position.z);
        updateSkydome(rocketGroup.position.z, deltaTime);
      } else if (gameState === "gameover") {
        rocketGroup.visible = true;
        starFieldRef.current.visible = true;
        obstaclesRef.current.forEach(obstacle => obstacle.visible = true);
        coinsRef.current.forEach(coin => coin.visible = true);
        Object.values(particlesRef.current).forEach(particleList => {
          particleList.forEach(particle => particle.mesh.visible = false);
        });
        updateStars(rocketGroup.position.z);
        updateSkydome(rocketGroup.position.z, deltaTime);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      console.log("Cleaning up useEffect...");
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      // Do not dispose scene or renderer here to preserve state
    };
  }, [gameState, endGame, setScore, setHealth, health, score]);

  return <div ref={mountRef} />;
}

export default RacingScene;