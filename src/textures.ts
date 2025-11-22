/**
 * Texture Generator
 * Creates tactile texture patterns that modify base height
 * All functions take normalized coordinates (0-1) and return height offset multiplier (0-1)
 */

import { TextureType } from './shapePage';

/**
 * Texture amplitude - how much textures modify height (small relative to tier differences)
 */
const TEXTURE_AMPLITUDE = 0.08; // 8% of height range

/**
 * Smooth texture - no modification
 */
export function smooth(_x: number, _y: number): number {
  return 0;
}

/**
 * Fine ridges - horizontal ridges for headings
 */
export function fineRidges(x: number, _y: number, frequency: number = 8): number {
  // Horizontal ridges (vary with x)
  return Math.sin(x * Math.PI * frequency) * 0.5 + 0.5;
}

/**
 * Ultra-fine ridges - very fine ridges for paragraphs
 */
export function ultraFineRidges(x: number, _y: number, frequency: number = 20): number {
  // Very fine horizontal ridges
  return Math.sin(x * Math.PI * frequency) * 0.3 + 0.5;
}

/**
 * Dots - stipple pattern for buttons/links
 */
export function dots(x: number, y: number, spacing: number = 0.15): number {
  // Create dot pattern using modulo
  const gridX = Math.floor(x / spacing);
  const gridY = Math.floor(y / spacing);
  
  // Alternate dots in checkerboard pattern
  const isDot = (gridX + gridY) % 2 === 0;
  
  if (!isDot) return 0;
  
  // Center of dot
  const centerX = (gridX + 0.5) * spacing;
  const centerY = (gridY + 0.5) * spacing;
  const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
  const dotRadius = spacing * 0.3;
  
  // Smooth falloff from center
  if (dist < dotRadius) {
    return 1.0 - (dist / dotRadius);
  }
  
  return 0;
}

/**
 * Pebbled - coarse random-like texture for media placeholders
 * With animated wave effect to indicate it's an image
 */
export function pebbled(x: number, y: number, scale: number = 4, time: number = 0): number {
  // Base pebbled texture
  const n1 = Math.sin(x * Math.PI * scale * 2.3) * Math.cos(y * Math.PI * scale * 1.7);
  const n2 = Math.sin(x * Math.PI * scale * 3.1) * Math.cos(y * Math.PI * scale * 2.9);
  const n3 = Math.sin(x * Math.PI * scale * 5.7) * Math.cos(y * Math.PI * scale * 4.3);
  
  // Add animated wave that travels across the image
  // Wave moves diagonally from top-left to bottom-right
  const waveSpeed = 4.0; // Increased speed for faster detection
  const waveFrequency = 3.0;
  const waveAmplitude = 0.7; // Increased amplitude for dramatic effect
  const wave = Math.sin((x + y) * Math.PI * waveFrequency - time * waveSpeed) * waveAmplitude;
  
  // Combine base texture with animated wave
  const combined = (n1 + n2 + n3) / 3 + wave;
  return Math.max(0, Math.min(1, (combined + 1) / 2)); // Normalize and clamp to [0, 1]
}

/**
 * Apply texture to a base height value
 */
export function applyTexture(
  textureType: TextureType,
  x: number,
  y: number,
  baseHeight: number,
  minHeight: number,
  maxHeight: number,
  time: number = 0
): number {
  let textureValue: number;
  
  switch (textureType) {
    case TextureType.Smooth:
      textureValue = smooth(x, y);
      break;
    case TextureType.FineRidges:
      textureValue = fineRidges(x, y);
      break;
    case TextureType.UltraFineRidges:
      textureValue = ultraFineRidges(x, y);
      break;
    case TextureType.Dots:
      textureValue = dots(x, y);
      break;
    case TextureType.Pebbled:
      textureValue = pebbled(x, y, 4, time); // Pass time for animation
      break;
    default:
      textureValue = 0;
  }
  
  // Apply texture as a small modification to base height
  const heightRange = maxHeight - minHeight;
  const textureOffset = (textureValue - 0.5) * TEXTURE_AMPLITUDE * heightRange;
  
  // Clamp to physical limits
  const finalHeight = baseHeight + textureOffset;
  return Math.max(minHeight, Math.min(maxHeight, finalHeight));
}

