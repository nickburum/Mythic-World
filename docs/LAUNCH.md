# Game Box — launch hand-off

The code, art, store assets and docs for v1.0 are done and reviewed. What is left needs your Apple and Google accounts and one real iPhone. This page is the short version; `store/CHECKLIST.md` is the tick-list and `ios/APPLE-SETUP.md` the click-by-click guide.

## Where things are

| What | Where |
|---|---|
| Playable web build (same bundle the iOS app ships) | GitHub Pages once this branch is merged to `main`; preview artifact while it is not |
| iOS app (WKWebView shell, Game Center, iCloud, rewarded ads, StoreKit 2) | `ios/` — `bash ios/bootstrap.sh --team <TEAMID>` generates the Xcode project |
| App Store copy, keywords, privacy answers, review notes | `store/METADATA.md` |
| Screenshots, 7 per size | `store/screens/1290x2796`, `store/screens/1284x2778` |
| Privacy policy page | `privacy/` (deploys with the site) — source `store/PRIVACY.md` |
| Legal check (COPPA, GDPR fonts, CIPA, CAN-SPAM, auto-renewal, DMCA) | `docs/LEGAL.md` |
| Review board reports, rounds 1–3, and the producer's backlog | `docs/review/` |

CI on every push: unit tests, browser smoke tests of the hub and all five games, the shipping web build, and an iOS simulator build (BUILD SUCCEEDED).

## Your steps, in order

1. **Apple Developer**: copy your Team ID, then `bash ios/bootstrap.sh --team <TEAMID> --bundle com.<you>.gamebox`. Run it on your iPhone from Xcode (`ios/APPLE-SETUP.md` §1–4).
2. **App Store Connect**: create the app record, the five Game Center leaderboards (`ios/APPLE-SETUP.md` §5), and the in-app purchase **Non-Consumable `com.mythicworld.gamebox.adfree`** ("Go ad-free", US$2.99 suggested).
3. **AdMob**: create the app and one rewarded ad unit, paste both IDs into `ios/project.yml` (`GADApplicationIdentifier`, `GADRewardedUnitID`), and publish a GDPR message under Privacy & messaging. Debug builds use Google's test IDs automatically; `fastlane release` refuses to ship the test IDs.
4. **TestFlight**: Product ▸ Archive ▸ Distribute, or `cd ios && fastlane beta` with your App Store Connect API key. Run the on-device smoke list in `store/CHECKLIST.md` §E (age question on the 4th run, Continue ad, ad-free purchase + restore, pause from Control Center, scores and streak survive reinstall, daily run from the Today card).
5. **Submit**: paste the metadata and review notes, upload the screenshots, privacy policy URL `https://nickburum.github.io/Mythic-World/privacy/`, age rating 4+, price Free.

## What v1.0 is

Five one-tap games in one free app: POP (chain pops, frenzy), Sky Temple (stacking with perfect streaks), SKIP (stone skipping across a day-to-night lake), ORBIT (reverse to dodge, momentum multiplier) and MELT (change state, heat multiplier). A daily run shared by every player keeps a streak; every run earns XP; levels 2–17 unlock colour looks. Friends can be challenged to the same seeded run. Scores, streak and progress back up to iCloud. Monetisation is one opt-in rewarded "Continue" (from the 4th run, behind a neutral age question) and a one-time "Go ad-free". No banners, no interstitials, no tracking, no accounts.

## Deferred to v1.1 (board-agreed)

Character art for Sky Temple and SKIP; Sky Temple offering stones; universal links (Associated Domains); a fixed-step SKIP simulation and a second RNG stream in ORBIT for perfectly identical challenge replays; Dynamic Type sizing; scale-aware stings and a higher POP lead line; store frames rendered on a Mac (SF Rounded).
