// SKIP — iOS shell entry point.
// Drop the `native/ios` sources into a new SwiftUI iOS App target, add the
// repo's `skip/` folder (minus tools/tests/docs/native) as a folder reference
// named `web`, enable the Game Center capability, and run. See docs/GAMECENTER.md.
import SwiftUI

@main
struct SkipApp: App {
    var body: some Scene {
        WindowGroup {
            GameView()
                .ignoresSafeArea()
                .statusBarHidden(true)
                .persistentSystemOverlays(.hidden)
        }
    }
}
