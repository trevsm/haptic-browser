#!/bin/bash
# Check if Playwright browsers are installed

echo "Checking Playwright browser installation..."

if npx playwright install firefox --dry-run 2>&1 | grep -q "Installed"; then
    echo "✅ Firefox browser is installed"
    exit 0
else
    echo "❌ Firefox browser is NOT installed"
    echo ""
    echo "To install, run:"
    echo "  npm run test:install"
    echo ""
    echo "Or manually:"
    echo "  npx playwright install firefox"
    exit 1
fi

