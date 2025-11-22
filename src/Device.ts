import * as THREE from 'three';
import type { SimulationConfig } from './config';

/**
 * Device represents the physical body/housing of the haptic display
 * Includes the base
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
    const bezelWidth = 0.1; // cm - minimal bezel width
    
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

  /**
   * Create rounded box geometry for premium Apple-style appearance
   */
  private createRoundedBox(width: number, height: number, depth: number, radius: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const x = width / 2;
    const y = depth / 2;
    
    // Create rounded rectangle shape
    shape.moveTo(-x + radius, -y);
    shape.lineTo(x - radius, -y);
    shape.quadraticCurveTo(x, -y, x, -y + radius);
    shape.lineTo(x, y - radius);
    shape.quadraticCurveTo(x, y, x - radius, y);
    shape.lineTo(-x + radius, y);
    shape.quadraticCurveTo(-x, y, -x, y - radius);
    shape.lineTo(-x, -y + radius);
    shape.quadraticCurveTo(-x, -y, -x + radius, -y);
    
    const extrudeSettings = {
      depth: height,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 12, // Increased for smoother beveled edges
      curveSegments: 40 // High quality curve segments for smooth border radiuses
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(Math.PI / 2);
    
    return geometry;
  }

  private createDeviceBody(onProgress?: (progress: number, message: string) => void) {
    const { deviceThickness } = this.config;
    const dims = this.getDeviceDimensions();
    
    if (onProgress) onProgress(10, 'Creating device base...');
    
    // Premium aluminum-style material for device body (Apple aesthetic)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5f7, // Apple-style light aluminum/silver
      roughness: 0.1, // Very smooth, almost mirror-like finish
      metalness: 0.15, // Subtle metallic sheen
    });
    
    const cornerRadius = 0.3; // Generous corner radius for Apple aesthetic
    
    // Main base body - top surface at y = 0 (reference level for pins)
    const baseGeometry = this.createRoundedBox(
      dims.width,
      deviceThickness,
      dims.depth,
      cornerRadius
    );
    const baseMesh = new THREE.Mesh(baseGeometry, bodyMaterial);
    // Position base so its top surface is at y = 0
    baseMesh.position.y = -deviceThickness / 2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.group.add(baseMesh);
    
    // Add antenna bands similar to iPhone design
    this.createAntennaBands(dims);
    
    if (onProgress) onProgress(100, 'Device base created!');
  }

  /**
   * Create white antenna bands around the device perimeter
   * Bands wrap around the edges following the device contours
   */
  private createAntennaBands(dims: { width: number; depth: number }) {
    const { deviceThickness } = this.config;
    const bandMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, // White bands
      roughness: 0.3,
      metalness: 0.05,
    });
    
    const bandWidth = 0.03; // Width of antenna band in cm
    const cornerRadius = 0.3; // Match device corner radius
    const bezelInset = 0.025; // Gap between band and device edge (cm)
    const bandPositions = [1.58]; // Position band at bottom of device
    
    // Create bands that wrap around the device edges
    bandPositions.forEach(positionRatio => {
      const yPos = -deviceThickness * positionRatio;
      
      // Create a continuous band that wraps around all four edges
      // Using a rounded rectangle path that follows the device perimeter with bezel inset
      const shape = new THREE.Shape();
      const halfWidth = dims.width / 2 - bezelInset; // Inset from device edge
      const halfDepth = dims.depth / 2 - bezelInset; // Inset from device edge
      const innerRadius = cornerRadius - bandWidth / 2;
      const outerRadius = cornerRadius + bandWidth / 2;
      
      // Outer edge of band (following device edge)
      shape.moveTo(-halfWidth + outerRadius, -halfDepth);
      shape.lineTo(halfWidth - outerRadius, -halfDepth);
      shape.quadraticCurveTo(halfWidth, -halfDepth, halfWidth, -halfDepth + outerRadius);
      shape.lineTo(halfWidth, halfDepth - outerRadius);
      shape.quadraticCurveTo(halfWidth, halfDepth, halfWidth - outerRadius, halfDepth);
      shape.lineTo(-halfWidth + outerRadius, halfDepth);
      shape.quadraticCurveTo(-halfWidth, halfDepth, -halfWidth, halfDepth - outerRadius);
      shape.lineTo(-halfWidth, -halfDepth + outerRadius);
      shape.quadraticCurveTo(-halfWidth, -halfDepth, -halfWidth + outerRadius, -halfDepth);
      
      // Inner edge of band (hole)
      const holePath = new THREE.Path();
      const holeInset = bandWidth;
      const holeHalfWidth = halfWidth - holeInset;
      const holeHalfDepth = halfDepth - holeInset;
      
      holePath.moveTo(-holeHalfWidth + innerRadius, -holeHalfDepth);
      holePath.lineTo(holeHalfWidth - innerRadius, -holeHalfDepth);
      holePath.quadraticCurveTo(holeHalfWidth, -holeHalfDepth, holeHalfWidth, -holeHalfDepth + innerRadius);
      holePath.lineTo(holeHalfWidth, holeHalfDepth - innerRadius);
      holePath.quadraticCurveTo(holeHalfWidth, holeHalfDepth, holeHalfWidth - innerRadius, holeHalfDepth);
      holePath.lineTo(-holeHalfWidth + innerRadius, holeHalfDepth);
      holePath.quadraticCurveTo(-holeHalfWidth, holeHalfDepth, -holeHalfWidth, holeHalfDepth - innerRadius);
      holePath.lineTo(-holeHalfWidth, -holeHalfDepth + innerRadius);
      holePath.quadraticCurveTo(-holeHalfWidth, -holeHalfDepth, -holeHalfWidth + innerRadius, -holeHalfDepth);
      
      shape.holes.push(holePath);
      
      // Extrude the band shape to give it thickness
      const extrudeSettings = {
        depth: 0.001, // Very thin extrusion to sit flush on device surface
        bevelEnabled: false
      };
      
      const bandGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      bandGeometry.rotateX(Math.PI / 2); // Rotate to align with device
      
      const band = new THREE.Mesh(bandGeometry, bandMaterial);
      band.position.set(0, yPos, 0);
      band.castShadow = true;
      band.receiveShadow = true;
      this.group.add(band);
    });
  }


  getGroup(): THREE.Group {
    return this.group;
  }
}

