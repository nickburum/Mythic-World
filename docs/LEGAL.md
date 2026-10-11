# Launch legal check

A pre-launch pass over six common traps for small apps (US and EU rules). This is an engineering checklist, not legal advice; if anything here is unclear for your situation, ask a lawyer.

| Trap | Applies to Game Box? | Status |
|---|---|---|
| Under-13 users without parental consent (COPPA) | **Yes**, through the rewarded-ad SDK in a casual game kids may play. There is no sign-up. | **Handled.** A neutral "year you were born" question is asked once before any ad is ever requested (the ad SDK does not even start before it). Under 13 → `tagForChildDirectedTreatment`, G-rated ads, no consent form, no tracking. 13–15 → `tagForUnderAgeOfConsent`. Only the age band is stored. See `src/ads.js`, `ios/GameBox/AdsBridge.swift`. |
| Fonts loaded from Google's servers (GDPR) | No. Every page uses the system font stack; no `fonts.googleapis.com`, no CDN. | Pass. Keep it that way: never add a `<link>` to a font CDN. |
| Session replay / keystroke recording (CIPA wiretapping) | No. There is no analytics, replay or crash SDK. | Pass. |
| Marketing email without unsubscribe + address (CAN-SPAM) | No. The app never collects an email address. | Pass. If you ever add a mailing list, every email needs an unsubscribe link and a postal address. |
| Auto-renewal without clear terms (California ARL) | No. The only purchase is a one-time non-consumable ("Go ad-free"). | Pass. If a subscription is ever added, show price, period and how to cancel next to the button, with an explicit opt-in. |
| User uploads without a DMCA agent | No. Nothing can be uploaded; the only player text is a three-letter tag inside a challenge link. | Pass. If user content is ever hosted, register a DMCA agent at copyright.gov ($6, renew every 3 years). |

Related store work: privacy policy in `store/PRIVACY.md` (host it before submitting), App Privacy answers in `store/METADATA.md` (Tracking: No), age rating 4+.
