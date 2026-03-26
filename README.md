# NutriSnap

## Local web development

Prerequisites:
- Node.js 20+

1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in `.env.local`
3. Start development server:
   `npm run dev`

## Android test app (Capacitor)

Prerequisites:
- Java 17 (JDK)
- Android Studio
- Android SDK + platform tools configured

First-time setup:
1. Install dependencies:
   `npm install`
2. Add Android platform (already done in this repo):
   `npm run android:add`

Daily workflow for testing:
1. Build web app and sync native project:
   `npm run android:sync`
2. Open Android Studio project:
   `npm run android:open`
3. Run on emulator/device from Android Studio, or via CLI:
   `npm run android:run`

Build APK from CLI:
- Debug APK:
  `npm run android:build:debug`
- Release APK:
  `npm run android:build:release`

Output location after debug build:
- `android/app/build/outputs/apk/debug/app-debug.apk`
