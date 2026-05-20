#!/bin/bash

# Exit immediately if any command fails
set -e

APP_PATH="$1"

if [ -z "$APP_PATH" ]; then
  echo "Error: Path to .app is required."
  exit 1
fi

echo "Cleaning quarantine attributes for: $APP_PATH..."
xattr -cr "$APP_PATH"

echo "Signing application using ad-hoc signature..."
codesign --deep --force --sign - "$APP_PATH"

echo "Verifying code signature..."
codesign --verify --deep --verbose=4 "$APP_PATH"

echo "Mac post-build signing completed successfully!"
