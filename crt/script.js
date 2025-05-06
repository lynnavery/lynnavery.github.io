class CRTViewer {
    constructor() {
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
        
        // Camera settings
        this.cameraHeight = 1.7; // Average human height
        this.cameraSpeed = 0.1;
        this.collisionRadius = 0.5; // Radius for collision detection
        
        // Zoom settings
        this.minFOV = 30;  // Maximum zoom in
        this.maxFOV = 100; // Maximum zoom out
        this.zoomSpeed = 2; // How fast to zoom
        
        // Frame buffer for TV screen delay
        this.frameBuffer = [];
        this.frameDelay = 5; // Number of frames to delay (30 frames ≈ 0.5 seconds at 60fps)
        this.currentFrame = 0;
        
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
    }

    setupMainScene() {
        // Create container with fixed aspect ratio
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        container.style.width = '100vh'; // Full viewport height
        container.style.height = '75vh'; // 3/4 of viewport height for 4:3 ratio
        container.style.overflow = 'hidden';
        document.body.appendChild(container);

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Create camera with 4:3 aspect ratio
        this.mainCamera = new THREE.PerspectiveCamera(100, 4/3, 0.1, 1000); // 4:3 ratio
        this.mainCamera.position.set(0, 0, 5);
        this.mainCamera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('mainCanvas'),
            antialias: true 
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        
        // Create render targets for feedback effect
        this.renderTargets = [];
        const numRenderTargets = 5; // Number of nested recursion levels
        
        for (let i = 0; i < numRenderTargets; i++) {
            this.renderTargets.push(new THREE.WebGLRenderTarget(512, 512, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBFormat
            }));
        }
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
        
        // Add point light for TV glow
        this.tvLight = new THREE.PointLight(0x88ff88, 2, 10); // Green glow
        this.tvLight.position.set(0, 0, 2);
        this.scene.add(this.tvLight);
        
        // Create environment
        this.createEnvironment();
        
        // Create CRT TV
        this.createCRTTV();

        // Store container reference
        this.container = container;
    }
    
    createEnvironment() {
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
        
        // Create some furniture or room elements
        const wallGeometry = new THREE.BoxGeometry(20, 10, 0.1);
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
        backWall.position.z = -5;
        backWall.position.y = 3;
        this.scene.add(backWall);
        
        // Add colorful shapes
        this.addColorfulShapes();
    }
    
    addColorfulShapes() {
        // Create an array of bright colors
        const colors = [
            0xff0000, // Red
            0x00ff00, // Green
            0x0000ff, // Blue
            0xffff00, // Yellow
            0xff00ff, // Magenta
            0x00ffff, // Cyan
            0xff8800, // Orange
            0x8800ff  // Purple
        ];
        
        // Add floating cubes
        for (let i = 0; i < 10; i++) {
            const size = Math.random() * 0.5 + 0.3;
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshStandardMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                emissive: colors[Math.floor(Math.random() * colors.length)],
                emissiveIntensity: 0.2,
                metalness: 0.8,
                roughness: 0.2
            });
            
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(
                (Math.random() - 0.5) * 10,
                Math.random() * 4,
                (Math.random() - 0.5) * 10
            );
            
            // Store initial position for animation
            cube.userData.initialY = cube.position.y;
            cube.userData.speed = Math.random() * 0.01 + 0.005;
            cube.userData.rotationSpeed = {
                x: Math.random() * 0.02 - 0.01,
                y: Math.random() * 0.02 - 0.01,
                z: Math.random() * 0.02 - 0.01
            };
            
            this.scene.add(cube);
        }
        
        // Add some spheres
        for (let i = 0; i < 5; i++) {
            const radius = Math.random() * 0.5 + 0.3;
            const geometry = new THREE.SphereGeometry(radius, 16, 16);
            const material = new THREE.MeshStandardMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                emissive: colors[Math.floor(Math.random() * colors.length)],
                emissiveIntensity: 0.2,
                metalness: 0.5,
                roughness: 0.3
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(
                (Math.random() - 0.5) * 10,
                Math.random() * 4,
                (Math.random() - 0.5) * 10
            );
            
            // Store initial position for animation
            sphere.userData.initialY = sphere.position.y;
            sphere.userData.speed = Math.random() * 0.01 + 0.005;
            
            this.scene.add(sphere);
        }
        
        // Add a torus knot
        const torusGeometry = new THREE.TorusKnotGeometry(0.8, 0.3, 64, 16);
        const torusMaterial = new THREE.MeshStandardMaterial({
            color: 0xff00ff,
            emissive: 0x880088,
            metalness: 0.7,
            roughness: 0.2
        });
        this.torusKnot = new THREE.Mesh(torusGeometry, torusMaterial);
        this.torusKnot.position.set(-3, 1, -2);
        this.scene.add(this.torusKnot);
    }

    createCRTTV() {
        console.log('Creating CRT TV...');
        
        // Create TV group
        this.tv = new THREE.Group();
        
        // Create TV body (a box)
        const tvBodyGeometry = new THREE.BoxGeometry(3, 2.5, 2);
        const tvBodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.3
        });
        const tvBody = new THREE.Mesh(tvBodyGeometry, tvBodyMaterial);
        this.tv.add(tvBody);
        
        // Create TV screen with feedback texture - using 4:3 aspect ratio
        const screenWidth = 2.5;
        const screenHeight = screenWidth * (3/4); // Maintain 4:3 aspect ratio
        const screenGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight);
        
        // Use the first render target as the screen texture
        const screenMaterial = new THREE.MeshBasicMaterial({
            map: this.renderTargets[0].texture,
            emissive: 0x88ff88, // Green glow
            emissiveIntensity: 0.9,
            transparent: true,
            opacity: 1
        });
        
        this.screen = new THREE.Mesh(screenGeometry, screenMaterial);
        this.screen.position.z = 1.01; // Slightly in front of the TV body
        this.tv.add(this.screen);
        
        // Add TV to scene
        this.tv.position.set(0, 1.7, 0);
        this.scene.add(this.tv);
        
        console.log('TV created and added to scene');
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
        
        // Add instructions for controls
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
        instructions.style.display = this.mouse.isLocked ? 'none' : 'block';
        instructions.style.zIndex = '1000';
        instructions.innerHTML = 'Click to use mouse controls<br>WASD to move, Mouse to look<br>Scroll to zoom';
        instructions.id = 'mouseInstructions';
        document.body.appendChild(instructions);
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

        // Update camera position based on controls
        this.updateCamera();

        // Temporarily hide the screen to avoid infinite feedback loop issues
        if (this.screen) {
            this.screen.visible = false;
        }
        
        // Create recursive feedback effect
        // First render the scene to the deepest render target
        for (let i = this.renderTargets.length - 1; i >= 0; i--) {
            // Render to current target
            this.renderer.setRenderTarget(this.renderTargets[i]);
            
            // For the deepest level, render the scene normally
            if (i === this.renderTargets.length - 1) {
                this.renderer.render(this.scene, this.mainCamera);
            } else {
                // For other levels, show the screen with the next level's texture
                if (this.screen && this.screen.material) {
                    // Save the current texture
                    const originalTexture = this.screen.material.map;
                    
                    // Set the texture to the next level's render target
                    this.screen.material.map = this.renderTargets[i + 1].texture;
                    this.screen.visible = true;
                    
                    // Render
                    this.renderer.render(this.scene, this.mainCamera);
                    
                    // Reset to original texture
                    this.screen.material.map = originalTexture;
                    this.screen.visible = false;
                }
            }
        }
        
        // Reset render target and show screen
        this.renderer.setRenderTarget(null);
        if (this.screen) {
            this.screen.visible = true;
        }

        // Render main scene
        this.renderer.render(this.scene, this.mainCamera);
        
        // Handle frame delay
        if (this.screen && this.screen.material) {
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
            
            // Apply delayed texture if we have enough frames
            if (this.frameBuffer.length === this.frameDelay) {
                this.screen.material.map = this.frameBuffer[0];
            }
        }
    }
}

// Initialize the viewer
new CRTViewer(); 