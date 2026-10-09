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
    /// Google's public TEST rewarded unit. Replace with your own from AdMob before release.
    static let rewardedUnitID = "ca-app-pub-3940256099942544/1712485313"

    #if canImport(GoogleMobileAds)
    private var rewarded: GADRewardedAd?
    private var loading = false
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
        guard !loading else { return }
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
        ad.fullScreenContentDelegate = AdDismissWatcher { [weak self] in
            self?.rewarded = nil
            self?.call("onResult", "{\"rewarded\":\(earned)}")
        }
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
