// Game Box — StoreKit 2 bridge. One non-consumable: "Go ad-free".
// JS → { type: "products" } | { type: "buy", id } | { type: "restore" }
// native → window.StoreBridge.onProducts([{ id, price }]), window.StoreBridge.onEntitlement({ adfree: Bool })
import Foundation
import StoreKit
import WebKit

final class StoreBridge: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?
    static let adFreeID = "com.mythicworld.gamebox.adfree"   // must match App Store Connect ▸ In-App Purchases
    private var updates: Task<Void, Never>?

    override init() {
        super.init()
        // Keep entitlements fresh (purchases on another device, refunds).
        updates = Task { for await result in Transaction.updates { if case .verified(let t) = result { await t.finish() }; await self.pushEntitlement() } }
        Task { await pushEntitlement() }
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "products": Task { await self.sendProducts(); await self.pushEntitlement() }   // page is ready: send both
        case "buy": if let id = body["id"] as? String { Task { await self.buy(id) } }
        case "restore": Task { try? await AppStore.sync(); await self.pushEntitlement() }
        default: break
        }
    }

    private func sendProducts() async {
        guard let products = try? await Product.products(for: [Self.adFreeID]) else { call("onProducts", "[]"); return }
        let list = products.map { ["id": $0.id, "price": $0.displayPrice] }
        if let data = try? JSONSerialization.data(withJSONObject: list), let json = String(data: data, encoding: .utf8) { call("onProducts", json) }
    }

    private func buy(_ id: String) async {
        guard let product = try? await Product.products(for: [id]).first else { await pushEntitlement(); return }
        if let result = try? await product.purchase(), case .success(let verification) = result, case .verified(let t) = verification { await t.finish() }
        await pushEntitlement()
    }

    private func pushEntitlement() async {
        var adfree = false
        for await result in Transaction.currentEntitlements { if case .verified(let t) = result, t.productID == Self.adFreeID, t.revocationDate == nil { adfree = true } }
        call("onEntitlement", "{\"adfree\":\(adfree)}")
    }

    private func call(_ fn: String, _ arg: String) {
        DispatchQueue.main.async { [weak self] in self?.webView?.evaluateJavaScript("window.StoreBridge && window.StoreBridge.\(fn)(\(arg));", completionHandler: nil) }
    }
}
