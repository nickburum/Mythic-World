// Game Box — rewarded ads ("Continue by watching an ad"). Google Mobile Ads
// via Swift Package Manager; compile-gated so the project builds without it.
// JS → { type: "load" } | { type: "show" }
// native → window.AdsBridge.onReady(Bool), window.AdsBridge.onResult({ rewarded: Bool })
import Foundation
import WebKit
#if canImport(GoogleMobileAds)
import GoogleMobileAds
#endif

final class AdsBridge: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?
    weak var presenter: UIViewController?
    /// Debug builds use Google's public TEST rewarded unit; release builds read `GADRewardedUnitID`
    /// from Info.plist (set it in ios/project.yml from your AdMob console). Never ship the test unit.
    static var rewardedUnitID: String {
        #if DEBUG
        return "ca-app-pub-3940256099942544/1712485313"
        #else
        return (Bundle.main.object(forInfoDictionaryKey: "GADRewardedUnitID") as? String) ?? ""
        #endif
    }

    #if canImport(GoogleMobileAds)
    private var rewarded: GADRewardedAd?
    private var loading = false
    private var watcher: AdDismissWatcher?      // fullScreenContentDelegate is weak: we must own it
    #endif

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "load": load()
        case "show": show()
        default: break
        }
    }

    private func load() {
        #if canImport(GoogleMobileAds)
        guard !loading, !Self.rewardedUnitID.isEmpty else { if Self.rewardedUnitID.isEmpty { call("onReady", "false") }; return }
        loading = true
        GADRewardedAd.load(withAdUnitID: Self.rewardedUnitID, request: GADRequest()) { [weak self] ad, error in
            guard let self = self else { return }
            self.loading = false
            self.rewarded = ad
            if let error = error { print("Rewarded ad failed to load: \(error.localizedDescription)") }
            self.call("onReady", ad != nil ? "true" : "false")
        }
        #else
        call("onReady", "false")
        #endif
    }

    private func show() {
        #if canImport(GoogleMobileAds)
        guard let ad = rewarded, let vc = presenter else { call("onResult", "{\"rewarded\":false}"); return }
        var earned = false
        watcher = AdDismissWatcher { [weak self] in
            guard let self = self else { return }
            self.rewarded = nil; self.watcher = nil
            self.call("onResult", "{\"rewarded\":\(earned)}")
            self.load()                                   // pre-load the next one
        }
        ad.fullScreenContentDelegate = watcher
        ad.present(fromRootViewController: vc) { earned = true }
        #else
        call("onResult", "{\"rewarded\":false}")
        #endif
    }

    private func call(_ fn: String, _ arg: String) {
        DispatchQueue.main.async { [weak self] in self?.webView?.evaluateJavaScript("window.AdsBridge && window.AdsBridge.\(fn)(\(arg));", completionHandler: nil) }
    }
}

#if canImport(GoogleMobileAds)
/// Small delegate object so the bridge hears when the full-screen ad closes.
final class AdDismissWatcher: NSObject, GADFullScreenContentDelegate {
    private let onDismiss: () -> Void
    init(onDismiss: @escaping () -> Void) { self.onDismiss = onDismiss }
    func adDidDismissFullScreenContent(_ ad: GADFullScreenPresentingAd) { onDismiss() }
    func ad(_ ad: GADFullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) { onDismiss() }
}
#endif
