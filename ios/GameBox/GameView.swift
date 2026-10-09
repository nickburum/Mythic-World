// Game Box — hosts the web build in a WKWebView.
import SwiftUI
import WebKit
import Combine

struct GameView: UIViewControllerRepresentable {
    /// Deep links (gamebox://play/skip, challenge links) arrive here and are forwarded to the page.
    static let pendingDeepLink = PassthroughSubject<URL, Never>()
    func makeUIViewController(context: Context) -> GameViewController { GameViewController() }
    func updateUIViewController(_ vc: GameViewController, context: Context) {}
}

final class GameViewController: UIViewController, WKNavigationDelegate {
    static let scheme = "gamebox"
    static let host = "app"
    private var webView: WKWebView!
    private let gameCenter = GameCenterBridge()
    private let haptics = HapticsBridge()
    private let cloud = CloudBridge()
    private let adsBridge = AdsBridge()
    private var links = Set<AnyCancellable>()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1)

        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.setURLSchemeHandler(BundleSchemeHandler(folder: "web"), forURLScheme: Self.scheme)
        config.userContentController.add(gameCenter, name: "gameCenter")
        config.userContentController.add(haptics, name: "haptics")
        config.userContentController.add(cloud, name: "cloud")
        config.userContentController.add(adsBridge, name: "ads")
        // iOS Safari has no Vibration API; games call the `haptics` handler when present.
        config.userContentController.addUserScript(WKUserScript(source: "window.__gameBoxNative = { platform: 'ios' };", injectionTime: .atDocumentStart, forMainFrameOnly: false))

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor
        #if DEBUG
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        #endif
        view.addSubview(webView)

        gameCenter.webView = webView
        gameCenter.presenter = self
        cloud.webView = webView
        adsBridge.webView = webView
        adsBridge.presenter = self

        webView.load(URLRequest(url: URL(string: "\(Self.scheme)://\(Self.host)/index.html")!))

        GameView.pendingDeepLink.sink { [weak self] url in self?.handle(deepLink: url) }.store(in: &links)
    }

    /// gamebox://play/skip → opens that game; gamebox://skip/#c=… → challenge link.
    private func handle(deepLink url: URL) {
        var hash = ""
        if url.host == "play", let id = url.pathComponents.dropFirst().first { hash = "#play=\(id)" }
        else if let frag = url.fragment, let game = url.host { hash = "#play=\(game)&\(frag)" }
        guard !hash.isEmpty else { return }
        webView.evaluateJavaScript("location.hash = '\(hash)';", completionHandler: nil)
    }

    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }
}

/// Serves files from the bundled `web` folder with proper MIME types, so ES
/// modules, iframes and fetches behave exactly like on a web server.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    let folder: String
    init(folder: String) { self.folder = folder }

    private static let mime: [String: String] = [
        "html": "text/html", "js": "text/javascript", "mjs": "text/javascript", "css": "text/css", "json": "application/json",
        "webmanifest": "application/manifest+json", "svg": "image/svg+xml", "png": "image/png", "jpg": "image/jpeg", "webp": "image/webp",
        "ico": "image/x-icon", "woff2": "font/woff2", "woff": "font/woff", "mp3": "audio/mpeg", "wav": "audio/wav", "txt": "text/plain",
    ]

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path
        if path.hasSuffix("/") || path.isEmpty { path += "index.html" }
        let rel = (folder as NSString).appendingPathComponent(path)
        guard let fileURL = Bundle.main.resourceURL?.appendingPathComponent(rel), let data = try? Data(contentsOf: fileURL) else {
            task.didReceive(HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: nil)!)
            task.didFinish(); return
        }
        let type = Self.mime[(path as NSString).pathExtension.lowercased()] ?? "application/octet-stream"
        let headers = ["Content-Type": type, "Content-Length": String(data.count), "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*"]
        task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!)
        task.didReceive(data)
        task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

/// Maps the games' `haptics` messages ("light" | "medium" | "heavy") to UIKit feedback.
final class HapticsBridge: NSObject, WKScriptMessageHandler {
    private let light = UIImpactFeedbackGenerator(style: .light)
    private let medium = UIImpactFeedbackGenerator(style: .medium)
    private let heavy = UIImpactFeedbackGenerator(style: .heavy)
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.body as? String {
        case "light": light.impactOccurred()
        case "medium": medium.impactOccurred()
        case "heavy": heavy.impactOccurred()
        default: break
        }
    }
}
