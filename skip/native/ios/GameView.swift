// SKIP — hosts the web game in a WKWebView and wires the native bridges
// (Game Center, haptics). The game itself is unchanged web code.
import SwiftUI
import WebKit

struct GameView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> GameViewController { GameViewController() }
    func updateUIViewController(_ vc: GameViewController, context: Context) {}
}

final class GameViewController: UIViewController {
    private var webView: WKWebView!
    private let gameCenter = GameCenterBridge()
    private let haptics = HapticsBridge()

    override func viewDidLoad() {
        super.viewDidLoad()
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(gameCenter, name: "gameCenter")
        config.userContentController.add(haptics, name: "haptics")

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.10, green: 0.16, blue: 0.29, alpha: 1)
        view.addSubview(webView)

        gameCenter.webView = webView
        gameCenter.presenter = self

        // The game is bundled as a folder reference named "web" (contains index.html).
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }

    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }
}

/// Maps the web game's `haptics` messages ("light" | "medium" | "heavy") to UIKit feedback.
final class HapticsBridge: NSObject, WKScriptMessageHandler {
    private let light = UIImpactFeedbackGenerator(style: .light)
    private let medium = UIImpactFeedbackGenerator(style: .medium)
    private let heavy = UIImpactFeedbackGenerator(style: .heavy)

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.body as? String {
        case "light": light.impactOccurred()
        case "medium": medium.impactOccurred()
        case "heavy": heavy.impactOccurred()
        default: break
        }
    }
}
