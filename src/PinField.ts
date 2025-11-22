import * as THREE from 'three';
import type { SimulationConfig } from './config';

/**
 * PinField manages the array of independently actuated pins
 * Each pin can move vertically to form a 3D relief surface
 * Uses GPU instancing for efficient rendering of thousands of pins
 */
export class PinField {
  private config: SimulationConfig;
  private group: THREE.Group;
  private instancedMesh!: THREE.InstancedMesh;
  private targetHeights: number[][] = [];
  private currentHeights: number[][] = [];
  private previousHeights: number[][] = []; // Track previous heights for dirty checking
  private time: number = 0;
  private tempObject: THREE.Object3D = new THREE.Object3D();
  private basePositions: { x: number; z: number; baseY: number }[] = []; // Cache base positions

  constructor(config: SimulationConfig, onProgress?: (progress: number, message: string) => void) {
    // Create a copy of the config to avoid reference issues
    this.config = { ...config };
    this.group = new THREE.Group();
    
    this.initializeHeightArrays();
    this.createPins(onProgress);
  }

  private initializeHeightArrays() {
    const { gridSize } = this.config;
    
    for (let x = 0; x < gridSize; x++) {
      this.targetHeights[x] = [];
      this.currentHeights[x] = [];
      this.previousHeights[x] = [];
      for (let y = 0; y < gridSize; y++) {
        this.targetHeights[x][y] = this.config.minHeight;
        this.currentHeights[x][y] = this.config.minHeight;
        this.previousHeights[x][y] = this.config.minHeight;
      }
    }
  }

  private createPins(onProgress?: (progress: number, message: string) => void) {
    const { gridSize, pinSpacing, maxHeight } = this.config;
    
    if (onProgress) onProgress(0, 'Initializing pin geometry...');
    
    // Pin geometry - pins have extra length below the frame for mechanical support
    // The visible part extends up to maxHeight, but pin extends down into device body
    const frameThickness = 0.2; // Match Device.ts frame thickness
    const belowFrameLength = 3.5; // Extra length extending down into device body
    const pinTotalHeight = maxHeight + belowFrameLength; // Total pin length (visible + hidden)
    
    // Use thin cylinders to represent thick lines (linewidth doesn't work reliably)
    const lineRadius = 0.04; // Thick line radius (4mm) - increased size
    
    if (onProgress) onProgress(10, 'Creating pin material...');
    
    // Material for thin cylinders representing lines
    const pinMaterial = new THREE.MeshLambertMaterial({
      color: 0x888888, // Grey color
    });
    
    if (onProgress) onProgress(30, 'Building pin geometry...');
    
    // Create a thin cylinder geometry to represent a thick line
    const pinGeometry = new THREE.CylinderGeometry(
      lineRadius,      // Radius top
      lineRadius,      // Radius bottom
      pinTotalHeight,  // Height
      8                // Radial segments (8 = octagon)
    );
    
    // Center geometry at origin (will be positioned via instance matrix)
    pinGeometry.translate(0, 0, 0);
    
    if (onProgress) onProgress(40, 'Creating instanced mesh...');
    
    // Create instanced mesh for all pins (GPU instancing for performance)
    const totalPins = gridSize * gridSize;
    this.instancedMesh = new THREE.InstancedMesh(pinGeometry, pinMaterial, totalPins);
    this.instancedMesh.castShadow = false; // Disable shadows for performance
    this.instancedMesh.receiveShadow = false;
    
    // Center the grid
    const fieldWidth = (gridSize - 1) * pinSpacing;
    const offsetX = -fieldWidth / 2;
    const offsetZ = -fieldWidth / 2;
    
    const frameTopY = frameThickness;
    const minOffset = 0.01; // No offset - pins positioned at frame level
    const baseY = frameTopY - pinTotalHeight / 2 + minOffset;
    
    // Cache base positions to avoid recalculating every frame
    this.basePositions = [];
    
    if (onProgress) onProgress(50, 'Positioning pin instances...');
    
    // Set initial positions for all pin instances
    const updateInterval = Math.max(1, Math.floor(totalPins / 10)); // Update every 10%
    
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const pinIndex = x * gridSize + y;
        
        const xPos = offsetX + x * pinSpacing;
        const zPos = offsetZ + y * pinSpacing;
        
        // Cache base position
        this.basePositions[pinIndex] = { x: xPos, z: zPos, baseY };
        
        // Set position for this instance
        this.tempObject.position.set(xPos, baseY, zPos);
        this.tempObject.updateMatrix();
        
        // Apply matrix to instance
        this.instancedMesh.setMatrixAt(pinIndex, this.tempObject.matrix);
        
        // Update progress periodically
        if (onProgress && (pinIndex % updateInterval === 0 || pinIndex === totalPins - 1)) {
          const progress = 50 + ((pinIndex + 1) / totalPins) * 50; // 50-100% range
          onProgress(progress, `Positioning pins... ${pinIndex + 1}/${totalPins}`);
        }
      }
    }
    
    // Mark instance matrix as needing update
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    
    // Add instanced mesh to group
    this.group.add(this.instancedMesh);
    
    if (onProgress) onProgress(100, 'Pin field created!');
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
            height = (Math.sin(nx * 2.3 + time * patternSpeed * 0.3) * Math.cos(ny * 1.7 + time * patternSpeed * 0.4)) * 0.5 + 0.5;
            break;
          }
          
          case 'flat':
          default:
            height = 0;
            break;
        }
        
        // Scale to height range with amplitude
        // Height represents extension above frame top, minimum is 0 (flush with frame)
        // Amplitude scales the pattern but is clamped to physical limits
        const scaledHeight = minHeight + (height * Math.min(amplitude, 1.0) * (maxHeight - minHeight));
        // Clamp to physical pin limits (minHeight to maxHeight)
        this.targetHeights[x][y] = Math.max(minHeight, Math.min(maxHeight, scaledHeight));
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
   * Apply current heights to pin meshes using instanced rendering
   * Optimized: Only update matrices for pins that actually changed
   * Pin height is fixed - the height value determines how much the pin is pushed up
   */
  private updatePinPositions() {
    const { gridSize } = this.config;
    let needsUpdate = false;
    
    // Only update instances that changed (dirty checking)
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const pinIndex = x * gridSize + y;
        const currentHeight = this.currentHeights[x][y];
        const previousHeight = this.previousHeights[x][y];
        
        // Only update if height changed significantly (threshold to avoid micro-updates)
        if (Math.abs(currentHeight - previousHeight) > 0.001) {
          const basePos = this.basePositions[pinIndex];
          const pushUpAmount = Math.max(0, currentHeight);
          
          // Set position for this instance using cached base position
          this.tempObject.position.set(
            basePos.x,
            basePos.baseY + pushUpAmount,
            basePos.z
          );
          this.tempObject.updateMatrix();
          
          // Apply matrix to instance
          this.instancedMesh.setMatrixAt(pinIndex, this.tempObject.matrix);
          
          // Update previous height
          this.previousHeights[x][y] = currentHeight;
          needsUpdate = true;
        }
      }
    }
    
    // Only mark as needing update if something actually changed
    if (needsUpdate) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
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

