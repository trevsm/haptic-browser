/**
 * Simulation Parameters
 * All configurable values for the haptic browser simulation
 */

export type SimulationConfig = {
  // Display Mode
  mode: 'pattern' | 'web';  // Pattern = mathematical patterns, Web = web content as tactile geometry
  
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
  
  // Pattern (only used in pattern mode)
  patternMode: 'wave' | 'ripple' | 'gaussian' | 'noise' | 'flat';
  patternSpeed: number;    // Time scaling for animated fields
  
  // Web Mode (only used in web mode)
  webUrl?: string;         // URL to load for web mode
  
  // Device Physical Form
  deviceWidth: number;     // Overall device width (cm)
  deviceDepth: number;     // Overall device depth (cm)
  deviceThickness: number; // Device body thickness (cm)
  rimHeight: number;       // Border rim height (cm)
  
  // Debug Visualization
  colorByHeight: boolean;  // Color pins based on height for easier debugging
}

export const defaultConfig: SimulationConfig = {
  // Display Mode
  mode: 'pattern',
  
  // Pin Field
  gridSize: 50,
  pinSpacing: 0.1, // Increased density - pins closer together
  pinWidth: 0.08, // Reduced to fit denser spacing
  
  // Height Range
  minHeight: 0,
  maxHeight: 0.1,
  amplitude: 2.0, // Height scaling (increased for better visibility)
  
  // Motion
  responseSpeed: 0.15,
  physicsMode: 'plausible',
  
  // Pattern (only used in pattern mode)
  patternMode: 'wave',
  patternSpeed: 3.5,
  
  // Web Mode (only used in web mode)
  webUrl: undefined,
  
  // Device Physical Form
  deviceWidth: 40,
  deviceDepth: 40,
  deviceThickness: .25, // Ultra-thin Apple-style profile
  rimHeight: 0.3, // Minimal rim for sleek design
  
  // Debug Visualization
  colorByHeight: false,
};

