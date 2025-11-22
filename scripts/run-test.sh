#!/bin/bash
# Run Playwright test with guaranteed exit

set -e

cd "$(dirname "$0")/.."

echo "Running screenshot test..."
CI=true npx playwright test tests/screenshot.spec.ts --reporter=list --max-failures=1

echo "Test completed, exiting..."

