#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_STUDIO_JDK="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

# Use Android Studio bundled JDK on macOS when JAVA_HOME is not set.
if [ -z "${JAVA_HOME:-}" ] && [ -x "$ANDROID_STUDIO_JDK/bin/java" ]; then
  export JAVA_HOME="$ANDROID_STUDIO_JDK"
fi

if [ -z "${JAVA_HOME:-}" ]; then
  echo "JAVA_HOME is not set and no bundled Android Studio JDK was found."
  echo "Set JAVA_HOME to a JDK 17 installation and retry."
  exit 1
fi

export PATH="$JAVA_HOME/bin:$PATH"

cd "$ROOT_DIR/android"
./gradlew "$@"
