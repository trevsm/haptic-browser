/**
 * Image Renderer - Converts images to tactile bitmaps
 * Uses edge detection and brightness mapping to create tactile representations
 * Supports common image formats: PNG, JPG, JPEG, WebP, GIF
 *
 * For animated GIFs, renders the first frame. To render a specific frame,
 * you can pre-extract the frame and pass that image URL instead.
 */

export interface ImageRenderOptions {
  minHeight: number;
  maxHeight: number;
  amplitude: number;
  edgeDetection?: boolean; // Use edge detection for more tactile definition
  contrast?: number; // Contrast adjustment (0.5 to 2.0, default 1.0)
  frameIndex?: number; // For animated GIFs, frame to render (0 = first frame, default: 0)
}

/**
 * Supported image formats
 */
const SUPPORTED_FORMATS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

/**
 * CORS proxy configuration
 * Can be overridden by calling setCorsProxy() or setting window.CORS_PROXY_URL
 *
 * Default proxy: https://api.allorigins.win/raw?url=
 * Alternative proxies:
 * - https://corsproxy.io/?
 * - https://cors-anywhere.herokuapp.com/ (may be rate limited)
 */
const DEFAULT_CORS_PROXY = "https://api.allorigins.win/raw?url=";

/**
 * Get CORS proxy URL (can be configured via setCorsProxy() or window.CORS_PROXY_URL)
 */
function getCorsProxy(): string {
  if (typeof window !== "undefined" && (window as any).CORS_PROXY_URL) {
    return (window as any).CORS_PROXY_URL;
  }
  return DEFAULT_CORS_PROXY;
}

/**
 * Set a custom CORS proxy URL
 * @param proxyUrl - The proxy URL (should end with ?url= or similar query parameter)
 *
 * @example
 * setCorsProxy('https://corsproxy.io/?');
 * setCorsProxy('https://api.allorigins.win/raw?url=');
 */
export function setCorsProxy(proxyUrl: string): void {
  if (typeof window !== "undefined") {
    (window as any).CORS_PROXY_URL = proxyUrl;
    console.log(`CORS proxy set to: ${proxyUrl}`);
  }
}

/**
 * Wrap a URL through a CORS proxy
 */
function wrapWithCorsProxy(url: string): string {
  const proxy = getCorsProxy();
  return proxy + encodeURIComponent(url);
}

/**
 * Check if URL is a GIF (including animated GIFs)
 */
export function isGifUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  return urlLower.includes(".gif") || urlLower.includes("format=gif");
}

/**
 * Process an already-loaded image element and convert it to tactile heights
 * This is used for continuous frame updates in animated GIFs
 */
