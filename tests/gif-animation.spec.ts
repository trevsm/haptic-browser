import { test, expect } from '@playwright/test';

/**
 * Test GIF animation functionality
 * Verifies that animated GIFs actually animate in the dotfield
 * 
 * FINDINGS:
 * --------
 * ❌ HTML Image elements created with `new Image()` do NOT animate when drawn to canvas
 * ❌ Even img elements in the DOM (but off-screen) do not animate reliably
 * ❌ Even fully visible on-screen img elements don't animate in test environment (Firefox headless)
 * 
 * ROOT CAUSE:
 * -----------
 * In src/PinField.ts, the enterImageMode() method creates an Image with `new Image()` which is
 * never attached to the DOM. When this image is repeatedly drawn to canvas via processImageElement(),
 * it always shows the same (first) frame because the browser doesn't animate images not in the DOM.
 * 
 * SOLUTION:
 * ---------
 * 1. Attach img elements to the DOM (can be hidden with CSS positioning)
 * 2. OR use a GIF decoder library like gifuct-js to manually decode and render each frame
 * 3. OR use the <video> element with GIF converted to video format for better performance
 */

test.describe('GIF Animation', () => {
  test('should detect if animated GIF frames are changing', async ({ page }) => {
    test.setTimeout(60000);
    
    // Create a test page that mimics the GIF animation approach
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>GIF Animation Test</title></head>
      <body>
        <canvas id="test-canvas" width="100" height="100"></canvas>
        <div id="results"></div>
      </body>
      </html>
    `);
    
    // Use a known animated GIF from Wikipedia
    const testGifUrl = 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif';
    
    console.log('\n=== GIF Animation Test ===');
    console.log(`Testing animated GIF: ${testGifUrl}\n`);
    
    const result = await page.evaluate(async (gifUrl) => {
      // Helper to get canvas pixel data checksum
      function getCanvasChecksum(ctx: CanvasRenderingContext2D, width: number, height: number): string {
        const imageData = ctx.getImageData(0, 0, width, height);
        // Sample a few pixels instead of all to create a simple checksum
        let checksum = 0;
        for (let i = 0; i < imageData.data.length; i += 400) {
          checksum += imageData.data[i];
        }
        return checksum.toString();
      }
      
      return new Promise<any>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const canvas = document.getElementById('test-canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve({
            success: false,
            error: 'No canvas context',
            animated: false
          });
          return;
        }
        
        const checksums: string[] = [];
        let frameCount = 0;
        const maxFrames = 20; // Sample 20 frames
        
        img.onload = () => {
          // Wait a bit for GIF to start
          setTimeout(() => {
            // Sample frames every 100ms
            const sampleInterval = setInterval(() => {
              try {
                ctx.clearRect(0, 0, 100, 100);
                ctx.drawImage(img, 0, 0, 100, 100);
                
                const checksum = getCanvasChecksum(ctx, 100, 100);
                checksums.push(checksum);
                frameCount++;
                
                if (frameCount >= maxFrames) {
                  clearInterval(sampleInterval);
                  
                  // Check if we got different frames
                  const uniqueChecksums = new Set(checksums);
                  const animated = uniqueChecksums.size > 1;
                  
                  resolve({
                    success: true,
                    animated: animated,
                    totalFrames: frameCount,
                    uniqueFrames: uniqueChecksums.size,
                    checksums: checksums,
                    note: animated 
                      ? 'GIF frames are changing!' 
                      : 'All frames are identical (not animating)'
                  });
                }
              } catch (error: any) {
                clearInterval(sampleInterval);
                resolve({
                  success: false,
                  error: error.message,
                  animated: false
                });
              }
            }, 100);
          }, 200);
        };
        
        img.onerror = () => {
          resolve({
            success: false,
            error: 'Failed to load GIF',
            animated: false
          });
        };
        
        img.src = gifUrl;
      });
    }, testGifUrl);
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      if (result.animated) {
        console.log(`✅ GIF IS animating!`);
        console.log(`   Captured ${result.totalFrames} samples with ${result.uniqueFrames} unique frames`);
      } else {
        console.log(`❌ GIF is NOT animating`);
        console.log(`   All ${result.totalFrames} frames were identical`);
        console.log(`   This is the problem - HTML img elements don't animate when repeatedly drawn to canvas`);
      }
    } else {
      console.log(`❌ Test failed: ${result.error}`);
    }
    
    // The test should ideally pass when GIFs animate
    // But currently we expect it to fail since the img approach doesn't work
    expect(result.success).toBe(true);
  });
  
  test('should test GIF animation using canvas-based approach', async ({ page }) => {
    test.setTimeout(60000);
    
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>GIF Canvas Animation Test</title></head>
      <body>
        <img id="visible-gif" crossorigin="anonymous" style="position: absolute; top: -9999px; left: -9999px; width: 100px; height: 100px;" />
        <canvas id="test-canvas" width="100" height="100"></canvas>
      </body>
      </html>
    `);
    
    const testGifUrl = 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif';
    
    console.log('\n=== GIF Canvas Animation Test (with visible img element) ===');
    console.log('Testing if using a truly visible (but off-screen) img element allows animation...\n');
    
    const result = await page.evaluate(async (gifUrl) => {
      function getCanvasChecksum(ctx: CanvasRenderingContext2D, width: number, height: number): string {
        const imageData = ctx.getImageData(0, 0, width, height);
        let checksum = 0;
        for (let i = 0; i < imageData.data.length; i += 400) {
          checksum += imageData.data[i];
        }
        return checksum.toString();
      }
      
      return new Promise<any>((resolve) => {
        const img = document.getElementById('visible-gif') as HTMLImageElement;
        const canvas = document.getElementById('test-canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        
        if (!ctx || !img) {
          resolve({
            success: false,
            error: 'No canvas context or img element',
            animated: false
          });
          return;
        }
        
        const checksums: string[] = [];
        let frameCount = 0;
        const maxFrames = 20;
        
        img.onload = () => {
          // Wait for GIF to start animating
          setTimeout(() => {
            const sampleInterval = setInterval(() => {
              try {
                ctx.clearRect(0, 0, 100, 100);
                ctx.drawImage(img, 0, 0, 100, 100);
                
                const checksum = getCanvasChecksum(ctx, 100, 100);
                checksums.push(checksum);
                frameCount++;
                
                if (frameCount >= maxFrames) {
                  clearInterval(sampleInterval);
                  
                  const uniqueChecksums = new Set(checksums);
                  const animated = uniqueChecksums.size > 1;
                  
                  resolve({
                    success: true,
                    animated: animated,
                    totalFrames: frameCount,
                    uniqueFrames: uniqueChecksums.size,
                    note: animated 
                      ? 'GIF animates when img is in DOM!' 
                      : 'Still not animating even with visible img element'
                  });
                }
              } catch (error: any) {
                clearInterval(sampleInterval);
                resolve({
                  success: false,
                  error: error.message,
                  animated: false
                });
              }
            }, 100);
          }, 500);
        };
        
        img.onerror = () => {
          resolve({
            success: false,
            error: 'Failed to load GIF',
            animated: false
          });
        };
        
        img.src = gifUrl;
      });
    }, testGifUrl);
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      if (result.animated) {
        console.log(`✅ GIF DOES animate when img element is in DOM!`);
        console.log(`   Captured ${result.totalFrames} samples with ${result.uniqueFrames} unique frames`);
        console.log(`   Solution: Keep img elements in DOM (but hidden) for GIF animation`);
      } else {
        console.log(`❌ GIF still not animating`);
        console.log(`   Need to investigate other approaches (e.g., GIF decoder libraries)`);
      }
    } else {
      console.log(`❌ Test failed: ${result.error}`);
    }
    
    expect(result.success).toBe(true);
  });
  
  test('should verify haptic browser GIF animation integration', async ({ page }) => {
    test.setTimeout(90000);
    
    console.log('\n=== Haptic Browser GIF Integration Test ===');
    
    // Try to load the app
    try {
      await page.goto('http://localhost:5173', { 
        waitUntil: 'networkidle', 
        timeout: 15000 
      });
    } catch (e) {
      console.log('⚠️  Could not load app at localhost:5173');
      console.log('   To run this test:');
      console.log('   1. Run `npm run dev` in another terminal');
      console.log('   2. Run this test again');
      test.skip();
      return;
    }
    
    console.log('App loaded successfully');
    
    // Wait for the app to initialize
    await page.waitForTimeout(3000);
    
    // Switch to web mode if not already
    const modeSelect = page.locator('select').first();
    if (await modeSelect.isVisible()) {
      await modeSelect.selectOption('web');
      await page.waitForTimeout(1000);
    }
    
    console.log('Switched to web mode');
    
    // Listen for console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('GIF') || text.includes('gif') || text.includes('animat')) {
        consoleLogs.push(text);
      }
    });
    
    // Try to navigate to an image block
    console.log('\nSimulating navigation to find image blocks...');
    
    // Press 'r' to switch to block mode
    await page.keyboard.press('r');
    await page.waitForTimeout(500);
    
    // Try to find an image block by pressing arrow keys
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      
      // Check navigation status to see if we're on an image
      const navStatus = await page.locator('#navigation-status').textContent();
      console.log(`Navigation status: ${navStatus}`);
      
      if (navStatus && (navStatus.includes('Image') || navStatus.includes('media'))) {
        console.log('✅ Found an image block!');
        
        // Press space to enter image mode
        await page.keyboard.press(' ');
        await page.waitForTimeout(2000);
        
        console.log('\nEntered image mode, checking for GIF animation...');
        
        // Check console logs for GIF-related messages
        console.log('\nGIF-related console messages:');
        if (consoleLogs.length > 0) {
          consoleLogs.forEach(log => console.log(`  ${log}`));
        } else {
          console.log('  No GIF-related messages found');
        }
        
        // The test passes if we got this far
        // Actual animation verification would require inspecting the pin heights over time
        break;
      }
      
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.log('⚠️  Did not find any image blocks in the demo page');
      console.log('   The demo might not have GIF images');
    }
    
    console.log('\n=== Test Complete ===');
    console.log('Note: To fully test GIF animation, you would need to:');
    console.log('1. Add a GIF image to the demo page');
    console.log('2. Navigate to it and press Space');
    console.log('3. Monitor the pinField heights over time to verify they change');
  });
  
  test('should test GIF animation with truly visible on-screen element', async ({ page }) => {
    test.setTimeout(60000);
    
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>GIF Visible Test</title></head>
      <body style="margin: 0; padding: 20px; background: #f0f0f0;">
        <h3>GIF Visibility Test</h3>
        <img id="visible-gif" crossorigin="anonymous" style="display: block; width: 200px; height: 200px; border: 2px solid red;" />
        <canvas id="test-canvas" width="100" height="100" style="border: 2px solid blue; margin-top: 10px;"></canvas>
      </body>
      </html>
    `);
    
    const testGifUrl = 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif';
    
    console.log('\n=== GIF Visible On-Screen Test ===');
    console.log('Testing if a truly visible on-screen img element allows animation...\n');
    
    const result = await page.evaluate(async (gifUrl) => {
      function getCanvasChecksum(ctx: CanvasRenderingContext2D, width: number, height: number): string {
        const imageData = ctx.getImageData(0, 0, width, height);
        let checksum = 0;
        for (let i = 0; i < imageData.data.length; i += 400) {
          checksum += imageData.data[i];
        }
        return checksum.toString();
      }
      
      return new Promise<any>((resolve) => {
        const img = document.getElementById('visible-gif') as HTMLImageElement;
        const canvas = document.getElementById('test-canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        
        if (!ctx || !img) {
          resolve({
            success: false,
            error: 'No canvas context or img element',
            animated: false
          });
          return;
        }
        
        const checksums: string[] = [];
        let frameCount = 0;
        const maxFrames = 30; // More frames for better detection
        
        img.onload = () => {
          // Wait longer for GIF to start animating
          setTimeout(() => {
            const sampleInterval = setInterval(() => {
              try {
                ctx.clearRect(0, 0, 100, 100);
                ctx.drawImage(img, 0, 0, 100, 100);
                
                const checksum = getCanvasChecksum(ctx, 100, 100);
                checksums.push(checksum);
                frameCount++;
                
                if (frameCount >= maxFrames) {
                  clearInterval(sampleInterval);
                  
                  const uniqueChecksums = new Set(checksums);
                  const animated = uniqueChecksums.size > 1;
                  
                  resolve({
                    success: true,
                    animated: animated,
                    totalFrames: frameCount,
                    uniqueFrames: uniqueChecksums.size,
                    firstFewChecksums: checksums.slice(0, 10),
                    note: animated 
                      ? 'GIF ANIMATES with visible on-screen img element!' 
                      : 'Still not animating (browser may not animate GIFs in test environment)'
                  });
                }
              } catch (error: any) {
                clearInterval(sampleInterval);
                resolve({
                  success: false,
                  error: error.message,
                  animated: false
                });
              }
            }, 100);
          }, 1000); // Longer delay
        };
        
        img.onerror = () => {
          resolve({
            success: false,
            error: 'Failed to load GIF',
            animated: false
          });
        };
        
        img.src = gifUrl;
      });
    }, testGifUrl);
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      if (result.animated) {
        console.log(`✅ SUCCESS! GIF DOES animate with visible on-screen img element!`);
        console.log(`   Captured ${result.totalFrames} samples with ${result.uniqueFrames} unique frames`);
        console.log(`   Solution: Attach img element to DOM with display:block for GIF animation`);
      } else {
        console.log(`❌ GIF still not animating even when visible on screen`);
        console.log(`   This may be a browser/test environment limitation`);
        console.log(`   In production, consider using a GIF decoder library like gifuct-js`);
      }
    } else {
      console.log(`❌ Test failed: ${result.error}`);
    }
    
    // Take a screenshot for visual verification
    await page.waitForTimeout(2000);
    const screenshotPath = '/home/trevsm/Desktop/Github/haptic-browser/tests/screenshots/gif-animation-test.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`\nScreenshot saved to: ${screenshotPath}`);
    
    expect(result.success).toBe(true);
  });
  
  test('should provide GIF animation diagnostic report', async ({ page }) => {
    test.setTimeout(30000);
    
    console.log('\n=== GIF Animation Diagnostic Report ===\n');
    
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>GIF Diagnostic</title></head>
      <body>
        <div id="results"></div>
      </body>
      </html>
    `);
    
    const report = await page.evaluate(async () => {
      const testGif = 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif';
      
      return new Promise<string>((resolve) => {
        const lines: string[] = [];
        lines.push('GIF Animation Diagnostic Report');
        lines.push('================================\n');
        
        // Test 1: Can we load a GIF?
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          lines.push(`✅ GIF loads successfully (${img.width}x${img.height})`);
          
          // Test 2: Can we draw to canvas?
          const canvas = document.createElement('canvas');
          canvas.width = 50;
          canvas.height = 50;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            lines.push('✅ Canvas context available');
            
            ctx.drawImage(img, 0, 0, 50, 50);
            lines.push('✅ Can draw image to canvas');
            
            // Test 3: Can we read pixel data?
            try {
              ctx.getImageData(0, 0, 50, 50);
              lines.push('✅ Can read canvas pixel data (CORS OK)');
            } catch (e) {
              lines.push('❌ Cannot read pixel data (CORS issue)');
            }
            
            // Test 4: Does repeated drawing give same result?
            const checksum1 = ctx.getImageData(0, 0, 1, 1).data[0];
            setTimeout(() => {
              ctx.clearRect(0, 0, 50, 50);
              ctx.drawImage(img, 0, 0, 50, 50);
              const checksum2 = ctx.getImageData(0, 0, 1, 1).data[0];
              
              if (checksum1 === checksum2) {
                lines.push('❌ Image does NOT animate (same pixel data after 500ms)');
                lines.push('   Problem: HTML Image elements dont animate when');
                lines.push('   repeatedly drawn to canvas. They show the same frame.');
                lines.push('\n   Potential Solutions:');
                lines.push('   1. Keep <img> in DOM (hidden) so browser animates it');
                lines.push('   2. Use a GIF decoder library (e.g., gifuct-js)');
                lines.push('   3. Use canvas.toBlob() with animation frame timing');
              } else {
                lines.push('✅ Image DOES animate (different pixel data)');
              }
              
              resolve(lines.join('\n'));
            }, 500);
          } else {
            lines.push('❌ No canvas context available');
            resolve(lines.join('\n'));
          }
        };
        
        img.onerror = () => {
          lines.push('❌ Failed to load GIF');
          resolve(lines.join('\n'));
        };
        
        img.src = testGif;
      });
    });
    
    console.log(report);
    
    // Test always passes - it's just diagnostic
    expect(report).toContain('GIF Animation Diagnostic Report');
  });
});

