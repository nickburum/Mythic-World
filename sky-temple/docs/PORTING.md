# Porting Sky Temple to Unity and Xcode

The game was written so that the **rules** are a single pure module (`src/core/stack.js`, ~200 lines) and everything else is a thin presentation layer. There are two routes to native.

## Route A — Ship the web build in a native shell (fastest, days)

The game is already a fullscreen, offline PWA with no network dependency.

### iOS (Xcode)
1. New iOS App (SwiftUI). Add a `WKWebView` that loads `index.html` from the bundle (`Bundle.main.url(forResource:withExtension:subdirectory:)`); copy the repo (minus `tools/`, `tests/`, `docs/`) into a `web/` folder reference.
2. `WKWebViewConfiguration`: `allowsInlineMediaPlayback = true`, `mediaTypesRequiringUserActionForPlayback = []` so WebAudio starts on first tap.
3. Haptics: add a `WKScriptMessageHandler` named `haptics`; in `src/platform/haptics.js` post `window.webkit.messageHandlers.haptics.postMessage('light'|'medium'|'heavy')` and map to `UIImpactFeedbackGenerator`.
4. Set `Info.plist` → `UIRequiresFullScreen`, portrait only, `UIStatusBarHidden`. Use `art/icon-1024.png` for the App Store icon asset.
5. Ads/IAP: expose a second message handler and call it from the hook points named in `docs/DESIGN.md`.

Capacitor (`npm i @capacitor/core @capacitor/ios`, `npx cap add ios`) does steps 1–3 for you and gives you plugins for haptics, share and AdMob.

### Android
Same shell with Capacitor, or a `WebView` + `JavascriptInterface`. The Vibration API already works in Chrome WebView.

## Route B — Native rewrite (best performance and store polish, weeks)

Port in this order. Each JS file names its native counterpart.

| JS module | Unity (C#) | iOS (Swift / SpriteKit or SceneKit) |
|---|---|---|
| `core/config.js` | `ScriptableObject` `GameConfig` | `struct GameConfig` |
| `core/stack.js` | plain C# class `StackGame` (no MonoBehaviour), events as `Action<DropResult>` | `final class StackGame`, events as closures or Combine publishers |
| `core/palette.js` | static `Palette` using `Color.HSVToRGB` (convert HSL→HSV or port the HSL helper) | `UIColor(hue:saturation:brightness:)` with the same conversion |
| `render/renderer.js` | real 3D: one `Cube` prefab per stone, orthographic camera at rotation (30°, 45°, 0); sky = gradient skybox or full-screen quad | SceneKit `SCNBox` nodes with an orthographic `SCNCamera`, or SpriteKit with pre-drawn isometric sprites |
| `render/effects.js` | `ParticleSystem` for sparks, `Rigidbody` on sliced pieces, `TextMeshPro` pops, Cinemachine impulse for shake | `SKEmitterNode`, `SCNPhysicsBody`, `SKLabelNode` actions |
| `audio/sfx.js` | bake the synth into short `.wav` clips (or port the tone generator to `OnAudioFilterRead`); `AudioSource.pitch` for the pentatonic ladder | `AVAudioEngine` with `AVAudioUnitSampler`, or baked clips with `AVAudioPlayer` rate |
| `platform/storage.js` | `PlayerPrefs` keys `best`, `muted`, `games` | `UserDefaults` same keys |
| `platform/haptics.js` | `Handheld.Vibrate` / Nice Vibrations | `UIImpactFeedbackGenerator` light/medium/heavy |
| `platform/input.js` | `Input.GetMouseButtonDown(0)` / new Input System `Pointer.press` | `UITapGestureRecognizer` or `touchesBegan` |
| `main.js` | `GameController : MonoBehaviour` state machine; `Update()` calls `game.Update(Time.deltaTime)` | `GameScene` with `update(_:)` |

### Porting `stack.js` verbatim

The simulation uses only arithmetic, so a line-by-line port is straightforward. Keep these invariants (all covered by `tests/stack.test.js`; port the tests too):

- Axis alternates: odd block count → X, even → Z.
- Moving stone starts at `top[axis] − dir × SLIDE_RANGE`, bounces at `±SLIDE_RANGE` around the top stone's centre, reflecting any overshoot so speed changes do not leak position.
- Cut geometry: kept piece centre = `(below + moving) / 2`, kept size = `size − |delta|`; slice centre = kept centre + `sign(delta) × size / 2`, slice size = `|delta|`.
- Perfect snaps to the stone below and may regrow by `GROW_AMOUNT` from combo `GROW_AFTER_COMBO`, never beyond `BLOCK_SIZE`.
- Miss when `size − |delta| ≤ MIN_SIZE`.

A C# sketch of the core type:

```csharp
public sealed class StackGame {
  public readonly List<Block> Blocks = new();
  public MovingBlock Moving;
  public int Score, Combo, BestCombo;
  public bool Over;
  public event Action<DropResult> Placed, Perfect, Cut, Missed;
  public event Action<Milestone> MilestoneReached;
  public void Reset() { ... }
  public void Update(float dt) { ... }
  public DropResult Drop() { ... }
}
```

### Camera (3D engines)

The 2D renderer fakes a camera with `focusY`, `anchor` and scale `K`. In Unity/SceneKit, use an orthographic camera looking down at (30°, 45°). While playing, ease the camera's Y toward `towerHeight` so the top stone sits ~44 % up the screen. On game over, ease orthographic size to fit the whole tower (`towerHeight / 2 + margin`) and look at `towerHeight / 2` — the same two targets `main.js` computes in `updateCameraTarget`.

### Art

The icon (`art/icon.svg`) and every in-game colour are generated from `palette.js`, so the native port reproduces them exactly by porting the two small functions `stoneColors(index, seedHue)` and `skyColors(height)`.
