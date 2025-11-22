import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Haptic Browser visual tests
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries to avoid hanging
  workers: 1, // Single worker to avoid hanging issues
  reporter: 'list', // Simple list reporter - no HTML that might try to open
  timeout: 30 * 1000, // 30 second timeout per test
  globalTimeout: 60 * 1000, // 60 second global timeout - force exit
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'off', // Disable tracing to avoid hanging
    screenshot: 'only-on-failure',
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 15000,
  },

  projects: [
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Ensure headless mode for non-interactive execution
        headless: true,
      },
    },
  ],

  // Note: Dev server should be running manually via 'npm run dev'
  // We don't configure webServer here to avoid Playwright waiting for it to stop
});

