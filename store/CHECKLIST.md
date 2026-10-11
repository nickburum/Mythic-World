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
- [ ] Privacy policy URL live (publish `store/PRIVACY.md`).
- [ ] Metadata pasted from `store/METADATA.md` (name, subtitle, description, keywords, promo text, URLs).
- [ ] Screenshots uploaded from `store/screens/1290x2796` and `store/screens/1284x2778` (run `node tools/store-screens.mjs`).

## D. Ads (optional for TestFlight, required before release)
- [ ] AdMob app + rewarded unit created; IDs pasted into `ios/project.yml` and `ios/GameBox/AdsBridge.swift`.
- [ ] AdMob payments profile complete.

## E. TestFlight
- [ ] Product ▸ Archive ▸ Distribute ▸ App Store Connect ▸ Upload.
- [ ] Internal testers added; build installed on a real phone.
- [ ] Smoke on device: every game plays; sound on; Continue shows a test ad; delete + reinstall restores scores; a challenge link opens the web version.

## F. Submit
- [ ] Review notes pasted (`store/METADATA.md`).
- [ ] Price: Free; availability: all territories.
- [ ] Add for Review ▸ Submit. Typical turnaround 1–3 days.

## G. Day-one
- [ ] Tag the release: `git tag v1.0.0 && git push --tags`.
- [ ] Watch crash reports in App Store Connect ▸ TestFlight/Crashes and reviews.
