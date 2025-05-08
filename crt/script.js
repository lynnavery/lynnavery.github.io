// Find the latest version by visiting https://unpkg.com/three, currently it's 0.126.1
import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.126.1/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'https://unpkg.com/three@0.126.1/examples/jsm/loaders/FBXLoader.js';
import { EffectComposer } from 'https://unpkg.com/three@0.126.1/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.126.1/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.126.1/examples/jsm/postprocessing/UnrealBloomPass.js';

export class CRTViewer {
    constructor(containerElement) {
        if (!containerElement) {
            throw new Error('Container element must be provided to CRTViewer');
        }
        console.log('CRTViewer constructor called');
        // Mouse controls
        this.mouse = {
            isLocked: false,
            sensitivity: 0.0008
        };
        
        // Gyroscope controls
        this.gyroscope = {
            enabled: false,
            sensitivity: 0.01,
            lastBeta: 0,
            lastGamma: 0,
            lastAlpha: 0,
            smoothing: 0.1,
            isPortrait: window.innerHeight > window.innerWidth
        };
        
        // Store the container element
        this.containerElement = containerElement;
        
        // Camera shake settings
        this.cameraShake = {
            enabled: true,
            intensity: 0.01,
            rotationIntensity: 0.000005,
            fovIntensity: 0.5,
            decay: 0.65,
            currentShake: { x: 0, y: 0, z: 0 },
            currentRotation: { x: 0, y: 0, z: 0 },
            currentFOV: 0
        };

        // FOV settings (for camera shake only)
        this.minFOV = 20;  // Minimum FOV for shake
        this.maxFOV = 30;  // Maximum FOV for shake
        
        // Touch controls
        this.touch = {
            isTouching: false,
            lastTouchX: 0,
            lastTouchY: 0
        };
        
        // HUD visibility
        this.hudVisible = false;
        
        // Camera settings
        this.cameraHeight = 1.7; // Average human height
        this.cameraSpeed = 0.1;
        this.collisionRadius = 0.5; // Radius for collision detection
        
        // Frame buffer for TV screen delay
        this.frameDelay = 5; // Number of frames to delay (adjustable)
        this.frameBuffer = [];
        // this.currentFrame = 0; // Unused
        
        // Create recursive feedback buffers
        this.recursionLevels = 8; // Number of recursion levels
        this.recursionBuffers = [];
        for (let i = 0; i < this.recursionLevels; i++) {
            this.recursionBuffers.push(new THREE.WebGLRenderTarget(512, 512, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBFormat,
                stencilBuffer: false,
                depthBuffer: false
            }));
        }
        
