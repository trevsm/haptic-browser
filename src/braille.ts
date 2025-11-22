/**
 * Braille Text Rendering
 * Converts text to Braille patterns for tactile reading
 */

/**
 * Braille cell pattern - 2x3 dot grid
 * Each cell is represented as a 6-bit number (dots from top-left, reading left-to-right, top-to-bottom)
 */
const BRAILLE_PATTERNS: Record<string, number> = {
  ' ': 0b000000, // Space
  'a': 0b100000,
  'b': 0b110000,
  'c': 0b100100,
  'd': 0b100110,
  'e': 0b100010,
  'f': 0b110100,
  'g': 0b110110,
  'h': 0b110010,
  'i': 0b010100,
  'j': 0b010110,
  'k': 0b101000,
  'l': 0b111000,
  'm': 0b101100,
  'n': 0b101110,
  'o': 0b101010,
  'p': 0b111100,
  'q': 0b111110,
  'r': 0b111010,
  's': 0b011100,
  't': 0b011110,
  'u': 0b101001,
  'v': 0b111001,
  'w': 0b010111,
  'x': 0b101101,
  'y': 0b101111,
  'z': 0b101011,
  '0': 0b010110,
  '1': 0b100000,
  '2': 0b110000,
  '3': 0b100100,
  '4': 0b100110,
  '5': 0b100010,
  '6': 0b110100,
  '7': 0b110110,
  '8': 0b110010,
  '9': 0b010100,
  '.': 0b010000,
  ',': 0b010000,
  '!': 0b011010,
  '?': 0b011001,
  '-': 0b001001,
  '\'': 0b001000,
};

/**
 * Convert a character to Braille pattern
 */
function charToBraille(char: string): number {
  const lower = char.toLowerCase();
  return BRAILLE_PATTERNS[lower] ?? BRAILLE_PATTERNS[' '];
}

/**
 * Convert text to Braille cells
 */
export function textToBraille(text: string): number[] {
  const cells: number[] = [];
  for (const char of text) {
    cells.push(charToBraille(char));
  }
  return cells;
}

/**
 * Render Braille cells as tactile dots
 * Returns a 2D array of heights representing Braille dots
 */
export function renderBrailleCells(
  cells: number[],
  gridSize: number,
  config: { minHeight: number; maxHeight: number; amplitude: number }
): number[][] {
  const { minHeight, maxHeight, amplitude } = config;
  const heightRange = maxHeight - minHeight;
  
  // Braille cell dimensions (dots per cell)
  const cellWidth = 2;  // 2 dots wide
  const cellHeight = 3; // 3 dots tall
  const cellSpacing = 1; // 1 dot spacing between cells
  
  // Calculate how many cells fit per row
  const dotsPerCell = cellWidth + cellSpacing;
  const cellsPerRow = Math.floor(gridSize / dotsPerCell);
  
  // Initialize height array - ALL pins retracted to minimum
  const heights: number[][] = [];
  for (let x = 0; x < gridSize; x++) {
    heights[x] = [];
    for (let y = 0; y < gridSize; y++) {
      heights[x][y] = minHeight; // All pins retracted
    }
  }
  
  // Render each Braille cell
  for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
    const cellPattern = cells[cellIndex];
    const row = Math.floor(cellIndex / cellsPerRow);
    const col = cellIndex % cellsPerRow;
    
    const startX = col * dotsPerCell;
    const startY = row * cellHeight;
    
    // Render dots in the cell (2x3 grid)
    for (let dotY = 0; dotY < cellHeight; dotY++) {
      for (let dotX = 0; dotX < cellWidth; dotX++) {
        const dotIndex = dotY * cellWidth + dotX;
        const dotBit = (cellPattern >> (5 - dotIndex)) & 1;
        
        if (dotBit === 1) {
          const x = startX + dotX;
          const y = startY + dotY;
          
          if (x < gridSize && y < gridSize) {
            // Raised Braille dot - use significant height for readability
            // Use 60% of height range for clear Braille dots
            const dotHeight = minHeight + (0.6 * heightRange * amplitude);
            heights[x][y] = Math.max(minHeight, Math.min(maxHeight, dotHeight));
          }
        }
      }
    }
  }
  
  return heights;
}

/**
 * Render text as Braille across the entire grid
 */
export function renderBrailleText(
  text: string,
  gridSize: number,
  config: { minHeight: number; maxHeight: number; amplitude: number }
): number[][] {
  const cells = textToBraille(text);
  return renderBrailleCells(cells, gridSize, config);
}

