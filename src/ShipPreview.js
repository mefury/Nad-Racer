import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { createSpeederShip, createBumbleShip, addEngineEffects } from './shipModels';

// Component to render ship models in 3D for selection screens
const ShipPreview = React.memo(function ShipPreview({ shipId, className }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const [shipModel, setShipModel] = useState(null);

  // Create ship model based on shipId - this effect runs when shipId changes
  useEffect(() => {
    // Create appropriate ship model
    let newShipModel;
    switch (shipId) {
      case 'SHIP_1':
        newShipModel = createSpeederShip();
        break;
      case 'SHIP_2':
        newShipModel = createBumbleShip();
        break;
      default:
        newShipModel = createSpeederShip();
    }
    
    // Add engine effects with full quality for production
    addEngineEffects(newShipModel, shipId === 'SHIP_1' ? 'speeder' : 'bumble');
    
    // Store the new model
    setShipModel(newShipModel);
    
    // Clean up function to dispose of old model
    return () => {
      // Cleanup will happen in the main scene management effect
    };
  }, [shipId]);

  // Scene setup and management
  useEffect(() => {
    if (!mountRef.current || !shipModel) return;
    
    // Skip initialization if component is not visible
    const { width, height } = mountRef.current.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    // Set up scene if it doesn't exist yet
    if (!sceneRef.current) {
      // Create scene, camera, and renderer
      const scene = new THREE.Scene();
      scene.background = null; // Transparent background
      
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
      
      // Position camera for a good view of the ship
      camera.position.set(0, 3, 10);
      camera.lookAt(0, 0, 0);

      // Use high quality renderer for production
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true, // Transparent background
        powerPreference: 'high-performance'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setClearColor(0x000000, 0); // Transparent background
      
      // Full quality lighting for production
      const lights = [];
      
      // Base ambient light
      const ambientLight = new THREE.AmbientLight(0x666666, 2);
      lights.push(ambientLight);
      scene.add(ambientLight);
      
      // Main directional light
      const dirLight = new THREE.DirectionalLight(0xffffff, 3);
      dirLight.position.set(5, 5, 7);
      lights.push(dirLight);
      scene.add(dirLight);

      // Accent light for depth
      const backLight = new THREE.DirectionalLight(0x6666ff, 2);
      backLight.position.set(-5, 3, -5);
      lights.push(backLight);
      scene.add(backLight);
      
      // Store refs for cleanup
      sceneRef.current = {
        scene,
        camera,
        renderer,
        shipGroup: null,
        animationId: null,
        lights,
        lastFrameTime: 0
      };

      // Add renderer to DOM
      mountRef.current.appendChild(renderer.domElement);
    }
    
    // Clean up any existing ship model
    if (sceneRef.current.shipGroup) {
      sceneRef.current.scene.remove(sceneRef.current.shipGroup);
    }
    
    // Add ship to scene
    sceneRef.current.scene.add(shipModel);
    sceneRef.current.shipGroup = shipModel;
    
    // Animation function for continuous rendering with performance optimizations
    const animate = (time) => {
      if (!sceneRef.current || !mountRef.current) return;
      
      const { scene, camera, renderer, shipGroup, lastFrameTime } = sceneRef.current;
      
      // Calculate delta time for smoother animations
      const delta = time - lastFrameTime;
      sceneRef.current.lastFrameTime = time;
      
      // Rotate ship gently
      if (shipGroup) {
        shipGroup.rotation.y += 0.003;
        
        // Animate engine flames if they exist
        if (shipGroup.userData && shipGroup.userData.engineEffects) {
          const engineEffects = shipGroup.userData.engineEffects;
          
          // Increment the time value stored in userData
          engineEffects.userData.time += delta * 0.005;
          const animTime = engineEffects.userData.time;
          
          if (engineEffects.userData.type === 'speeder') {
            // Get flames and original scales from userData
            const { flames, originalScales } = engineEffects.userData;
            
            // Animate each flame with slightly different patterns
            flames.forEach((flame, index) => {
              // Use sine waves with different frequencies for natural-looking pulsing
              const pulseValue = Math.sin(animTime * (0.8 + index * 0.4)) * 0.15 + 1;
              const flutterValue = Math.sin(animTime * (3 + index)) * 0.05 + 1;
              
              // Apply different scale factors to each dimension for realistic flames
              const origScale = originalScales[index];
              flame.scale.set(
                origScale.x * (pulseValue + flutterValue * 0.3),  // width varies more
                origScale.y * pulseValue,                         // height pulses regularly
                origScale.z * (flutterValue * 0.7 + pulseValue * 0.3)  // depth has slight flutter
              );
            });
            
            // Find and animate any side thruster flames
            engineEffects.children.forEach(child => {
              // Find the side thruster flames by their position (not the most robust, but works)
              if (child.position.x !== 0 && Math.abs(child.position.x) > 1) {
                // More rapid, subtle pulsing for side thrusters
                const sideThrust = (Math.sin(animTime * 4) * 0.1 + 0.95);
                const origScale = child.userData.originalScale || new THREE.Vector3(1, 1, 1);
                
                // Store original scale if not already stored
                if (!child.userData.originalScale) {
                  child.userData.originalScale = child.scale.clone();
                }
                
                // Apply scaling
                child.scale.copy(origScale).multiplyScalar(sideThrust);
              }
            });
          }
          else if (engineEffects.userData.type === 'bumble') {
            // Animate bumble ship flames
            engineEffects.children.forEach(flame => {
              // Different pulse for each engine
              const index = engineEffects.children.indexOf(flame) % 4;
              const pulse = Math.sin(animTime * (1 + index * 0.2)) * 0.2 + 0.9;
              
              // Store original scale if not already stored
              if (!flame.userData.originalScale) {
                flame.userData.originalScale = flame.scale.clone();
              }
              
              // Apply pulsing effect
              const origScale = flame.userData.originalScale;
              flame.scale.copy(origScale).multiplyScalar(pulse);
            });
          }
        }
      }
      
      // Render scene
      renderer.render(scene, camera);
      
      // Request next frame
      sceneRef.current.animationId = requestAnimationFrame(animate);
    };
    
    // Start animation
    animate(0);
    
    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current || !sceneRef.current) return;
      
      const { width, height } = mountRef.current.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      
      sceneRef.current.camera.aspect = width / height;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        
        if (mountRef.current && sceneRef.current.renderer && mountRef.current.contains(sceneRef.current.renderer.domElement)) {
          mountRef.current.removeChild(sceneRef.current.renderer.domElement);
        }
        
        // Dispose of all Three.js resources
        if (sceneRef.current.shipGroup) {
          sceneRef.current.scene.remove(sceneRef.current.shipGroup);
          // Recursively dispose of geometries and materials
          sceneRef.current.shipGroup.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              if (object.geometry) object.geometry.dispose();
              if (object.material) {
                if (Array.isArray(object.material)) {
                  object.material.forEach(material => material.dispose());
                } else {
                  object.material.dispose();
                }
              }
            }
          });
        }
        
        // Dispose of renderer
        if (sceneRef.current.renderer) {
          sceneRef.current.renderer.dispose();
        }
        
        sceneRef.current = null;
      }
    };
  }, [shipModel]); // Only re-run this effect when shipModel changes

  return <div ref={mountRef} className={className} style={{ width: '100%', height: '100%' }} />;
});

export default ShipPreview; 