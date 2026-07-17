#!/usr/bin/env bash
# Builds a signed Android App Bundle (.aab) ready for Google Play Store upload.
# Prerequisites:
#   1. Run ./generate-keystore.sh once to create sms-simbtech-release.jks
#   2. Create keystore.properties with your passwords (see generate-keystore.sh output)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"

# Verify prerequisites
if [ ! -f "$SCRIPT_DIR/sms-simbtech-release.jks" ]; then
  echo "ERROR: Keystore not found. Run ./generate-keystore.sh first."
  exit 1
fi

if [ ! -f "$SCRIPT_DIR/keystore.properties" ]; then
  echo "ERROR: keystore.properties not found."
  echo ""
  echo "Create '$SCRIPT_DIR/keystore.properties' with:"
  echo "  storeFile=sms-simbtech-release.jks"
  echo "  storePassword=YOUR_STORE_PASSWORD"
  echo "  keyAlias=sms-simbtech"
  echo "  keyPassword=YOUR_KEY_PASSWORD"
  exit 1
fi

echo "==> Building release AAB for Google Play Store..."
cd "$SCRIPT_DIR"
./gradlew bundleRelease

AAB_PATH="$SCRIPT_DIR/app/build/outputs/bundle/release/app-release.aab"
RELEASES_DIR="$SCRIPT_DIR/../releases"

if [ -f "$AAB_PATH" ]; then
  mkdir -p "$RELEASES_DIR"
  # Read versionName from build.gradle for the filename
  VERSION=$(grep 'versionName' "$SCRIPT_DIR/app/build.gradle" | head -1 | sed 's/.*"\(.*\)".*/\1/')
  DEST="$RELEASES_DIR/sms-simbtech-v${VERSION}.aab"
  cp "$AAB_PATH" "$DEST"
  echo ""
  echo "SUCCESS! Upload this file to Google Play Console:"
  echo "  $DEST"
else
  echo "Build completed but AAB not found at expected path."
fi
