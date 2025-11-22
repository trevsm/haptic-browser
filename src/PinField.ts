import * as THREE from 'three';
import type { SimulationConfig } from './config';

/**
 * PinField manages the array of independently actuated pins
 * Each pin can move vertically to form a 3D relief surface
 */
export class PinField {
  private config: SimulationConfig;
  private group: THREE.Group;
  private pins: THREE.Mesh[] = [];
  private targetHeights: number[][] = [];
  private currentHeights: number[][] = [];
  private time: number = 0;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.group = new THREE.Group();
    
    this.initializeHeightArrays();
    this.createPins();
  }

  private initializeHeightArrays() {
    const { gridSize } = this.config;
    
    for (let x = 0; x < gridSize; x++) {
      this.targetHeights[x] = [];
      this.currentHeights[x] = [];
      for (let y = 0; y < gridSize; y++) {
        this.targetHeights[x][y] = this.config.minHeight;
        this.currentHeights[x][y] = this.config.minHeight;
      }
    }
  }

  private createPins() {
    const { gridSize, pinSpacing, pinWidth } = this.config;
    
    // Pin geometry - use cylinder for now
    const pinGeometry = new THREE.CylinderGeometry(
      pinWidth / 2,
      pinWidth / 2,
      this.config.maxHeight,
      8
    );
    
    // Matte material for clear shape reading
    const pinMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.8,
      metalness: 0.1,
    });
    
    // Center the grid
    const fieldWidth = (gridSize - 1) * pinSpacing;
    const offsetX = -fieldWidth / 2;
    const offsetZ = -fieldWidth / 2;
    
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const pin = new THREE.Mesh(pinGeometry, pinMaterial);
        
        // Position in grid
        pin.position.x = offsetX + x * pinSpacing;
        pin.position.z = offsetZ + y * pinSpacing;
        pin.position.y = this.config.minHeight;
        
        // Store grid coordinates for later reference
        pin.userData = { gridX: x, gridY: y };
        
        this.pins.push(pin);
        this.group.add(pin);
      }
    }
  }

  /**
   * Update target heights based on current pattern mode
   */
  private updateTargetHeights(time: number) {
    const { gridSize, patternMode, patternSpeed, minHeight, maxHeight, amplitude } = this.config;
    
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        let height = 0;
        
        switch (patternMode) {
          case 'wave': {
            // Traveling sine wave
            const nx = x / gridSize;
            const ny = y / gridSize;
            height = Math.sin((nx + ny) * Math.PI * 4 + time * patternSpeed) * 0.5 + 0.5;
            break;
          }
          
          case 'ripple': {
            // Circular ripple from center
            const cx = x - gridSize / 2;
            const cy = y - gridSize / 2;
            const dist = Math.sqrt(cx * cx + cy * cy);
            height = Math.sin(dist * 0.5 - time * patternSpeed * 3) * 0.5 + 0.5;
            break;
          }
          
          case 'gaussian': {
            // Gaussian hill in center
            const cx = x - gridSize / 2;
            const cy = y - gridSize / 2;
            const dist = Math.sqrt(cx * cx + cy * cy);
            const sigma = gridSize * 0.15;
            height = Math.exp(-(dist * dist) / (2 * sigma * sigma));
            break;
          }
          
          case 'noise': {
            // Simple noise pattern (will improve later with proper noise)
            const nx = (x / gridSize) * 4;
            const ny = (y / gridSize) * 4;
            height = (Math.sin(nx * 2.3 + time * 0.3) * Math.cos(ny * 1.7 + time * 0.4)) * 0.5 + 0.5;
            break;
          }
          
          case 'flat':
          default:
            height = 0;
            break;
        }
        
        // Scale to height range with amplitude
        this.targetHeights[x][y] = minHeight + (height * amplitude * (maxHeight - minHeight));
      }
    }
  }

  /**
   * Interpolate current heights toward target heights
   */
  private updateCurrentHeights() {
    const { gridSize, responseSpeed, physicsMode } = this.config;
    
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const target = this.targetHeights[x][y];
        const current = this.currentHeights[x][y];
        
        if (physicsMode === 'ideal') {
          // Direct assignment (instant response)
          this.currentHeights[x][y] = target;
        } else {
          // Smooth interpolation (plausible physics)
          this.currentHeights[x][y] = current + (target - current) * responseSpeed;
        }
      }
    }
  }

  /**
   * Apply current heights to pin meshes
   */
  private updatePinPositions() {
    const { gridSize } = this.config;
    
    for (let i = 0; i < this.pins.length; i++) {
      const pin = this.pins[i];
      const x = pin.userData.gridX;
      const y = pin.userData.gridY;
      
      pin.position.y = this.currentHeights[x][y];
    }
  }

  /**
   * Main update loop called each frame
   */
  update(deltaTime: number) {
    this.time += deltaTime;
    
    this.updateTargetHeights(this.time);
    this.updateCurrentHeights();
    this.updatePinPositions();
  }

  /**
   * Get the Three.js group containing all pins
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<SimulationConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