export function processImageElement(
  img: HTMLImageElement,
  gridSize: number,
  options: ImageRenderOptions
): number[][] {
  const {
    minHeight,
    maxHeight,
    amplitude,
    edgeDetection = true,
    contrast = 1.5,
  } = options;

  // Create a canvas to process the image
  const canvas = document.createElement("canvas");
  canvas.width = gridSize;
  canvas.height = gridSize;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Draw the current frame of the image (for GIFs, this will be the current animated frame)
  ctx.drawImage(img, 0, 0, gridSize, gridSize);

  // Get image data
  let imageData: ImageData;
  let data: Uint8ClampedArray;

  try {
    imageData = ctx.getImageData(0, 0, gridSize, gridSize);
    data = imageData.data;
  } catch (canvasError: any) {
    const errorMsg = canvasError.message || String(canvasError);
    throw new Error(`Cannot read image data: ${errorMsg}`);
  }

  // Convert to grayscale and apply contrast
  const grayscale: number[][] = [];
  for (let x = 0; x < gridSize; x++) {
    grayscale[x] = [];
    for (let y = 0; y < gridSize; y++) {
      const idx = (y * gridSize + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Convert to grayscale (weighted average for human perception)
      let gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Apply contrast
      gray = Math.max(0, Math.min(1, (gray - 0.5) * contrast + 0.5));

      grayscale[x][y] = gray;
    }
  }

  // Apply edge detection if enabled
  let heightMap: number[][];
  if (edgeDetection) {
    heightMap = applyEdgeDetection(grayscale, gridSize);
  } else {
    heightMap = grayscale;
  }

  // Convert to pin heights
  const heights: number[][] = [];
  const heightRange = maxHeight - minHeight;

  for (let x = 0; x < gridSize; x++) {
    heights[x] = [];
    for (let y = 0; y < gridSize; y++) {
      const value = heightMap[x][y];
      const height = minHeight + value * heightRange * amplitude;
      heights[x][y] = Math.max(minHeight, Math.min(maxHeight, height));
    }
  }

  return heights;
}

/**
 * Load an image from a URL and render it as a tactile bitmap
 * Supports static images and animated GIFs (renders first frame by default)
 */
export async function renderImageAsTactile(
  imageUrl: string,
  gridSize: number,
  options: ImageRenderOptions
): Promise<number[][]> {
  const {
    minHeight,
    maxHeight,
    amplitude,
    edgeDetection = true,
    contrast = 1.5,
    frameIndex = 0,
  } = options;

  try {
    // Load the image
    const img = await loadImage(imageUrl);

    // For animated GIFs, log that we're rendering a specific frame
    if (isGifUrl(imageUrl)) {
      if (frameIndex > 0) {
        console.log(
          `Rendering GIF frame ${frameIndex} (animated GIF support is limited - showing first frame)`
        );
      } else {
        console.log("Rendering GIF (animated GIFs will show first frame)");
      }
    }

    // Create a canvas to process the image
    const canvas = document.createElement("canvas");
    canvas.width = gridSize;
    canvas.height = gridSize;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // For animated GIFs, wait a moment to ensure first frame is loaded
    // Then draw the image scaled to fit the grid
    // Note: HTML Image element will show the current frame when drawn to canvas
    // For animated GIFs, this is typically the first frame
    if (isGifUrl(imageUrl)) {
      // Small delay to ensure GIF frame is ready
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Draw the image scaled to fit the grid
    // For animated GIFs, this captures the current visible frame (first frame by default)
    ctx.drawImage(img, 0, 0, gridSize, gridSize);

    // Get image data - this will fail if image is cross-origin without CORS
    let imageData: ImageData;
    let data: Uint8ClampedArray;

    try {
      imageData = ctx.getImageData(0, 0, gridSize, gridSize);
      data = imageData.data;
    } catch (canvasError: any) {
      // Canvas security error - image loaded but can't read pixel data due to CORS
      const errorMsg = canvasError.message || String(canvasError);
      if (
        errorMsg.includes("tainted") ||
        errorMsg.includes("CORS") ||
        errorMsg.includes("cross-origin") ||
        errorMsg.includes("insecure")
      ) {
        // Try loading through CORS proxy
        console.log(
          `CORS error detected, retrying with CORS proxy: ${imageUrl}`
        );
        try {
          const proxiedUrl = wrapWithCorsProxy(imageUrl);
          console.log(`Loading through proxy: ${proxiedUrl}`);
          const proxiedImg = await loadImage(proxiedUrl);

          // Clear canvas and draw proxied image
          ctx.clearRect(0, 0, gridSize, gridSize);
          ctx.drawImage(proxiedImg, 0, 0, gridSize, gridSize);

          // Try to read pixel data again
          imageData = ctx.getImageData(0, 0, gridSize, gridSize);
          data = imageData.data;
          console.log("Successfully loaded image through CORS proxy");
        } catch (proxyError: any) {
          console.error("CORS proxy also failed:", proxyError);
          throw new Error(
            `Cannot read image data due to CORS restrictions. Tried proxy but failed. Original error: ${errorMsg}`
          );
        }
      } else {
        throw canvasError;
      }
    }

    // Convert to grayscale and apply contrast
    const grayscale: number[][] = [];
    for (let x = 0; x < gridSize; x++) {
      grayscale[x] = [];
      for (let y = 0; y < gridSize; y++) {
        const idx = (y * gridSize + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Convert to grayscale (weighted average for human perception)
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Apply contrast
        gray = Math.max(0, Math.min(1, (gray - 0.5) * contrast + 0.5));

        grayscale[x][y] = gray;
      }
    }

    // Apply edge detection if enabled
    let heightMap: number[][];
    if (edgeDetection) {
      heightMap = applyEdgeDetection(grayscale, gridSize);
    } else {
      heightMap = grayscale;
    }

    // Convert to pin heights
    const heights: number[][] = [];
    const heightRange = maxHeight - minHeight;

    for (let x = 0; x < gridSize; x++) {
      heights[x] = [];
      for (let y = 0; y < gridSize; y++) {
        const value = heightMap[x][y];
        const height = minHeight + value * heightRange * amplitude;
        heights[x][y] = Math.max(minHeight, Math.min(maxHeight, height));
      }
    }

    return heights;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to render image:", imageUrl);
    console.error("Error details:", errorMessage);
    console.error("This will display an X pattern on the pin field");
    // Return a placeholder pattern on error
    return createErrorPattern(gridSize, minHeight, maxHeight);
  }
}

/**
 * Apply Sobel edge detection to enhance tactile definition
 */
function applyEdgeDetection(
  grayscale: number[][],
  gridSize: number
): number[][] {
  const edges: number[][] = [];

  // Sobel kernels
  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];
  const sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];

  for (let x = 0; x < gridSize; x++) {
    edges[x] = [];
    for (let y = 0; y < gridSize; y++) {
      let gx = 0;
      let gy = 0;

      // Apply Sobel kernels
      for (let kx = -1; kx <= 1; kx++) {
        for (let ky = -1; ky <= 1; ky++) {
          const px = Math.max(0, Math.min(gridSize - 1, x + kx));
          const py = Math.max(0, Math.min(gridSize - 1, y + ky));
          const pixel = grayscale[px][py];

          gx += pixel * sobelX[kx + 1][ky + 1];
          gy += pixel * sobelY[kx + 1][ky + 1];
        }
      }

      // Calculate gradient magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);

      // Combine with original grayscale for better representation
      const original = grayscale[x][y];
      const combined = magnitude * 0.7 + original * 0.3;

      edges[x][y] = Math.max(0, Math.min(1, combined));
    }
  }

  return edges;
}

/**
 * Check if URL appears to be a supported image format
 */
function isSupportedImageFormat(url: string): boolean {
  const urlLower = url.toLowerCase();
  return SUPPORTED_FORMATS.some(
    (format) =>
      urlLower.includes(format) || urlLower.includes(format.replace(".", ""))
  );
}

/**
 * Load an image from a URL
 * Supports PNG, JPG, JPEG, WebP, and GIF formats
 * Automatically retries with CORS proxy if needed
 */
function loadImage(
  url: string,
  useProxy: boolean = false
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const imageUrl = useProxy ? wrapWithCorsProxy(url) : url;

    // Always try with CORS for cross-origin images
    img.crossOrigin = "anonymous";

    img.onload = () => {
      // Verify the image actually loaded
      if (img.width > 0 && img.height > 0) {
        if (useProxy) {
          console.log(
            `Successfully loaded image through CORS proxy: ${url} (${img.width}x${img.height})`
          );
        }
        resolve(img);
      } else {
        reject(new Error(`Image loaded but has invalid dimensions: ${url}`));
      }
    };

    img.onerror = () => {
      if (useProxy) {
        // Already tried proxy, give up
        const formatHint = isSupportedImageFormat(url)
          ? " (format appears supported)"
          : " (may be unsupported format)";
        console.error(
          `Failed to load image even with CORS proxy: ${url}${formatHint}`
        );
        reject(new Error(`Failed to load image: ${url}${formatHint}`));
        return;
      }

      console.warn(`Image failed to load with CORS: ${url}`);
      // If CORS fails, try without CORS first (for same-origin images)
      console.log(`Retrying without CORS: ${url}`);
      const imgRetry = new Image();
      imgRetry.onload = () => {
        if (imgRetry.width > 0 && imgRetry.height > 0) {
          console.log(
            `Successfully loaded image without CORS: ${url} (${imgRetry.width}x${imgRetry.height})`
          );
          resolve(imgRetry);
        } else {
          reject(new Error(`Image loaded but has invalid dimensions: ${url}`));
        }
      };
      imgRetry.onerror = () => {
        // Last resort: try with CORS proxy
        console.log(`Retrying with CORS proxy: ${url}`);
        loadImage(url, true).then(resolve).catch(reject);
      };
      imgRetry.src = url;
    };

    img.src = imageUrl;
  });
}

/**
 * Create an error pattern when image loading fails
 */
function createErrorPattern(
  gridSize: number,
  minHeight: number,
  maxHeight: number
): number[][] {
  const heights: number[][] = [];

  for (let x = 0; x < gridSize; x++) {
    heights[x] = [];
    for (let y = 0; y < gridSize; y++) {
      // Create an X pattern to indicate error
      const distFromDiag1 = Math.abs(x - y);
      const distFromDiag2 = Math.abs(x - (gridSize - 1 - y));
      const minDist = Math.min(distFromDiag1, distFromDiag2);

      if (minDist < 2) {
        heights[x][y] = maxHeight;
      } else {
        heights[x][y] = minHeight;
      }
    }
  }

  return heights;
}
