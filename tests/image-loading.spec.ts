import { test, expect } from '@playwright/test';

/**
 * Test image loading functionality
 * Verifies that images can be loaded and rendered correctly
 */

test.describe('Image Loading', () => {
  test('should load and render PNG images', async ({ page }) => {
    test.setTimeout(30000);
    
    // Create a simple HTML page to test image loading
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>Image Test</title></head>
      <body>
        <div id="test-container"></div>
      </body>
      </html>
    `);
    
    // Test with a known-good PNG image
    const testImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Saturn%27s_rings_in_visible_light_and_radio.jpg/800px-Saturn%27s_rings_in_visible_light_and_radio.jpg';
    
    // Check console for image loading errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Try to load an image
    const result = await page.evaluate(async (url) => {
      try {
        // Check if image can be loaded
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            resolve({
              success: false,
              error: 'Timeout loading image',
              url: url
            });
          }, 15000);
          
          img.onload = () => {
            clearTimeout(timeout);
            resolve({
              success: true,
              width: img.width,
              height: img.height,
              url: url
            });
          };
          img.onerror = () => {
            clearTimeout(timeout);
            resolve({
              success: false,
              error: 'Image failed to load',
              url: url
            });
          };
          img.src = url;
        });
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          url: url
        };
      }
    }, testImageUrl);
    
    console.log('\n=== PNG Image Loading Test ===');
    console.log('Image loading result:', JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.error('❌ Image loading failed:', result);
      console.error('Console errors:', errors);
    } else {
      console.log(`✅ Successfully loaded image: ${result.width}x${result.height}`);
    }
  });
  
  test('should load JPG images', async ({ page }) => {
    test.setTimeout(30000);
    
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>Image Test</title></head>
      <body>
        <div id="test-container"></div>
      </body>
      </html>
    `);
    
    // Test with a JPG image
    const testImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Saturn_during_Equinox.jpg';
    
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    const result = await page.evaluate(async (url) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            resolve({
              success: false,
              error: 'Timeout loading image',
              url: url
            });
          }, 15000);
          
          img.onload = () => {
            clearTimeout(timeout);
            resolve({
              success: true,
              width: img.width,
              height: img.height,
              url: url,
              note: 'Loaded with CORS'
            });
          };
          img.onerror = () => {
            clearTimeout(timeout);
            // Try without CORS
            const imgRetry = new Image();
            imgRetry.onload = () => {
              resolve({
                success: true,
                width: imgRetry.width,
                height: imgRetry.height,
                url: url,
                note: 'Loaded without CORS (retry)'
              });
            };
            imgRetry.onerror = () => {
              resolve({
                success: false,
                error: 'Failed with and without CORS',
                url: url
              });
            };
            imgRetry.src = url;
          };
          img.src = url;
        });
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          url: url
        };
      }
    }, testImageUrl);
    
    console.log('\n=== JPG Image Loading Test ===');
    console.log('JPG image loading result:', JSON.stringify(result, null, 2));
    if (!result.success) {
      console.error('❌ JPG loading failed:', result);
      console.error('Console errors:', errors);
    } else {
      console.log(`✅ Successfully loaded JPG: ${result.width}x${result.height}`);
      if (result.note) {
        console.log(`   Note: ${result.note}`);
      }
    }
  });
  
  test('should test demo page image URLs', async ({ page }) => {
    test.setTimeout(60000);
    
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>Image Test</title></head>
      <body>
        <div id="test-container"></div>
      </body>
      </html>
    `);
    
    // Test the actual URLs from the demo
    const demoImageUrls = [
      'https://www.thestampmaker.com/images/products/thestampmaker_sss2-sad-face.jpg.ashx?width=600&height=600&quality=90&format=webp&scale=canvas',
      'https://nightingaledvs.com/wp-content/uploads/2024/03/Cover-1.png',
    ];
    
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    console.log('\n=== Demo Page Image URLs Test ===');
    
    for (const url of demoImageUrls) {
      console.log(`\nTesting URL: ${url}`);
      
      const result = await page.evaluate(async (imageUrl) => {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          return new Promise((resolve) => {
            const timeout = setTimeout(() => {
              resolve({
                success: false,
                error: 'Timeout after 20 seconds',
                url: imageUrl
              });
            }, 20000);
            
            img.onload = () => {
              clearTimeout(timeout);
              resolve({
                success: true,
                width: img.width,
                height: img.height,
                url: imageUrl,
                note: 'Loaded with CORS'
              });
            };
            
            img.onerror = () => {
              // Try without CORS
              const imgRetry = new Image();
              imgRetry.onload = () => {
                clearTimeout(timeout);
                resolve({
                  success: true,
                  width: imgRetry.width,
                  height: imgRetry.height,
                  url: imageUrl,
                  note: 'Loaded without CORS (retry)'
                });
              };
              imgRetry.onerror = () => {
                clearTimeout(timeout);
                resolve({
                  success: false,
                  error: 'Failed with and without CORS',
                  url: imageUrl
                });
              };
              imgRetry.src = imageUrl;
            };
            
            img.src = imageUrl;
          });
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            url: imageUrl
          };
        }
      }, url);
      
      console.log('Result:', JSON.stringify(result, null, 2));
      
      if (!result.success) {
        console.error(`❌ Failed to load: ${url}`);
        console.error(`   Error: ${result.error}`);
      } else {
        console.log(`✅ Successfully loaded: ${url}`);
        console.log(`   Dimensions: ${result.width}x${result.height}`);
        if (result.note) {
          console.log(`   Note: ${result.note}`);
        }
      }
    }
    
    if (errors.length > 0) {
      console.error('\nConsole errors encountered:');
      errors.forEach(err => console.error(`  - ${err}`));
    }
  });
  
  test('should test CORS proxy functionality', async ({ page }) => {
    test.setTimeout(30000);
    
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>CORS Proxy Test</title></head>
      <body>
        <canvas id="test-canvas" width="100" height="100"></canvas>
      </body>
      </html>
    `);
    
    // Test URL that doesn't support CORS
    const testUrl = 'https://www.thestampmaker.com/images/products/thestampmaker_sss2-sad-face.jpg.ashx?width=600&height=600&quality=90&format=webp&scale=canvas';
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    
    console.log('\n=== CORS Proxy Test ===');
    console.log(`Testing URL: ${testUrl}`);
    console.log(`Using proxy: ${proxyUrl}\n`);
    
    const result = await page.evaluate(async ({ url, proxy }) => {
      try {
        // First try without proxy (should fail to read pixels)
        const img1 = new Image();
        img1.crossOrigin = 'anonymous';
        
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            resolve({ success: false, error: 'Timeout' });
          }, 15000);
          
          img1.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 100;
              canvas.height = 100;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                clearTimeout(timeout);
                resolve({ success: false, error: 'No canvas context' });
                return;
              }
              
              ctx.drawImage(img1, 0, 0, 100, 100);
              
              try {
                ctx.getImageData(0, 0, 100, 100);
                // If we get here, CORS worked (unexpected)
                clearTimeout(timeout);
                resolve({ 
                  success: true, 
                  canReadPixels: true,
                  note: 'Direct load worked (unexpected - server may have added CORS)' 
                });
              } catch (e) {
                // Expected - try with proxy
                console.log('Direct load failed (expected), trying proxy...');
                const proxiedUrl = proxy + encodeURIComponent(url);
                const img2 = new Image();
                img2.crossOrigin = 'anonymous';
                
                img2.onload = () => {
                  try {
                    ctx.clearRect(0, 0, 100, 100);
                    ctx.drawImage(img2, 0, 0, 100, 100);
                    const imageData = ctx.getImageData(0, 0, 100, 100);
                    clearTimeout(timeout);
                    resolve({
                      success: true,
                      canReadPixels: true,
                      pixelCount: imageData.data.length / 4,
                      note: 'Proxy worked!'
                    });
                  } catch (e2) {
                    clearTimeout(timeout);
                    resolve({
                      success: false,
                      error: 'Proxy also failed: ' + e2.message,
                      canReadPixels: false
                    });
                  }
                };
                
                img2.onerror = () => {
                  clearTimeout(timeout);
                  resolve({
                    success: false,
                    error: 'Proxy image failed to load',
                    canReadPixels: false
                  });
                };
                
                img2.src = proxiedUrl;
              }
            } catch (error: any) {
              clearTimeout(timeout);
              resolve({ success: false, error: error.message });
            }
          };
          
          img1.onerror = () => {
            clearTimeout(timeout);
            resolve({ success: false, error: 'Image failed to load' });
          };
          
          img1.src = url;
        });
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }, { url: testUrl, proxy: proxyUrl });
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success && result.canReadPixels) {
      console.log(`✅ CORS proxy works! Can read ${result.pixelCount} pixels`);
      if (result.note) console.log(`   ${result.note}`);
    } else {
      console.log(`❌ CORS proxy test failed`);
      console.log(`   Error: ${result.error}`);
    }
  });
  
  test('should test canvas pixel data reading (CORS check)', async ({ page }) => {
    test.setTimeout(30000);
    
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>Canvas Test</title></head>
      <body>
        <canvas id="test-canvas" width="100" height="100"></canvas>
      </body>
      </html>
    `);
    
    const testUrls = [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Saturn_during_Equinox.jpg',
        name: 'Wikipedia JPG (should work with CORS)'
      },
      {
        url: 'https://www.thestampmaker.com/images/products/thestampmaker_sss2-sad-face.jpg.ashx?width=600&height=600&quality=90&format=webp&scale=canvas',
        name: 'Demo URL (likely CORS issue)'
      }
    ];
    
    console.log('\n=== Canvas Pixel Data Reading Test ===');
    console.log('Testing if we can read pixel data from canvas after drawing images...\n');
    
    for (const testCase of testUrls) {
      const result = await page.evaluate(async ({ url, name }) => {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          return new Promise((resolve) => {
            const timeout = setTimeout(() => {
              resolve({
                success: false,
                error: 'Timeout',
                canReadPixels: false,
                name
              });
            }, 15000);
            
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = 100;
                canvas.height = 100;
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                  clearTimeout(timeout);
                  resolve({
                    success: false,
                    error: 'No canvas context',
                    canReadPixels: false,
                    name
                  });
                  return;
                }
                
                ctx.drawImage(img, 0, 0, 100, 100);
                
                // Try to read pixel data
                try {
                  const imageData = ctx.getImageData(0, 0, 100, 100);
                  clearTimeout(timeout);
                  resolve({
                    success: true,
                    canReadPixels: true,
                    pixelCount: imageData.data.length / 4,
                    name
                  });
                } catch (canvasError: any) {
                  clearTimeout(timeout);
                  const errorMsg = canvasError.message || String(canvasError);
                  resolve({
                    success: false,
                    error: errorMsg,
                    canReadPixels: false,
                    name,
                    note: 'Image loaded but cannot read pixels (CORS issue)'
                  });
                }
              } catch (error: any) {
                clearTimeout(timeout);
                resolve({
                  success: false,
                  error: error.message,
                  canReadPixels: false,
                  name
                });
              }
            };
            
            img.onerror = () => {
              // Try without CORS
              const imgRetry = new Image();
              imgRetry.onload = () => {
                try {
                  const canvas = document.createElement('canvas');
                  canvas.width = 100;
                  canvas.height = 100;
                  const ctx = canvas.getContext('2d');
                  
                  if (!ctx) {
                    clearTimeout(timeout);
                    resolve({
                      success: false,
                      error: 'No canvas context',
                      canReadPixels: false,
                      name
                    });
                    return;
                  }
                  
                  ctx.drawImage(imgRetry, 0, 0, 100, 100);
                  
                  try {
                    const imageData = ctx.getImageData(0, 0, 100, 100);
                    clearTimeout(timeout);
                    resolve({
                      success: true,
                      canReadPixels: true,
                      pixelCount: imageData.data.length / 4,
                      name,
                      note: 'Loaded without CORS, pixels readable'
                    });
                  } catch (canvasError: any) {
                    clearTimeout(timeout);
                    const errorMsg = canvasError.message || String(canvasError);
                    resolve({
                      success: false,
                      error: errorMsg,
                      canReadPixels: false,
                      name,
                      note: 'Image loaded without CORS but cannot read pixels (tainted canvas)'
                    });
                  }
                } catch (error: any) {
                  clearTimeout(timeout);
                  resolve({
                    success: false,
                    error: error.message,
                    canReadPixels: false,
                    name
                  });
                }
              };
              imgRetry.onerror = () => {
                clearTimeout(timeout);
                resolve({
                  success: false,
                  error: 'Failed to load image',
                  canReadPixels: false,
                  name
                });
              };
              imgRetry.src = url;
            };
            
            img.src = url;
          });
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            canReadPixels: false,
            name
          };
        }
      }, testCase);
      
      console.log(`\n${testCase.name}:`);
      console.log(JSON.stringify(result, null, 2));
      
      if (result.canReadPixels) {
        console.log(`✅ Can read pixel data (${result.pixelCount} pixels)`);
        if (result.note) console.log(`   ${result.note}`);
      } else {
        console.log(`❌ Cannot read pixel data`);
        console.log(`   Error: ${result.error}`);
        if (result.note) console.log(`   ${result.note}`);
        console.log(`   This is why you're seeing X patterns!`);
      }
    }
  });
  
  test('should load and render GIF images', async ({ page }) => {
    test.setTimeout(30000);
    
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>GIF Test</title></head>
      <body>
        <canvas id="test-canvas" width="100" height="100"></canvas>
      </body>
      </html>
    `);
    
    // Test with an animated GIF from Wikipedia
    const testGifUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Dscovrepicmoontransitfull.gif/250px-Dscovrepicmoontransitfull.gif';
    
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    console.log('\n=== GIF Image Loading Test ===');
    console.log(`Testing GIF URL: ${testGifUrl}\n`);
    
    const result = await page.evaluate(async (url) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            resolve({
              success: false,
              error: 'Timeout loading GIF',
              url: url
            });
          }, 20000);
          
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 100;
              canvas.height = 100;
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                clearTimeout(timeout);
                resolve({
                  success: false,
                  error: 'No canvas context',
                  url: url
                });
                return;
              }
              
              // Wait a bit for GIF frame to be ready
              setTimeout(() => {
                ctx.drawImage(img, 0, 0, 100, 100);
                
                try {
                  const imageData = ctx.getImageData(0, 0, 100, 100);
                  clearTimeout(timeout);
                  resolve({
                    success: true,
                    width: img.width,
                    height: img.height,
                    canReadPixels: true,
                    pixelCount: imageData.data.length / 4,
                    url: url,
                    note: 'GIF loaded and pixel data readable (first frame)'
                  });
                } catch (canvasError: any) {
                  clearTimeout(timeout);
                  // Try with proxy
                  const proxiedUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
                  const img2 = new Image();
                  img2.crossOrigin = 'anonymous';
                  
                  img2.onload = () => {
                    setTimeout(() => {
                      try {
                        ctx.clearRect(0, 0, 100, 100);
                        ctx.drawImage(img2, 0, 0, 100, 100);
                        const imageData = ctx.getImageData(0, 0, 100, 100);
                        clearTimeout(timeout);
                        resolve({
                          success: true,
                          width: img2.width,
                          height: img2.height,
                          canReadPixels: true,
                          pixelCount: imageData.data.length / 4,
                          url: url,
                          note: 'GIF loaded through proxy (first frame)'
                        });
                      } catch (e2) {
                        clearTimeout(timeout);
                        resolve({
                          success: false,
                          error: 'Cannot read pixels even with proxy: ' + e2.message,
                          canReadPixels: false,
                          url: url
                        });
                      }
                    }, 100);
                  };
                  
                  img2.onerror = () => {
                    clearTimeout(timeout);
                    resolve({
                      success: false,
                      error: 'Proxy image failed to load',
                      canReadPixels: false,
                      url: url
                    });
                  };
                  
                  img2.src = proxiedUrl;
                }
              }, 200);
            } catch (error: any) {
              clearTimeout(timeout);
              resolve({
                success: false,
                error: error.message,
                url: url
              });
            }
          };
          
          img.onerror = () => {
            // Try without CORS
            const imgRetry = new Image();
            imgRetry.onload = () => {
              setTimeout(() => {
                try {
                  const canvas = document.createElement('canvas');
                  canvas.width = 100;
                  canvas.height = 100;
                  const ctx = canvas.getContext('2d');
                  
                  if (!ctx) {
                    clearTimeout(timeout);
                    resolve({
                      success: false,
                      error: 'No canvas context',
                      url: url
                    });
                    return;
                  }
                  
                  ctx.drawImage(imgRetry, 0, 0, 100, 100);
                  
                  try {
                    const imageData = ctx.getImageData(0, 0, 100, 100);
                    clearTimeout(timeout);
                    resolve({
                      success: true,
                      width: imgRetry.width,
                      height: imgRetry.height,
                      canReadPixels: true,
                      pixelCount: imageData.data.length / 4,
                      url: url,
                      note: 'GIF loaded without CORS (first frame)'
                    });
                  } catch (e) {
                    clearTimeout(timeout);
                    resolve({
                      success: false,
                      error: 'Cannot read pixels: ' + e.message,
                      canReadPixels: false,
                      url: url
                    });
                  }
                } catch (error: any) {
                  clearTimeout(timeout);
                  resolve({
                    success: false,
                    error: error.message,
                    url: url
                  });
                }
              }, 200);
            };
            imgRetry.onerror = () => {
              clearTimeout(timeout);
              resolve({
                success: false,
                error: 'Failed to load GIF',
                url: url
              });
            };
            imgRetry.src = url;
          };
          
          img.src = url;
        });
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          url: url
        };
      }
    }, testGifUrl);
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success && result.canReadPixels) {
      console.log(`✅ GIF loaded successfully: ${result.width}x${result.height}`);
      console.log(`   Can read ${result.pixelCount} pixels`);
      if (result.note) console.log(`   ${result.note}`);
    } else {
      console.error(`❌ GIF loading failed`);
      console.error(`   Error: ${result.error}`);
    }
    
    if (errors.length > 0) {
      console.error('\nConsole errors:');
      errors.forEach(err => console.error(`  - ${err}`));
    }
  });
  
  test('should verify image loading in haptic browser context', async ({ page }) => {
    test.setTimeout(60000);
    
    // Try to load the actual app
    try {
      await page.goto('/', { waitUntil: 'networkidle', timeout: 10000 });
    } catch (e) {
      console.log('Could not load app, skipping context test');
      return;
    }
    
    // Listen for console errors
    const errors: string[] = [];
    const imageLogs: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        errors.push(text);
        if (text.includes('image') || text.includes('Image') || text.includes('Failed to load')) {
          imageLogs.push(`[Error] ${text}`);
        }
      } else if (text.includes('image') || text.includes('Image') || text.includes('Failed to load') || text.includes('CORS')) {
        imageLogs.push(`[Log] ${text}`);
      }
    });
    
    // Wait for page to load
    console.log('\n=== Haptic Browser Context Test ===');
    console.log('Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    // Check console for any image-related errors
    console.log('\nImage-related console messages:');
    if (imageLogs.length > 0) {
      imageLogs.forEach(log => console.log(`  ${log}`));
    } else {
      console.log('  No image-related messages found');
    }
    
    if (errors.length > 0) {
      console.error(`\nFound ${errors.length} console errors:`);
      errors.forEach(err => console.error(`  - ${err}`));
    } else {
      console.log('\nNo console errors detected');
    }
  });
});

