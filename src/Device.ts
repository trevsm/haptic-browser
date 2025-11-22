import * as THREE from 'three';
import type { SimulationConfig } from './config';

/**
 * Device represents the physical body/housing of the haptic display
 * Includes the base, sides, and rim around the pin field
 */
export class Device {
  private config: SimulationConfig;
  private group: THREE.Group;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.group = new THREE.Group();
    
    this.createDeviceBody();
  }

  private createDeviceBody() {
    const { deviceWidth, deviceDepth, deviceThickness, rimHeight } = this.config;
    
    // Material for device body - dark matte
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.9,
      metalness: 0.05,
    });
    
    // Main base body
    const baseGeometry = new THREE.BoxGeometry(
      deviceWidth,
      deviceThickness,
      deviceDepth
    );
    const baseMesh = new THREE.Mesh(baseGeometry, bodyMaterial);
    baseMesh.position.y = -deviceThickness / 2;
    this.group.add(baseMesh);
    
    // Calculate rim dimensions
    // Rim goes around the edge of the top surface
    const rimThickness = 0.5; // cm
    const rimY = deviceThickness / 2;
    
    // North rim
    const northRim = new THREE.Mesh(
      new THREE.BoxGeometry(deviceWidth, rimHeight, rimThickness),
      bodyMaterial
    );
    northRim.position.set(0, rimY + rimHeight / 2, -deviceDepth / 2 + rimThickness / 2);
    this.group.add(northRim);
    
    // South rim
    const southRim = new THREE.Mesh(
      new THREE.BoxGeometry(deviceWidth, rimHeight, rimThickness),
      bodyMaterial
    );
    southRim.position.set(0, rimY + rimHeight / 2, deviceDepth / 2 - rimThickness / 2);
    this.group.add(southRim);
    
    // East rim
    const eastRim = new THREE.Mesh(
      new THREE.BoxGeometry(rimThickness, rimHeight, deviceDepth - rimThickness * 2),
      bodyMaterial
    );
    eastRim.position.set(deviceWidth / 2 - rimThickness / 2, rimY + rimHeight / 2, 0);
    this.group.add(eastRim);
    
    // West rim
    const westRim = new THREE.Mesh(
      new THREE.BoxGeometry(rimThickness, rimHeight, deviceDepth - rimThickness * 2),
      bodyMaterial
    );
    westRim.position.set(-deviceWidth / 2 + rimThickness / 2, rimY + rimHeight / 2, 0);
    this.group.add(westRim);
  }

  getGroup(): THREE.Group {
    return this.group;
  }
}

