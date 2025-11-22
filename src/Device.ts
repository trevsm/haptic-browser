import * as THREE from 'three';
import type { SimulationConfig } from './config';

/**
 * Device represents the physical body/housing of the haptic display
 * Includes the base, frame with holes for pins, and sides
 */
export class Device {
  private config: SimulationConfig;
  private group: THREE.Group;

  constructor(config: SimulationConfig, onProgress?: (progress: number, message: string) => void) {
    this.config = config;
    this.group = new THREE.Group();
    
    this.createDeviceBody(onProgress);
  }

  /**
   * Calculate device dimensions based on pin field
   * Device includes a bezel around the pin field
   */
  private getDeviceDimensions() {
    const { gridSize, pinSpacing } = this.config;
    const bezelWidth = 0.5; // cm - half size bezel
    
    // Field width extends from center of first pin to center of last pin
    const fieldWidth = (gridSize - 1) * pinSpacing;
    // Pin field area extends half spacing beyond first and last pin centers
    const pinFieldArea = fieldWidth + pinSpacing;
    // Device includes bezel on all sides
    const deviceWidth = pinFieldArea + (bezelWidth * 2);
    
    return {
      width: deviceWidth,
      depth: deviceWidth, // Square device
      fieldWidth: fieldWidth,
      bezelWidth: bezelWidth,
      pinFieldArea: pinFieldArea
    };
  }

  private createDeviceBody(onProgress?: (progress: number, message: string) => void) {
    const { deviceThickness, rimHeight } = this.config;
    const dims = this.getDeviceDimensions();
    
    if (onProgress) onProgress(10, 'Creating device base...');
    
    // Premium white plastic material for device body (Apple style)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, // Pure white
      roughness: 0.4, // Smooth premium plastic finish
      metalness: 0.0, // No metalness - pure plastic
    });
    
    // Premium white plastic material for frame (same as body)
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, // Pure white
      roughness: 0.4,
      metalness: 0.0,
    });
    
    // Create frame plate (solid for performance with dense grids)
    const frameThickness = 0.2; // cm - thin frame for sleeker profile
    
    // Main base body - flush with frame top, extends downward
    // Frame top is at frameThickness, base top aligns with frame top
    const frameTopY = frameThickness;
    const baseGeometry = new THREE.BoxGeometry(
      dims.width,
      deviceThickness,
      dims.depth
    );
    const baseMesh = new THREE.Mesh(baseGeometry, bodyMaterial);
    // Position base so its top surface is flush with frame top
    baseMesh.position.y = frameTopY - deviceThickness / 2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.group.add(baseMesh);
    
    // Frame sits at y = 0, with its bottom at 0 and top at frameThickness
    const frameY = 0;
    
    // Create simple solid frame (no holes for performance with dense grids)
    if (onProgress) onProgress(30, 'Creating frame...');
    const frameGeometry = new THREE.BoxGeometry(dims.width, frameThickness, dims.depth);
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
    frameMesh.position.y = frameY + frameThickness / 2;
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    this.group.add(frameMesh);
    
    if (onProgress) onProgress(50, 'Frame created!');
    
    if (onProgress) onProgress(50, 'Adding device rims...');
    
    // Side walls/rims around the frame
    const rimThickness = 0.2; // cm - thinner rims for refined edges
    const rimY = frameThickness;
    
    // North rim
    const northRim = new THREE.Mesh(
      new THREE.BoxGeometry(dims.width, rimHeight, rimThickness),
      bodyMaterial
    );
    northRim.position.set(0, rimY + rimHeight / 2, -dims.depth / 2 + rimThickness / 2);
    northRim.castShadow = true;
    this.group.add(northRim);
    
    // South rim
    const southRim = new THREE.Mesh(
      new THREE.BoxGeometry(dims.width, rimHeight, rimThickness),
      bodyMaterial
    );
    southRim.position.set(0, rimY + rimHeight / 2, dims.depth / 2 - rimThickness / 2);
    southRim.castShadow = true;
    this.group.add(southRim);
    
    // East rim
    const eastRim = new THREE.Mesh(
      new THREE.BoxGeometry(rimThickness, rimHeight, dims.depth - rimThickness * 2),
      bodyMaterial
    );
    eastRim.position.set(dims.width / 2 - rimThickness / 2, rimY + rimHeight / 2, 0);
    eastRim.castShadow = true;
    this.group.add(eastRim);
    
    // West rim
    const westRim = new THREE.Mesh(
      new THREE.BoxGeometry(rimThickness, rimHeight, dims.depth - rimThickness * 2),
      bodyMaterial
    );
    westRim.position.set(-dims.width / 2 + rimThickness / 2, rimY + rimHeight / 2, 0);
    westRim.castShadow = true;
    this.group.add(westRim);
  }


  getGroup(): THREE.Group {
    return this.group;
  }
}

