// Game Box — iCloud Key-Value Storage bridge. Scores survive deleting the app
// because they live in the player's iCloud (1 MB, no server, no sign-in UI).
// JS → { type: "getAll" } | { type: "set", key, value } | { type: "remove", key }
// native → window.CloudBridge.onSnapshot({ key: value, … })
import Foundation
import WebKit

final class CloudBridge: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?
    private let store = NSUbiquitousKeyValueStore.default

    override init() {
        super.init()
        NotificationCenter.default.addObserver(self, selector: #selector(changedExternally(_:)), name: NSUbiquitousKeyValueStore.didChangeExternallyNotification, object: store)
        store.synchronize()
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "getAll": sendSnapshot()
        case "set": if let k = body["key"] as? String, let v = body["value"] as? String { store.set(v, forKey: k); store.synchronize() }
        case "remove": if let k = body["key"] as? String { store.removeObject(forKey: k); store.synchronize() }
        default: break
        }
    }

    @objc private func changedExternally(_ n: Notification) { sendSnapshot() }

    private func sendSnapshot() {
        var dict: [String: String] = [:]
        for (k, v) in store.dictionaryRepresentation { if let s = v as? String { dict[k] = s } }
        guard let data = try? JSONSerialization.data(withJSONObject: dict), let json = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.main.async { [weak self] in self?.webView?.evaluateJavaScript("window.CloudBridge && window.CloudBridge.onSnapshot(\(json));", completionHandler: nil) }
    }
}
