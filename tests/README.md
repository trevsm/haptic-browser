# Playwright Visual Tests

Visual regression tests for the Haptic Browser prototype.

## Setup

1. **Install Playwright Firefox** (if not already installed):
   ```bash
   npm run test:install
   ```
   Or manually:
   ```bash
   npx playwright install firefox
   ```

2. **Start the dev server** (in a separate terminal):
   ```bash
   npm run dev
   ```

3. **Run the screenshot test**:
   ```bash
   npm run test:screenshot
   ```

## Test Files

- `screenshot.spec.ts` - Simple screenshot capture test (recommended to start with)
- `visual.spec.ts` - Comprehensive visual tests with multiple scenarios

## Screenshots

Screenshots are saved to `tests/screenshots/`:
- `haptic-browser-prototype.png` - Full page screenshot
- `haptic-browser-canvas.png` - Canvas/3D scene only

## Troubleshooting

If tests hang:
1. Make sure the dev server is running on `http://localhost:5173`
2. Check that Firefox browser is installed: `npx playwright install firefox`
3. Try running with a single worker: `playwright test --workers=1`
4. Check browser installation: `npx playwright --version`

