// shipModels.js
// Custom ship models created with Three.js geometry instead of GLTF models
// These lightweight models provide better performance while maintaining visual appeal

import * as THREE from "three";

// Factory function to create Ship 1 (Speeder) using Three.js geometry
export function createSpeederShip() {
  const shipGroup = new THREE.Group();
  
  // Color scheme for space jet
  const colors = {
    main: 0x3368c0,      // Blue main body
    accent: 0x222222,    // Dark accents
    engine: 0x44eeff,    // Bright blue engine glow
    cockpit: 0x88ddff,   // Blue cockpit
    detail: 0xcccccc     // Light gray details
  };
  
  // Main body - elongated shape
  const bodyGeometry = new THREE.CylinderGeometry(1, 0.7, 4, 8);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: colors.main,
    metalness: 0.7,
    roughness: 0.3
  });
  
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.rotation.x = Math.PI / 2; // Align horizontally with nose forward
  body.position.set(0, 0, 0);
  shipGroup.add(body);
  
  // Nose cone
  const noseGeometry = new THREE.ConeGeometry(0.7, 2, 8);
  const noseMaterial = new THREE.MeshStandardMaterial({
    color: colors.main,
    metalness: 0.7,
    roughness: 0.3
  });
  
  const nose = new THREE.Mesh(noseGeometry, noseMaterial);
  nose.rotation.x = -Math.PI / 2; // Point forward
  nose.position.set(0, 0, -3);
  shipGroup.add(nose);
  
  // Cockpit
  const cockpitGeometry = new THREE.SphereGeometry(0.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const cockpitMaterial = new THREE.MeshStandardMaterial({
    color: colors.cockpit,
    metalness: 0.8,
    roughness: 0.2,
    transparent: true,
    opacity: 0.7
  });
  
  const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
  cockpit.rotation.x = -Math.PI;
  cockpit.position.set(0, 0.5, -1);
  shipGroup.add(cockpit);
  
  // Wings
  const wingGeometry = new THREE.BoxGeometry(6, 0.2, 1.5);
  const wingMaterial = new THREE.MeshStandardMaterial({
    color: colors.main,
    metalness: 0.7,
    roughness: 0.3
  });
  
  const wings = new THREE.Mesh(wingGeometry, wingMaterial);
  wings.position.set(0, 0, 0.5);
  shipGroup.add(wings);
  
  // Wing tips - angle up at the ends
  const wingTipGeometry = new THREE.BoxGeometry(1, 0.6, 1.5);
  const wingTipMaterial = new THREE.MeshStandardMaterial({
    color: colors.accent,
    metalness: 0.8,
    roughness: 0.2
  });
  
  // Left wing tip
  const leftWingTip = new THREE.Mesh(wingTipGeometry, wingTipMaterial);
  leftWingTip.position.set(-3, 0.2, 0.5);
  leftWingTip.rotation.z = Math.PI / 12; // Angle up slightly
  shipGroup.add(leftWingTip);
  
  // Right wing tip
  const rightWingTip = new THREE.Mesh(wingTipGeometry, wingTipMaterial);
  rightWingTip.position.set(3, 0.2, 0.5);
  rightWingTip.rotation.z = -Math.PI / 12; // Angle up slightly
  shipGroup.add(rightWingTip);
  
  // Rear fin
  const finGeometry = new THREE.BoxGeometry(0.2, 1.2, 1.5);
  const finMaterial = new THREE.MeshStandardMaterial({
    color: colors.accent,
    metalness: 0.7,
    roughness: 0.3
  });
  
  const fin = new THREE.Mesh(finGeometry, finMaterial);
  fin.position.set(0, 0.6, 1.5);
  shipGroup.add(fin);
  
  // Single engine at the back
  const engineGeometry = new THREE.CylinderGeometry(0.7, 0.8, 0.8, 16);
  const engineMaterial = new THREE.MeshStandardMaterial({
    color: colors.accent,
    metalness: 0.9,
    roughness: 0.2
  });
  
  const engine = new THREE.Mesh(engineGeometry, engineMaterial);
  engine.rotation.x = Math.PI / 2; // Align with body
  engine.position.set(0, 0, 2.4); // Position at back
  shipGroup.add(engine);
  
  // Engine glow (exhaust) - facing backward
  const exhaustGeometry = new THREE.CircleGeometry(0.5, 16);
  const exhaustMaterial = new THREE.MeshStandardMaterial({
    color: colors.engine,
    emissive: colors.engine,
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.9
  });
  
  const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
  exhaust.position.set(0, 0, 2.85); // Position at back of engine
  exhaust.rotation.y = Math.PI; // Face backward
  shipGroup.add(exhaust);
  
  // Add some detail elements
  const detailGeometry = new THREE.BoxGeometry(1.5, 0.1, 0.1);
  const detailMaterial = new THREE.MeshStandardMaterial({
    color: colors.detail,
    metalness: 0.8,
    roughness: 0.2
  });
  
  // Add details along the wings
  for (let x = -2; x <= 2; x += 1) {
    if (x !== 0) { // Skip center
      const detail = new THREE.Mesh(detailGeometry, detailMaterial);
      detail.position.set(x, 0.15, 0);
      shipGroup.add(detail);
    }
  }
  
  // Add small side thrusters for detail
  for (let side of [-1, 1]) {
    const smallThrusterGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.3, 8);
    const smallThruster = new THREE.Mesh(smallThrusterGeometry, engineMaterial);
    
    smallThruster.rotation.x = Math.PI / 2;
    smallThruster.position.set(side * 1.2, -0.1, 2.2);
    shipGroup.add(smallThruster);
    
    // Small glow for side thrusters
    const smallGlowGeometry = new THREE.CircleGeometry(0.12, 8);
    const smallGlow = new THREE.Mesh(smallGlowGeometry, exhaustMaterial);
    smallGlow.position.set(side * 1.2, -0.1, 2.4);
    smallGlow.rotation.y = Math.PI;
    shipGroup.add(smallGlow);
  }
  
  // Set shadow properties
  shipGroup.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  
  return shipGroup;
}

