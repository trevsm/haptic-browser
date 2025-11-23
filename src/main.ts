import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PinField } from './PinField';
import { Device } from './Device';
import { defaultConfig } from './config';
import type { SimulationConfig } from './config';
import { NavigationManager } from './navigation';
import { createWikipediaDemo } from './demos/wikipedia';
import type { ContentBlock } from './shapePage';
import { 
  detectGPUCapabilities, 
  getOptimalRendererSettings, 
  getOptimalPixelRatio,
  getOptimalShadowMapSize,
  logGPUUtilization,
  setupContextLossHandling,
  type GPUCapabilities 
} from './gpuUtils';
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
  private navigationManager!: NavigationManager;
  private gpuCapabilities!: GPUCapabilities;

  constructor() {
    // Ensure DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  /**
   * Load configuration from localStorage, merging with defaults
   */
  private loadConfig(): SimulationConfig {
    try {
      const saved = localStorage.getItem('hapticBrowserConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all properties exist
        return { ...defaultConfig, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load config from localStorage:', error);
    }
    return { ...defaultConfig };
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig() {
    try {
      localStorage.setItem('hapticBrowserConfig', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save config to localStorage:', error);
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
      // Load saved configuration from localStorage
      this.config = this.loadConfig();
      
      // Make body visible now that CSS has loaded
      document.body.style.visibility = 'visible';
      document.body.style.opacity = '1';
      
      // Progress callback for real-time updates
      const updateProgress = (progress: number, message: string) => {
        this.updateLoader(message, progress);
      };
      
      this.updateLoader('Detecting GPU capabilities...', 5);
      
      // Detect GPU capabilities
      this.gpuCapabilities = detectGPUCapabilities();
      logGPUUtilization(this.gpuCapabilities);
      
      // Check WebGL support
      if (!this.gpuCapabilities.webgl1Supported) {
        throw new Error('WebGL is not supported in this browser. Please update your browser or enable hardware acceleration.');
      }
      
      if (!this.gpuCapabilities.isGPUAvailable) {
        console.warn('⚠ Running in software rendering mode. Performance may be limited.');
      }
      
      this.updateLoader('Initializing Three.js scene...', 10);
      
      // Setup Three.js scene - Apple-style clean white background
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xfafafa);
      
      // Setup camera
      this.camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      this.camera.position.set(0, 1.2, 6);
      this.camera.lookAt(0, 0, 0);
      
      this.updateLoader('Setting up renderer...', 15);
      
      // Get optimal renderer settings based on GPU capabilities
      const rendererSettings = getOptimalRendererSettings(this.gpuCapabilities);
      
      // Setup renderer with GPU-optimized settings
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: rendererSettings.antialias,
        powerPreference: rendererSettings.powerPreference,
        precision: rendererSettings.precision,
        logarithmicDepthBuffer: rendererSettings.logarithmicDepthBuffer,
        preserveDrawingBuffer: rendererSettings.preserveDrawingBuffer,
        failIfMajorPerformanceCaveat: rendererSettings.failIfMajorPerformanceCaveat,
        alpha: false, // Opaque background for better performance
        stencil: false, // Disable stencil buffer if not needed
      });
      
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      
      // Set optimal pixel ratio based on GPU capabilities
      const optimalPixelRatio = getOptimalPixelRatio(this.gpuCapabilities);
      this.renderer.setPixelRatio(optimalPixelRatio);
      console.log(`Using pixel ratio: ${optimalPixelRatio}x (device: ${window.devicePixelRatio}x)`);
      
      // Configure shadows based on GPU capabilities
      if (this.gpuCapabilities.isGPUAvailable) {
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows for quality
        console.log('✓ Shadow mapping enabled');
      } else {
        this.renderer.shadowMap.enabled = false;
        console.log('⚠ Shadow mapping disabled for software rendering');
      }
      
      this.renderer.sortObjects = false; // Disable sorting for instanced meshes (performance gain)
      
      // Ensure canvas is visible
      const canvas = this.renderer.domElement;
      canvas.style.display = 'block';
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.zIndex = '0';
      
      // Setup WebGL context loss handling for GPU robustness
      setupContextLossHandling(
        canvas,
        () => {
          // Context lost - pause rendering
          console.error('⚠ GPU context lost. Pausing rendering...');
        },
        () => {
          // Context restored - resume rendering
          console.log('✓ GPU context restored. Resuming rendering...');
          // Force a full re-render
          this.renderer.render(this.scene, this.camera);
        }
      );
      
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
      this.controls.maxPolarAngle = Math.PI; // Allow full rotation around device
      
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
      
      // Initialize navigation manager
      this.navigationManager = new NavigationManager();
      
      // Setup UI controls
      this.setupUI();
      
      // Initialize mode-specific controls visibility
      const controlsDiv = document.getElementById('controls');
      if (controlsDiv) {
        this.updateModeSpecificControls(controlsDiv);
      }
      
      // Setup navigation controls
      this.setupNavigation();
      
      // Setup click handler for reading mode
      this.setupClickHandler();
      
      // Setup hide UI button
      this.setupHideUIButton();
      
      // Clock for delta time
      this.clock = new THREE.Clock();
      
      // Load initial demo if in web mode
      if (this.config.mode === 'web') {
        this.loadWikipediaDemo();
      }
      
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
    // Ambient light for overall scene illumination - Apple-style bright and even
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);
    
    // Main directional key light with soft shadows - Apple product photography style
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(30, 45, 25);
    
    // Enable shadows only if GPU is available
    if (this.gpuCapabilities.isGPUAvailable) {
      keyLight.castShadow = true;
      
      // Adaptive shadow map quality based on GPU capabilities
      const shadowMapSize = getOptimalShadowMapSize(this.gpuCapabilities);
      keyLight.shadow.mapSize.width = shadowMapSize;
      keyLight.shadow.mapSize.height = shadowMapSize;
      console.log(`Shadow map size: ${shadowMapSize}x${shadowMapSize}`);
      
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 100;
      keyLight.shadow.camera.left = -30;
      keyLight.shadow.camera.right = 30;
      keyLight.shadow.camera.top = 30;
      keyLight.shadow.camera.bottom = -30;
      keyLight.shadow.bias = -0.0001;
      keyLight.shadow.normalBias = 0.02;
      keyLight.shadow.radius = 3; // Softer shadows for Apple aesthetic
    } else {
      keyLight.castShadow = false;
    }
    
    this.scene.add(keyLight);
    
    // Fill light from opposite side for minimal shadows - Apple-style studio lighting
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-25, 30, -25);
    fillLight.castShadow = false;
    this.scene.add(fillLight);
    
    // Subtle rim light for depth and dimension - Apple product photography technique
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 20, -40);
    rimLight.castShadow = false;
    this.scene.add(rimLight);
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
      toggleButton.textContent = '+';
      toggleButton.setAttribute('aria-label', 'Expand controls');
      
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
      // Start collapsed
      controlsContent.style.maxHeight = '0';
      controlsContent.style.opacity = '0';
      controlsContent.style.overflow = 'hidden';
      
      // Move existing content (if any) into controlsContent
      while (controlsDiv.firstChild && controlsDiv.firstChild !== header) {
        controlsDiv.removeChild(controlsDiv.firstChild);
      }
      
      // Insert patternContainer and controlsContent after header
      controlsDiv.insertBefore(patternContainer, header.nextSibling);
      controlsDiv.insertBefore(controlsContent, patternContainer.nextSibling);
      
      // Start collapsed
      controlsDiv.classList.add('collapsed');
      
      // Toggle functionality
      let isExpanded = false;
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
    
    // Mode selector - always visible (pattern or web)
    this.addControl(controlsDiv, 'Mode', 'select',
      ['pattern', 'web'],
      this.config.mode,
      (value) => {
        this.config.mode = value as SimulationConfig['mode'];
        this.pinField.updateConfig({ mode: this.config.mode });
        // Show/hide relevant controls based on mode
        this.updateModeSpecificControls(controlsDiv);
        // Load demo when switching to web mode
        if (this.config.mode === 'web') {
          this.loadWikipediaDemo();
        } else {
          // Clear page when switching to pattern mode
          this.pinField.setShapePage(null);
          this.navigationManager.setShapePage(null);
        }
        this.saveConfig();
      },
      true // collapsed view (always visible)
    );
    
    // Pattern Mode - only shown in pattern mode
    this.addControl(controlsDiv, 'Pattern Mode', 'select', 
      ['wave', 'ripple', 'gaussian', 'noise', 'flat'],
      this.config.patternMode,
      (value) => {
        this.config.patternMode = value as SimulationConfig['patternMode'];
        this.pinField.updateConfig({ patternMode: this.config.patternMode });
        this.saveConfig();
      },
      true, // collapsed view (always visible)
      'pattern' // only visible in pattern mode
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
          // Reload demo if in web mode to match new grid size
          if (this.config.mode === 'web') {
            this.loadWikipediaDemo();
          }
          this.saveConfig();
          gridSizeRebuildTimeout = null;
        }, 300); // Wait 300ms after user stops moving slider
      }
    );
    
    // Amplitude
    this.addControl(controlsDiv, 'Amplitude', 'range',
      { min: 0, max: 2, step: 0.1 },
      this.config.amplitude,
      (value) => {
        this.config.amplitude = parseFloat(value);
        this.pinField.updateConfig({ amplitude: this.config.amplitude });
        this.saveConfig();
      }
    );
    
    // Pattern Speed (only in pattern mode)
    this.addControl(controlsDiv, 'Pattern Speed', 'range',
      { min: 0, max: 5, step: 0.1 },
      this.config.patternSpeed,
      (value) => {
        this.config.patternSpeed = parseFloat(value);
        this.pinField.updateConfig({ patternSpeed: this.config.patternSpeed });
        this.saveConfig();
      },
      false,
      'pattern' // only visible in pattern mode
    );
    
    // Color by Height (debug visualization)
    this.addControl(controlsDiv, 'Color by Height', 'checkbox',
      null,
      this.config.colorByHeight,
      (value) => {
        this.config.colorByHeight = value === 'true';
        this.pinField.updateConfig({ colorByHeight: this.config.colorByHeight });
        this.saveConfig();
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
        this.saveConfig();
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
    type: 'range' | 'select' | 'checkbox',
    options: any,
    defaultValue: any,
    onChange: (value: string) => void,
    collapsedView: boolean = false,
    dataMode?: 'pattern' | 'web' // Control is only visible in this mode
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
    
    // Add data attribute for mode-specific visibility
    if (dataMode) {
      controlGroup.setAttribute('data-mode', dataMode);
      // Initially hide if not matching current mode
      if (this.config.mode !== dataMode) {
        controlGroup.style.display = 'none';
      }
    }
    
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    controlGroup.appendChild(labelEl);
    
    if (type === 'checkbox') {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = defaultValue === true || defaultValue === 'true';
      input.className = 'control-checkbox';
      
      input.addEventListener('change', () => {
        onChange(input.checked.toString());
      });
      
      controlGroup.appendChild(input);
    } else if (type === 'range') {
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

  /**
   * Update visibility of mode-specific controls
   */
  private updateModeSpecificControls(controlsDiv: HTMLElement) {
    const modeSpecificControls = controlsDiv.querySelectorAll('[data-mode]');
    modeSpecificControls.forEach((control) => {
      const controlEl = control as HTMLElement;
      const controlMode = controlEl.getAttribute('data-mode');
      if (controlMode === this.config.mode) {
        controlEl.style.display = '';
      } else {
        controlEl.style.display = 'none';
      }
    });
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    
    const deltaTime = this.clock.getDelta();
    
    // Update navigation focus indicator
    if (this.config.mode === 'web') {
      const focusedPrimitive = this.navigationManager.getFocusedPrimitive();
      this.pinField.setFocusedPrimitive(focusedPrimitive);
      this.updateNavigationStatus();
    }
    
    // Update pin field
    this.pinField.update(deltaTime);
    
    // Update controls
    this.controls.update();
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
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

  private setupHideUIButton() {
    const button = document.createElement('button');
    button.id = 'hide-ui-button';
    button.textContent = 'Hide UI';
    button.setAttribute('aria-label', 'Toggle UI visibility');
    
    let uiHidden = false;
    
    button.addEventListener('click', () => {
      uiHidden = !uiHidden;
      const controls = document.getElementById('controls');
      const instructions = document.getElementById('instructions');
      
      if (uiHidden) {
        if (controls) controls.style.display = 'none';
        if (instructions) instructions.style.display = 'none';
        button.textContent = 'Show UI';
        button.setAttribute('aria-label', 'Show UI');
      } else {
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


  /**
   * Load Wikipedia demo page
   */
  private loadWikipediaDemo() {
    // Use current config gridSize for the demo
    const demoPage = createWikipediaDemo(this.config.gridSize);
    this.pinField.setShapePage(demoPage);
    this.navigationManager.setShapePage(demoPage);
  }
  
  /**
   * Setup click handler (removed - using keyboard only)
   */
  private setupClickHandler() {
    // Keyboard-only navigation - no click handler needed
  }

  /**
   * Setup navigation controls and keyboard handlers
   */
  private setupNavigation() {
    // Create navigation status display
    const navStatus = document.createElement('div');
    navStatus.id = 'navigation-status';
    navStatus.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: rgba(255, 255, 255, 0.9);
      padding: 12px 16px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      font-size: 13px;
      color: #333;
      min-width: 200px;
      display: none;
    `;
    
    const appContent = document.getElementById('app-content');
    if (appContent) {
      appContent.appendChild(navStatus);
    } else {
      document.body.appendChild(navStatus);
    }
    
    // Store reference for updates
    (this as any).navStatusElement = navStatus;
    
    // Keyboard handlers
    window.addEventListener('keydown', (e) => {
      // Only handle navigation keys if in web mode
      if (this.config.mode !== 'web') return;
      
      // Don't interfere with typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      
      // If in reading mode, only allow Space/Escape to exit
      if (this.pinField.isReadingMode()) {
        switch (e.key) {
          case ' ':
          case 'Backspace':
          case 'Escape':
            e.preventDefault();
            this.pinField.exitReadingMode();
            break;
        }
        return; // Don't process other keys in reading mode
      }
      
      // Normal navigation mode
      switch (e.key) {
        case 'r':
        case 'R':
          // Toggle region/block mode
          e.preventDefault();
          this.navigationManager.toggleMode();
          break;
          
        case 'ArrowRight':
        case 'ArrowDown':
          // Next item
          e.preventDefault();
          if (this.navigationManager.getMode() === 'region') {
            this.navigationManager.nextLandmark();
          } else {
            this.navigationManager.nextBlock();
          }
          break;
          
        case 'ArrowLeft':
        case 'ArrowUp':
          // Previous item
          e.preventDefault();
          if (this.navigationManager.getMode() === 'region') {
            this.navigationManager.previousLandmark();
          } else {
            this.navigationManager.previousBlock();
          }
          break;
          
        case 'Tab':
          // Next item
          if (!e.shiftKey) {
            e.preventDefault();
            if (this.navigationManager.getMode() === 'region') {
              this.navigationManager.nextLandmark();
            } else {
              this.navigationManager.nextBlock();
            }
          } else {
            // Previous item
            e.preventDefault();
            if (this.navigationManager.getMode() === 'region') {
              this.navigationManager.previousLandmark();
            } else {
              this.navigationManager.previousBlock();
            }
          }
          break;
          
        case ' ':
          // Space: Enter reading mode for focused block (text or image)
          e.preventDefault();
          const focusedPrimitive = this.navigationManager.getFocusedPrimitive();
          
          // Debug logging
          console.log('Space pressed, focused primitive:', focusedPrimitive);
          
          // Check if it's a ContentBlock
          if (focusedPrimitive && 'blockType' in focusedPrimitive) {
            const block = focusedPrimitive as ContentBlock;
            
            // Check if it's an image block
            if (block.blockType === 'media' && block.imageUrl) {
              console.log('Found image block, entering image mode');
              this.pinField.enterImageMode(block);
            } else if (block.text) {
              console.log('Found content block with text:', block.text);
              this.pinField.enterReadingMode(block.text);
            }
          } else if (focusedPrimitive) {
            console.log('Focused primitive is not a ContentBlock');
            // Check if it's a landmark with blocks
            if ('landmarkType' in focusedPrimitive) {
              console.log('This is a landmark. Switch to Block mode (press R) to focus on content blocks.');
            }
          }
          break;
      }
    });
  }

  /**
   * Update navigation status display
   */
  private updateNavigationStatus() {
    const navStatus = (this as any).navStatusElement as HTMLElement | undefined;
    if (!navStatus) return;
    
    const navInstructions = document.getElementById('nav-instructions');
    
    if (this.config.mode === 'web') {
      if (this.pinField.isReadingMode()) {
        navStatus.style.display = 'block';
        navStatus.textContent = 'Reading Mode - Press Backspace to go back';
        if (navInstructions) navInstructions.style.display = 'none';
      } else {
        navStatus.style.display = 'block';
        const statusText = this.navigationManager.getStatusString();
        const mode = this.navigationManager.getMode();
        if (mode === 'region') {
          navStatus.textContent = `${statusText} (Press R for Block mode to read content)`;
        } else {
          navStatus.textContent = `${statusText} (Press Space to read)`;
        }
        if (navInstructions) navInstructions.style.display = 'block';
      }
    } else {
      navStatus.style.display = 'none';
      if (navInstructions) navInstructions.style.display = 'none';
    }
  }
}

// Initialize the application
new HapticBrowser();
