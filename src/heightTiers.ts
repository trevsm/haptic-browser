/**
 * Height Tier System
 * Maps canonical height tiers to actual pin heights
 */

import { HeightTier } from './shapePage';
import type { SimulationConfig } from './config';

/**
 * Get the actual height value for a given height tier
 * Heights scale proportionally within minHeight-maxHeight range
 */
export function getHeightForTier(tier: HeightTier, config: SimulationConfig): number {
  const { minHeight, maxHeight, amplitude } = config;
  const heightRange = maxHeight - minHeight;
  
  // Define tier proportions (0-1 scale)
  const tierProportions: Record<HeightTier, number> = {
    [HeightTier.Level0]: 0.0,   // Background plane at minimum
    [HeightTier.Level1]: 0.15,  // Text areas - subtle raise
    [HeightTier.Level2]: 0.4,   // Interactive surfaces - moderate raise
    [HeightTier.Level3]: 0.7,   // Structural emphasis - significant raise
    [HeightTier.Level4]: 1.0,   // Alerts/focus - maximum raise
  };
  
  // Calculate height for tier
  const tierProportion = tierProportions[tier];
  
  // Apply amplitude scaling (but ensure Level0 stays at minHeight)
  if (tier === HeightTier.Level0) {
    return minHeight;
  }
  
  // Scale by amplitude, but keep proportional to tier
  // Allow amplitude > 1.0 for better visibility, but clamp final height to physical limits
  const scaledHeight = minHeight + (tierProportion * heightRange * amplitude);
  
  // Clamp to physical limits
  return Math.max(minHeight, Math.min(maxHeight, scaledHeight));
}

