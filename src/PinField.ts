import * as THREE from "three";
import type { SimulationConfig } from "./config";
import type { ShapePage, TactilePrimitive, ContentBlock } from "./shapePage";
import { TactileRenderer } from "./tactileRenderer";
import { renderBrailleText } from "./braille";
import {
  renderImageAsTactile,
  processImageElement,
  isGifUrl,
} from "./imageRenderer";

/**
 * PinField manages the array of independently actuated pins
 * Each pin can move vertically to form a 3D relief surface
 * Uses GPU instancing for efficient rendering of thousands of pins
 */
export class PinField {
  private config: SimulationConfig;
  private group: THREE.Group;
  private instancedMesh!: THREE.InstancedMesh;
  private pinMaterial!: THREE.MeshStandardMaterial;
  private colorByHeightMaterial!: THREE.MeshBasicMaterial;
  private targetHeights: number[][] = [];
  private currentHeights: number[][] = [];
  private previousHeights: number[][] = []; // Track previous heights for dirty checking
  private time: number = 0;
  private tempObject: THREE.Object3D = new THREE.Object3D();
  private basePositions: { x: number; z: number; baseY: number }[] = []; // Cache base positions

  // Web mode rendering
  private tactileRenderer: TactileRenderer;
  private currentShapePage: ShapePage | null = null;
  private focusedPrimitive: TactilePrimitive | null = null;

  // Reading mode (Braille display)
  private readingMode: boolean = false;
  private readingText: string | null = null;

  // Image viewing mode state
  private imageMode: boolean = false;
  private imageHeights: number[][] | null = null;
  private animatedGifImage: HTMLImageElement | null = null;
  private animatedGifFrameId: number | null = null;

  constructor(
    config: SimulationConfig,
    onProgress?: (progress: number, message: string) => void
  ) {
    // Create a copy of the config to avoid reference issues
    this.config = { ...config };
    this.group = new THREE.Group();

    // Initialize tactile renderer for web mode
    this.tactileRenderer = new TactileRenderer();

    this.initializeHeightArrays();
    this.createPins(onProgress);

    // If color-by-height is enabled from saved config, initialize colors
    if (this.config.colorByHeight) {
      this.updateAllPinColors();
    }
  }

  /**
   * Check if a grid position is a corner pin (should be skipped)
   */
  private isCorner(x: number, y: number): boolean {
    const { gridSize } = this.config;
    const lastIndex = gridSize - 1;
    return (
      (x === 0 && y === 0) || // Top-left
      (x === 0 && y === lastIndex) || // Top-right
      (x === lastIndex && y === 0) || // Bottom-left
      (x === lastIndex && y === lastIndex)
    ); // Bottom-right
  }

  private initializeHeightArrays() {
    const { gridSize } = this.config;

    for (let x = 0; x < gridSize; x++) {
      this.targetHeights[x] = [];
      this.currentHeights[x] = [];
      this.previousHeights[x] = [];
      for (let y = 0; y < gridSize; y++) {
        this.targetHeights[x][y] = this.config.minHeight;
        this.currentHeights[x][y] = this.config.minHeight;
        this.previousHeights[x][y] = this.config.minHeight;
      }
    }
  }

