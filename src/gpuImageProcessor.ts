/**
 * GPU Image Processor - Uses WebGL for accelerated image processing
 * Falls back to Canvas 2D if WebGL is not available
 */

import { detectGPUCapabilities } from './gpuUtils';

export class GPUImageProcessor {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private useGPU: boolean = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.initWebGL();
  }

  private initWebGL(): void {
    const capabilities = detectGPUCapabilities();
    
    if (capabilities.webgl2Supported) {
      this.gl = this.canvas.getContext('webgl2', {
        powerPreference: 'high-performance',
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: true,
      });
      this.useGPU = !!this.gl;
    } else if (capabilities.webgl1Supported) {
      this.gl = this.canvas.getContext('webgl', {
        powerPreference: 'high-performance',
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: true,
      }) || this.canvas.getContext('experimental-webgl', {
        powerPreference: 'high-performance',
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: true,
      }) as WebGLRenderingContext | null;
      this.useGPU = !!this.gl;
    }

    if (this.useGPU && this.gl) {
      console.log('✓ GPU image processing enabled');
    } else {
      console.log('⚠ GPU image processing unavailable, using Canvas 2D');
    }
  }

  /**
   * Process image to grayscale and apply contrast using GPU
   */
  public processImage(
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number,
    contrast: number = 1.5
  ): ImageData {
    this.canvas.width = targetWidth;
    this.canvas.height = targetHeight;

    if (this.useGPU && this.gl) {
      return this.processImageWebGL(img, targetWidth, targetHeight, contrast);
    } else {
      return this.processImageCanvas2D(img, targetWidth, targetHeight, contrast);
    }
  }

  /**
   * GPU-accelerated image processing using WebGL
   */
  private processImageWebGL(
    img: HTMLImageElement,
    width: number,
    height: number,
    contrast: number
  ): ImageData {
    const gl = this.gl!;

    // Create shaders
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D u_texture;
      uniform float u_contrast;
      varying vec2 v_texCoord;
      
      void main() {
        vec4 color = texture2D(u_texture, v_texCoord);
        
        // Convert to grayscale using human perception weights
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        
        // Apply contrast
        gray = clamp((gray - 0.5) * u_contrast + 0.5, 0.0, 1.0);
        
        gl_FragColor = vec4(vec3(gray), 1.0);
      }
    `;

    // Compile shaders
    const vertexShader = this.compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
      console.warn('Failed to compile shaders, falling back to Canvas 2D');
      return this.processImageCanvas2D(img, width, height, contrast);
    }

    // Create and link program
    const program = gl.createProgram();
    if (!program) {
      console.warn('Failed to create WebGL program, falling back to Canvas 2D');
      return this.processImageCanvas2D(img, width, height, contrast);
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Failed to link program, falling back to Canvas 2D');
      return this.processImageCanvas2D(img, width, height, contrast);
    }

    gl.useProgram(program);

    // Setup geometry (full-screen quad)
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);

    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ]);

    // Position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Texture coordinate buffer
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Create texture from image
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    // Set uniforms
    const contrastLocation = gl.getUniformLocation(program, 'u_contrast');
    gl.uniform1f(contrastLocation, contrast);

    // Set viewport and draw
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Read pixels
    const pixels = new Uint8ClampedArray(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // Clean up
    gl.deleteTexture(texture);
    gl.deleteBuffer(positionBuffer);
    gl.deleteBuffer(texCoordBuffer);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteProgram(program);

    return new ImageData(pixels, width, height);
  }

  /**
   * Canvas 2D fallback for image processing
   */
  private processImageCanvas2D(
    img: HTMLImageElement,
    width: number,
    height: number,
    contrast: number
  ): ImageData {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Process pixels
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Convert to grayscale
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Apply contrast
      gray = Math.max(0, Math.min(255, (gray - 127.5) * contrast + 127.5));

      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    return imageData;
  }

  /**
   * Compile a WebGL shader
   */
  private compileShader(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    source: string,
    type: number
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.gl && this.canvas) {
      const loseContext = this.gl.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }
    }
  }
}

// Singleton instance
let gpuImageProcessor: GPUImageProcessor | null = null;

export function getGPUImageProcessor(): GPUImageProcessor {
  if (!gpuImageProcessor) {
    gpuImageProcessor = new GPUImageProcessor();
  }
  return gpuImageProcessor;
}

