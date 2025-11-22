/**
 * Tactile Renderer
 * Converts ShapePage data into pin height arrays
 */

import type { ShapePage, TactilePrimitive, Rectangle } from './shapePage';
import { HeightTier } from './shapePage';
import type { SimulationConfig } from './config';
import { getHeightForTier } from './heightTiers';
import { applyTexture } from './textures';

/**
 * Check if a point (x, y) is within a rectangle (normalized coordinates)
 */
function pointInRectangle(x: number, y: number, rect: Rectangle): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

/**
 * Get all primitives that overlap a given point
 */
export function getPrimitivesAtPoint(
  x: number,
  y: number,
  page: ShapePage
): TactilePrimitive[] {
  const primitives: TactilePrimitive[] = [];
  
  // Check landmarks
  for (const landmark of page.landmarks) {
    if (pointInRectangle(x, y, landmark.bounds)) {
      primitives.push(landmark);
      
      // Check blocks within landmark
      if (landmark.blocks) {
        for (const block of landmark.blocks) {
          if (pointInRectangle(x, y, block.bounds)) {
            primitives.push(block);
            
            // Check nested children
            if (block.children) {
              for (const child of block.children) {
                if (pointInRectangle(x, y, child.bounds)) {
                  primitives.push(child);
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Check standalone primitives
  if (page.primitives) {
    for (const primitive of page.primitives) {
      if (pointInRectangle(x, y, primitive.bounds)) {
        primitives.push(primitive);
      }
    }
  }
  
  return primitives;
}

/**
 * Get the highest-priority primitive at a point (highest height tier wins)
 */
function getTopPrimitive(
  primitives: TactilePrimitive[]
): TactilePrimitive | null {
  if (primitives.length === 0) return null;
  
  // Sort by height tier (higher tier = higher priority)
  const sorted = [...primitives].sort((a, b) => b.heightTier - a.heightTier);
  return sorted[0];
}

/**
 * Calculate focus indicator height modification
 * Creates an outline ridge around the focused primitive
 */
function getFocusIndicatorHeight(
  x: number,
  y: number,
  focusedPrimitive: TactilePrimitive | null,
  config: SimulationConfig
): number {
  if (!focusedPrimitive) return 0;
  
  const { bounds } = focusedPrimitive;
  
  // Focus indicator thickness (normalized)
  const focusThickness = 0.02;
  
  // Check if point is on the border of the focused primitive
  const onLeftEdge = Math.abs(x - bounds.x) < focusThickness && 
                     y >= bounds.y && y <= bounds.y + bounds.height;
  const onRightEdge = Math.abs(x - (bounds.x + bounds.width)) < focusThickness &&
                      y >= bounds.y && y <= bounds.y + bounds.height;
  const onTopEdge = Math.abs(y - bounds.y) < focusThickness &&
                    x >= bounds.x && x <= bounds.x + bounds.width;
  const onBottomEdge = Math.abs(y - (bounds.y + bounds.height)) < focusThickness &&
                       x >= bounds.x && x <= bounds.x + bounds.width;
  
  if (onLeftEdge || onRightEdge || onTopEdge || onBottomEdge) {
    // Return Level 4 height for focus indicator
    return getHeightForTier(HeightTier.Level4, config);
  }
  
  return 0;
}

/**
 * Tactile Renderer class
 */
export class TactileRenderer {
  /**
   * Render a ShapePage into a 2D array of pin heights
   */
  renderPage(
    page: ShapePage,
    config: SimulationConfig,
    focusedPrimitive: TactilePrimitive | null = null,
    time: number = 0
  ): number[][] {
    // Use config gridSize (actual pin field size) instead of page gridSize
    // This allows the page to work with any grid size
    const { gridSize } = config;
    const { minHeight, maxHeight } = config;
    
    // Initialize height array
    const heights: number[][] = [];
    
    for (let x = 0; x < gridSize; x++) {
      heights[x] = [];
      for (let y = 0; y < gridSize; y++) {
        // Convert grid coordinates to normalized coordinates (0-1)
        // Grid coordinates: x=0 (left), y=0 (top) to x=gridSize-1 (right), y=gridSize-1 (bottom)
        // Normalized coordinates: nx=0 (left), ny=0 (top) to nx=1 (right), ny=1 (bottom)
        const nx = x / (gridSize - 1);
        const ny = y / (gridSize - 1);
        
        // Get all primitives at this point
        const primitives = getPrimitivesAtPoint(nx, ny, page);
        
        // Get the top primitive (highest tier)
        const topPrimitive = getTopPrimitive(primitives);
        
        let height: number;
        
        if (topPrimitive) {
          // Get base height from tier
          const baseHeight = getHeightForTier(topPrimitive.heightTier, config);
          
          // Apply texture (with time for animations)
          height = applyTexture(
            topPrimitive.textureType,
            nx,
            ny,
            baseHeight,
            minHeight,
            maxHeight,
            time
          );
        } else {
          // No primitive - use background (Level 0)
          height = getHeightForTier(0, config);
        }
        
        // Apply focus indicator (outline ridge)
        const focusHeight = getFocusIndicatorHeight(nx, ny, focusedPrimitive, config);
        if (focusHeight > 0) {
          height = Math.max(height, focusHeight);
        }
        
        heights[x][y] = height;
      }
    }
    
    return heights;
  }
}

