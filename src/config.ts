/**
 * Simulation Parameters
 * All configurable values for the haptic browser simulation
 */

export type SimulationConfig = {
  // Pin Field
  gridSize: number;        // Number of pins per side (NxN grid)
  pinSpacing: number;      // Distance between pin centers (cm)
  pinWidth: number;        // Size of each pin cross-section (cm)
  
  // Height Range
  minHeight: number;       // Minimum pin height (cm)
  maxHeight: number;       // Maximum pin height (cm)
  amplitude: number;       // Global height scaling multiplier (0-1), scales pattern within minHeight/maxHeight bounds
  
  // Motion
  responseSpeed: number;   // How fast pins move toward target (0-1)
  physicsMode: 'ideal' | 'plausible';  // Ideal = instant, Plausible = easing
  
  // Pattern
  patternMode: 'wave' | 'ripple' | 'gaussian' | 'noise' | 'flat';
  patternSpeed: number;    // Time scaling for animated fields
  
  // Device Physical Form
  deviceWidth: number;     // Overall device width (cm)
  deviceDepth: number;     // Overall device depth (cm)
  deviceThickness: number; // Device body thickness (cm)
  rimHeight: number;       // Border rim height (cm)
}

export const defaultConfig: SimulationConfig = {
  // Pin Field
  gridSize: 40,
  pinSpacing: 0.8,
  pinWidth: 0.5, // Smaller radius so holes are visible when pins are flush
  
  // Height Range
  minHeight: 0,
  maxHeight: 2,
  amplitude: 0.5, // Height scaling (0-0.5), clamped to respect minHeight/maxHeight limits
  
  // Motion
  responseSpeed: 0.15,
  physicsMode: 'plausible',
  
  // Pattern
  patternMode: 'wave',
  patternSpeed: 1.0,
  
  // Device Physical Form
  deviceWidth: 40,
  deviceDepth: 40,
  deviceThickness: 4,
  rimHeight: 0.8,
};

