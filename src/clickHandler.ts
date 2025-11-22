/**
 * Click Handler
 * Converts screen coordinates to normalized grid coordinates and finds clicked primitives
 */

import * as THREE from 'three';
import type { ShapePage, ContentBlock } from './shapePage';
import { getPrimitivesAtPoint } from './tactileRenderer';

/**
 * Convert screen coordinates to normalized grid coordinates (0-1)
 */
export function screenToNormalized(
  mouseX: number,
  mouseY: number,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  gridSize: number
): { x: number; y: number } | null {
  // Create a raycaster from the camera through the mouse position
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  // Convert screen coordinates to normalized device coordinates (-1 to +1)
  mouse.x = (mouseX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(mouseY / renderer.domElement.clientHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  // Intersect with a plane at y=0 (the pin field surface)
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersectionPoint = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersectionPoint);
  
  if (!intersectionPoint) {
    return null;
  }
  
  // Get device dimensions to calculate normalized coordinates
  // Use pinSpacing from default config (0.1 cm)
  const pinSpacing = 0.1;
  const fieldWidth = (gridSize - 1) * pinSpacing;
  const halfWidth = fieldWidth / 2;
  
  // Convert 3D position to normalized coordinates (0-1)
  // x and z coordinates map to normalized x and y
  const nx = (intersectionPoint.x + halfWidth) / fieldWidth;
  const ny = (intersectionPoint.z + halfWidth) / fieldWidth;
  
  // Clamp to valid range
  const clampedX = Math.max(0, Math.min(1, nx));
  const clampedY = Math.max(0, Math.min(1, ny));
  
  return { x: clampedX, y: clampedY };
}

/**
 * Find the top content block at a screen position
 */
export function findClickedBlock(
  mouseX: number,
  mouseY: number,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  page: ShapePage,
  gridSize: number
): ContentBlock | null {
  const normalized = screenToNormalized(mouseX, mouseY, camera, renderer, gridSize);
  if (!normalized) {
    return null;
  }
  
  // Get all primitives at this point
  const primitives = getPrimitivesAtPoint(normalized.x, normalized.y, page);
  
  // Find the top content block (highest tier, with text)
  let topBlock: ContentBlock | null = null;
  let topTier = -1;
  
  for (const primitive of primitives) {
    // Check if it's a content block with text
    if ('blockType' in primitive && 'text' in primitive) {
      const block = primitive as ContentBlock;
      if (block.text && block.heightTier > topTier) {
        topTier = block.heightTier;
        topBlock = block;
      }
    }
  }
  
  return topBlock;
}