        // For the initial state of the TV screen material's map
        this.screenInitialRenderTarget = new THREE.WebGLRenderTarget(512, 512, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBFormat,
            stencilBuffer: false,
            depthBuffer: false
        });

        this.init();
    }

    async init() {
        console.log('Initializing CRT Viewer...');
        
        // Set up main scene
        this.setupMainScene();
        
        // Set up controls
        this.setupControls();
        
        // Start animation loop
        this.animate();
        console.log('Initialization complete');
    }

    setupMainScene() {
        console.log('Setting up main scene...');
        
        // Create scene first
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        console.log('Scene created');

        // Use the provided container
        const container = this.containerElement;
        console.log('Container configured (assuming CSS or direct style handles dimensions)');
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true 
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);
        
        // Create camera with 4:3 aspect ratio, positioned to face the screen
        this.mainCamera = new THREE.PerspectiveCamera(25, 4/3, 0.1, 1000);
        this.mainCamera.position.set(0, 0, 5); // Position camera 5 units away from screen
        this.mainCamera.lookAt(0, 0, 0); // Look at center where screen will be

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        ambientLight.intensity = 0.8;
        this.scene.add(ambientLight);

        // Add directional light from above
        const overheadLight = new THREE.DirectionalLight(0xffffff, 1.2);
        overheadLight.position.set(0, 5, 0);
        overheadLight.target.position.set(0, 0, 0);
        this.scene.add(overheadLight);
        this.scene.add(overheadLight.target);

        // Add rim light from behind
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
        rimLight.position.set(0, 0, -5);
        rimLight.target.position.set(0, 0, 0);
        this.scene.add(rimLight);
        this.scene.add(rimLight.target);

        // Add TV glow light
        this.tvLight = new THREE.PointLight(0xffffff, 1.5, 15);
        this.tvLight.position.set(0, 0, 2);
        this.scene.add(this.tvLight);

        // Add wider ambient TV glow
        this.tvAmbientLight = new THREE.PointLight(0xffffff, 0.2, 25);
        this.tvAmbientLight.position.set(0, 0, 1);
        this.scene.add(this.tvAmbientLight);

        // Add colored accent lights
        const leftAccent = new THREE.PointLight(0x4444ff, 0.5, 10);
        leftAccent.position.set(-3, 0, 0);
        this.scene.add(leftAccent);

        const rightAccent = new THREE.PointLight(0xff4444, 0.5, 10);
        rightAccent.position.set(3, 0, 0);
        this.scene.add(rightAccent);

        // Create TV screen
        const screenWidth = 2.5;
        const screenHeight = screenWidth * (3/4);
        const screenGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight);
        
        const screenMaterial = new THREE.MeshStandardMaterial({
            map: this.screenInitialRenderTarget.texture,
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            emissive: 0xffffff,
            emissiveIntensity: 0.0008, // Subtle glow
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.screen = new THREE.Mesh(screenGeometry, screenMaterial);
        this.screen.position.z = 0; // Center of scene
        this.scene.add(this.screen);

        // Add cats image overlay
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('cats.png', (texture) => {
            const overlayGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight * 0.8); // Slightly smaller than the screen
            const overlayMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 1,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
            overlay.position.z = 0.01; // Slightly in front of the screen
            this.scene.add(overlay);
        });

        // In setupMainScene(), after renderer is created and appended:
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.mainCamera));
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(container.clientWidth, container.clientHeight),
            0.0000001, // strength
            0.1, // radius
            0.1  // threshold
        );
        this.composer.addPass(bloomPass);
    }

    setupControls() {
        // Mouse controls
        document.addEventListener('click', this.onMouseClick.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        
        // Touch controls
        this.containerElement.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.containerElement.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.containerElement.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        // Gyroscope controls
        window.addEventListener('deviceorientation', this.onDeviceOrientation.bind(this));
        
        // Pointer lock change
        document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
        document.addEventListener('pointerlockerror', () => {
            console.error('Pointer lock error');
        });
        
        // Window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    onMouseClick() {
        if (!this.mouse.isLocked) {
            // Lock the pointer
            document.body.requestPointerLock();
        }
    }
    
    onPointerLockChange() {
        this.mouse.isLocked = document.pointerLockElement === document.body;
    }
    
    onTouchStart(event) {
        event.preventDefault();
        this.touch.isTouching = true;
        this.touch.lastTouchX = event.touches[0].clientX;
        this.touch.lastTouchY = event.touches[0].clientY;
    }

    onTouchMove(event) {
        event.preventDefault();
        if (this.touch.isTouching) {
            const touch = event.touches[0];
            const deltaX = touch.clientX - this.touch.lastTouchX;
            const deltaY = touch.clientY - this.touch.lastTouchY;
            
            // Update camera rotation based on touch movement
            this.mainCamera.rotation.y -= deltaX * this.mouse.sensitivity * 0.5;
            
            // Limit up/down rotation to avoid flipping
            const newRotationX = this.mainCamera.rotation.x - deltaY * this.mouse.sensitivity * 0.5;
            this.mainCamera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, newRotationX));
            
            this.touch.lastTouchX = touch.clientX;
            this.touch.lastTouchY = touch.clientY;
        }
    }

    onTouchEnd(event) {
        event.preventDefault();
        this.touch.isTouching = false;
    }

    onMouseMove(event) {
        if (this.mouse.isLocked) {
            // Update camera rotation based on mouse movement
            this.mainCamera.rotation.y -= event.movementX * this.mouse.sensitivity;
            
            // Limit up/down rotation to avoid flipping
            const newRotationX = this.mainCamera.rotation.x - event.movementY * this.mouse.sensitivity;
            this.mainCamera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, newRotationX));
        }
    }

    onWindowResize() {
        const containerWidth = this.containerElement.clientWidth;
        this.renderer.setSize(containerWidth, this.containerElement.clientHeight);
        this.mainCamera.aspect = containerWidth / this.containerElement.clientHeight;
        this.mainCamera.updateProjectionMatrix();
        this.composer.setSize(containerWidth, this.containerElement.clientHeight);
        
        // Update orientation mode
        this.gyroscope.isPortrait = window.innerHeight > window.innerWidth;
    }

    onDeviceOrientation(event) {
        // Debug logging
        console.log('Device Orientation Event:', {
            alpha: event.alpha,
            beta: event.beta,
            gamma: event.gamma,
            absolute: event.absolute
        });

        // Check if device orientation is available
        if (event.beta === null || event.gamma === null || event.alpha === null) {
            console.log('Device orientation not available');
            return;
        }

        // Update orientation mode
        this.gyroscope.isPortrait = window.innerHeight > window.innerWidth;
        console.log('Is Portrait Mode:', this.gyroscope.isPortrait);

        // Enable gyroscope controls if not already enabled
        if (!this.gyroscope.enabled) {
            console.log('Enabling gyroscope controls');
            this.gyroscope.enabled = true;
            this.gyroscope.lastBeta = event.beta;
            this.gyroscope.lastGamma = event.gamma;
            this.gyroscope.lastAlpha = event.alpha;
            return;
        }

        // Calculate rotation changes with smoothing
        const beta = event.beta; // -180 to 180 (front/back)
        const gamma = event.gamma; // -90 to 90 (left/right)
        const alpha = event.alpha; // 0 to 360 (compass direction)

        // Apply smoothing
        const betaDelta = (beta - this.gyroscope.lastBeta) * this.gyroscope.smoothing;
        const gammaDelta = (gamma - this.gyroscope.lastGamma) * this.gyroscope.smoothing;
        const alphaDelta = (alpha - this.gyroscope.lastAlpha) * this.gyroscope.smoothing;

        console.log('Rotation Deltas:', {
            betaDelta,
            gammaDelta,
            alphaDelta
        });

        if (this.gyroscope.isPortrait) {
            // Portrait mode controls
            // Use gamma for left/right rotation (more natural in portrait)
            this.mainCamera.rotation.y -= gammaDelta * this.gyroscope.sensitivity * 1.5;
            
            // Use beta for up/down rotation
            const newRotationX = this.mainCamera.rotation.x - betaDelta * this.gyroscope.sensitivity;
            this.mainCamera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, newRotationX));
        } else {
            // Landscape mode controls (original behavior)
            const newRotationX = this.mainCamera.rotation.x - betaDelta * this.gyroscope.sensitivity;
            this.mainCamera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, newRotationX));
            this.mainCamera.rotation.y -= gammaDelta * this.gyroscope.sensitivity;
        }

        // Store current values for next frame
        this.gyroscope.lastBeta = beta;
        this.gyroscope.lastGamma = gamma;
        this.gyroscope.lastAlpha = alpha;
    }

    applyCameraShake() {
        // Generate new random shake values
        const shake = this.cameraShake;
        
        // Position shake
        shake.currentShake.x = (Math.random() - 0.5) * shake.intensity;
        shake.currentShake.y = (Math.random() - 0.5) * shake.intensity;
        shake.currentShake.z = (Math.random() - 0.5) * shake.intensity;
        
        // Rotation shake
        shake.currentRotation.x = (Math.random() - 0.5) * shake.rotationIntensity;
        shake.currentRotation.y = (Math.random() - 0.5) * shake.rotationIntensity;
        shake.currentRotation.z = (Math.random() - 0.5) * shake.rotationIntensity;

        // FOV shake
        shake.currentFOV = (Math.random() - 0.5) * shake.fovIntensity;
        
        // Apply position shake
        this.mainCamera.position.x += shake.currentShake.x;
        this.mainCamera.position.y += shake.currentShake.y;
        this.mainCamera.position.z += shake.currentShake.z;
        
        // Apply rotation shake
        this.mainCamera.rotation.x += shake.currentRotation.x;
        this.mainCamera.rotation.y += shake.currentRotation.y;
        this.mainCamera.rotation.z += shake.currentRotation.z;

        // Apply FOV shake
        const newFOV = this.mainCamera.fov + shake.currentFOV;
        this.mainCamera.fov = Math.max(this.minFOV - 0.2, Math.min(this.maxFOV + 0.2, newFOV));
        this.mainCamera.updateProjectionMatrix(); // Required after FOV change
        
        // Apply decay to make it more natural
        shake.intensity *= shake.decay;
        shake.rotationIntensity *= shake.decay;
        shake.fovIntensity *= shake.decay;
        
        // Reset intensity if it gets too small
        if (shake.intensity < 0.0005) {
            shake.intensity = 0.001;
        }
        if (shake.rotationIntensity < 0.00002) {
            shake.rotationIntensity = 0.00005;
        }
        if (shake.fovIntensity < 0.05) {
            shake.fovIntensity = 0.15;
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        // Apply camera shake
        if (this.cameraShake.enabled) {
            this.applyCameraShake();
        }

        // Create recursive feedback effect
        for (let i = this.recursionLevels - 1; i >= 0; i--) {
            this.renderer.setRenderTarget(this.recursionBuffers[i]);

            if (i === this.recursionLevels - 1) {
                this.renderer.render(this.scene, this.mainCamera);
            } else {
                if (this.screen && this.screen.material) {
                    const originalTexture = this.screen.material.map;
                    const wasVisible = this.screen.visible;
                    
                    this.screen.material.map = this.recursionBuffers[i + 1].texture;
                    this.screen.visible = true;
                    
                    this.renderer.render(this.scene, this.mainCamera);
                    
                    this.screen.material.map = originalTexture;
                    this.screen.visible = wasVisible;
                }
            }
        }

        // Create a new render target for the current frame
        const currentRenderTarget = new THREE.WebGLRenderTarget(
            this.renderer.getSize(new THREE.Vector2()).x,
            this.renderer.getSize(new THREE.Vector2()).y,
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBFormat
            }
        );

        // Render the current frame to the new render target
        this.renderer.setRenderTarget(currentRenderTarget);
        this.renderer.render(this.scene, this.mainCamera);
        this.renderer.setRenderTarget(null);

        // Store the current frame's texture
        this.frameBuffer.push(currentRenderTarget.texture);

        // Keep buffer at desired length
        if (this.frameBuffer.length > this.frameDelay) {
            const oldTexture = this.frameBuffer.shift();
            if (oldTexture) {
                oldTexture.dispose();
            }
        }

        // Show screen and update its texture
        if (this.screen && this.screen.material) {
            this.screen.visible = true;
            if (this.frameBuffer.length === this.frameDelay && this.frameBuffer[0]) {
                this.screen.material.map = this.frameBuffer[0];
                this.screen.material.needsUpdate = true;
            } else if (!this.screen.material.map) {
                this.screen.material.map = this.screenInitialRenderTarget.texture;
                this.screen.material.needsUpdate = true;
            }
        }

        // Render main scene to the canvas
        this.composer.render();
    }
}

// Initialize the viewer
export { CRTViewer }; 