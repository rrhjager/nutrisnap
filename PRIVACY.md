# NutriSnap Privacy Policy

Last updated: March 26, 2026

This Privacy Policy explains what personal data NutriSnap processes, why we process it, where it is stored, and your rights under the GDPR.

## 1. Data Controller

NutriSnap (app)  
Contact: kaartenautomaat@gmail.com

## 2. Data We Process

### 2.1 Data for **guest accounts** (anonymous Firebase Auth)

We process and store:
- `uid` (anonymous user ID)
- `displayName` (`Guest`)
- `isGuest`
- goals and tracking fields: `dailyCalorieGoal`, `dailyProteinGoal`, `dailyCarbsGoal`, `dailyFatGoal`, `waterAmount`
- usage fields: `scansToday`, `lastScanDate`, `createdAt`
- Firestore logs:
  - `users/{uid}/meals`
  - `users/{uid}/scans`
  - `users/{uid}/favorites`
- progress fields: `totalScans`, `currentStreak`, `longestStreak`, `unlockedBadges`, `hasCompletedOnboarding`

Locally on your device, we store:
- `guest_scan_count`
- `guest_scan_date`
- `darkMode`

### 2.2 Data for **Google sign-in accounts**

All data above, plus:
- `email`
- `displayName`
- `photoURL`
- authentication data via Firebase Auth (provider: Google)

Additional local session storage:
- `googleFitToken` (during active browser/app session)

### 2.3 Data for **Premium accounts**

All data above, plus:
- `isPremium`
- `stripeCustomerId`
- `stripeSubscriptionId`
- `updatedAt` (server timestamp)

Important:
- NutriSnap does **not** store full payment card numbers.
- Payments are handled through Stripe Checkout.

## 3. Camera, Barcode, and Voice Data

For nutrition analysis, we process:
- camera images (base64 format)
- barcode input
- voice/text food descriptions

This input is used to generate nutrition outputs (`foodName`, `calories`, `protein`, `carbs`, `fat`, `servingSize`, `ingredients`, `confidence`).

## 4. Why We Process Data

Purposes:
- account and authentication management
- food analysis and meal logging features
- scan limits, streaks, badges, and progress
- storing goals and water intake
- premium subscription management
- optional Google Fit synchronization
- Android local reminder notifications

## 5. Services and Processors We Use

We use:
- **Firebase (Google)**: authentication and Firestore storage
- **Google Gemini API**: image/text nutrition estimation
- **Open Food Facts**: barcode product lookup
- **Stripe**: subscriptions and payments
- **Google Fit API** (optional): nutrition sync after Google sign-in
- **Hosting platform** (Vercel/Cloud runtime): API and backend processing

## 6. Legal Bases (GDPR)

We process personal data based on:
- performance of our service (account, app features, subscription functionality)
- consent (for example camera access, notifications, Google Fit connection)
- legitimate interests (security, debugging, abuse prevention)

## 7. Data Retention

- Account and log data is retained while your account is active, or until deletion is requested.
- Guest data is intended for temporary use, but may technically remain until removed.
- Stripe subscription reference data is retained as needed for subscription handling and administration.

## 8. Your Rights

You can request:
- access to your personal data
- correction of inaccurate data
- deletion of your data
- restriction of processing or objection
- data portability (where technically feasible)

For privacy requests, contact: kaartenautomaat@gmail.com

## 9. Security

We apply reasonable technical and organizational measures to protect personal data.  
No system is 100% secure, so please do not upload unnecessary sensitive information in free-text fields or images.

## 10. Children

NutriSnap is not intended for children under 16 without parent or guardian permission.

## 11. Changes

We may update this Privacy Policy. Material changes will be reflected in an updated version with a new date.