  private createPins(onProgress?: (progress: number, message: string) => void) {
    const { gridSize, pinSpacing, maxHeight } = this.config;

    if (onProgress) onProgress(0, "Initializing pin geometry...");

    // Pin geometry - pins have extra length below the surface for mechanical support
    // The visible part extends up to maxHeight, but pin extends down into device body
    const belowSurfaceLength = 0.01; // Extra length extending down into device body (very short pins)
    const pinTotalHeight = maxHeight + belowSurfaceLength; // Total pin length (visible + hidden)

    // Use thin cylinders to represent thick lines (linewidth doesn't work reliably)
    const lineRadius = 0.04; // Thick line radius (4mm) - increased size

    if (onProgress) onProgress(10, "Creating pin material...");

    // Base material for pins in normal (non-debug) mode
    this.pinMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888, // Grey color
      roughness: 0.3, // Smooth surface
      metalness: 0.1, // Slight metallic sheen
      vertexColors: false, // Debug colors are applied via a separate material
    });

    // Unlit material for debug color-by-height mode (colors not affected by lighting)
    this.colorByHeightMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
    });

    if (onProgress) onProgress(30, "Building pin geometry...");

    // Create a thin cylinder geometry to represent a thick line
    const pinGeometry = new THREE.CylinderGeometry(
      lineRadius, // Radius top
      lineRadius, // Radius bottom
      pinTotalHeight, // Height
      16 // Radial segments (increased for smoother pins)
    );

    // Center geometry at origin (will be positioned via instance matrix)
    pinGeometry.translate(0, 0, 0);

    if (onProgress) onProgress(40, "Creating instanced mesh...");

    // Create instanced mesh for all pins (GPU instancing for performance)
    // Subtract 4 for the corner pins that we skip
    const totalPins = gridSize * gridSize - 4;
    const initialMaterial = this.config.colorByHeight
      ? this.colorByHeightMaterial
      : this.pinMaterial;

    this.instancedMesh = new THREE.InstancedMesh(pinGeometry, initialMaterial, totalPins);
    this.instancedMesh.castShadow = false; // Disable shadows for performance
    this.instancedMesh.receiveShadow = false;

    // Center the grid
    const fieldWidth = (gridSize - 1) * pinSpacing;
    const offsetX = -fieldWidth / 2;
    const offsetZ = -fieldWidth / 2;

    // Surface top is at y = 0 (reference level for pins)
    const surfaceTopY = 0;
    const minOffset = -0.1; // No offset - pins positioned at surface level
    const baseY = surfaceTopY - pinTotalHeight / 2 + minOffset;

    // Cache base positions to avoid recalculating every frame
    this.basePositions = [];

    if (onProgress) onProgress(50, "Positioning pin instances...");

    // Set initial positions for all pin instances
    const updateInterval = Math.max(1, Math.floor(totalPins / 10)); // Update every 10%

    let pinIndex = 0; // Sequential index for instanced mesh (skips corners)

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        // Skip corner pins
        if (this.isCorner(x, y)) {
          continue;
        }

        const xPos = offsetX + x * pinSpacing;
        const zPos = offsetZ + y * pinSpacing;

        // Cache base position using grid coordinates for lookup
        const gridIndex = x * gridSize + y;
        this.basePositions[gridIndex] = { x: xPos, z: zPos, baseY };

        // Set position for this instance
        this.tempObject.position.set(xPos, baseY, zPos);
        this.tempObject.updateMatrix();

        // Apply matrix to instance (using sequential pinIndex)
        this.instancedMesh.setMatrixAt(pinIndex, this.tempObject.matrix);

        // Update progress periodically
        if (
          onProgress &&
          (pinIndex % updateInterval === 0 || pinIndex === totalPins - 1)
        ) {
          const progress = 50 + ((pinIndex + 1) / totalPins) * 50; // 50-100% range
          onProgress(
            progress,
            `Positioning pins... ${pinIndex + 1}/${totalPins}`
          );
        }

        pinIndex++;
      }
    }

    // Mark instance matrix as needing update
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    // Add instanced mesh to group
    this.group.add(this.instancedMesh);

    if (onProgress) onProgress(100, "Pin field created!");
  }

  /**
   * Update target heights based on current mode (pattern or web)
   */
  private updateTargetHeights(time: number) {
    if (this.config.mode === "web") {
      this.updateWebModeHeights(time); // Pass time for image wave animations
    } else {
      this.updatePatternModeHeights(time);
    }
  }

  /**
   * Update target heights for web mode
   * Renders web content as tactile geometry using TactileRenderer
   */
  private updateWebModeHeights(time: number) {
    const { gridSize } = this.config;

    // Ensure height arrays are properly sized
    if (
      this.targetHeights.length !== gridSize ||
      (this.targetHeights[0] && this.targetHeights[0].length !== gridSize)
    ) {
      this.initializeHeightArrays();
    }

    // If in image viewing mode, render the image bitmap
    if (this.imageMode && this.imageHeights) {
      // Copy image heights to target heights
      for (let x = 0; x < gridSize; x++) {
        if (!this.targetHeights[x]) {
          this.targetHeights[x] = [];
        }
        for (let y = 0; y < gridSize; y++) {
          this.targetHeights[x][y] =
            this.imageHeights[x]?.[y] ?? this.config.minHeight;
        }
      }
      return;
    }

    // If in reading mode, render Braille text
    if (this.readingMode && this.readingText) {
      const heights = renderBrailleText(this.readingText, gridSize, {
        minHeight: this.config.minHeight,
        maxHeight: this.config.maxHeight,
        amplitude: this.config.amplitude,
      });

      // Copy Braille heights to target heights
      for (let x = 0; x < gridSize; x++) {
        if (!this.targetHeights[x]) {
          this.targetHeights[x] = [];
        }
        for (let y = 0; y < gridSize; y++) {
          this.targetHeights[x][y] = heights[x]?.[y] ?? this.config.minHeight;
        }
      }
      return;
    }

    if (!this.currentShapePage) {
      // No page loaded - render flat background
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          this.targetHeights[x][y] = this.config.minHeight;
        }
      }
      return;
    }

    // Render page using TactileRenderer (with time for image wave animations)
    const heights = this.tactileRenderer.renderPage(
      this.currentShapePage,
      this.config,
      this.focusedPrimitive,
      time
    );

    // Copy rendered heights to target heights
    // Ensure arrays match size
    for (let x = 0; x < gridSize; x++) {
      if (!this.targetHeights[x]) {
        this.targetHeights[x] = [];
      }
      for (let y = 0; y < gridSize; y++) {
        this.targetHeights[x][y] = heights[x]?.[y] ?? this.config.minHeight;
      }
    }
  }

  /**
   * Enter reading mode with Braille text
   */
  enterReadingMode(text: string) {
    this.readingMode = true;
    this.readingText = text;
    this.imageMode = false;
    this.imageHeights = null;
    this.stopAnimatedGif();
  }

  /**
   * Enter image viewing mode to view a tactile bitmap
   * For animated GIFs, continuously updates frames
   */
  async enterImageMode(block: ContentBlock) {
    if (!block.imageUrl) {
      console.warn("No image URL provided for image block");
      return;
    }

    // Clean up any existing animated GIF
    this.stopAnimatedGif();

    const { gridSize, minHeight, maxHeight, amplitude } = this.config;
    const imageUrl = block.imageUrl; // Store in const for TypeScript
    const isGif = isGifUrl(imageUrl);

    try {
      if (isGif) {
        // For animated GIFs, load the image and set up continuous frame updates
        console.log("Loading animated GIF, will update frames continuously");
        const img = new Image();
        img.crossOrigin = "anonymous";

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            // Initial frame
            try {
              this.imageHeights = processImageElement(img, gridSize, {
                minHeight,
                maxHeight,
                amplitude,
                edgeDetection: true,
                contrast: 1.5,
              });

              // Store image reference and start animation loop
              this.animatedGifImage = img;
              this.startAnimatedGifLoop(gridSize, {
                minHeight,
                maxHeight,
                amplitude,
                edgeDetection: true,
                contrast: 1.5,
              });

              this.imageMode = true;
              this.readingMode = false;
              this.readingText = null;
              resolve();
            } catch (error) {
              reject(error);
            }
          };

          img.onerror = () => {
            // Try without CORS
            const imgRetry = new Image();
            imgRetry.onload = () => {
              try {
                this.imageHeights = processImageElement(imgRetry, gridSize, {
                  minHeight,
                  maxHeight,
                  amplitude,
                  edgeDetection: true,
                  contrast: 1.5,
                });

                this.animatedGifImage = imgRetry;
                this.startAnimatedGifLoop(gridSize, {
                  minHeight,
                  maxHeight,
                  amplitude,
                  edgeDetection: true,
                  contrast: 1.5,
                });

                this.imageMode = true;
                this.readingMode = false;
                this.readingText = null;
                resolve();
              } catch (error) {
                reject(error);
              }
            };
            imgRetry.onerror = () => reject(new Error("Failed to load GIF"));
            imgRetry.src = imageUrl;
          };

          img.src = imageUrl;
        });
      } else {
        // For static images, use the existing render function
        this.imageHeights = await renderImageAsTactile(imageUrl, gridSize, {
          minHeight,
          maxHeight,
          amplitude,
          edgeDetection: true,
          contrast: 1.5,
        });

        this.imageMode = true;
        this.readingMode = false;
        this.readingText = null;
      }
    } catch (error) {
      console.error("Failed to enter image mode:", error);
      this.stopAnimatedGif();
    }
  }

  /**
   * Start animation loop for animated GIFs
   * Updates the pin field heights as the GIF animates
   */
  private startAnimatedGifLoop(
    gridSize: number,
    options: {
      minHeight: number;
      maxHeight: number;
      amplitude: number;
      edgeDetection: boolean;
      contrast: number;
    }
  ) {
    if (!this.animatedGifImage) return;

    const updateFrame = () => {
      if (!this.animatedGifImage || !this.imageMode) {
        this.stopAnimatedGif();
        return;
      }

      try {
        // Process current frame and update heights
        this.imageHeights = processImageElement(
          this.animatedGifImage,
          gridSize,
          options
        );
      } catch (error) {
        console.error("Error updating GIF frame:", error);
        this.stopAnimatedGif();
        return;
      }

      // Schedule next frame update (every ~100ms for smooth animation)
      this.animatedGifFrameId = requestAnimationFrame(() => {
        setTimeout(updateFrame, 100);
      });
    };

    // Start the loop
    updateFrame();
  }

  /**
   * Stop animated GIF updates
   */
  private stopAnimatedGif() {
    if (this.animatedGifFrameId !== null) {
      cancelAnimationFrame(this.animatedGifFrameId);
      this.animatedGifFrameId = null;
    }
    this.animatedGifImage = null;
  }

  /**
   * Exit reading mode
   */
  exitReadingMode() {
    this.readingMode = false;
    this.readingText = null;
    this.imageMode = false;
    this.imageHeights = null;
    this.stopAnimatedGif();
  }

  /**
   * Check if in reading mode (text or image)
   */
  isReadingMode(): boolean {
    return this.readingMode || this.imageMode;
  }

  /**
   * Set the current ShapePage for web mode rendering
   */
  setShapePage(page: ShapePage | null) {
    this.currentShapePage = page;
    // Heights will be updated on next frame
  }

  /**
   * Set the focused primitive for focus indicator
   */
  setFocusedPrimitive(primitive: TactilePrimitive | null) {
    this.focusedPrimitive = primitive;
    // Heights will be updated on next frame
  }

  /**
   * Update target heights for pattern mode
   * Renders mathematical patterns
   */
  private updatePatternModeHeights(time: number) {
    const {
      gridSize,
      patternMode,
      patternSpeed,
      minHeight,
      maxHeight,
      amplitude,
    } = this.config;

    // Ensure arrays are properly sized
    if (
      this.targetHeights.length !== gridSize ||
      (this.targetHeights[0] && this.targetHeights[0].length !== gridSize)
    ) {
      this.initializeHeightArrays();
    }

    for (let x = 0; x < gridSize; x++) {
      if (!this.targetHeights[x]) {
        this.targetHeights[x] = [];
      }
      for (let y = 0; y < gridSize; y++) {
        let height = 0;

        switch (patternMode) {
          case "wave": {
            // Traveling sine wave
            const nx = x / gridSize;
            const ny = y / gridSize;
            height =
              Math.sin((nx + ny) * Math.PI * 4 + time * patternSpeed) * 0.5 +
              0.5;
            break;
          }

          case "ripple": {
            // Circular ripple from center
            const cx = x - gridSize / 2;
            const cy = y - gridSize / 2;
            const dist = Math.sqrt(cx * cx + cy * cy);
            height = Math.sin(dist * 0.5 - time * patternSpeed * 3) * 0.5 + 0.5;
            break;
          }

          case "gaussian": {
            // Gaussian hill in center
            const cx = x - gridSize / 2;
            const cy = y - gridSize / 2;
            const dist = Math.sqrt(cx * cx + cy * cy);
            const sigma = gridSize * 0.15;
            height = Math.exp(-(dist * dist) / (2 * sigma * sigma));
            break;
          }

          case "noise": {
            // Simple noise pattern (will improve later with proper noise)
            const nx = (x / gridSize) * 4;
            const ny = (y / gridSize) * 4;
            height =
              Math.sin(nx * 2.3 + time * patternSpeed * 0.3) *
                Math.cos(ny * 1.7 + time * patternSpeed * 0.4) *
                0.5 +
              0.5;
            break;
          }

          case "flat":
          default:
            height = 0;
            break;
        }

        // Scale to height range with amplitude
        // Height represents extension above frame top, minimum is 0 (flush with frame)
        // Amplitude scales the pattern but is clamped to physical limits
        const scaledHeight =
          minHeight +
          height * Math.min(amplitude, 1.0) * (maxHeight - minHeight);
        // Clamp to physical pin limits (minHeight to maxHeight)
        this.targetHeights[x][y] = Math.max(
          minHeight,
          Math.min(maxHeight, scaledHeight)
        );
      }
    }
  }

  /**
   * Interpolate current heights toward target heights
   */
  private updateCurrentHeights() {
    const { gridSize, responseSpeed, physicsMode } = this.config;

    // Ensure arrays are properly sized
    if (
      this.currentHeights.length !== gridSize ||
      (this.currentHeights[0] && this.currentHeights[0].length !== gridSize)
    ) {
      this.initializeHeightArrays();
    }

    for (let x = 0; x < gridSize; x++) {
      if (!this.currentHeights[x]) {
        this.currentHeights[x] = [];
      }
      for (let y = 0; y < gridSize; y++) {
        const target = this.targetHeights[x]?.[y] ?? this.config.minHeight;
        const current = this.currentHeights[x][y] ?? this.config.minHeight;

        if (physicsMode === "ideal") {
          // Direct assignment (instant response)
          this.currentHeights[x][y] = target;
        } else {
          // Smooth interpolation (plausible physics)
          this.currentHeights[x][y] =
            current + (target - current) * responseSpeed;
        }
      }
    }
  }

  /**
   * Apply current heights to pin meshes using instanced rendering
   * Optimized: Only update matrices for pins that actually changed
   * Pin height is fixed - the height value determines how much the pin is pushed up
   */
  private updatePinPositions() {
    const { gridSize, minHeight, maxHeight, colorByHeight } = this.config;
    let needsUpdate = false;
    let needsColorUpdate = false;
    let pinIndex = 0; // Sequential index for instanced mesh (skips corners)

    // Only update instances that changed (dirty checking)
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        // Skip corner pins
        if (this.isCorner(x, y)) {
          continue;
        }

        const gridIndex = x * gridSize + y;
        const currentHeight = this.currentHeights[x][y];
        const previousHeight = this.previousHeights[x][y];

        // Only update if height changed significantly (threshold to avoid micro-updates)
        if (Math.abs(currentHeight - previousHeight) > 0.001) {
          const basePos = this.basePositions[gridIndex];
          const pushUpAmount = Math.max(0, currentHeight);

          // Set position for this instance using cached base position
          this.tempObject.position.set(
            basePos.x,
            basePos.baseY + pushUpAmount,
            basePos.z
          );
          this.tempObject.updateMatrix();

          // Apply matrix to instance (using sequential pinIndex)
          this.instancedMesh.setMatrixAt(pinIndex, this.tempObject.matrix);

          // Update color based on height if colorByHeight is enabled
          if (colorByHeight) {
            const normalizedHeight = Math.max(
              0,
              Math.min(1, (currentHeight - minHeight) / (maxHeight - minHeight))
            );
            const color = this.getHeightColor(normalizedHeight);
            this.instancedMesh.setColorAt(pinIndex, color);
            needsColorUpdate = true;
          }

          // Update previous height
          this.previousHeights[x][y] = currentHeight;
          needsUpdate = true;
        }

        pinIndex++; // Increment for every non-corner pin
      }
    }

    // Only mark as needing update if something actually changed
    if (needsUpdate) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
    if (needsColorUpdate && this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * Get color for a given height (normalized 0-1)
   * Uses a gradient from blue (low) -> cyan -> green -> yellow -> red (high)
   */
  private getHeightColor(normalizedHeight: number): THREE.Color {
    // Clamp normalized height to 0-1 range
    const clamped = Math.max(0, Math.min(1, normalizedHeight));
    const h = (1.0 - clamped) * 0.7; // Hue: 0.7 (blue) to 0.0 (red)
    const s = 0.9; // Saturation (increased for more vibrant colors)
    const l = 0.6; // Lightness (increased for brighter colors)
    return new THREE.Color().setHSL(h, s, l);
  }

  /**
   * Main update loop called each frame
   */
  update(deltaTime: number) {
    this.time += deltaTime;

    this.updateTargetHeights(this.time);
    this.updateCurrentHeights();
    this.updatePinPositions();
  }

  /**
   * Get the Three.js group containing all pins
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<SimulationConfig>) {
    const oldGridSize = this.config.gridSize;
    const oldColorByHeight = this.config.colorByHeight;
    this.config = { ...this.config, ...newConfig };

    // If grid size changed, reinitialize height arrays
    if (
      newConfig.gridSize !== undefined &&
      newConfig.gridSize !== oldGridSize
    ) {
      this.initializeHeightArrays();
    }

    // If colorByHeight changed, switch materials and update pin colors
    if (
      newConfig.colorByHeight !== undefined &&
      newConfig.colorByHeight !== oldColorByHeight
    ) {
      if (this.instancedMesh) {
        this.instancedMesh.material = this.config.colorByHeight
          ? this.colorByHeightMaterial
          : this.pinMaterial;
        this.instancedMesh.material.needsUpdate = true;
      }

      // When enabling debug mode, compute colors for all pins immediately
      if (this.config.colorByHeight) {
        this.updateAllPinColors();
      }
    }
  }

  /**
   * Update colors for all pins based on current heights
   */
  private updateAllPinColors() {
    const { gridSize, minHeight, maxHeight, colorByHeight } = this.config;
    let pinIndex = 0;

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        // Skip corner pins
        if (this.isCorner(x, y)) continue;

        if (colorByHeight) {
          const currentHeight = this.currentHeights[x][y];
          const normalizedHeight = Math.max(
            0,
            Math.min(1, (currentHeight - minHeight) / (maxHeight - minHeight))
          );
          const color = this.getHeightColor(normalizedHeight);
          this.instancedMesh.setColorAt(pinIndex, color);
        } else {
          // Reset to default color (white, which shows the material color)
          this.instancedMesh.setColorAt(pinIndex, new THREE.Color(0xffffff));
        }

        pinIndex++;
      }
    }

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    // Force a render update
    this.updatePinPositions();
  }
}
