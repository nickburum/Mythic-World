# Game Box on iOS — from this repo to TestFlight

Everything in the box is web code. The iOS app is a thin SwiftUI shell that serves the
web build from the bundle through a custom URL scheme (`gamebox://app/…`) in one
WKWebView, plus two native bridges: **Game Center** (leaderboards) and **haptics**.

## 0. Prerequisites (once)
- A Mac with **Xcode 15+** (App Store) and the **iOS platform** installed.
- An **Apple Developer Program** membership (you have this).
- `brew install xcodegen` (the bootstrap script does this for you if Homebrew exists).

## 1. Generate and run on your phone (5 minutes)
```bash
bash ios/bootstrap.sh
```
This assembles the web build into `ios/GameBox/web`, writes the app icon, generates
`GameBox.xcodeproj` from `project.yml` and opens Xcode.

In Xcode: select the **GameBox** target ▸ **Signing & Capabilities** ▸ choose your **Team**.
(Or set `DEVELOPMENT_TEAM` in `project.yml` once and never think about it again.)
Change the bundle identifier if you like (`PRODUCT_BUNDLE_IDENTIFIER` in `project.yml`),
plug in your iPhone, pick it as the destination and press ▶. First run on a device asks
you to trust the developer certificate in *Settings ▸ General ▸ VPN & Device Management*.

Every time the web code changes, re-run `bash ios/bootstrap.sh` (or just
`bash scripts/build-web.sh`) and build again. The project file never needs hand edits.

## 2. App Store Connect record
1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) ▸ **Apps ▸ +** ▸ New App.
   Platform iOS, name **Game Box** (or yours), bundle ID = the one in `project.yml`, SKU anything.
2. **Game Center**: *Services ▸ Game Center ▸ Leaderboards ▸ +* → Classic leaderboard
   - Reference `Skip — longest throw`, ID **`com.mythicworld.skip.distance`**
     (or change `LEADERBOARD_ID` in `skip/src/main.js`), format *Fixed point – 1 decimal*, high‑to‑low.
   - Add boards for the other games later with the same pattern; each game passes its own ID
     through the shared bridge.
3. **App Privacy**: the box stores scores on device only and makes no network calls
   (answer "No" to data collection). Encryption: `ITSAppUsesNonExemptEncryption` is already `false`.

## 3. TestFlight
**From Xcode**: Product ▸ **Archive** ▸ *Distribute App* ▸ *App Store Connect* ▸ Upload.
A few minutes later the build appears under **TestFlight** in App Store Connect; add yourself
as an internal tester (your Apple ID) and install the TestFlight app on your phone.

**One command (optional)**: `cd ios && fastlane beta` — see `fastlane/Fastfile` for the three
environment variables it needs (App Store Connect API key).

## 4. Prepping for the App Store
- **Screenshots**: `npm run screens:all` captures 2× phone screenshots of every game into
  `*/art/screens/`; App Store wants 6.7" (1290×2796) and 6.5" (1284×2778) PNGs — the
  render tools accept a viewport override, or export from the Simulator.
- **Icon**: `art/icon-1024.png` is the App Store icon; the bootstrap copies it into the asset catalog.
- **Age rating**: no mature content → 4+. **Category**: Games ▸ Casual.
- **Review notes**: "All games are offline. Game Center is used for leaderboards only."

## How the bridges work
| Web → native message | Handler | What happens |
|---|---|---|
| `webkit.messageHandlers.haptics.postMessage('light'|'medium'|'heavy')` | `HapticsBridge` | `UIImpactFeedbackGenerator` |
| `webkit.messageHandlers.gameCenter.postMessage({type:'authenticate'})` | `GameCenterBridge` | GKLocalPlayer sign-in, calls back `GameCenterBridge.onAuth` |
| `…({type:'submit', leaderboardID, score})` | | `GKLeaderboard.submitScore` |
| `…({type:'show', leaderboardID, scope})` | | Presents `GKGameCenterViewController` (global or friends) |

Deep links: `gamebox://play/skip` opens a game; a SKIP challenge link rewritten as
`gamebox://skip/#c=…` opens that challenge. Universal Links (https) can be added later with an
`applinks:` associated domain once the site is on your own domain.

## Android later
The same web build drops into a `WebView` + `WebViewAssetLoader`; implement the two
`@JavascriptInterface` objects (`gameCenter` → Play Games, `haptics` → `Vibrator`).
