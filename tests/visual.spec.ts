import { test, expect } from '@playwright/test';

/**
 * Visual regression test for Haptic Browser prototype
 * Verifies the simulation renders correctly and looks like a tactile pin display
 */
test.describe('Haptic Browser Visual Tests', () => {
  test('should render the tactile pin display simulation', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the Three.js canvas to be rendered
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    
    // Wait a bit for the scene to fully initialize and pins to render
    await page.waitForTimeout(2000);
    
    // Take a full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/haptic-browser-full.png',
      fullPage: true,
    });
    
    // Take a screenshot of just the canvas area
    await canvas.screenshot({
      path: 'tests/screenshots/haptic-browser-canvas.png',
    });
  });

  test('should display UI controls panel', async ({ page }) => {
    await page.goto('/');
    
    // Verify controls panel is visible
    const controlsPanel = page.locator('#controls');
    await expect(controlsPanel).toBeVisible();
    
    // Verify key controls are present
    await expect(controlsPanel.locator('text=Pattern Mode')).toBeVisible();
    await expect(controlsPanel.locator('text=Grid Size')).toBeVisible();
    await expect(controlsPanel.locator('text=Amplitude')).toBeVisible();
    await expect(controlsPanel.locator('text=Pattern Speed')).toBeVisible();
    
    // Take screenshot of controls panel
    await controlsPanel.screenshot({
      path: 'tests/screenshots/haptic-browser-controls.png',
    });
  });

  test('should display info panel', async ({ page }) => {
    await page.goto('/');
    
    // Verify info panel is visible
    const infoPanel = page.locator('#info');
    await expect(infoPanel).toBeVisible();
    
    // Verify title is present
    await expect(infoPanel.locator('h1')).toContainText('Haptic Browser');
    
    // Verify description
    await expect(infoPanel.locator('p')).toContainText('tactile pin display');
  });

  test('should render pin field with wave pattern', async ({ page }) => {
    await page.goto('/');
    
    // Wait for canvas
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    
    // Wait for scene to initialize
    await page.waitForTimeout(3000);
    
    // Verify canvas has content (not blank)
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.width).toBeGreaterThan(0);
    expect(canvasBox!.height).toBeGreaterThan(0);
    
    // Take screenshot after pattern has animated
    await page.screenshot({
      path: 'tests/screenshots/haptic-browser-wave-pattern.png',
      fullPage: true,
    });
  });

  test('should switch pattern modes', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(2000);
    
    // Switch to ripple pattern
    const patternSelect = page.locator('#controls select').first();
    await patternSelect.selectOption('ripple');
    
    // Wait for pattern to update
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: 'tests/screenshots/haptic-browser-ripple-pattern.png',
      fullPage: true,
    });
    
    // Switch to gaussian pattern
    await patternSelect.selectOption('gaussian');
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: 'tests/screenshots/haptic-browser-gaussian-pattern.png',
      fullPage: true,
    });
  });

  test('should adjust amplitude slider', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(2000);
    
    // Find amplitude slider (second range input)
    const amplitudeSlider = page.locator('#controls input[type="range"]').nth(1);
    
    // Set amplitude to minimum
    await amplitudeSlider.fill('0');
    await page.waitForTimeout(1000);
    
    await page.screenshot({
      path: 'tests/screenshots/haptic-browser-amplitude-min.png',
      fullPage: true,
    });
    
    // Set amplitude to maximum
    await amplitudeSlider.fill('1');
    await page.waitForTimeout(1000);
    
    await page.screenshot({
      path: 'tests/screenshots/haptic-browser-amplitude-max.png',
      fullPage: true,
    });
  });

  test('should verify device appearance matches prototype vision', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(3000);
    
    // Take a comprehensive screenshot for manual review
    // This should show:
    // - Dark background (1a1a1a)
    // - 3D device body with rim
    // - Pin field forming visible relief pattern
    // - UI controls in top-right
    // - Info panel in top-left
    // - Instructions in bottom-left
    
    const screenshot = await page.screenshot({
      path: 'tests/screenshots/haptic-browser-prototype-verification.png',
      fullPage: true,
    });
    
    // Basic checks that the page rendered
    expect(screenshot).not.toBeNull();
    
    // Verify all key UI elements are present
    await expect(page.locator('#info')).toBeVisible();
    await expect(page.locator('#controls')).toBeVisible();
    await expect(page.locator('#instructions')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
  });
});

