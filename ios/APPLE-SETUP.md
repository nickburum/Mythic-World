# Apple Developer setup for Game Box — from zero to TestFlight

Do these in order. Each step says where you are, what to click, and what to copy into this repo.
Budget about an hour of clicking the first time; after that, shipping an update is one command.

## 1. Enroll (if you have not already)
1. Go to [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll/) and sign in with your Apple ID (turn on two-factor authentication first in Settings ▸ your name ▸ Sign-In & Security).
2. Choose **Individual** (your name shows as the seller) or **Organization** (needs a D-U-N-S number; takes days). Individual is fine for a game box; you can transfer the app to a company later.
3. Pay the annual fee (US $99). Approval usually lands within 48 hours; you get an email.
4. Once approved, open [developer.apple.com/account](https://developer.apple.com/account) ▸ **Membership details** and copy your **Team ID** (10 characters, e.g. `AB12CD34EF`). You will paste it into `ios/project.yml` or pass it to the bootstrap:
   ```bash
   bash ios/bootstrap.sh --team AB12CD34EF --bundle com.yourname.gamebox
   ```

## 2. Install Xcode (once)
Mac App Store ▸ **Xcode** (15 or newer). Open it once, accept the licence, let it install the iOS platform. Then **Xcode ▸ Settings ▸ Accounts ▸ +** and sign in with the same Apple ID. Your team appears in the list; signing certificates are created automatically the first time you build.

## 3. Register the App ID with its capabilities
Xcode does this for you with automatic signing, but doing it by hand once avoids surprises:
1. [developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers/list) ▸ **+** ▸ App IDs ▸ App.
2. Description `Game Box`, Bundle ID **Explicit** = the one in `ios/project.yml` (`com.yourname.gamebox`).
3. Tick capabilities: **Game Center**, **iCloud** (then *Edit* ▸ tick **Key-value storage** only; no container needed). Leave *Associated Domains* for later (challenge links as Universal Links).
4. Continue ▸ Register.

## 4. Run it on your iPhone
```bash
bash ios/bootstrap.sh
```
In Xcode: target **GameBox** ▸ **Signing & Capabilities** ▸ Team = yours. The capabilities list should show Game Center and iCloud (Key-value storage). Plug in the iPhone, pick it at the top, press ▶. On the phone: Settings ▸ General ▸ VPN & Device Management ▸ trust your certificate, then launch again.

## 5. App Store Connect record
1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) ▸ **Apps ▸ +** ▸ New App. Platform iOS. Name **Game Box** (names are unique store-wide; have a fallback like *Game Box: Five Tiny Games*). Primary language, Bundle ID (pick the one from step 3), SKU `gamebox-1`. Full access.
2. **Agreements, Tax, and Banking** (top-right ▸ Business): accept the *Apple Developer Program License Agreement* (and, when Apple asks, the Paid Apps agreement; it is free to accept and needed before any paid feature, not for ads).
3. **Game Center** (left sidebar, under *Features* ▸ Game Center): create five **Classic** leaderboards, high‑to‑low, all time. IDs must match `src/games.js`:

   | Game | Leaderboard ID | Score format |
   |---|---|---|
   | MELT | `com.mythicworld.melt.score` | Integer |
   | SKIP | `com.mythicworld.skip.distance` | Fixed point, 1 decimal (we submit metres × 10) |
   | POP | `com.mythicworld.pop.score` | Integer |
   | ORBIT | `com.mythicworld.orbit.score` | Integer |
   | Sky Temple | `com.mythicworld.skytemple.score` | Integer |

   Add one localisation each (English, score suffix). Leaderboards work in the sandbox as soon as they are saved.
4. **App Privacy**: with AdMob the honest answers are *Yes, we collect data* ▸ Identifiers (Device ID) and Usage Data (Advertising data), *used for third‑party advertising*, linked to the user: No, used for tracking: Yes only if you enable personalised ads (see step 7). Without AdMob: *No data collected*.
5. **Age rating**: fill the questionnaire; everything is "None" except *Unrestricted web access: No* and *Contests: No* → 4+.

## 6. iCloud scores (already wired)
Nothing to create in the portal beyond the iCloud capability in step 3: Key‑Value Storage uses the entitlement `com.apple.developer.ubiquity-kvstore-identifier` that `project.yml` sets to your Team ID + bundle ID. On a device signed into iCloud, scores sync automatically; delete the app, reinstall, and the hub restores them on first launch. Test: play, note a best, delete the app, reinstall from Xcode, open the hub.

## 7. Ads (rewarded "Continue")
1. [admob.google.com](https://admob.google.com) ▸ Apps ▸ **Add app** ▸ iOS ▸ *Is the app listed on a supported store?* No (for now) ▸ name **Game Box**. Copy the **App ID** (`ca-app-pub-…~…`).
2. Ad units ▸ **Rewarded** ▸ name `Continue` ▸ copy the **Ad unit ID** (`ca-app-pub-…/…`).
3. Paste them: App ID → `GADApplicationIdentifier` in `ios/project.yml`; ad unit → `rewardedUnitID` in `ios/GameBox/AdsBridge.swift`. Until then the project uses Google's public **test** IDs and shows test ads, which is what you want while developing (real ads on a dev build can get the account suspended).
4. The AdMob SDK is a Swift package (`project.yml` ▸ `packages`); Xcode resolves it on first open. If you ever build without network, the bridge compiles out and the Continue button simply never appears.
5. Personalised ads need the App Tracking Transparency prompt. The Info.plist string is in place; AdMob will serve non‑personalised ads when the user declines. If you would rather never show the prompt, set AdMob to non‑personalised ads only and answer "No tracking" in App Privacy.
6. Before release: AdMob ▸ your app ▸ **App settings** ▸ link it to the App Store listing, and complete **Payments** so revenue can be paid out.

## 8. TestFlight
Xcode ▸ **Product ▸ Archive** ▸ *Distribute App* ▸ *App Store Connect* ▸ Upload (automatic signing handles the distribution certificate). In App Store Connect ▸ TestFlight ▸ **Internal Testing** ▸ create a group, add yourself (and up to 100 colleagues) by Apple ID. Install the **TestFlight** app on the phone; builds arrive as push notifications. Export compliance is pre‑answered (`ITSAppUsesNonExemptEncryption = false`).

One‑command alternative: `cd ios && fastlane beta` with an App Store Connect API key (Users and Access ▸ Integrations ▸ **App Store Connect API** ▸ generate a key with *App Manager* role; export `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_PATH`).

## 9. Submitting to the App Store
- **Screenshots**: 6.7" (1290×2796) and 6.5" (1284×2778). Run each game's `npm run screens` with the viewport overridden, or capture in the iOS Simulator (⌘S). Three to five per device size.
- **Icon**: already in the asset catalog from `art/icon-1024.png`.
- **Description / keywords**: see each game's `docs/DESIGN.md` store copy; the box listing should name all five games.
- **Review notes**: "All five games are offline and free. Game Center is used for leaderboards; iCloud Key‑Value Storage for score backup; AdMob rewarded ads only (no banners, no interstitials). Test ads are disabled in this build."
- Set **Price** Free, availability all territories, then **Add for Review** ▸ Submit. First reviews take 1–3 days.

## 10. Later: challenge links that open the app
Challenge links are web URLs. To make them open the app directly, add the **Associated Domains** capability (`applinks:yourdomain.com`), host `/.well-known/apple-app-site-association` on that domain listing `TEAMID.com.yourname.gamebox` with paths `/*`, and point the Game Box PWA at the same domain. Until then links open the web version, which plays the same seeded run.
