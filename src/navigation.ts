/**
 * Navigation Manager
 * Handles region/block navigation modes and focus tracking
 */

import type { ShapePage, TactilePrimitive, Landmark, ContentBlock } from './shapePage';

export type NavigationMode = 'region' | 'block';

/**
 * Navigation Manager class
 */
export class NavigationManager {
  private mode: NavigationMode = 'region';
  private currentLandmarkIndex: number = 0;
  private currentBlockIndex: number = 0;
  private shapePage: ShapePage | null = null;
  
  /**
   * Set the ShapePage to navigate
   */
  setShapePage(page: ShapePage | null) {
    this.shapePage = page;
    // Reset navigation state
    this.currentLandmarkIndex = 0;
    this.currentBlockIndex = 0;
  }
  
  /**
   * Set navigation mode
   */
  setMode(mode: NavigationMode) {
    this.mode = mode;
    // Reset block index when switching modes
    this.currentBlockIndex = 0;
  }
  
  /**
   * Get current navigation mode
   */
  getMode(): NavigationMode {
    return this.mode;
  }
  
  /**
   * Toggle between region and block modes
   */
  toggleMode(): NavigationMode {
    this.mode = this.mode === 'region' ? 'block' : 'region';
    this.currentBlockIndex = 0;
    return this.mode;
  }
  
  /**
   * Get all landmarks from the current page
   */
  private getLandmarks(): Landmark[] {
    return this.shapePage?.landmarks || [];
  }
  
  /**
   * Get blocks in the current landmark
   */
  private getCurrentLandmarkBlocks(): ContentBlock[] {
    const landmarks = this.getLandmarks();
    if (landmarks.length === 0) return [];
    
    const currentLandmark = landmarks[this.currentLandmarkIndex];
    return currentLandmark?.blocks || [];
  }
  
  /**
   * Move to next landmark (region mode)
   */
  nextLandmark(): boolean {
    const landmarks = this.getLandmarks();
    if (landmarks.length === 0) return false;
    
    this.currentLandmarkIndex = (this.currentLandmarkIndex + 1) % landmarks.length;
    this.currentBlockIndex = 0;
    return true;
  }
  
  /**
   * Move to previous landmark (region mode)
   */
  previousLandmark(): boolean {
    const landmarks = this.getLandmarks();
    if (landmarks.length === 0) return false;
    
    this.currentLandmarkIndex = 
      (this.currentLandmarkIndex - 1 + landmarks.length) % landmarks.length;
    this.currentBlockIndex = 0;
    return true;
  }
  
  /**
   * Move to next block (block mode)
   */
  nextBlock(): boolean {
    if (this.mode !== 'block') return false;
    
    const blocks = this.getCurrentLandmarkBlocks();
    if (blocks.length === 0) return false;
    
    this.currentBlockIndex = (this.currentBlockIndex + 1) % blocks.length;
    return true;
  }
  
  /**
   * Move to previous block (block mode)
   */
  previousBlock(): boolean {
    if (this.mode !== 'block') return false;
    
    const blocks = this.getCurrentLandmarkBlocks();
    if (blocks.length === 0) return false;
    
    this.currentBlockIndex = 
      (this.currentBlockIndex - 1 + blocks.length) % blocks.length;
    return true;
  }
  
  /**
   * Get the currently focused primitive
   */
  getFocusedPrimitive(): TactilePrimitive | null {
    if (!this.shapePage) return null;
    
    const landmarks = this.getLandmarks();
    if (landmarks.length === 0) return null;
    
    if (this.mode === 'region') {
      // Focus on current landmark
      return landmarks[this.currentLandmarkIndex] || null;
    } else {
      // Focus on current block within current landmark
      const blocks = this.getCurrentLandmarkBlocks();
      if (blocks.length === 0) {
        // No blocks, focus on landmark
        return landmarks[this.currentLandmarkIndex] || null;
      }
      return blocks[this.currentBlockIndex] || null;
    }
  }
  
  /**
   * Get current landmark
   */
  getCurrentLandmark(): Landmark | null {
    const landmarks = this.getLandmarks();
    return landmarks[this.currentLandmarkIndex] || null;
  }
  
  /**
   * Get current block
   */
  getCurrentBlock(): ContentBlock | null {
    if (this.mode !== 'block') return null;
    const blocks = this.getCurrentLandmarkBlocks();
    return blocks[this.currentBlockIndex] || null;
  }
  
  /**
   * Get navigation status string for UI
   */
  getStatusString(): string {
    if (!this.shapePage) return 'No page loaded';
    
    const modeStr = this.mode === 'region' ? 'Region' : 'Block';
    const landmark = this.getCurrentLandmark();
    const landmarkName = landmark?.id || `Landmark ${this.currentLandmarkIndex + 1}`;
    
    if (this.mode === 'region') {
      return `${modeStr} Mode: ${landmarkName}`;
    } else {
      const block = this.getCurrentBlock();
      const blockName = block?.id || `Block ${this.currentBlockIndex + 1}`;
      return `${modeStr} Mode: ${landmarkName} > ${blockName}`;
    }
  }
}

