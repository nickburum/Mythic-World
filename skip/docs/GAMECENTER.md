# SKIP — Game Center setup

SKIP's leaderboard code has two backends. On the web it keeps a local top‑10 and
shows "Local scores" on the title screen. Inside the iOS shell in
`native/ios`, the same code talks to Game Center: the chip turns green with the
player's alias, every run is submitted, and the LEADERBOARD panel gains an
**OPEN GAME CENTER** button that presents Apple's leaderboard sheet.

## 1. Xcode project (10 minutes)

1. Xcode → **File ▸ New ▸ Project ▸ iOS App**. Interface: SwiftUI. Name it `SKIP`.
   Bundle identifier e.g. `com.yourname.skip`.
2. Delete the generated `ContentView.swift` and `SKIPApp.swift`. Drag
   `skip/native/ios/*.swift` into the target (copy items).
3. Add the game: drag the `skip/` folder into the project and choose
   **Create folder references** (blue folder). Rename the reference to `web`.
   You can exclude `tools/`, `tests/`, `docs/` and `native/` from the copy.
   `GameView.swift` loads `web/index.html`.
4. Because the shell loads from the bundle, delete the switcher line
   (`<script src="../switcher.js" …>`) from the bundled `index.html` or copy
   `switcher.js` into `web/`; the game runs fine either way, the script just
   fails to load silently.
5. Target ▸ **Signing & Capabilities ▸ + Capability ▸ Game Center**.
6. Target ▸ **Info**: set `UIRequiresFullScreen = YES`, supported orientations
   Portrait only, `UIStatusBarHidden = YES`, `UIViewControllerBasedStatusBarAppearance = NO`.
7. App icon: `skip/art/icon-1024.png`.

## 2. App Store Connect

1. Create the app record with the same bundle ID.
2. **Services ▸ Game Center ▸ Leaderboards ▸ +** → *Classic leaderboard*.
   - Reference name: `Longest skip`
   - Leaderboard ID: `com.mythicworld.skip.distance`
     (or change `LEADERBOARD_ID` at the top of `src/main.js` to match yours)
   - Score format: **Fixed point – to 1 decimal** (the game submits metres × 10)
   - Sort: **High to low**
   - Add at least one localisation (score suffix ` m`).
3. Save. Leaderboards work in sandbox immediately with a sandbox tester account
   signed in under *Settings ▸ Game Center* on the device.

## 3. Test

Run on a device (Game Center authentication does not show its sign‑in sheet in
the Simulator unless you are signed in there too). On launch you should see
Apple's "Welcome back" banner, the chip on the title screen turning green, and
after your first run **LEADERBOARD ▸ OPEN GAME CENTER** showing the global board.

## Protocol reference

| Direction | Message |
|---|---|
| JS → native | `{ type: 'authenticate' }` |
| JS → native | `{ type: 'submit', leaderboardID, score }` — integer score, metres × 10 |
| JS → native | `{ type: 'show', leaderboardID, scope }` — `scope` is `'global'` or `'friends'` (GKLeaderboard playerScope) |
| native → JS | `GameCenterBridge.onAuth({ authenticated, alias })` |
| native → JS | `GameCenterBridge.onSubmitted({ ok, error })` |

The JS side lives in `src/platform/leaderboard.js` and is covered by
`tests/skip.test.js` (local board ordering, ranks, best).

## Competing with friends

Two layers, both already wired in `src/main.js`:

- **Game Center friends** — the GLOBAL tab shows *Game Center Friends*, which presents the
  leaderboard with `playerScope = .friendsOnly`. Players add friends in the Game Center
  settings on their device; nothing extra to build.
- **Challenge links (works everywhere, no server)** — every run is played on a seeded lake.
  The result card's *Challenge a friend* button shares a link `…/skip/#c=SEED.SCORE10.TAG`.
  Opening it shows a banner, *Accept* plays the identical lake, and the result card says who
  won. *Send result* shares `#c=SEED.SCORE10.TAG.REPLY10.REPLYTAG` back; the challenger sees
  the outcome and a *Rematch* button. Friends' bests collect in the FRIENDS tab. In the iOS
  shell these links open the app when you register the site as a Universal Link
  (`applinks:` associated domain) or simply as a custom URL scheme that forwards the fragment.

## Android

Use the same bridge shape with Google Play Games Services: a `@JavascriptInterface`
object named `gameCenter` exposing `postMessage(json)` keeps `leaderboard.js`
unchanged apart from the feature check in `nativeAvailable`.

## Capacitor alternative

`npx cap add ios` plus a community Game Center plugin also works; map the three
message types to the plugin's `signIn`, `submitScore` and `showLeaderboard`.
