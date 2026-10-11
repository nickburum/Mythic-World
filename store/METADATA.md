# App Store metadata — Game Box

Copy these fields into App Store Connect ▸ your app ▸ *App Store* tab. Character limits are Apple's.

## Name (30)
`Game Box: Five Tiny Games`

## Subtitle (30)
`One finger. Endless replays.`

## Promotional text (170, editable without a new build)
`Five tiny games in one box. Skip stones at sunset, pop bubbles, dodge on a ring, change state, stack to the sky. Free, offline, no account.`

## Description (4000)
```
Five games. One finger. No downloads inside, no accounts, no waiting.

Open the box, pick a game, play in seconds. Every game is one-touch, lasts about a minute, and gets harder the longer you last. Beat your best, challenge a friend on the exact same run, and climb the Game Center leaderboards.

THE GAMES
• SKIP — Skip a stone across a sunset lake. Tap when it kisses the water. Chase the glowing motes, dodge the lily pads, and run from golden hour into a sky full of stars.
• MELT — Tap to change state. Ice smashes glass, water flows through pipes, steam floats over spikes. Be the right one when it counts.
• POP — Pop the bubbles that match the colour. Three lives. The colour keeps changing.
• ORBIT — One tap reverses your comet. Dodge the red arcs, sweep up the gems.
• SKY TEMPLE — Tap to drop stones on the tower. Land perfectly and they grow back.

MADE FOR PHONES
• Everything is one tap, thumb-first, portrait.
• Each game has its own music and a 20-second tutorial.
• Your best scores back up to iCloud and follow you to a new phone.
• Challenge friends: send a link, they play the identical run, the result says who won.
• Game Center leaderboards for every game.

FREE, AND HONEST ABOUT IT
Game Box is free. There are no banners and nothing interrupts play. When a run ends you can choose to watch a short ad to continue once. That is the only ad in the box.

Five games, one icon on your home screen. Which one is yours?
```

## Keywords (100, comma-separated, no spaces)
`stone,skip,bubble,pop,orbit,stack,tower,casual,one tap,arcade,minimal,offline,quick,relax,zen,puzzle`

## Categories
Primary **Games ▸ Casual**. Secondary **Games ▸ Arcade**.

## What's New (first version)
`Welcome to the box. Five games, one finger. Tell us which one you love.`

## Support and marketing URLs
- Support URL: `https://github.com/nickburum/Mythic-World/issues` (or your own site)
- Marketing URL: `https://nickburum.github.io/Mythic-World/`
- Privacy policy URL: `https://nickburum.github.io/Mythic-World/privacy/` (generated from `store/PRIVACY.md` by `node tools/privacy-page.mjs`, deployed with the site) — required because AdMob receives device data.

## Age rating questionnaire
Everything **None** / **No**. Result: 4+. (No violence, no gambling, no user content, no unrestricted web.)

## App Privacy (with AdMob rewarded ads)
| Data | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Device ID (IDFV) | Yes | No | No | Third-party advertising |
| Advertising data | Yes | No | No | Third-party advertising |
| Coarse location (from IP) | Yes | No | No | Third-party advertising |
| Product interaction | No | | | |
| Crash data | No | | | |
**Tracking: No** (the app never calls the App Tracking Transparency prompt and ships no NSUserTrackingUsageDescription). Game Center and iCloud data are handled by Apple and not declared.

AdMob settings to match: *Privacy & messaging* ▸ create a GDPR message (EU/UK consent); *Apps ▸ Game Box ▸ App settings* ▸ "Is your app directed to children?" ▸ **No / mixed audience** (the in-app age question tags under-13 players per request).

## Review notes (paste into "Notes" for the reviewer)
```
Game Box is five small offline games in one app. No account is needed.
- Game Center: used only for leaderboards. Any Game Center account works.
- iCloud: Key-Value Storage backs up best scores (no user-facing UI).
- Ads: a single rewarded video ("Continue · watch an ad") offered after a run ends, from the fourth run on. No banners, no interstitials. Before the first ad the app asks a neutral "year you were born" question once; under-13 players get child-directed, G-rated ad requests only. To see it: play any game four times.
- In-app purchase: "Go ad-free" (non-consumable) removes the ad offer; Restore Purchases is in Settings.
- Challenge links open https://nickburum.github.io/Mythic-World/ with a seed; the same seed produces the same run.
Nothing is gated; every game is playable from the first screen.
```

## Build settings to double-check before upload
- `MARKETING_VERSION` 1.0.0, `CURRENT_PROJECT_VERSION` increments every upload.
- `ITSAppUsesNonExemptEncryption` false (already in project.yml).
- Replace the AdMob **test** App ID and ad unit with your own before the *release* build, never before.
