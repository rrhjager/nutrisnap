# Privacyverklaring NutriSnap

Laatst bijgewerkt: 26 maart 2026

Deze privacyverklaring legt uit welke persoonsgegevens NutriSnap verwerkt, waarom we dat doen, waar deze gegevens worden opgeslagen en welke rechten je hebt onder de AVG (GDPR).

## 1. Verantwoordelijke

NutriSnap (app)  
Contact: rrhjager@gmail.com

## 2. Welke gegevens we verwerken

### 2.1 Gegevens bij **guest-account** (anoniem via Firebase Auth)

Wij verwerken en bewaren:
- `uid` (anonieme gebruikers-id)
- `displayName` (`Guest`)
- `isGuest`
- doelen en voortgang: `dailyCalorieGoal`, `dailyProteinGoal`, `dailyCarbsGoal`, `dailyFatGoal`, `waterAmount`
- gebruiksdata: `scansToday`, `lastScanDate`, `createdAt`
- logdata in Firestore:
  - `users/{uid}/meals`
  - `users/{uid}/scans`
  - `users/{uid}/favorites`
- voortgangsvelden: `totalScans`, `currentStreak`, `longestStreak`, `unlockedBadges`, `hasCompletedOnboarding`

Lokaal op je apparaat slaan we op:
- `guest_scan_count`
- `guest_scan_date`
- `darkMode`

### 2.2 Gegevens bij **Google-login**

Bovenstaande gegevens, plus:
- `email`
- `displayName`
- `photoURL`
- authenticatiegegevens via Firebase Auth (provider: Google)

Extra lokaal (session storage):
- `googleFitToken` (alleen tijdens de browser/app-sessie)

### 2.3 Gegevens bij **Premium-account**

Bovenstaande gegevens, plus:
- `isPremium`
- `stripeCustomerId`
- `stripeSubscriptionId`
- `updatedAt` (server timestamp)

Let op:
- NutriSnap verwerkt zelf **geen volledige kaartgegevens**.
- Betalingen lopen via Stripe Checkout.

## 3. Gegevens uit camera, barcode en spraak

Voor voedingsanalyse verwerken wij:
- camerabeelden (als base64) voor AI-analyse
- barcode-gegevens
- spraak/tekstbeschrijving van maaltijden

Deze input wordt gebruikt om voedingswaarden te berekenen (`foodName`, `calories`, `protein`, `carbs`, `fat`, `servingSize`, `ingredients`, `confidence`).

## 4. Waarom we deze gegevens verwerken

Doeleinden:
- account en login mogelijk maken
- maaltijdanalyse en logboekfunctionaliteit
- scanlimieten, voortgang en badges beheren
- doelen en waterinname opslaan
- premium-abonnementen beheren
- optioneel synchroniseren met Google Fit
- dagelijks herinneringsbericht op Android (lokale notificatie)

## 5. Met wie we gegevens delen (verwerkers/diensten)

Wij gebruiken:
- **Firebase (Google)**: authenticatie en Firestore-opslag
- **Google Gemini API**: analyse van foto/tekst voor voedingsschatting
- **Open Food Facts**: productinformatie op basis van barcode
- **Stripe**: abonnementen en betalingen
- **Google Fit API** (optioneel, na Google-login): sync van maaltijdwaarden
- **Hostingplatform** (Vercel/Cloud run-time): serververwerking en API-routes

## 6. Rechtsgrond (AVG)

Wij verwerken gegevens op basis van:
- uitvoering van de dienst (account, logboek, premiumfunctionaliteit)
- toestemming (bijv. camera, notificaties, Google Fit-koppeling)
- gerechtvaardigd belang (beveiliging, foutanalyse, misbruikpreventie)

## 7. Bewaartermijnen

- Account- en loggegevens worden bewaard zolang je account actief is, of tot verwijdering op verzoek.
- Guest-data is bedoeld als tijdelijk gebruik, maar kan technisch blijven bestaan totdat deze wordt verwijderd.
- Stripe-gerelateerde abonnementreferenties worden bewaard zolang nodig voor abonnementbeheer en administratie.

## 8. Jouw rechten

Je kunt verzoeken om:
- inzage in je persoonsgegevens
- correctie van onjuiste gegevens
- verwijdering van je gegevens
- beperking of bezwaar tegen bepaalde verwerking
- dataportabiliteit (waar technisch mogelijk)

Stuur hiervoor een verzoek naar: rrhjager@gmail.com

## 9. Beveiliging

Wij nemen redelijke technische en organisatorische maatregelen om persoonsgegevens te beveiligen.  
Geen enkel systeem is 100% veilig; deel daarom nooit onnodig gevoelige informatie via vrije tekstvelden of afbeeldingen.

## 10. Minderjarigen

NutriSnap is niet gericht op kinderen onder 16 jaar zonder toestemming van ouder/voogd.

## 11. Wijzigingen

Wij kunnen deze privacyverklaring aanpassen. Bij belangrijke wijzigingen publiceren we een bijgewerkte versie met nieuwe datum.
