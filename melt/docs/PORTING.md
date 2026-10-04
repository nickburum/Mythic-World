# Porting MELT to Unity and Xcode

The rules live in one pure module, `src/core/melt.js` (~250 lines), plus `config.js` and `palette.js`. Everything else is presentation.

## Route A — ship the web build in a native shell (days)

MELT is a fullscreen offline PWA with no network dependency.

- **iOS**: SwiftUI app + `WKWebView` loading `index.html` from the bundle. Set `allowsInlineMediaPlayback` and clear `mediaTypesRequiringUserActionForPlayback` so WebAudio starts on first touch. Add a `WKScriptMessageHandler` for haptics and call it from `src/platform/haptics.js` → `UIImpactFeedbackGenerator`. Portrait only, status bar hidden, `art/icon-1024.png` as the store icon.
- **Capacitor** (`npx cap add ios` / `android`) does the above and gives you Haptics, Share and AdMob plugins.

## Route B — native rewrite (weeks)

| JS module | Unity (C#) | iOS (Swift) |
|---|---|---|
| `core/config.js` | `ScriptableObject GameConfig` | `struct GameConfig` |
| `core/melt.js` | plain C# `MeltGame` (no MonoBehaviour); events → `Action<T>` | `final class MeltGame`; events → closures / Combine |
| `core/palette.js` | static `Palette` (HSL helper → `Color`) | `UIColor(hue:…)` |
| `render/renderer.js` | SpriteRenderer prefabs per obstacle, LineRenderer gauge, gradient quad backdrop | SpriteKit `SKShapeNode`s / `SKSpriteNode`s |
| `render/effects.js` | `ParticleSystem` ×4 (wisp, frost, burst, death), TMP pops, Cinemachine impulse | `SKEmitterNode`, `SKLabelNode` actions |
| `audio/sfx.js` | bake clips or port the tone generator via `OnAudioFilterRead`; looping noise bed with `AudioSource.volume` | `AVAudioEngine` + `AVAudioPlayerNode` |
| `platform/input.js` | `Input.GetMouseButton(0)` / new Input System `Pointer.press.isPressed` | `touchesBegan` / `touchesEnded` |
| `platform/storage.js` | `PlayerPrefs` keys `best`, `muted`, `games`, `closeCalls` | `UserDefaults` same keys |
| `platform/haptics.js` | Nice Vibrations / `Handheld.Vibrate` | `UIImpactFeedbackGenerator` light / medium / heavy |
| `main.js` | `GameController : MonoBehaviour` state machine; `Update()` → `game.Update(Time.deltaTime, holding)` | `GameScene.update(_:)` |

### Invariants to keep (all covered by `tests/melt.test.js`; port the tests too)

- `phase = temp < ICE_MAX ? ice : temp >= STEAM_MIN ? steam : water`.
- Altitude eases toward 1 for steam and 0 otherwise at `FLOAT_SPEED` per second.
- Spikes pass when altitude ≥ 0.6; beams when ≤ 0.4; glass only ice; pipe only water. Hazards apply once on overlap and never kill.
- Gap after an obstacle = `timeBudget(distance) × speed`, where distance is the worst accepted state leaving it vs the best accepted state at the next one, and `timeBudget` is `TIME_SAME / TIME_ADJACENT / TIME_OPPOSITE × difficulty(score)`.
- Hazards only in gaps ≥ `HAZARD_MIN_TIME`, placed `HAZARD_POS` into the gap, and the gap grows by `HAZARD_RECOVERY`.
- Keep the autopilot (`autopilot(game)`) and the 20-seed survival test; it is the cheapest regression check for any tuning change.

### C# sketch

```csharp
public sealed class MeltGame {
  public float Temp, Altitude, Speed, Distance; public Phase Phase; public int Score, CloseCalls; public bool Over;
  public readonly List<Obstacle> Obstacles = new();
  public event Action<PhaseChange> PhaseChanged; public event Action<Pass> Passed; public event Action<Obstacle> CloseCall, Hazard; public event Action<Death> Died; public event Action<Milestone> MilestoneReached;
  public void Reset() { … }
  public void Update(float dt, bool holding) { … }
}
```
