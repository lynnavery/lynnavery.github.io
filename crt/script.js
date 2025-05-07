import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

class CRTViewer {
    constructor() {
        console.log('CRTViewer constructor called');
        // Mouse controls
        this.mouse = {
            isLocked: false,
            sensitivity: 0.002
        };
        
        // Touch controls
        this.touch = {
            joystick: null,
            lookControls: null,
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
        
        // Zoom settings
        this.minFOV = 20;  // Maximum zoom in
        this.maxFOV = 70; // Maximum zoom out
        this.zoomSpeed = 2; // How fast to zoom
        
        // Frame buffer for TV screen delay
        this.frameDelay = 5; // Number of frames to delay (adjustable)
        this.frameBuffer = [];
        this.currentFrame = 0;
        
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
        
        this.init();
    }

    async init() {
        console.log('Initializing CRT Viewer...');
        
        // Initialize controls
        this.keys = {
            w: false, s: false, a: false, d: false,
            q: false, e: false,
            ArrowUp: false, ArrowDown: false,
            ArrowLeft: false, ArrowRight: false
        };
        
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

        // Create container with fixed aspect ratio
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        container.style.width = '100vh';
        container.style.height = '75vh';
        container.style.overflow = 'hidden';
        document.body.appendChild(container);
        console.log('Container created and added to body');

        // Now add fog after scene is created
        this.scene.fog = new THREE.Fog(0x000000, 2, 20);
        this.scene.fog.color.setRGB(0.1, 0.1, 0.1);
        console.log('Fog added to scene');
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true 
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);
        
        // Create camera with 4:3 aspect ratio
        this.mainCamera = new THREE.PerspectiveCamera(75, 4/3, 0.1, 1000);
        this.mainCamera.position.set(0, 1.7, 5);
        this.mainCamera.lookAt(0, 1.7, 0);

        // Add fog material
        const fogMaterial = new THREE.ShaderMaterial({
            uniforms: {
                fogColor: { value: new THREE.Color(0x000000) },
                fogNear: { value: 2 },
                fogFar: { value: 20 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 fogColor;
                uniform float fogNear;
                uniform float fogFar;
                varying vec3 vWorldPosition;
                
                void main() {
                    float depth = length(vWorldPosition);
                    float fogFactor = smoothstep(fogNear, fogFar, depth);
                    gl_FragColor = vec4(fogColor, fogFactor);
                }
            `,
            transparent: true,
            depthWrite: false
        });

        // Create render targets for feedback effect
        this.renderTargets = [];
        const numRenderTargets = 5;
        
        for (let i = 0; i < numRenderTargets; i++) {
            this.renderTargets.push(new THREE.WebGLRenderTarget(512, 512, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBFormat,
                stencilBuffer: false,
                depthBuffer: false
            }));
        }

        // Create a full-screen quad for the fog effect
        const fogGeometry = new THREE.PlaneGeometry(2, 2);
        const fogQuad = new THREE.Mesh(fogGeometry, fogMaterial);
        fogQuad.position.z = -1;
        this.scene.add(fogQuad);

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        ambientLight.intensity = 0.8;
        this.scene.add(ambientLight);
        
        // Add directional light from above
        const overheadLight = new THREE.DirectionalLight(0xffffff, 1.2);
        overheadLight.position.set(0, 10, 0);
        overheadLight.target.position.set(0, 0, 0);
        overheadLight.castShadow = true;
        overheadLight.shadow.mapSize.width = 1024;
        overheadLight.shadow.mapSize.height = 1024;
        overheadLight.shadow.camera.near = 1;
        overheadLight.shadow.camera.far = 30;
        overheadLight.shadow.camera.left = -10;
        overheadLight.shadow.camera.right = 10;
        overheadLight.shadow.camera.top = 10;
        overheadLight.shadow.camera.bottom = -10;
        this.scene.add(overheadLight);
        this.scene.add(overheadLight.target);

        // Create TV group
        this.tv = new THREE.Group();
        
        // Create TV body
        const tvBodyGeometry = new THREE.BoxGeometry(3, 2.5, 2);
        const tvBodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.3
        });
        const tvBody = new THREE.Mesh(tvBodyGeometry, tvBodyMaterial);
        this.tv.add(tvBody);

        // Create TV screen
        const screenWidth = 2.5;
        const screenHeight = screenWidth * (3/4);
        const screenGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight);
        
        const screenMaterial = new THREE.MeshStandardMaterial({
            map: this.renderTargets[0].texture,
            color: 0xffffff,
            emissive: 0x00ff00,
            emissiveIntensity: 0.005,
            transparent: false,
            opacity: 1.0
        });
        
        this.screen = new THREE.Mesh(screenGeometry, screenMaterial);
        this.screen.position.z = 1.01;
        this.tv.add(this.screen);

        // Add TV to scene
        this.tv.position.set(0, 1.7, 0);
        this.scene.add(this.tv);

        // Store container reference
        this.container = container;

        // Create the environment and setup
        this.createEnvironment();
        this.setupLighting();
        this.setupGlowEffects();

        // Add instructions
        const instructions = document.createElement('div');
        instructions.style.position = 'fixed';
        instructions.style.top = '50%';
        instructions.style.left = '50%';
        instructions.style.transform = 'translate(-50%, -50%)';
        instructions.style.color = 'white';
        instructions.style.background = 'rgba(0, 0, 0, 0.7)';
        instructions.style.padding = '20px';
        instructions.style.borderRadius = '5px';
        instructions.style.textAlign = 'center';
        instructions.style.fontFamily = 'monospace';
        instructions.style.display = 'none';
        instructions.style.zIndex = '1000';
        instructions.innerHTML = 'Click to use mouse controls<br>WASD to move, Mouse to look<br>Scroll to zoom<br>Press P to toggle HUD';
        instructions.id = 'mouseInstructions';
        document.body.appendChild(instructions);
        this.instructions = instructions;
    }

    createEnvironment() {
        console.log('Creating environment...');
        
        // Create a floor
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2;
        this.scene.add(floor);
        
        // Create walls
        const wallGeometry = new THREE.BoxGeometry(20, 10, 0.1);
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
        
        // Back wall
        const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
        backWall.position.z = -5;
        backWall.position.y = 3;
        this.scene.add(backWall);
        
        // Side walls
        const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.x = -10;
        leftWall.position.y = 3;
        this.scene.add(leftWall);
        
        const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
        rightWall.rotation.y = Math.PI / 2;
        rightWall.position.x = 10;
        rightWall.position.y = 3;
        this.scene.add(rightWall);

        // Create TV
        const tvBodyGeometry = new THREE.BoxGeometry(3, 2.5, 2);
        const tvBodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.3
        });
        
        this.tv = new THREE.Group();
        const tvBody = new THREE.Mesh(tvBodyGeometry, tvBodyMaterial);
        this.tv.add(tvBody);

        // Create TV screen
        const screenWidth = 2.5;
        const screenHeight = screenWidth * (3/4);
        const screenGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight);
        
        const screenMaterial = new THREE.MeshStandardMaterial({
            map: this.renderTargets[0].texture,
            color: 0xffffff,
            emissive: 0x00ff00,
            emissiveIntensity: 0.005,
            transparent: false,
            opacity: 1.0
        });
        
        this.screen = new THREE.Mesh(screenGeometry, screenMaterial);
        this.screen.position.z = 1.01;
        this.tv.add(this.screen);

        // Position and add TV to scene
        this.tv.position.set(0, 1.7, 0);
        this.scene.add(this.tv);
    }

    setupLighting() {
        // Add point light for TV glow
        this.tvLight = new THREE.PointLight(0x00ff00, 1.5, 15);
        this.tvLight.position.set(0, 1.7, 2);
        this.tvLight.castShadow = true;
        this.tvLight.shadow.mapSize.width = 1024;
        this.tvLight.shadow.mapSize.height = 1024;
        this.tvLight.shadow.camera.near = 0.5;
        this.tvLight.shadow.camera.far = 20;
        this.tvLight.shadow.bias = -0.0001;
        this.scene.add(this.tvLight);

        // Add wider ambient TV glow
        this.tvAmbientLight = new THREE.PointLight(0x88ff88, 0.4, 25);
        this.tvAmbientLight.position.set(0, 1.7, 1);
        this.tvAmbientLight.castShadow = true;
        this.tvAmbientLight.shadow.mapSize.width = 512;
        this.tvAmbientLight.shadow.mapSize.height = 512;
        this.tvAmbientLight.shadow.camera.near = 0.5;
        this.tvAmbientLight.shadow.camera.far = 20;
        this.scene.add(this.tvAmbientLight);

        // Add volumetric glow effects
        this.setupGlowEffects();
    }

    setupGlowEffects() {
        // Add volumetric green glow effect
        const glowGeometry = new THREE.PlaneGeometry(4, 3.5);
        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                varying vec2 vUv;
                void main() {
                    vec2 center = vec2(0.5);
                    float dist = length(vUv - center);
                    float alpha = smoothstep(0.9, 0.1, dist) * 0.15;
                    float pulse = sin(time * 1.5) * 0.05 + 0.95;
                    float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
                    alpha *= (0.95 + noise * 0.05);
                    gl_FragColor = vec4(0.0, 1.0, 0.0, alpha * pulse);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
        });
        
        const glowPlane = new THREE.Mesh(glowGeometry, glowMaterial);
        glowPlane.position.z = 0.99;
        this.tv.add(glowPlane);
        this.glowMaterial = glowMaterial;

        // Add wider glow effect
        const wideGlowGeometry = new THREE.PlaneGeometry(6, 4.5);
        const wideGlowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: glowMaterial.vertexShader,
            fragmentShader: `
                uniform float time;
                varying vec2 vUv;
                void main() {
                    vec2 center = vec2(0.5);
                    float dist = length(vUv - center);
                    float alpha = smoothstep(1.0, 0.2, dist) * 0.08;
                    float pulse = sin(time * 1.2) * 0.03 + 0.97;
                    float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
                    alpha *= (0.97 + noise * 0.03);
                    gl_FragColor = vec4(0.0, 1.0, 0.0, alpha * pulse);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
        });

        const wideGlowPlane = new THREE.Mesh(wideGlowGeometry, wideGlowMaterial);
        wideGlowPlane.position.z = 0.98;
        this.tv.add(wideGlowPlane);
        this.wideGlowMaterial = wideGlowMaterial;
    }

    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
        
        // Mouse controls
        document.addEventListener('click', this.onMouseClick.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('wheel', this.onMouseWheel.bind(this));
        
        // Touch controls
        this.setupTouchControls();
        
        // Pointer lock change
        document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
        document.addEventListener('pointerlockerror', () => {
            console.error('Pointer lock error');
        });
        
        // Window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    setupTouchControls() {
        // Create joystick container
        const joystickContainer = document.createElement('div');
        joystickContainer.style.position = 'fixed';
        joystickContainer.style.bottom = '30px';
        joystickContainer.style.left = '30px';
        joystickContainer.style.width = '150px';
        joystickContainer.style.height = '150px';
        joystickContainer.style.background = 'rgba(255, 255, 255, 0.2)';
        joystickContainer.style.borderRadius = '50%';
        joystickContainer.style.touchAction = 'none';
        joystickContainer.style.zIndex = '1000';
        document.body.appendChild(joystickContainer);

        // Create joystick handle
        const joystickHandle = document.createElement('div');
        joystickHandle.style.position = 'absolute';
        joystickHandle.style.width = '60px';
        joystickHandle.style.height = '60px';
        joystickHandle.style.background = 'rgba(255, 255, 255, 0.5)';
        joystickHandle.style.borderRadius = '50%';
        joystickHandle.style.top = '50%';
        joystickHandle.style.left = '50%';
        joystickHandle.style.transform = 'translate(-50%, -50%)';
        joystickContainer.appendChild(joystickHandle);

        // Create look controls container
        const lookControls = document.createElement('div');
        lookControls.style.position = 'fixed';
        lookControls.style.bottom = '30px';
        lookControls.style.right = '30px';
        lookControls.style.width = '200px';
        lookControls.style.height = '200px';
        lookControls.style.background = 'rgba(255, 255, 255, 0.2)';
        lookControls.style.borderRadius = '50%';
        lookControls.style.touchAction = 'none';
        lookControls.style.zIndex = '1000';
        document.body.appendChild(lookControls);

        // Store references
        this.touch.joystick = {
            container: joystickContainer,
            handle: joystickHandle,
            active: false,
            position: { x: 0, y: 0 }
        };

        this.touch.lookControls = {
            container: lookControls,
            active: false,
            position: { x: 0, y: 0 }
        };

        // Add touch event listeners
        joystickContainer.addEventListener('touchstart', this.onJoystickStart.bind(this));
        joystickContainer.addEventListener('touchmove', this.onJoystickMove.bind(this));
        joystickContainer.addEventListener('touchend', this.onJoystickEnd.bind(this));

        lookControls.addEventListener('touchstart', this.onLookStart.bind(this));
        lookControls.addEventListener('touchmove', this.onLookMove.bind(this));
        lookControls.addEventListener('touchend', this.onLookEnd.bind(this));
    }

    onJoystickStart(event) {
        event.preventDefault();
        this.touch.joystick.active = true;
        this.updateJoystickPosition(event.touches[0]);
    }

    onJoystickMove(event) {
        event.preventDefault();
        if (this.touch.joystick.active) {
            this.updateJoystickPosition(event.touches[0]);
        }
    }

    onJoystickEnd(event) {
        event.preventDefault();
        this.touch.joystick.active = false;
        this.touch.joystick.handle.style.transform = 'translate(-50%, -50%)';
        this.touch.joystick.position = { x: 0, y: 0 };
    }

    updateJoystickPosition(touch) {
        const rect = this.touch.joystick.container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = touch.clientX - centerX;
        const deltaY = touch.clientY - centerY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = rect.width / 2;
        
        if (distance > maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            this.touch.joystick.position.x = Math.cos(angle) * maxDistance;
            this.touch.joystick.position.y = Math.sin(angle) * maxDistance;
        } else {
            this.touch.joystick.position.x = deltaX;
            this.touch.joystick.position.y = deltaY;
        }
        
        this.touch.joystick.handle.style.transform = 
            `translate(calc(-50% + ${this.touch.joystick.position.x}px), calc(-50% + ${this.touch.joystick.position.y}px))`;
    }

    onLookStart(event) {
        event.preventDefault();
        this.touch.lookControls.active = true;
        this.touch.lastTouchX = event.touches[0].clientX;
        this.touch.lastTouchY = event.touches[0].clientY;
    }

    onLookMove(event) {
        event.preventDefault();
        if (this.touch.lookControls.active) {
            const touch = event.touches[0];
            const deltaX = touch.clientX - this.touch.lastTouchX;
            const deltaY = touch.clientY - this.touch.lastTouchY;
            
            this.mainCamera.rotation.y -= deltaX * this.mouse.sensitivity * 0.5;
            
            const newRotationX = this.mainCamera.rotation.x - deltaY * this.mouse.sensitivity * 0.5;
            this.mainCamera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, newRotationX));
            
            this.touch.lastTouchX = touch.clientX;
            this.touch.lastTouchY = touch.clientY;
        }
    }

    onLookEnd(event) {
        event.preventDefault();
        this.touch.lookControls.active = false;
    }

    onKeyDown(event) {
        if (this.keys.hasOwnProperty(event.key)) {
            this.keys[event.key] = true;
        }
        
        // Toggle HUD visibility with 'p' key
        if (event.key.toLowerCase() === 'p') {
            this.hudVisible = !this.hudVisible;
            if (this.instructions) {
                this.instructions.style.display = this.hudVisible ? 'block' : 'none';
            }
        }
    }
    
    onKeyUp(event) {
        if (this.keys.hasOwnProperty(event.key)) {
            this.keys[event.key] = false;
        }
    }
    
    onMouseClick() {
        if (!this.mouse.isLocked) {
            // Lock the pointer
            document.body.requestPointerLock();
        }
    }
    
    onPointerLockChange() {
        this.mouse.isLocked = document.pointerLockElement === document.body;
        const instructions = document.getElementById('mouseInstructions');
        if (instructions) {
            instructions.style.display = this.mouse.isLocked ? 'none' : 'block';
        }
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
    
    onMouseWheel(event) {
        // Calculate new FOV based on scroll direction
        const delta = event.deltaY * 0.01;
        const newFOV = this.mainCamera.fov + delta * this.zoomSpeed;
        
        // Clamp FOV between min and max values
        this.mainCamera.fov = Math.max(this.minFOV, Math.min(this.maxFOV, newFOV));
        
        // Update camera projection matrix
        this.mainCamera.updateProjectionMatrix();
    }
    
    onWindowResize() {
        // Update container size
        this.container.style.width = '100vh';
        this.container.style.height = '75vh';

        // Update renderer size
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        
        // Update camera aspect ratio (maintain 4:3)
        this.mainCamera.aspect = 4/3;
        this.mainCamera.updateProjectionMatrix();
    }
    
    updateCamera() {
        const moveSpeed = this.cameraSpeed;

        // Create a direction vector based on camera rotation
        const direction = new THREE.Vector3();
        this.mainCamera.getWorldDirection(direction);
        direction.y = 0; // Keep movement horizontal
        direction.normalize();

        // Create a right vector perpendicular to direction
        const right = new THREE.Vector3();
        right.crossVectors(this.mainCamera.up, direction).normalize();

        // Calculate new position
        const newPosition = this.mainCamera.position.clone();
        
        // Movement relative to camera direction
        if (this.keys.w || this.touch.joystick.position.y < -10) {
            newPosition.addScaledVector(direction, moveSpeed);
        }
        if (this.keys.s || this.touch.joystick.position.y > 10) {
            newPosition.addScaledVector(direction, -moveSpeed);
        }
        if (this.keys.a || this.touch.joystick.position.x < -10) {
            newPosition.addScaledVector(right, moveSpeed);
        }
        if (this.keys.d || this.touch.joystick.position.x > 10) {
            newPosition.addScaledVector(right, -moveSpeed);
        }

        // Check for collisions with objects
        const canMove = this.checkCollisions(newPosition);
        
        if (canMove) {
            // Update position while maintaining height
            this.mainCamera.position.x = newPosition.x;
            this.mainCamera.position.z = newPosition.z;
            this.mainCamera.position.y = this.cameraHeight; // Lock to walking height
        }
        
        // Update green overlay position to follow camera
        if (this.greenOverlay) {
            this.greenOverlay.position.copy(this.mainCamera.position);
            this.greenOverlay.quaternion.copy(this.mainCamera.quaternion);
            this.greenOverlay.translateZ(-0.5); // Position slightly in front of camera
        }
        
        // Animate shapes
        this.animateShapes();
    }

    checkCollisions(newPosition) {
        // Create a raycaster for collision detection
        const raycaster = new THREE.Raycaster();
        const collisionObjects = [];
        
        // Collect all objects that should have collision
        this.scene.children.forEach(child => {
            // Skip lights, the TV screen, and other non-collidable objects
            if (child.isLight || child === this.screen || child === this.tv) return;
            
            // Add floor and walls to collision objects
            if (child.geometry && (child.geometry.type === 'PlaneGeometry' || child.geometry.type === 'BoxGeometry')) {
                collisionObjects.push(child);
            }
        });

        // Check for collisions in 8 directions around the player
        const directions = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(0.707, 0, 0.707),
            new THREE.Vector3(-0.707, 0, 0.707),
            new THREE.Vector3(0.707, 0, -0.707),
            new THREE.Vector3(-0.707, 0, -0.707)
        ];

        for (const dir of directions) {
            raycaster.set(newPosition, dir);
            const intersects = raycaster.intersectObjects(collisionObjects);
            
            if (intersects.length > 0 && intersects[0].distance < this.collisionRadius) {
                return false; // Collision detected
            }
        }

        return true; // No collision
    }
    
    animateShapes() {
        // Animate the shapes
        const time = Date.now() * 0.001;
        
        // Animate cubes and spheres
        this.scene.children.forEach(child => {
            if (child.userData && child.userData.initialY !== undefined) {
                // Bob up and down
                child.position.y = child.userData.initialY + Math.sin(time * child.userData.speed * 10) * 0.5;
                
                // Rotate if it has rotation speed
                if (child.userData.rotationSpeed) {
                    child.rotation.x += child.userData.rotationSpeed.x;
                    child.rotation.y += child.userData.rotationSpeed.y;
                    child.rotation.z += child.userData.rotationSpeed.z;
                }
            }
        });
        
        // Animate torus knot
        if (this.torusKnot) {
            this.torusKnot.rotation.x = time * 0.3;
            this.torusKnot.rotation.y = time * 0.2;
        }
    }
    
    applyCRTEffect(ctx, width, height) {
        try {
            // Get image data from the context
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            
            // Add scan lines
            for (let y = 0; y < height; y += 2) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    data[idx] = Math.max(0, data[idx] - 30);     // R
                    data[idx + 1] = Math.max(0, data[idx + 1] - 30); // G
                    data[idx + 2] = Math.max(0, data[idx + 2] - 30); // B
                }
            }
            
            // Add static noise
            for (let i = 0; i < data.length; i += 4) {
                const noise = Math.random() * 20 - 10;
                data[i] = Math.max(0, Math.min(255, data[i] + noise));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
            }
            
            // Put the modified data back
            ctx.putImageData(imageData, 0, 0);
        } catch (e) {
            console.error('Error applying CRT effect:', e);
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        // Update glow effects
        const time = performance.now() * 0.001;
        if (this.glowMaterial) {
            this.glowMaterial.uniforms.time.value = time;
        }
        if (this.wideGlowMaterial) {
            this.wideGlowMaterial.uniforms.time.value = time;
        }

        // Update camera position based on controls
        this.updateCamera();

        // Create recursive feedback effect
        for (let i = this.recursionLevels - 1; i >= 0; i--) {
            // Render to current recursion buffer
            this.renderer.setRenderTarget(this.recursionBuffers[i]);

            if (i === this.recursionLevels - 1) {
                // For the deepest level, render the scene normally
                this.renderer.render(this.scene, this.mainCamera);
            } else {
                // For other levels, use the next level's texture
                if (this.screen && this.screen.material) {
                    // Save current state
                    const originalTexture = this.screen.material.map;
                    const wasVisible = this.screen.visible;
                    
                    // Update screen for this recursion level
                    this.screen.material.map = this.recursionBuffers[i + 1].texture;
                    this.screen.visible = true;
                    
                    // Render the scene
                    this.renderer.render(this.scene, this.mainCamera);
                    
                    // Restore original state
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

        // Store the current frame
        this.frameBuffer.push(currentRenderTarget.texture);

        // Keep buffer at desired length
        if (this.frameBuffer.length > this.frameDelay) {
            const oldTexture = this.frameBuffer.shift();
            oldTexture.dispose(); // Clean up old texture
        }

        // Show screen and update its texture
        if (this.screen) {
            this.screen.visible = true;
            // Apply delayed texture if we have enough frames
            if (this.frameBuffer.length === this.frameDelay) {
                this.screen.material.map = this.frameBuffer[0];
            }
        }

        // Render main scene with the first recursion level
        this.renderer.render(this.scene, this.mainCamera);
    }
}

// Initialize the viewer
new CRTViewer(); 