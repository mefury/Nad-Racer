// audioSystem.js
// A robust audio system using Web Audio API for game sound management
// Handles multiple concurrent sounds with proper resource management

// Audio volume constants
const MASTER_VOLUME = 0.7;    // Overall volume for all sounds
const MUSIC_VOLUME = 0.5;     // Background music volume
const ENGINE_VOLUME = 0.2;    // Engine sound volume
const EFFECTS_VOLUME = 0.6;   // Volume for coin and crash sounds

class AudioSystem {
    constructor() {
        // Initialize audio context
        this.audioContext = null;
        
        // Sound buffers storage
        this.soundBuffers = new Map();
        
        // Active sound sources
        this.activeSources = new Map();
        
        // Background music and engine sound nodes
        this.backgroundMusic = null;
        this.engineSound = null;
        
        // Volume controls
        this.masterGainNode = null;
        this.effectsGainNode = null;
        this.musicGainNode = null;
        this.engineGainNode = null;
        
        // Sound states
        this.initialized = false;
        this.muted = false;
        this.userInteracted = false;
        
        // Bind methods
        this.loadSounds = this.loadSounds.bind(this);
        this.playSound = this.playSound.bind(this);
        this.stopSound = this.stopSound.bind(this);
        this.setMasterVolume = this.setMasterVolume.bind(this);
        this.handleUserInteraction = this.handleUserInteraction.bind(this);
        
        // Add user interaction listener
        if (typeof window !== 'undefined') {
            const interactionEvents = ['click', 'touchstart', 'keydown'];
            interactionEvents.forEach(event => {
                window.addEventListener(event, this.handleUserInteraction, { once: true });
            });
        }
    }

    // Handle user interaction to initialize audio context
    async handleUserInteraction() {
        console.log('🎵 User interaction detected, initializing audio context...');
        if (!this.userInteracted) {
            this.userInteracted = true;
            await this.initializeAudioContext();
        }
    }

    // Initialize audio context and gain nodes
    async initializeAudioContext() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Create and connect gain nodes
                this.masterGainNode = this.audioContext.createGain();
                this.effectsGainNode = this.audioContext.createGain();
                this.musicGainNode = this.audioContext.createGain();
                this.engineGainNode = this.audioContext.createGain();
                
                this.effectsGainNode.connect(this.masterGainNode);
                this.musicGainNode.connect(this.masterGainNode);
                this.engineGainNode.connect(this.masterGainNode);
                this.masterGainNode.connect(this.audioContext.destination);
                
                // Set initial volumes
                this.masterGainNode.gain.value = MASTER_VOLUME;
                this.effectsGainNode.gain.value = EFFECTS_VOLUME;
                this.musicGainNode.gain.value = MUSIC_VOLUME;
                this.engineGainNode.gain.value = ENGINE_VOLUME;
                
                console.log('🎵 Audio context initialized');
                
