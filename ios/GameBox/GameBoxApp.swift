// Game Box — iOS shell entry point. The whole box (hub + five games) is the
// web build in `web/`, served from the bundle through a custom URL scheme and
// shown in one WKWebView. Native bridges add Game Center and haptics.
import SwiftUI
import AVFoundation
#if canImport(GoogleMobileAds)
import GoogleMobileAds
#endif
#if canImport(UserMessagingPlatform)
import UserMessagingPlatform
#endif

@main
struct GameBoxApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    var body: some Scene {
        WindowGroup {
            GameView()
                .ignoresSafeArea()
                .statusBarHidden(true)
                .persistentSystemOverlays(.hidden)
                .onOpenURL { url in GameView.pendingDeepLink.send(url) }   // gamebox:// and https universal links
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        // Ambient + mixWithOthers: launching the box never stops the player's own music or podcast.
        try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: [.mixWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        // Ads: nothing starts here. AdsBridge starts the SDK only after the player's one-time age answer (COPPA).
        return true
    }
    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask { .portrait }
}
