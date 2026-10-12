// Game Box — rewarded ads ("Continue by watching an ad"). Google Mobile Ads
// via Swift Package Manager; compile-gated so the project builds without it.
// JS → { type: "load" } | { type: "show" }
// native → window.AdsBridge.onReady(Bool), window.AdsBridge.onResult({ rewarded: Bool })
import Foundation
import WebKit
#if canImport(GoogleMobileAds)
import GoogleMobileAds
#endif
#if canImport(UserMessagingPlatform)
import UserMessagingPlatform
#endif

final class AdsBridge: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?
    weak var presenter: UIViewController?
    /// Set from the page's one-time age question. Nothing ad-related runs before it is answered.
    private var childDirected = true
    private var underAgeOfConsent = true
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
    private var started = false
    private var consentChecked = false
    #endif

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "load":
            childDirected = body["childDirected"] as? Bool ?? true          // unknown → safest
            underAgeOfConsent = body["underAgeOfConsent"] as? Bool ?? true
            load()
        case "show": show()
        case "privacyOptions": presentPrivacyOptions()
        default: break
        }
    }

    /// COPPA / GDPR-K: configure the SDK for the player's age band and run Google's consent flow
    /// (skipped for children). `then` runs only when ads may be requested; the consent check runs on
    /// every load, so an unfinished or declined form never lets a request through later.
    private func ensureConsent(_ then: @escaping () -> Void) {
        #if canImport(GoogleMobileAds)
        let cfg = GADMobileAds.sharedInstance().requestConfiguration
        cfg.tagForChildDirectedTreatment = NSNumber(value: childDirected)
        cfg.tagForUnderAgeOfConsent = NSNumber(value: underAgeOfConsent)
        cfg.maxAdContentRating = childDirected ? .general : .parentalGuidance
        let startSDK = { [weak self] in
            guard let self = self else { return }
            if self.started { then(); return }
            self.started = true
            GADMobileAds.sharedInstance().start { _ in then() }
        }
        #if canImport(UserMessagingPlatform)
        if !childDirected {
            let info = UMPConsentInformation.sharedInstance
            let params = UMPRequestParameters()
            params.tagForUnderAgeOfConsent = underAgeOfConsent
            info.requestConsentInfoUpdate(with: params) { [weak self] _ in
                UMPConsentForm.loadAndPresentIfRequired(from: nil) { _ in
                    // tell the page whether a "Privacy choices" entry is required (EEA/UK)
                    self?.call("onPrivacy", info.privacyOptionsRequirementStatus == .required ? "true" : "false")
                    guard info.canRequestAds else { self?.consentChecked = false; self?.call("onReady", "false"); return }
                    startSDK()
                }
            }
            return
        }
        #endif
        startSDK()
        #endif
    }

    /// Settings ▸ Privacy choices: lets EEA/UK players change their ad consent at any time.
    private func presentPrivacyOptions() {
        #if canImport(UserMessagingPlatform)
        guard let vc = presenter else { return }
        UMPConsentForm.presentPrivacyOptionsForm(from: vc) { [weak self] _ in self?.load() }
        #endif
    }

    private func load() {
        #if canImport(GoogleMobileAds)
        if !consentChecked { consentChecked = true; ensureConsent { [weak self] in self?.consentChecked = false; self?.requestAd() }; return }
        #else
        call("onReady", "false")
        #endif
    }

    private func requestAd() {
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
