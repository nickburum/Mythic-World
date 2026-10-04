// Game Box — iOS shell entry point. The whole box (hub + five games) is the
// web build in `web/`, served from the bundle through a custom URL scheme and
// shown in one WKWebView. Native bridges add Game Center and haptics.
import SwiftUI

@main
struct GameBoxApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    var body: some Scene {
        WindowGroup {
            GameView()
                .ignoresSafeArea()
                .statusBarHidden(true)
                .persistentSystemOverlays(.hidden)
                .onOpenURL { url in GameView.pendingDeepLink.send(url) }
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask { .portrait }
}
