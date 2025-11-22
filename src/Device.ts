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
    const bezelWidth = 2.0; // cm - border around the pin field
    
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
    const { deviceThickness, rimHeight, gridSize, pinSpacing, pinWidth } = this.config;
    const dims = this.getDeviceDimensions();
    
    if (onProgress) onProgress(10, 'Creating device base...');
    
    // White plastic material for device body
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, // Pure white
      roughness: 0.7, // Slight sheen but mostly matte
      metalness: 0.0, // No metalness - pure plastic
    });
    
    // White plastic material for frame (same as body)
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, // Pure white
      roughness: 0.7,
      metalness: 0.0,
    });
    
    // Create frame plate with holes for pins
    const frameThickness = 0.3; // cm - thickness of the frame plate
    const holeClearance = 0.03; // cm - extra space around pin for clearance
    const holeRadius = pinWidth / 2 + holeClearance;
    
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
    
    // Create frame using CSG-like approach: start with solid plate, subtract holes
    // For simplicity, we'll create a frame with individual hole geometries
    if (onProgress) onProgress(30, 'Creating frame with holes...');
    this.createFrameWithHoles(
      dims.width,
      dims.depth,
      frameThickness,
      frameY,
      gridSize,
      pinSpacing,
      holeRadius,
      frameMaterial,
      onProgress
    );
    
    if (onProgress) onProgress(50, 'Adding device rims...');
    
    // Side walls/rims around the frame
    const rimThickness = 0.3; // cm
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

  /**
   * Create frame plate with actual holes for each pin
   * Uses THREE.Shape with holes and ExtrudeGeometry to create proper geometry
   */
  private createFrameWithHoles(
    width: number,
    depth: number,
    thickness: number,
    yPosition: number,
    gridSize: number,
    pinSpacing: number,
    holeRadius: number,
    material: THREE.MeshStandardMaterial,
    onProgress?: (progress: number, message: string) => void
  ) {
    // Calculate field dimensions (same as PinField)
    const fieldWidth = (gridSize - 1) * pinSpacing;
    const offsetX = -fieldWidth / 2;
    const offsetZ = -fieldWidth / 2;
    
    // Create frame shape with holes using THREE.Shape
    const frameShape = new THREE.Shape();
    
    // Define the outer rectangle of the frame
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    
    frameShape.moveTo(-halfWidth, -halfDepth);
    frameShape.lineTo(halfWidth, -halfDepth);
    frameShape.lineTo(halfWidth, halfDepth);
    frameShape.lineTo(-halfWidth, halfDepth);
    frameShape.lineTo(-halfWidth, -halfDepth);
    
    // Add holes for each pin position with higher quality (more segments)
    const holes: THREE.Path[] = [];
    const holeSegments = 32; // Increased from 16 to 32 for smoother circles
    const totalHoles = gridSize * gridSize;
    const updateInterval = Math.max(1, Math.floor(totalHoles / 10)); // Update every 10% of holes
    
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const holeIndex = x * gridSize + y;
        const holeX = offsetX + x * pinSpacing;
        const holeZ = offsetZ + y * pinSpacing;
        
        // Create circular hole path with more segments for smoother edges
        const holePath = new THREE.Path();
        for (let i = 0; i <= holeSegments; i++) {
          const angle = (i / holeSegments) * Math.PI * 2;
          const px = holeX + Math.cos(angle) * holeRadius;
          const pz = holeZ + Math.sin(angle) * holeRadius;
          if (i === 0) {
            holePath.moveTo(px, pz);
          } else {
            holePath.lineTo(px, pz);
          }
        }
        holes.push(holePath);
        
        // Update progress periodically
        if (onProgress && (holeIndex % updateInterval === 0 || holeIndex === totalHoles - 1)) {
          const progress = 30 + ((holeIndex + 1) / totalHoles) * 20; // 30-50% range
          onProgress(progress, `Creating frame holes... ${holeIndex + 1}/${totalHoles}`);
        }
      }
    }
    
    // Add all holes to the shape
    frameShape.holes = holes;
    
    // Extrude the shape to create the frame with holes
    // Add slight bevel for rounded edges
    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: 0.02, // Small bevel for rounded edges
      bevelSize: 0.02,
      bevelSegments: 2, // Smooth bevel
    };
    
    const frameGeometry = new THREE.ExtrudeGeometry(frameShape, extrudeSettings);
    
    // Rotate to align with horizontal frame (extrude creates vertical by default)
    // After rotation, the extrude depth (thickness) becomes the Y-axis height
    frameGeometry.rotateX(-Math.PI / 2);
    
    // The extrude geometry center is at the shape center after rotation
    // Translate geometry so its bottom edge aligns with y=0
    // This ensures when we position at yPosition, the bottom is at base top
    frameGeometry.translate(0, thickness / 2, 0);
    
    const frameMesh = new THREE.Mesh(frameGeometry, material);
    // Position frame so its bottom is exactly at base top surface (deviceThickness / 2)
    // After translation, geometry bottom is at mesh position
    frameMesh.position.y = yPosition;
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    this.group.add(frameMesh);
  }

  getGroup(): THREE.Group {
    return this.group;
  }
}

