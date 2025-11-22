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
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  
  private pinField: PinField;
  private device: Device;
  
  private clock: THREE.Clock;

  constructor() {
    // Ensure DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  private init() {
    try {
      // Check WebGL support
      if (!this.isWebGLAvailable()) {
        throw new Error('WebGL is not supported in this browser');
      }
      
      // Setup Three.js scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x1a1a1a);
      
      // Setup camera
      this.camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      this.camera.position.set(40, 35, 40);
      this.camera.lookAt(0, 0, 0);
      
      // Setup renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      
      // Ensure canvas is visible
      const canvas = this.renderer.domElement;
      canvas.style.display = 'block';
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.zIndex = '0';
      
      document.body.appendChild(canvas);
      
      console.log('Three.js renderer initialized, canvas appended to body');
    
      // Setup orbit controls
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Don't go below ground
      
      // Setup lighting
      this.setupLighting();
      
      // Create device and pin field
      this.device = new Device(this.config);
      this.scene.add(this.device.getGroup());
      
      this.pinField = new PinField(this.config);
      this.scene.add(this.pinField.getGroup());
      
      // Setup UI controls
      this.setupUI();
      
      // Clock for delta time
      this.clock = new THREE.Clock();
      
      // Handle window resize
      window.addEventListener('resize', () => this.onWindowResize());
      
      // Do an initial render to verify everything works
      this.renderer.render(this.scene, this.camera);
      console.log('Initial render complete');
      
      // Start animation loop
      this.animate();
      
      console.log('HapticBrowser initialized successfully');
      console.log('Scene objects:', this.scene.children.length);
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
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
    // Ambient light for soft fill
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);
    
    // Strong directional key light to emphasize relief
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(30, 40, 20);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 100;
    keyLight.shadow.camera.left = -30;
    keyLight.shadow.camera.right = 30;
    keyLight.shadow.camera.top = 30;
    keyLight.shadow.camera.bottom = -30;
    this.scene.add(keyLight);
    
    // Rim light from opposite side
    const rimLight = new THREE.DirectionalLight(0x6688ff, 0.4);
    rimLight.position.set(-20, 15, -20);
    this.scene.add(rimLight);
    
    // Ground plane for reference (optional)
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 1,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -this.config.deviceThickness - 0.1;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private setupUI() {
    const controlsDiv = document.getElementById('controls');
    if (!controlsDiv) return;
    
    // Pattern Mode
    this.addControl(controlsDiv, 'Pattern Mode', 'select', 
      ['wave', 'ripple', 'gaussian', 'noise', 'flat'],
      this.config.patternMode,
      (value) => {
        this.config.patternMode = value as SimulationConfig['patternMode'];
        this.pinField.updateConfig({ patternMode: this.config.patternMode });
      }
    );
    
    // Grid Size
    this.addControl(controlsDiv, 'Grid Size', 'range',
      { min: 10, max: 80, step: 5 },
      this.config.gridSize,
      (value) => {
        this.config.gridSize = parseInt(value);
        // Note: Changing grid size requires rebuilding the pin field
        // For now, just update config (rebuild would go here)
      }
    );
    
    // Amplitude
    this.addControl(controlsDiv, 'Amplitude', 'range',
      { min: 0, max: 1, step: 0.05 },
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
    
    // Response Speed
    this.addControl(controlsDiv, 'Response Speed', 'range',
      { min: 0.01, max: 1, step: 0.01 },
      this.config.responseSpeed,
      (value) => {
        this.config.responseSpeed = parseFloat(value);
        this.pinField.updateConfig({ responseSpeed: this.config.responseSpeed });
      }
    );
    
    // Physics Mode
    this.addControl(controlsDiv, 'Physics Mode', 'select',
      ['ideal', 'plausible'],
      this.config.physicsMode,
      (value) => {
        this.config.physicsMode = value as SimulationConfig['physicsMode'];
        this.pinField.updateConfig({ physicsMode: this.config.physicsMode });
      }
    );
  }

  private addControl(
    parent: HTMLElement,
    label: string,
    type: 'range' | 'select',
    options: any,
    defaultValue: any,
    onChange: (value: string) => void
  ) {
    const controlGroup = document.createElement('div');
    controlGroup.className = 'control-group';
    
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
    
    parent.appendChild(controlGroup);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    
    const deltaTime = this.clock.getDelta();
    
    // Update pin field
    this.pinField.update(deltaTime);
    
    // Update controls
    this.controls.update();
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  };

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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