                // Load sounds after context is initialized
                await this.init();
            } catch (error) {
                console.error('❌ Failed to initialize audio context:', error);
            }
        }
    }

    // Initialize the audio system and load all sounds
    async init() {
        if (this.initialized) return;

        try {
            if (!this.audioContext) {
                console.log('⚠️ Audio context not ready, waiting for user interaction...');
                return false;
            }

            // Resume audio context if it's suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('🎵 Audio context resumed');
            }

            // Load all game sounds
            await this.loadSounds();
            
            this.initialized = true;
            console.log('🎵 Audio system initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize audio system:', error);
            return false;
        }
    }

    // Load all game sound files
    async loadSounds() {
        const soundFiles = {
            coin: '/sounds/coin.mp3',
            crash: '/sounds/crash.mp3',
            engine: '/sounds/engine.mp3',
            background: '/sounds/gamebg.mp3'
        };

        try {
            const loadPromises = Object.entries(soundFiles).map(async ([key, path]) => {
                const response = await fetch(path);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.soundBuffers.set(key, audioBuffer);
                console.log(`🎵 Loaded sound: ${key}`);
            });

            await Promise.all(loadPromises);
            console.log('🎵 All sounds loaded successfully');
        } catch (error) {
            console.error('❌ Error loading sounds:', error);
            throw error;
        }
    }

    // Play a sound effect (coin, crash)
    playSound(soundId, options = {}) {
        if (!this.audioContext || !this.initialized) {
            console.warn('⚠️ Cannot play sound, audio system not ready');
            return null;
        }

        if (this.muted && options.loop) {
            console.warn('⚠️ Cannot play looping sound while muted');
            return null;
        }

        const buffer = this.soundBuffers.get(soundId);
        if (!buffer) {
            console.warn(`⚠️ Sound not found: ${soundId}`);
            return null;
        }

        try {
            // Stop existing sound if it's looping
            if (options.loop && this.activeSources.has(soundId)) {
                this.stopSound(soundId);
            }

            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;

            // Connect to appropriate gain node based on sound type
            if (soundId === 'background') {
                source.connect(this.musicGainNode);
            } else if (soundId === 'engine') {
                source.connect(this.engineGainNode);
            } else {
                source.connect(this.effectsGainNode);
            }

            // Configure looping
            source.loop = options.loop || false;

            // Store source if we need to stop it later
            if (options.loop) {
                this.activeSources.set(soundId, source);
            }

            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                console.log('🎵 Resuming audio context...');
                this.audioContext.resume();
            }

            // Start the sound
            source.start(0);
            console.log(`🎵 Playing sound: ${soundId}, looping: ${source.loop}`);

            // Clean up when non-looping sounds finish
            if (!options.loop) {
                source.onended = () => {
                    source.disconnect();
                    this.activeSources.delete(soundId);
                };
            }

            return source;
        } catch (error) {
            console.error(`❌ Error playing sound ${soundId}:`, error);
            return null;
        }
    }

    // Stop a specific sound
    stopSound(soundId) {
        const source = this.activeSources.get(soundId);
        if (source) {
            try {
                source.stop();
                source.disconnect();
                this.activeSources.delete(soundId);
                console.log(`🎵 Stopped sound: ${soundId}`);
            } catch (error) {
                console.error(`❌ Error stopping sound ${soundId}:`, error);
            }
        }
    }

    // Start background music
    startBackgroundMusic() {
        console.log('🎵 Starting background music...');
        try {
            // Stop existing background music if any
            this.stopBackgroundMusic();

            // Use playSound method for consistency
            const source = this.playSound('background', { loop: true });
            if (source) {
                this.backgroundMusic = source;
                console.log('🎵 Background music started successfully');
            } else {
                throw new Error('Failed to start background music');
            }
        } catch (error) {
            console.error('❌ Error starting background music:', error);
            this.stopBackgroundMusic();
        }
    }

    // Start engine sound
    startEngineSound() {
        console.log('🎵 Starting engine sound...');
        try {
            // Stop existing engine sound if any
            this.stopEngineSound();

            // Use playSound method for consistency
            const source = this.playSound('engine', { loop: true });
            if (source) {
                this.engineSound = source;
                console.log('🎵 Engine sound started successfully');
            } else {
                throw new Error('Failed to start engine sound');
            }
        } catch (error) {
            console.error('❌ Error starting engine sound:', error);
            this.stopEngineSound();
        }
    }

    // Stop background music
    stopBackgroundMusic() {
        console.log('🎵 Stopping background music...');
        try {
            if (this.backgroundMusic) {
                this.backgroundMusic.stop();
                this.backgroundMusic.disconnect();
                this.activeSources.delete('background');
                this.backgroundMusic = null;
                console.log('🎵 Background music stopped successfully');
            }
        } catch (error) {
            console.error('❌ Error stopping background music:', error);
        }
    }

    // Stop engine sound
    stopEngineSound() {
        console.log('🎵 Stopping engine sound...');
        try {
            if (this.engineSound) {
                this.engineSound.stop();
                this.engineSound.disconnect();
                this.activeSources.delete('engine');
                this.engineSound = null;
                console.log('🎵 Engine sound stopped successfully');
            }
        } catch (error) {
            console.error('❌ Error stopping engine sound:', error);
        }
    }

    // Play coin collection sound
    playCoinSound() {
        this.playSound('coin');
    }

    // Play crash sound
    playCrashSound() {
        this.playSound('crash');
    }

    // Set master volume
    setMasterVolume(value) {
        this.masterGainNode.gain.value = Math.max(0, Math.min(1, value));
    }

    // Set effects volume
    setEffectsVolume(value) {
        this.effectsGainNode.gain.value = Math.max(0, Math.min(1, value));
    }

    // Set music volume
    setMusicVolume(value) {
        this.musicGainNode.gain.value = Math.max(0, Math.min(1, value));
    }

    // Set engine sound volume
    setEngineVolume(value) {
        this.engineGainNode.gain.value = Math.max(0, Math.min(1, value));
    }

    // Mute all sounds
    mute() {
        this.muted = true;
        this.masterGainNode.gain.value = 0;
    }

    // Unmute all sounds
    unmute() {
        this.muted = false;
        this.masterGainNode.gain.value = 1;
    }

    // Clean up resources
    dispose() {
        if (typeof window !== 'undefined') {
            const interactionEvents = ['click', 'touchstart', 'keydown'];
            interactionEvents.forEach(event => {
                window.removeEventListener(event, this.handleUserInteraction);
            });
        }

        // Stop all active sounds
        this.activeSources.forEach((source, id) => {
            this.stopSound(id);
        });

        // Clear buffers
        this.soundBuffers.clear();
        this.activeSources.clear();

        // Disconnect nodes if they exist
        if (this.masterGainNode) this.masterGainNode.disconnect();
        if (this.effectsGainNode) this.effectsGainNode.disconnect();
        if (this.musicGainNode) this.musicGainNode.disconnect();
        if (this.engineGainNode) this.engineGainNode.disconnect();

        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }

        this.initialized = false;
        this.userInteracted = false;
        console.log('🎵 Audio system disposed');
    }

    // Add debug method to check sound buffers
    debugSoundBuffers() {
        console.log('🎵 Sound Buffers Status:');
        console.log('Background music buffer:', this.soundBuffers.has('background'));
        console.log('Engine sound buffer:', this.soundBuffers.has('engine'));
        console.log('Coin sound buffer:', this.soundBuffers.has('coin'));
        console.log('Crash sound buffer:', this.soundBuffers.has('crash'));
        console.log('Active sources:', Array.from(this.activeSources.keys()));
        console.log('Audio context state:', this.audioContext?.state);
        console.log('Initialized:', this.initialized);
        console.log('User interacted:', this.userInteracted);
    }

    // Add verification method for sound playback
    verifySound(soundId) {
        const source = this.activeSources.get(soundId);
        if (!source) {
            console.warn(`⚠️ Sound ${soundId} is not active`);
            return false;
        }

        try {
            // This will throw if the source has ended or been stopped
            source.playbackRate.value;
            return true;
        } catch (error) {
            console.warn(`⚠️ Sound ${soundId} is not playing properly:`, error);
            return false;
        }
    }
}

// Create and export a singleton instance
export const audioSystem = new AudioSystem(); 