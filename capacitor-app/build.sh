#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Syncing Capacitor platforms..."
cd "$SCRIPT_DIR"
npx cap sync

echo ""
echo "Done! The app loads from https://ssiccmr.com (live server mode)."
echo ""
echo "Next steps:"
echo "  Android:  npm run open:android  (requires Android Studio)"
echo "  iOS:      npm run open:ios      (requires Xcode, macOS only)"
echo ""
echo "To add platforms (first time only):"
echo "  npm run add:android"
echo "  npm run add:ios"