// Factory function to create Ship 2 (Bumble Ship) using Three.js geometry
export function createBumbleShip() {
  const shipGroup = new THREE.Group();
  
  // Color scheme
  const colors = {
    main: 0xffcc00, // Yellow main body
    accent: 0x222222, // Black stripes
    engine: 0xff6600, // Orange engine glow
    window: 0x88ddff, // Blue window
    details: 0x444444 // Dark gray details
  };
  
  // Main body - rounded shape
  const bodyGeometry = new THREE.SphereGeometry(2, 16, 16);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: colors.main,
    metalness: 0.4,
    roughness: 0.6,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.scale.set(1, 0.6, 1.4); // Make it oval shaped
  shipGroup.add(body);
  
  // Add black stripes (bee pattern)
  const stripeGeometry = new THREE.CylinderGeometry(2.02, 2.02, 0.3, 32);
  const stripeMaterial = new THREE.MeshStandardMaterial({
    color: colors.accent,
    metalness: 0.5,
    roughness: 0.6
  });
  
  // Add three black stripes
  for (let i = -1; i <= 1; i++) {
    const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe.rotation.x = Math.PI / 2;
    stripe.scale.set(1, 1, 0.6);
    stripe.position.set(0, 0, i * 0.8);
    shipGroup.add(stripe);
  }
  
  // Cockpit window
  const windowGeometry = new THREE.SphereGeometry(0.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: colors.window,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.8
  });
  const cockpitWindow = new THREE.Mesh(windowGeometry, windowMaterial);
  cockpitWindow.position.set(0, 0.5, -1.6);
  cockpitWindow.scale.set(1, 0.7, 1);
  shipGroup.add(cockpitWindow);
  
  // Wings/fins (antennae for bee theme)
  const antennaGeometry = new THREE.CylinderGeometry(0.1, 0.05, 2, 8);
  const antennaMaterial = new THREE.MeshStandardMaterial({
    color: colors.accent,
    metalness: 0.6,
    roughness: 0.4
  });
  
  // Create two antennae
  for (let side of [-1, 1]) {
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(side * 0.6, 0.8, -1.5);
    antenna.rotation.x = -Math.PI / 4;
    antenna.rotation.z = side * Math.PI / 8;
    shipGroup.add(antenna);
    
    // Add a little ball at the end of each antenna
    const ballGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const ball = new THREE.Mesh(ballGeometry, antennaMaterial);
    ball.position.set(side * 1.1, 1.3, -2.2);
    shipGroup.add(ball);
  }
  
  // Engine exhausts
  const engineGeometry = new THREE.CylinderGeometry(0.5, 0.7, 0.4, 16);
  const engineMaterial = new THREE.MeshStandardMaterial({
    color: colors.details,
    metalness: 0.7,
    roughness: 0.3
  });
  
  // Exhaust glow material
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: colors.engine,
    emissive: colors.engine,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.9
  });
  
  // Add engines
  for (let side of [-1, 1]) {
    for (let height of [-0.2, 0.2]) {
      // Engine housing
      const engine = new THREE.Mesh(engineGeometry, engineMaterial);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(side * 1, height, 2);
      shipGroup.add(engine);
      
      // Engine glow
      const glowGeometry = new THREE.CircleGeometry(0.4, 16);
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.set(side * 1, height, 2.25);
      glow.rotation.y = Math.PI;
      shipGroup.add(glow);
    }
  }
  
  // Add stinger at the back
  const stingerGeometry = new THREE.ConeGeometry(0.4, 1.2, 16);
  const stinger = new THREE.Mesh(stingerGeometry, stripeMaterial);
  stinger.rotation.x = Math.PI / 2;
  stinger.position.set(0, -0.3, 2.5);
  shipGroup.add(stinger);
  
  // Add wings
  const wingGeometry = new THREE.CylinderGeometry(0.05, 1.5, 0.1, 3);
  const wingMaterial = new THREE.MeshStandardMaterial({
    color: colors.window,
    transparent: true,
    opacity: 0.8,
    metalness: 0.2,
    roughness: 0.4
  });
  
  for (let side of [-1, 1]) {
    // Top wing
    const topWing = new THREE.Mesh(wingGeometry, wingMaterial);
    topWing.position.set(side * 1.5, 0.4, 0.5);
    topWing.rotation.z = side * Math.PI / 2;
    topWing.rotation.y = side * Math.PI / 10;
    topWing.scale.set(1.3, 1, 2);
    shipGroup.add(topWing);
    
    // Bottom wing
    const bottomWing = new THREE.Mesh(wingGeometry, wingMaterial);
    bottomWing.position.set(side * 1.5, -0.2, 0.5);
    bottomWing.rotation.z = side * Math.PI / 2;
    bottomWing.rotation.y = side * Math.PI / 10;
    bottomWing.scale.set(1, 1, 1.7);
    shipGroup.add(bottomWing);
  }
  
  // Set shadow properties
  shipGroup.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  
  return shipGroup;
}

