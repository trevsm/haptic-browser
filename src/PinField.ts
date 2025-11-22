import * as THREE from 'three';
import type { SimulationConfig } from './config';

/**
 * PinField manages the array of independently actuated pins
 * Each pin can move vertically to form a 3D relief surface
 */
export class PinField {
  private config: SimulationConfig;
  private group: THREE.Group;
  private pins: THREE.Group[] = [];
  private targetHeights: number[][] = [];
  private currentHeights: number[][] = [];
  private time: number = 0;

  constructor(config: SimulationConfig, onProgress?: (progress: number, message: string) => void) {
    this.config = config;
    this.group = new THREE.Group();
    
    this.initializeHeightArrays();
    this.createPins(onProgress);
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

  private createPins(onProgress?: (progress: number, message: string) => void) {
    const { gridSize, pinSpacing, pinWidth, maxHeight, deviceThickness } = this.config;
    
    // Pin geometry - pins have extra length below the frame for mechanical support
    // The visible part extends up to maxHeight, but pin extends down into device body
    const frameThickness = 0.3;
    const belowFrameLength = 3.5; // Extra length extending down into device body
    const pinTotalHeight = maxHeight + belowFrameLength; // Total pin length (visible + hidden)
    const pinRadius = pinWidth / 2;
    
    // Create metallic textures once and reuse for all pins
    const createMetallicTexture = () => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      
      // Base metallic color - smooth light metal
      const gradient = ctx.createLinearGradient(0, 0, size, 0);
      gradient.addColorStop(0, '#e8e8e8');
      gradient.addColorStop(0.5, '#f5f5f5');
      gradient.addColorStop(1, '#e8e8e8');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      // Add very subtle noise for smooth metallic texture (no grooves)
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 8; // Subtle noise for smooth metal
        data[i] = Math.max(220, Math.min(255, data[i] + noise));     // R
        data[i + 1] = Math.max(220, Math.min(255, data[i + 1] + noise)); // G
        data[i + 2] = Math.max(220, Math.min(255, data[i + 2] + noise)); // B
      }
      ctx.putImageData(imageData, 0, 0);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1); // Uniform smooth texture
      return texture;
    };
    
    // Create normal map for surface detail
    const createNormalMap = () => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      
      // Base normal map color (neutral - smooth surface)
      ctx.fillStyle = '#8080ff';
      ctx.fillRect(0, 0, size, size);
      
      // Add very subtle surface variations (no grooves, smooth pins)
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          // Very subtle micro-variations for smooth metal
          const variation = (Math.random() - 0.5) * 6;
          const nx = 128 + variation;
          const ny = 128 + variation;
          const nz = 250;
          
          data[i] = nx;     // R -> X
          data[i + 1] = ny; // G -> Y
          data[i + 2] = nz; // B -> Z
          data[i + 3] = 255; // A
        }
      }
      ctx.putImageData(imageData, 0, 0);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1); // Smooth uniform surface
      return texture;
    };
    
    // Create roughness map for varied reflectivity (tin foil is quite reflective)
    const createRoughnessMap = () => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      
      // Base roughness - smooth polished metal
      const gradient = ctx.createLinearGradient(0, 0, size, 0);
      gradient.addColorStop(0, '#606060');
      gradient.addColorStop(0.5, '#555555');
      gradient.addColorStop(1, '#606060');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      // Add subtle variation for smooth metal
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const variation = (Math.random() - 0.5) * 10;
        const roughness = Math.max(80, Math.min(100, 90 + variation));
        data[i] = roughness;     // R
        data[i + 1] = roughness; // G
        data[i + 2] = roughness; // B
      }
      ctx.putImageData(imageData, 0, 0);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1); // Smooth uniform
      return texture;
    };
    
    // Create textures once
    const metallicTexture = createMetallicTexture();
    const normalMap = createNormalMap();
    const roughnessMap = createRoughnessMap();
    
    // Create metallic material once and reuse for all pins (smooth light metallic)
    const pinMaterial = new THREE.MeshStandardMaterial({
      color: 0xececec, // Light gray metallic base
      map: metallicTexture,
      normalMap: normalMap,
      roughnessMap: roughnessMap,
      roughness: 0.35, // Smooth polished metal
      metalness: 0.75, // Metallic but not too reflective
      normalScale: new THREE.Vector2(0.2, 0.2), // Very subtle surface detail (smooth, not grooved)
      envMapIntensity: 1.0, // Natural reflections
    });
    
    // Create pin geometry with rounded top for softer feel
    // Use a group to combine cylinder body with rounded top cap
    const createRoundedPinGeometry = (height: number) => {
      const pinGroup = new THREE.Group();
      
      // Cylindrical body - slightly shorter to make room for rounded cap
      const bodyHeight = Math.max(height - pinRadius * 0.3, height * 0.7); // Leave room for cap
      const bodyGeometry = new THREE.CylinderGeometry(
        pinRadius,
        pinRadius,
        bodyHeight,
        16 // More segments for smoother edges
      );
      
      // Rounded top cap using a hemisphere
      const capRadius = pinRadius;
      const capGeometry = new THREE.SphereGeometry(
        capRadius,
        16,
        8,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2 // Only top hemisphere
      );
      
      // Create body mesh
      const bodyMesh = new THREE.Mesh(bodyGeometry, pinMaterial);
      bodyMesh.position.y = -height / 2 + bodyHeight / 2;
      pinGroup.add(bodyMesh);
      
      // Create rounded cap mesh
      const capMesh = new THREE.Mesh(capGeometry, pinMaterial);
      capMesh.position.y = -height / 2 + bodyHeight; // Position at top of body
      capMesh.rotation.x = Math.PI; // Flip to point upward
      pinGroup.add(capMesh);
      
      return pinGroup;
    };
    
    // Center the grid
    const fieldWidth = (gridSize - 1) * pinSpacing;
    const offsetX = -fieldWidth / 2;
    const offsetZ = -fieldWidth / 2;
    
    const totalPins = gridSize * gridSize;
    const updateInterval = Math.max(1, Math.floor(totalPins / 20)); // Update every 5% of pins
    
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const pinIndex = x * gridSize + y;
        
        // Create pin with rounded top
        const pin = createRoundedPinGeometry(pinTotalHeight);
        
        // Position in grid (X and Z)
        pin.position.x = offsetX + x * pinSpacing;
        pin.position.z = offsetZ + y * pinSpacing;
        
        // Position Y so pin top is slightly above frame top when height = 0
        // Initial height is minHeight (0), so pin top should be at frameTopY + minOffset
        // Frame top is at frameThickness (frame sits at y=0, extends up to frameThickness)
        const frameTopY = frameThickness;
        const minOffset = 0.25; // Small offset to raise minimum pin position above frame
        pin.position.y = frameTopY - pinTotalHeight / 2 + minOffset;
        
        // Store grid coordinates and reference data for later reference
        pin.userData = { 
          gridX: x, 
          gridY: y,
          totalHeight: pinTotalHeight,
          pinRadius: pinRadius
        };
        
        // Enable shadows on all children
        pin.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
          }
        });
        
        this.pins.push(pin);
        this.group.add(pin);
        
        // Update progress periodically
        if (onProgress && (pinIndex % updateInterval === 0 || pinIndex === totalPins - 1)) {
          const progress = ((pinIndex + 1) / totalPins) * 100;
          onProgress(progress, `Creating pins... ${pinIndex + 1}/${totalPins}`);
        }
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
   * Apply current heights to pin meshes
   * Pin height is fixed - the height value determines how much the pin is pushed up
   * When height = 0, pin top is slightly above frame top
   * When height = maxHeight, pin top is pushed up by maxHeight
   * The height value determines the vertical offset (how much it's pushed up)
   * Pin extends down into device body for mechanical support
   */
  private updatePinPositions() {
    const frameThickness = 0.3;
    // Frame top is at frameThickness (frame sits at y=0, extends up to frameThickness)
    const frameTopY = frameThickness;
    const minOffset = 0.25; // Small offset to raise minimum pin position above frame
    
    for (let i = 0; i < this.pins.length; i++) {
      const pin = this.pins[i] as THREE.Group;
      const x = pin.userData.gridX;
      const y = pin.userData.gridY;
      
      // Height value determines how much the pin is pushed up (0 to maxHeight)
      // Ensure it's never negative - minimum is 0
      const pushUpAmount = Math.max(0, this.currentHeights[x][y]);
      
      // Pin has fixed total height (includes visible portion + hidden portion in device body)
      // When pushUpAmount = 0: pin top should be at frameTopY + minOffset (slightly above frame)
      // Pin center is at pin.position.y, so pin top = pin.position.y + pinTotalHeight/2
      // Therefore: pin.position.y = frameTopY + minOffset - pinTotalHeight/2 + pushUpAmount
      const pinTotalHeight = pin.userData.totalHeight;
      pin.position.y = frameTopY + minOffset - pinTotalHeight / 2 + pushUpAmount;
      
      // Pin geometry remains at fixed size - no scaling needed
      pin.scale.y = 1.0;
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

