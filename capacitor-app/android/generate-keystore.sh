#!/usr/bin/env bash
# Run this script ONCE to generate the release keystore.
# Keep the generated .jks file and its passwords safe — you cannot publish
# updates to the Play Store without the same keystore.

set -e

JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
KEYTOOL="$JAVA_HOME/bin/keytool"
KEYSTORE_FILE="$(dirname "$0")/sms-simbtech-release.jks"

if [ -f "$KEYSTORE_FILE" ]; then
  echo "Keystore already exists at: $KEYSTORE_FILE"
  exit 0
fi

echo "=== SMS Simbtech Release Keystore Generator ==="
echo ""
echo "You will be asked to create a keystore password and a key password."
echo "Write both passwords down and store them somewhere safe."
echo ""

read -s -p "Enter keystore password (min 6 chars): " STORE_PASS
echo ""
read -s -p "Confirm keystore password: " STORE_PASS2
echo ""

if [ "$STORE_PASS" != "$STORE_PASS2" ]; then
  echo "Passwords do not match. Aborting."
  exit 1
fi

read -s -p "Enter key password (can be same as keystore password): " KEY_PASS
echo ""
read -s -p "Confirm key password: " KEY_PASS2
echo ""

if [ "$KEY_PASS" != "$KEY_PASS2" ]; then
  echo "Passwords do not match. Aborting."
  exit 1
fi

"$KEYTOOL" -genkeypair \
  -v \
  -keystore "$KEYSTORE_FILE" \
  -alias sms-simbtech \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$STORE_PASS" \
  -keypass "$KEY_PASS" \
  -dname "CN=SMS Simbtech, OU=Mobile, O=Simbtech, L=Yaounde, ST=Centre, C=CM"

echo ""
echo "Keystore generated at: $KEYSTORE_FILE"
echo ""
echo "==> IMPORTANT: Now create the file capacitor-app/android/keystore.properties"
echo "    with the following content (replace with your actual passwords):"
echo ""
echo "    storeFile=sms-simbtech-release.jks"
echo "    storePassword=YOUR_STORE_PASSWORD"
echo "    keyAlias=sms-simbtech"
echo "    keyPassword=YOUR_KEY_PASSWORD"
echo ""
echo "Then run: cd capacitor-app/android && ./gradlew bundleRelease"
