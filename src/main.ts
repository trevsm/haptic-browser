import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PinField } from './PinField';
import { Device } from './Device';
import { defaultConfig } from './config';
import type { SimulationConfig } from './config';
import './style.css';

/**
 * Haptic Browser - Main Application
 * Visual simulation of a tactile pin display for accessible web browsing
 */
class HapticBrowser {
  private config: SimulationConfig = defaultConfig;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  
  private pinField!: PinField;
  private device!: Device;
  
  private clock!: THREE.Clock;
  private fpsElement!: HTMLElement;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;

  constructor() {
    // Ensure DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  private updateLoader(message: string, progress: number) {
    const loaderMessage = document.getElementById('loader-message');
    const progressBar = document.getElementById('progress-bar');
    const loaderProgress = document.getElementById('loader-progress');
    
    if (loaderMessage) loaderMessage.textContent = message;
    if (progressBar) {
      // Force a reflow to ensure smooth animation
      progressBar.offsetHeight;
      progressBar.style.width = `${progress}%`;
    }
    if (loaderProgress) loaderProgress.textContent = `${Math.round(progress)}%`;
  }

  private init() {
    try {
      // Make body visible now that CSS has loaded
      document.body.style.visibility = 'visible';
      document.body.style.opacity = '1';
      
      // Progress callback for real-time updates
      const updateProgress = (progress: number, message: string) => {
        this.updateLoader(message, progress);
      };
      
      this.updateLoader('Checking WebGL support...', 5);
      
      // Check WebGL support
      if (!this.isWebGLAvailable()) {
        throw new Error('WebGL is not supported in this browser');
      }
      
      this.updateLoader('Initializing Three.js scene...', 10);
      
      // Setup Three.js scene - brighter background
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xf0f0f0);
      
      // Setup camera
      this.camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      this.camera.position.set(40, 35, 40);
      this.camera.lookAt(0, 0, 0);
      
      this.updateLoader('Setting up renderer...', 15);
      
      // Setup renderer with performance optimizations
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: false, // Disable antialiasing for performance (can re-enable if needed)
        powerPreference: 'high-performance' // Prefer performance over quality
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      // Cap pixel ratio at 1.5 for performance (or use devicePixelRatio if on high-DPI display)
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true; // Enable shadows for realism
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
      this.renderer.sortObjects = false; // Disable sorting for instanced meshes (slight performance gain)
      
      // Ensure canvas is visible
      const canvas = this.renderer.domElement;
      canvas.style.display = 'block';
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.zIndex = '0';
      
      const appContent = document.getElementById('app-content');
      if (appContent) {
        appContent.appendChild(canvas);
      } else {
        document.body.appendChild(canvas);
      }
      
      this.updateLoader('Configuring controls...', 20);
    
      // Setup orbit controls
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Don't go below ground
      
      this.updateLoader('Setting up lighting...', 25);
      
      // Setup lighting
      this.setupLighting();
      
      // Create device and pin field with real progress tracking
      // Device creation: 5-50% (45% of total)
      this.updateLoader('Creating device model...', 5);
      this.device = new Device(this.config, (progress, message) => {
        // Map device progress (0-100) to overall progress (5-50)
        const overallProgress = 5 + (progress / 100) * 45;
        updateProgress(overallProgress, message);
      });
      this.scene.add(this.device.getGroup());
      
      // Pin field creation: 50-95% (45% of total)
      this.updateLoader('Generating pin field...', 50);
      this.pinField = new PinField(this.config, (progress, message) => {
        // Map pin field progress (0-100) to overall progress (50-95)
        const overallProgress = 50 + (progress / 100) * 45;
        updateProgress(overallProgress, message);
      });
      this.scene.add(this.pinField.getGroup());
      
      this.updateLoader('Setting up UI controls...', 95);
      
      // Setup UI controls
      this.setupUI();
      
      // Setup hide UI button
      this.setupHideUIButton();
      
      // Setup FPS counter
      this.setupFPSDisplay();
      
      // Clock for delta time
      this.clock = new THREE.Clock();
      
      // Handle window resize
      window.addEventListener('resize', () => this.onWindowResize());
      
      this.updateLoader('Rendering scene...', 98);
      
      // Do an initial render to verify everything works
      this.renderer.render(this.scene, this.camera);
      
      this.updateLoader('Rendering...', 100);
      
      // Start animation loop
      this.animate();
      
      // Hide loader and show content after a brief delay to ensure render is complete
      setTimeout(() => {
        const loader = document.getElementById('loader');
        const appContent = document.getElementById('app-content');
        
        if (loader) {
          loader.classList.add('hidden');
        }
        
        if (appContent) {
          appContent.style.display = 'block';
          // Use requestAnimationFrame to ensure smooth transition
          requestAnimationFrame(() => {
            appContent.classList.add('loaded');
          });
        }
      }, 300);
    } catch (error) {
      console.error('Error initializing HapticBrowser:', error);
      // Display error message to user
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: red; color: white; padding: 20px; z-index: 1000;';
      errorDiv.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
      document.body.appendChild(errorDiv);
    }
  }

  private setupLighting() {
    // Ambient light for overall scene illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    // Main directional key light with shadows
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(30, 40, 20);
    keyLight.castShadow = true;
    // High quality shadow map settings
    keyLight.shadow.mapSize.width = 2048; // Increased from 1024 for better quality
    keyLight.shadow.mapSize.height = 2048; // Increased from 1024 for better quality
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 100;
    keyLight.shadow.camera.left = -30;
    keyLight.shadow.camera.right = 30;
    keyLight.shadow.camera.top = 30;
    keyLight.shadow.camera.bottom = -30;
    keyLight.shadow.bias = -0.0001; // Reduce shadow acne
    keyLight.shadow.normalBias = 0.02; // Additional bias for better quality
    this.scene.add(keyLight);
    
    // Fill light from opposite side for softer shadows and better depth perception
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-20, 25, -20);
    fillLight.castShadow = false; // Only key light casts shadows for performance
    this.scene.add(fillLight);
    
    // Ground plane - use simpler material for performance
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({
      color: 0xf5f5f5,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    // Frame top is at 0.2 (frameThickness), base extends down by deviceThickness from there
    const frameThickness = 0.2;
    ground.position.y = frameThickness - this.config.deviceThickness - 0.1;
    ground.receiveShadow = true; // Enable shadow receiving for realism
    this.scene.add(ground);
  }

  private setupUI() {
    const controlsDiv = document.getElementById('controls');
    if (!controlsDiv) return;
    
    // Add collapsible header with toggle button
    const header = controlsDiv.querySelector('h3');
    if (header) {
      header.style.cursor = 'pointer';
      header.style.userSelect = 'none';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.marginBottom = '16px';
      
      // Create toggle button
      const toggleButton = document.createElement('button');
      toggleButton.className = 'controls-toggle';
      toggleButton.textContent = '−';
      toggleButton.setAttribute('aria-label', 'Collapse controls');
      
      // Wrap header text in a span
      const headerText = document.createElement('span');
      headerText.textContent = header.textContent;
      header.innerHTML = '';
      header.appendChild(headerText);
      header.appendChild(toggleButton);
      
      // Create container for pattern selector (always visible)
      const patternContainer = document.createElement('div');
      patternContainer.className = 'pattern-selector-collapsed';
      
      // Create container for controls content (collapsible)
      const controlsContent = document.createElement('div');
      controlsContent.className = 'controls-content';
      controlsContent.style.transition = 'max-height 0.3s ease-out, opacity 0.3s ease-out';
      
      // Move existing content (if any) into controlsContent
      while (controlsDiv.firstChild && controlsDiv.firstChild !== header) {
        controlsDiv.removeChild(controlsDiv.firstChild);
      }
      
      // Insert patternContainer and controlsContent after header
      controlsDiv.insertBefore(patternContainer, header.nextSibling);
      controlsDiv.insertBefore(controlsContent, patternContainer.nextSibling);
      
      // Toggle functionality
      let isExpanded = true;
      const toggleControls = () => {
        isExpanded = !isExpanded;
        if (isExpanded) {
          controlsContent.style.maxHeight = '1000px';
          controlsContent.style.opacity = '1';
          controlsContent.style.overflow = 'visible';
          toggleButton.textContent = '−';
          toggleButton.setAttribute('aria-label', 'Collapse controls');
          controlsDiv.classList.remove('collapsed');
        } else {
          controlsContent.style.maxHeight = '0';
          controlsContent.style.opacity = '0';
          controlsContent.style.overflow = 'hidden';
          toggleButton.textContent = '+';
          toggleButton.setAttribute('aria-label', 'Expand controls');
          controlsDiv.classList.add('collapsed');
        }
      };
      
      header.addEventListener('click', toggleControls);
      toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleControls();
      });
      
      // Store references for adding controls
      (controlsDiv as any).controlsContent = controlsContent;
      (controlsDiv as any).patternContainer = patternContainer;
    }
    
    // Pattern Mode - only in collapsed view (always visible)
    this.addControl(controlsDiv, 'Pattern Mode', 'select', 
      ['wave', 'ripple', 'gaussian', 'noise', 'flat'],
      this.config.patternMode,
      (value) => {
        this.config.patternMode = value as SimulationConfig['patternMode'];
        this.pinField.updateConfig({ patternMode: this.config.patternMode });
      },
      true // collapsed view (always visible)
    );
    
    // Grid Size
    let gridSizeRebuildTimeout: number | null = null;
    this.addControl(controlsDiv, 'Grid Size', 'range',
      { min: 10, max: 120, step: 5 },
      this.config.gridSize,
      (value) => {
        this.config.gridSize = parseInt(value);
        // Debounce rebuild to avoid rebuilding on every slider movement
        if (gridSizeRebuildTimeout !== null) {
          clearTimeout(gridSizeRebuildTimeout);
        }
        gridSizeRebuildTimeout = window.setTimeout(() => {
          // Rebuild device and pin field with new grid size
          this.rebuildScene();
          gridSizeRebuildTimeout = null;
        }, 300); // Wait 300ms after user stops moving slider
      }
    );
    
    // Amplitude
    this.addControl(controlsDiv, 'Amplitude', 'range',
      { min: 0, max: 0.25, step: 0.05 },
      this.config.amplitude,
      (value) => {
        this.config.amplitude = parseFloat(value);
        this.pinField.updateConfig({ amplitude: this.config.amplitude });
      }
    );
    
    // Pattern Speed
    this.addControl(controlsDiv, 'Pattern Speed', 'range',
      { min: 0, max: 5, step: 0.1 },
      this.config.patternSpeed,
      (value) => {
        this.config.patternSpeed = parseFloat(value);
        this.pinField.updateConfig({ patternSpeed: this.config.patternSpeed });
      }
    );
    
    // Response Time (inverted: lower = faster)
    // Map slider value (0.01-1.0) to responseSpeed (0.99-0.01) where lower slider = faster
    // Convert internal responseSpeed (0.15) to slider value (0.86) for display
    const responseTimeSliderValue = 1.01 - this.config.responseSpeed;
    this.addControl(controlsDiv, 'Response Time', 'range',
      { min: 0.01, max: 1, step: 0.01 },
      responseTimeSliderValue,
      (value) => {
        const sliderValue = parseFloat(value);
        // Invert: lower slider value (0.01) = faster response (0.99), higher slider (1.0) = slower (0.01)
        const responseSpeed = 1.01 - sliderValue; // Maps 0.01->0.99, 1.0->0.01
        this.config.responseSpeed = responseSpeed;
        this.pinField.updateConfig({ responseSpeed });
      }
    );
    
    // Physics Mode - always plausible, removed from UI
    // this.addControl(controlsDiv, 'Physics Mode', 'select',
    //   ['ideal', 'plausible'],
    //   this.config.physicsMode,
    //   (value) => {
    //     this.config.physicsMode = value as SimulationConfig['physicsMode'];
    //     this.pinField.updateConfig({ physicsMode: this.config.physicsMode });
    //   }
    // );
  }

  private addControl(
    parent: HTMLElement,
    label: string,
    type: 'range' | 'select',
    options: any,
    defaultValue: any,
    onChange: (value: string) => void,
    collapsedView: boolean = false
  ) {
    // Get the appropriate container
    const controlsDiv = document.getElementById('controls');
    let targetParent: HTMLElement;
    
    if (collapsedView && controlsDiv && (controlsDiv as any).patternContainer) {
      // Add to collapsed pattern container
      targetParent = (controlsDiv as any).patternContainer;
    } else if (controlsDiv && (controlsDiv as any).controlsContent) {
      // Add to expanded controls content
      targetParent = (controlsDiv as any).controlsContent;
    } else {
      // Fallback to parent
      targetParent = parent;
    }
    
    const controlGroup = document.createElement('div');
    controlGroup.className = 'control-group';
    if (collapsedView) {
      controlGroup.classList.add('pattern-selector-group');
    }
    
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    controlGroup.appendChild(labelEl);
    
    if (type === 'range') {
      const input = document.createElement('input');
      input.type = 'range';
      input.min = options.min;
      input.max = options.max;
      input.step = options.step;
      input.value = defaultValue.toString();
      
      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'value-display';
      valueDisplay.textContent = defaultValue.toString();
      
      input.addEventListener('input', () => {
        valueDisplay.textContent = input.value;
        onChange(input.value);
      });
      
      controlGroup.appendChild(input);
      controlGroup.appendChild(valueDisplay);
    } else if (type === 'select') {
      const select = document.createElement('select');
      
      (options as string[]).forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option;
        optionEl.textContent = option;
        if (option === defaultValue) {
          optionEl.selected = true;
        }
        select.appendChild(optionEl);
      });
      
      select.addEventListener('change', () => {
        onChange(select.value);
      });
      
      controlGroup.appendChild(select);
    }
    
    targetParent.appendChild(controlGroup);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    
    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    
    // Update pin field
    this.pinField.update(deltaTime);
    
    // Update controls
    this.controls.update();
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
    
    // Update FPS counter (update every 0.5 seconds)
    this.frameCount++;
    if (elapsedTime - this.lastFpsUpdate >= 0.5) {
      const fps = Math.round(this.frameCount / (elapsedTime - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = elapsedTime;
      if (this.fpsElement) {
        this.fpsElement.textContent = `FPS: ${fps}`;
      }
    }
  };

  private rebuildScene() {
    // Remove old device and pin field from scene
    if (this.device) {
      this.scene.remove(this.device.getGroup());
      // Dispose of device geometry/materials
      this.device.getGroup().traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    
    if (this.pinField) {
      this.scene.remove(this.pinField.getGroup());
      // Dispose of pin field geometry/materials
      this.pinField.getGroup().traverse((child) => {
        if (child instanceof THREE.InstancedMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    
    // Recreate device and pin field with new config
    this.device = new Device(this.config);
    this.scene.add(this.device.getGroup());
    
    this.pinField = new PinField(this.config);
    this.scene.add(this.pinField.getGroup());
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private setupFPSDisplay() {
    const fpsDiv = document.createElement('div');
    fpsDiv.id = 'fps-display';
    fpsDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #0f0;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 14px;
      font-weight: bold;
      z-index: 1000;
      pointer-events: none;
    `;
    fpsDiv.textContent = 'FPS: --';
    this.fpsElement = fpsDiv;
    
    const appContent = document.getElementById('app-content');
    if (appContent) {
      appContent.appendChild(fpsDiv);
    } else {
      document.body.appendChild(fpsDiv);
    }
  }

  private setupHideUIButton() {
    const button = document.createElement('button');
    button.id = 'hide-ui-button';
    button.textContent = 'Hide UI';
    button.setAttribute('aria-label', 'Toggle UI visibility');
    
    let uiHidden = false;
    
    button.addEventListener('click', () => {
      uiHidden = !uiHidden;
      const info = document.getElementById('info');
      const controls = document.getElementById('controls');
      const instructions = document.getElementById('instructions');
      
      if (uiHidden) {
        if (info) info.style.display = 'none';
        if (controls) controls.style.display = 'none';
        if (instructions) instructions.style.display = 'none';
        button.textContent = 'Show UI';
        button.setAttribute('aria-label', 'Show UI');
      } else {
        if (info) info.style.display = '';
        if (controls) controls.style.display = '';
        if (instructions) instructions.style.display = '';
        button.textContent = 'Hide UI';
        button.setAttribute('aria-label', 'Hide UI');
      }
    });
    
    const appContent = document.getElementById('app-content');
    if (appContent) {
      appContent.appendChild(button);
    } else {
      document.body.appendChild(button);
    }
  }

  private isWebGLAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
    } catch (e) {
      return false;
    }
  }
}

// Initialize the application
new HapticBrowser();
