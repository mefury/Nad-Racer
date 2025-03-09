// src/background.js
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const CONFIG = {
  SKYDOME_RADIUS: 1000,
  SKYDOME_COLOR_START: 0x200052, // Monad blue
  SKYDOME_COLOR_END: 0x000022,   // Darker blue for gradient
  SKYDOME_ROTATION_SPEED: 0.0005, // Slow rotation speed

  PLANET_RADIUS: 200,
  PLANET_COLOR: 0xA0055D,
  PLANET_EMISSIVE: 0xA0055D,     // Brighter pinkish-purple glow
  PLANET_EMISSIVE_INTENSITY: 0.03,// Increased glow intensity
  PLANET_SPIN_SPEED: 0.001,
  PLANET_DISTANCE: 500,

  AMBIENT_LIGHT_COLOR: 0x606080, // Slightly brighter bluish ambient
  AMBIENT_LIGHT_INTENSITY: 0.7,
  DIR_LIGHT_COLOR: 0xfff5e6,     // Softer warm light
  DIR_LIGHT_INTENSITY: 2.5,
  DIR_LIGHT_POSITION: { x: 100, y: 150, z: -75 }, // Adjusted for better spread

  EDGE_STAR_COUNT: 5000,
  EDGE_STAR_SIZE: 0.4,           // Slightly larger for visibility
  EDGE_STAR_COLOR: 0xffffff,
  EDGE_STAR_SPREAD: 800,
  EDGE_STAR_PULSE_SPEED: 0.005,  // Pulsing speed

  STARFIELD_COUNT: 10000,
  STARFIELD_SIZE: 1,
  STARFIELD_COLOR: 0xffffff,
  STARFIELD_SPEED: 0.5,
  STARFIELD_SPREAD: 2000,
};

function BackgroundScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      CONFIG.SKYDOME_RADIUS * 2
    );
    camera.position.set(0, 5, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (mountRef.current) mountRef.current.appendChild(renderer.domElement);

    // Skydome with gradient
    const skydomeGeometry = new THREE.SphereGeometry(CONFIG.SKYDOME_RADIUS, 64, 64);
    const skydomeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        colorStart: { value: new THREE.Color(CONFIG.SKYDOME_COLOR_START) },
        colorEnd: { value: new THREE.Color(CONFIG.SKYDOME_COLOR_END) },
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorStart;
        uniform vec3 colorEnd;
        varying vec3 vPosition;
        void main() {
          float factor = (vPosition.y + ${CONFIG.SKYDOME_RADIUS.toFixed(1)}) / (${CONFIG.SKYDOME_RADIUS.toFixed(1)} * 2.0);
          gl_FragColor = vec4(mix(colorEnd, colorStart, factor), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    const skydome = new THREE.Mesh(skydomeGeometry, skydomeMaterial);
    scene.add(skydome);

    // Edge starfield with pulsing
    const edgeStarsGeometry = new THREE.BufferGeometry();
    const edgeStarPositions = new Float32Array(CONFIG.EDGE_STAR_COUNT * 3);
    for (let i = 0; i < CONFIG.EDGE_STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.5;
      const radius = CONFIG.EDGE_STAR_SPREAD;
      edgeStarPositions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
      edgeStarPositions[i * 3 + 1] = radius * Math.sin(phi);
      edgeStarPositions[i * 3 + 2] = radius * Math.cos(theta) * Math.cos(phi);
    }
    edgeStarsGeometry.setAttribute("position", new THREE.BufferAttribute(edgeStarPositions, 3));
    const edgeStarsMaterial = new THREE.PointsMaterial({
      color: CONFIG.EDGE_STAR_COLOR,
      size: CONFIG.EDGE_STAR_SIZE,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1.0,
    });
    const edgeStars = new THREE.Points(edgeStarsGeometry, edgeStarsMaterial);
    scene.add(edgeStars);

    // Planet with glow effect
    const planetTexture = new THREE.TextureLoader().load(
      "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg" // Example texture
    );
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(CONFIG.PLANET_RADIUS, 64, 64),
      new THREE.MeshPhongMaterial({
        map: planetTexture,
        color: CONFIG.PLANET_COLOR,
        emissive: CONFIG.PLANET_EMISSIVE,
        emissiveIntensity: CONFIG.PLANET_EMISSIVE_INTENSITY,
        shininess: 50,
      })
    );
    planet.position.set(0, 0, CONFIG.PLANET_DISTANCE);
    scene.add(planet);

    // Add glow sprite behind planet
    const glowTexture = new THREE.TextureLoader().load(
      "https://threejs.org/examples/textures/lensflare/lensflare0.png"
    );
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: CONFIG.PLANET_EMISSIVE,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.8,
    });
    const glowSprite = new THREE.Sprite(glowMaterial);
    glowSprite.scale.set(CONFIG.PLANET_RADIUS * 2.5, CONFIG.PLANET_RADIUS * 2.5, 1);
    glowSprite.position.set(0, 0, CONFIG.PLANET_DISTANCE - 10);
    scene.add(glowSprite);

    // Improved lighting
    scene.add(new THREE.AmbientLight(CONFIG.AMBIENT_LIGHT_COLOR, CONFIG.AMBIENT_LIGHT_INTENSITY));
    const dirLight = new THREE.DirectionalLight(CONFIG.DIR_LIGHT_COLOR, CONFIG.DIR_LIGHT_INTENSITY);
    dirLight.position.set(
      CONFIG.DIR_LIGHT_POSITION.x,
      CONFIG.DIR_LIGHT_POSITION.y,
      CONFIG.DIR_LIGHT_POSITION.z
    );
    dirLight.castShadow = true; // Optional: adds depth if shadows enabled
    scene.add(dirLight);

    // Foreground starfield
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(CONFIG.STARFIELD_COUNT * 3);
    for (let i = 0; i < CONFIG.STARFIELD_COUNT; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * CONFIG.STARFIELD_SPREAD;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * CONFIG.STARFIELD_SPREAD;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * CONFIG.STARFIELD_SPREAD;
    }
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: CONFIG.STARFIELD_COLOR,
      size: CONFIG.STARFIELD_SIZE,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Animation loop
    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += CONFIG.EDGE_STAR_PULSE_SPEED;

      // Rotate skydome
      skydome.rotation.y += CONFIG.SKYDOME_ROTATION_SPEED;

      // Spin planet
      planet.rotation.y += CONFIG.PLANET_SPIN_SPEED;

      // Pulse edge stars
      edgeStarsMaterial.opacity = 0.6 + Math.sin(time) * 0.4;

      // Animate foreground starfield
      const positions = stars.geometry.attributes.position.array;
      for (let i = 2; i < positions.length; i += 3) {
        positions[i] -= CONFIG.STARFIELD_SPEED;
        if (positions[i] < -CONFIG.STARFIELD_SPREAD / 2) {
          positions[i] = CONFIG.STARFIELD_SPREAD / 2;
          positions[i - 2] = (Math.random() - 0.5) * CONFIG.STARFIELD_SPREAD;
          positions[i - 1] = (Math.random() - 0.5) * CONFIG.STARFIELD_SPREAD;
        }
      }
      stars.geometry.attributes.position.needsUpdate = true;

      camera.lookAt(planet.position);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />;
}

export default BackgroundScene;