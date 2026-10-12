# Launch checklist — Game Box 1.0

Tick top to bottom. Each line names where you do it. The code side is done; the account side is yours.

## A. Account (once)
- [ ] Apple Developer Program active; Team ID copied (developer.apple.com ▸ Membership).
- [ ] Xcode 15+ installed and signed in (Xcode ▸ Settings ▸ Accounts).
- [ ] `bash ios/bootstrap.sh --team <TEAMID> --bundle com.<you>.gamebox`

## B. Identifiers & capabilities
- [ ] App ID registered with Game Center + iCloud (Key-value storage) — or let Xcode's automatic signing create it.
- [ ] Build runs on your iPhone from Xcode (▶).

## C. App Store Connect
- [ ] App record created (name, bundle ID, SKU).
- [ ] Five Game Center leaderboards created with the IDs in `ios/APPLE-SETUP.md` §5.
- [ ] App Privacy answered (see `store/METADATA.md`).
- [ ] Age rating completed (4+).
- [ ] Privacy policy URL live: `https://nickburum.github.io/Mythic-World/privacy/` (deploys with the site once this branch is merged to main).
- [ ] Metadata pasted from `store/METADATA.md` (name, subtitle, description, keywords, promo text, URLs).
- [ ] Screenshots uploaded from `store/screens/1290x2796` and `store/screens/1284x2778` (7 each, already rendered; re-run `node tools/store-screens.mjs` after visual changes).
- [ ] In-App Purchase created: *Monetization ▸ In-App Purchases ▸ +* ▸ Non-Consumable, Product ID **`com.mythicworld.gamebox.adfree`**, reference name "Go ad-free", price tier of your choice (US$2.99 suggested), review screenshot = the Settings sheet. Attach it to the first version.

## D. Ads (optional for TestFlight, required before release)
- [ ] AdMob app + rewarded unit created; both IDs pasted into `ios/project.yml` (`GADApplicationIdentifier`, `GADRewardedUnitID`). Debug builds keep Google's test IDs automatically; `fastlane release` refuses to ship test IDs.
- [ ] AdMob ▸ Privacy & messaging: GDPR message published (the app shows Google's consent form in the EU/UK). App settings ▸ "directed to children": No (the in-app age question tags under-13 players).
- [ ] AdMob payments profile complete.

## E. TestFlight
- [ ] Product ▸ Archive ▸ Distribute ▸ App Store Connect ▸ Upload.
- [ ] Internal testers added; build installed on a real phone.
- [ ] Smoke on device: every game plays; sound mixes with your music; on the 4th run the age question appears once, then Continue shows a test ad; Go ad-free in sandbox removes the ad (Restore brings it back after reinstall); Control Center pauses a run; delete + reinstall restores scores and streak; a challenge link opens the web version; today's run from the hub's Today card.
- [ ] Zoom check: a stray pinch or double tap on a game's title, result sheet or pause screen never leaves the game zoomed (the hub allows zoom for accessibility; the WKWebView scroll view is locked).
- [ ] Consent: in an EU/UK region (Settings ▸ General ▸ Language & Region, or a VPN) Google's consent form appears before the first ad, and Settings shows **Privacy choices** afterwards.

## F. Submit
- [ ] Review notes pasted (`store/METADATA.md`).
- [ ] Price: Free; availability: all territories.
- [ ] Add for Review ▸ Submit. Typical turnaround 1–3 days.

## G. Day-one
- [ ] Tag the release: `git tag v1.0.0 && git push --tags`.
- [ ] Watch crash reports in App Store Connect ▸ TestFlight/Crashes and reviews.
