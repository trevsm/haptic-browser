/**
 * GPU Utilities - GPU detection and optimization helpers
 * Ensures the application utilizes GPU capabilities when available
 */

export interface GPUCapabilities {
  webgl2Supported: boolean;
  webgl1Supported: boolean;
  maxTextureSize: number;
  maxRenderBufferSize: number;
  maxVertexAttributes: number;
  maxFragmentUniforms: number;
  maxVertexUniforms: number;
  maxVaryingVectors: number;
  maxTextureImageUnits: number;
  maxCombinedTextureImageUnits: number;
  renderer: string;
  vendor: string;
  shadingLanguageVersion: string;
  isGPUAvailable: boolean;
  supportsFloatTextures: boolean;
  supportsInstancedArrays: boolean;
  maxAnisotropy: number;
  webglVersion: number;
}

/**
 * Detect GPU capabilities and WebGL support
 */
export function detectGPUCapabilities(): GPUCapabilities {
  const canvas = document.createElement('canvas');
  
  // Try WebGL2 first
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = canvas.getContext('webgl2', {
    powerPreference: 'high-performance',
    antialias: false,
    alpha: false,
    stencil: false,
  });
  
  const webgl2Supported = !!gl;
  
  // Fall back to WebGL1 if WebGL2 is not available
  if (!gl) {
    gl = canvas.getContext('webgl', {
      powerPreference: 'high-performance',
      antialias: false,
      alpha: false,
      stencil: false,
    }) || canvas.getContext('experimental-webgl', {
      powerPreference: 'high-performance',
      antialias: false,
      alpha: false,
      stencil: false,
    }) as WebGLRenderingContext | null;
  }
  
  if (!gl) {
    console.warn('WebGL is not supported in this browser');
    return {
      webgl2Supported: false,
      webgl1Supported: false,
      maxTextureSize: 0,
      maxRenderBufferSize: 0,
      maxVertexAttributes: 0,
      maxFragmentUniforms: 0,
      maxVertexUniforms: 0,
      maxVaryingVectors: 0,
      maxTextureImageUnits: 0,
      maxCombinedTextureImageUnits: 0,
      renderer: 'Unknown',
      vendor: 'Unknown',
      shadingLanguageVersion: 'Unknown',
      isGPUAvailable: false,
      supportsFloatTextures: false,
      supportsInstancedArrays: false,
      maxAnisotropy: 0,
      webglVersion: 0,
    };
  }
  
  // Get debug renderer info
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown'
    : 'Unknown';
  const vendor = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown'
    : 'Unknown';
  
  // Check for GPU availability (not software renderer)
  const isGPUAvailable = !renderer.toLowerCase().includes('swiftshader') &&
                         !renderer.toLowerCase().includes('llvmpipe') &&
                         !renderer.toLowerCase().includes('software');
  
  // Get texture filter anisotropic extension
  const anisotropyExt = gl.getExtension('EXT_texture_filter_anisotropic') ||
                        gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
                        gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  const maxAnisotropy = anisotropyExt
    ? gl.getParameter(anisotropyExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
    : 1;
  
  // Check for float texture support
  const floatTextureExt = gl.getExtension('OES_texture_float');
  const supportsFloatTextures = !!floatTextureExt;
  
  // Check for instanced arrays support (WebGL1)
  const instancedArraysExt = gl.getExtension('ANGLE_instanced_arrays');
  const supportsInstancedArrays = webgl2Supported || !!instancedArraysExt;
  
  const capabilities: GPUCapabilities = {
    webgl2Supported,
    webgl1Supported: true,
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
    maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
    maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
    maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
    maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
    renderer: String(renderer),
    vendor: String(vendor),
    shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || 'Unknown',
    isGPUAvailable,
    supportsFloatTextures,
    supportsInstancedArrays,
    maxAnisotropy,
    webglVersion: webgl2Supported ? 2 : 1,
  };
  
  // Log GPU information
  console.log('GPU Capabilities:', capabilities);
  if (isGPUAvailable) {
    console.log('✓ Hardware GPU acceleration available');
    console.log(`  Renderer: ${renderer}`);
    console.log(`  Vendor: ${vendor}`);
    console.log(`  WebGL Version: ${capabilities.webglVersion}`);
  } else {
    console.warn('⚠ Software rendering detected - GPU may not be available');
  }
  
  return capabilities;
}

/**
 * Get optimal renderer settings based on GPU capabilities
 */
export function getOptimalRendererSettings(capabilities: GPUCapabilities): {
  antialias: boolean;
  powerPreference: 'high-performance' | 'low-power' | 'default';
  precision: 'highp' | 'mediump' | 'lowp';
  logarithmicDepthBuffer: boolean;
  preserveDrawingBuffer: boolean;
  failIfMajorPerformanceCaveat: boolean;
} {
  // If GPU is available, use high-performance settings
  if (capabilities.isGPUAvailable) {
    return {
      antialias: true, // Enable antialiasing for better visuals on GPU
      powerPreference: 'high-performance',
      precision: 'highp',
      logarithmicDepthBuffer: false, // Disable unless depth fighting occurs
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
    };
  }
  
  // Fall back to lower settings for software rendering
  return {
    antialias: false,
    powerPreference: 'default',
    precision: 'mediump',
    logarithmicDepthBuffer: false,
    preserveDrawingBuffer: false,
    failIfMajorPerformanceCaveat: false,
  };
}

/**
 * Get optimal pixel ratio based on GPU capabilities
 * Prevents over-rendering on high-DPI displays if GPU is limited
 */
export function getOptimalPixelRatio(capabilities: GPUCapabilities): number {
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  if (!capabilities.isGPUAvailable) {
    // Limit to 1x for software rendering
    return 1;
  }
  
  // For GPU rendering, allow higher pixel ratios but cap at reasonable values
  if (capabilities.webgl2Supported) {
    // WebGL2 can handle higher pixel ratios
    return Math.min(devicePixelRatio, 2);
  } else {
    // WebGL1 - cap at 1.5x
    return Math.min(devicePixelRatio, 1.5);
  }
}

/**
 * Get optimal shadow map size based on GPU capabilities
 */
export function getOptimalShadowMapSize(capabilities: GPUCapabilities): number {
  if (!capabilities.isGPUAvailable) {
    return 512; // Low quality for software rendering
  }
  
  const maxSize = capabilities.maxTextureSize;
  
  if (capabilities.webgl2Supported && maxSize >= 4096) {
    return 2048; // High quality shadows
  } else if (maxSize >= 2048) {
    return 1024; // Medium quality shadows
  } else {
    return 512; // Low quality shadows
  }
}

/**
 * Log GPU utilization hints and warnings
 */
export function logGPUUtilization(capabilities: GPUCapabilities): void {
  console.log('=== GPU Utilization Report ===');
  
  if (!capabilities.webgl1Supported) {
    console.error('❌ WebGL is not supported. GPU acceleration unavailable.');
    return;
  }
  
  if (!capabilities.isGPUAvailable) {
    console.warn('⚠ Software rendering detected.');
    console.warn('  This may result in poor performance.');
    console.warn('  Please check:');
    console.warn('  - GPU drivers are up to date');
    console.warn('  - Hardware acceleration is enabled in browser settings');
    console.warn('  - GPU is not being blocked by browser flags');
  } else {
    console.log('✓ GPU acceleration is active');
    console.log(`  WebGL Version: ${capabilities.webglVersion === 2 ? 'WebGL 2' : 'WebGL 1'}`);
    console.log(`  Max Texture Size: ${capabilities.maxTextureSize}px`);
    console.log(`  Max Anisotropy: ${capabilities.maxAnisotropy}x`);
    console.log(`  Instanced Arrays: ${capabilities.supportsInstancedArrays ? 'Supported' : 'Not Supported'}`);
    console.log(`  Float Textures: ${capabilities.supportsFloatTextures ? 'Supported' : 'Not Supported'}`);
  }
  
  if (!capabilities.webgl2Supported) {
    console.warn('⚠ WebGL 2 is not supported. Using WebGL 1.');
    console.warn('  Consider updating your browser or GPU drivers for better performance.');
  }
  
  if (!capabilities.supportsInstancedArrays) {
    console.warn('⚠ Instanced rendering is not supported.');
    console.warn('  This may significantly impact performance with many objects.');
  }
  
  console.log('==============================');
}

/**
 * Handle WebGL context loss
 */
export function setupContextLossHandling(
  canvas: HTMLCanvasElement,
  onContextLost: () => void,
  onContextRestored: () => void
): void {
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    console.error('WebGL context lost. Attempting to restore...');
    onContextLost();
  }, false);
  
  canvas.addEventListener('webglcontextrestored', () => {
    console.log('WebGL context restored.');
    onContextRestored();
  }, false);
}