// Helper function to add engine thrust effects to any ship
export function addEngineEffects(shipGroup, type = 'default') {
  const engineGroup = new THREE.Group();
  shipGroup.add(engineGroup);
  
  let color, size, count, position, flameLength;
  
  switch(type) {
    case 'speeder':
      color = 0x44eeff;  // Bright blue
      size = 0.35;       // Reduced from 0.5 to make flames smaller
      count = 1;
      position = new THREE.Vector3(0, 0, 2.85); // Position at back of the main engine
      flameLength = 0.8; // Reduced from 1.2 to make flames shorter
      break;
    case 'bumble':
      color = 0xff6600;  // Orange
      size = 0.4;
      count = 4;
      position = new THREE.Vector3(0, 0, 2.25); // Position will be adjusted for each engine
      flameLength = 0.8;
      break;
    default:
      color = 0x66ffcc;  // Cyan
      size = 0.3;
      count = 2;
      position = new THREE.Vector3(0, 0, 2);
      flameLength = 0.6;
  }
  
  if (type === 'speeder') {
    // Create the main engine flame
    // By default, ConeGeometry points along +Y axis, we need it along +Z
    const flameGeometry = new THREE.ConeGeometry(size, flameLength, 16, 3);
    
    // Core flame - bright and glowing
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });
    
    // Create the core flame with correct orientation
    const coreFlame = new THREE.Mesh(flameGeometry, coreMaterial);
    // Rotate so cone points along Z axis with tip backward (away from the ship)
    coreFlame.rotation.x = Math.PI / 2;
    // Position the flame at the back of the engine
    coreFlame.position.copy(position);
    // Move it back so the cone base is at the engine exit and cone extends backward
    coreFlame.position.z += 0.1;
    engineGroup.add(coreFlame);
    
    // Middle flame layer - colored
    const middleMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7
    });
    
    // Create the middle flame with correct orientation
    const middleFlame = new THREE.Mesh(flameGeometry, middleMaterial);
    middleFlame.scale.set(1.2, 1.2, 1.1); // Reduced from 1.3, 1.3, 1.2
    // Rotate so cone points along Z axis with tip backward (away from the ship)
    middleFlame.rotation.x = Math.PI / 2;
    // Position the flame at the back of the engine
    middleFlame.position.copy(position);
    // Move it slightly further back
    middleFlame.position.z += 0.2;
    engineGroup.add(middleFlame);
    
    // Outer flame layer - more transparent
    const outerMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3
    });
    
    // Create the outer flame with correct orientation
    const outerFlame = new THREE.Mesh(flameGeometry, outerMaterial);
    outerFlame.scale.set(1.5, 1.5, 1.2); // Reduced from 1.7, 1.7, 1.4
    // Rotate so cone points along Z axis with tip backward (away from the ship)
    outerFlame.rotation.x = Math.PI / 2;
    // Position the flame at the back of the engine
    outerFlame.position.copy(position);
    // Move it furthest back
    outerFlame.position.z += 0.3;
    engineGroup.add(outerFlame);
    
    // Add small side thrusters flame effects
    for (let side of [-1, 1]) {
      const sidePosition = new THREE.Vector3(side * 1.2, -0.1, 2.4);
      const sideSize = 0.1;  // Reduced from 0.15
      const sideLength = 0.35; // Reduced from 0.5
      
      // Side thruster flame geometry
      const sideFlameGeometry = new THREE.ConeGeometry(sideSize, sideLength, 8, 2);
      
      // Core flame for side thruster with correct orientation
      const sideCoreFlame = new THREE.Mesh(sideFlameGeometry, coreMaterial);
      // Rotate so cone points along Z axis with tip backward (away from the ship)
      sideCoreFlame.rotation.x = Math.PI / 2;
      // Position the flame at the back of the side thruster
      sideCoreFlame.position.copy(sidePosition);
      // Move it slightly back
      sideCoreFlame.position.z += 0.05;
      engineGroup.add(sideCoreFlame);
      
      // Outer flame for side thruster with correct orientation
      const sideOuterFlame = new THREE.Mesh(sideFlameGeometry, outerMaterial);
      sideOuterFlame.scale.set(1.3, 1.3, 1.2); // Reduced from 1.4, 1.4, 1.3
      // Rotate so cone points along Z axis with tip backward (away from the ship)
      sideOuterFlame.rotation.x = Math.PI / 2;
      // Position the flame at the back of the side thruster
      sideOuterFlame.position.copy(sidePosition);
      // Move it slightly further back
      sideOuterFlame.position.z += 0.1;
      engineGroup.add(sideOuterFlame);
    }
    
    // Simple animation properties for the flames
    engineGroup.userData = {
      type: 'speeder',
      flames: [coreFlame, middleFlame, outerFlame],
      originalScales: [
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(1.2, 1.2, 1.1), // Updated to match new scale
        new THREE.Vector3(1.5, 1.5, 1.2)  // Updated to match new scale
      ],
      time: 0
    };
  }
  
  else if (type === 'bumble') {
    // Bumble ship has 4 engines
    const enginePositions = [
      new THREE.Vector3(-1, -0.2, 2.25),
      new THREE.Vector3(-1, 0.2, 2.25),
      new THREE.Vector3(1, -0.2, 2.25),
      new THREE.Vector3(1, 0.2, 2.25)
    ];
    
    // Create flames for each engine
    enginePositions.forEach((pos, index) => {
      const flameGeometry = new THREE.ConeGeometry(size * 0.8, flameLength, 12, 2);
      
      // Core flame with correct orientation
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
      });
      
      const coreFlame = new THREE.Mesh(flameGeometry, coreMaterial);
      // Rotate so cone points along Z axis with tip backward (away from the ship)
      coreFlame.rotation.x = Math.PI / 2;
      // Position the flame at the back of the engine
      coreFlame.position.copy(pos);
      // Move it back so the cone base is at the engine exit and cone extends backward
      coreFlame.position.z += 0.05;
      engineGroup.add(coreFlame);
      
      // Outer flame with correct orientation
      const outerMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.4
      });
      
      const outerFlame = new THREE.Mesh(flameGeometry, outerMaterial);
      outerFlame.scale.set(1.4, 1.4, 1.3);
      // Rotate so cone points along Z axis with tip backward (away from the ship)
      outerFlame.rotation.x = Math.PI / 2;
      // Position the flame at the back of the engine
      outerFlame.position.copy(pos);
      // Move it slightly further back
      outerFlame.position.z += 0.1;
      engineGroup.add(outerFlame);
    });
    
    // Animation data for bumble ship
    engineGroup.userData = {
      type: 'bumble',
      time: 0
    };
  }
  
  // Add the engine group to the ship
  shipGroup.userData.engineEffects = engineGroup;
  
  return engineGroup;
} 