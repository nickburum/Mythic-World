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
        startAds()
        return true
    }

    /// Google's EU/UK consent flow (UMP) runs before the SDK starts; the rewarded Continue only appears after this.
    private func startAds() {
        #if canImport(GoogleMobileAds)
        #if canImport(UserMessagingPlatform)
        let params = UMPRequestParameters()
        params.tagForUnderAgeOfConsent = false
        UMPConsentInformation.sharedInstance.requestConsentInfoUpdate(with: params) { _ in
            UMPConsentForm.loadAndPresentIfRequired(from: nil) { _ in
                if UMPConsentInformation.sharedInstance.canRequestAds { GADMobileAds.sharedInstance().start(completionHandler: nil) }
            }
        }
        #else
        GADMobileAds.sharedInstance().start(completionHandler: nil)
        #endif
        #endif
    }
    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask { .portrait }
}
