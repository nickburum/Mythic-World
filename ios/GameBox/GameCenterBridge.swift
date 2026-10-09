// Game Box — Game Center bridge (shared by every game; each passes its own leaderboardID).
//
// JS → native (window.webkit.messageHandlers.gameCenter.postMessage):
//   { type: "authenticate" }
//   { type: "submit", leaderboardID: String, score: Int }   // score = metres × 10
//   { type: "show",   leaderboardID: String, scope?: "global" | "friends" }
// native → JS:
//   window.GameCenterBridge.onAuth({ authenticated: Bool, alias: String })
//   window.GameCenterBridge.onSubmitted({ ok: Bool, error: String })
import Foundation
import GameKit
import WebKit

final class GameCenterBridge: NSObject, WKScriptMessageHandler, GKGameCenterControllerDelegate {
    weak var webView: WKWebView?
    weak var presenter: UIViewController?

    // MARK: WKScriptMessageHandler
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "authenticate":
            authenticate()
        case "submit":
            if let score = body["score"] as? Int, let id = body["leaderboardID"] as? String { submit(score: score, to: id) }
        case "show":
            if let id = body["leaderboardID"] as? String {
                let friends = (body["scope"] as? String) == "friends"
                showLeaderboard(id, friendsOnly: friends)
            }
        default:
            break
        }
    }

    // MARK: Game Center
    private func authenticate() {
        GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
            guard let self = self else { return }
            if let vc = viewController {
                // Game Center wants to show its sign-in UI.
                self.presenter?.present(vc, animated: true)
                return
            }
            let player = GKLocalPlayer.local
            self.call("onAuth", ["authenticated": player.isAuthenticated, "alias": player.isAuthenticated ? player.alias : ""])
            if let error = error { print("Game Center auth error: \(error.localizedDescription)") }
        }
    }

    private func submit(score: Int, to leaderboardID: String) {
        guard GKLocalPlayer.local.isAuthenticated else {
            call("onSubmitted", ["ok": false, "error": "not authenticated"]); return
        }
        GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [leaderboardID]) { [weak self] error in
            self?.call("onSubmitted", ["ok": error == nil, "error": error?.localizedDescription ?? ""])
        }
    }

    private func showLeaderboard(_ leaderboardID: String, friendsOnly: Bool = false) {
        let vc = GKGameCenterViewController(leaderboardID: leaderboardID, playerScope: friendsOnly ? .friendsOnly : .global, timeScope: .allTime)
        vc.gameCenterDelegate = self
        presenter?.present(vc, animated: true)
    }

    func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }

    // MARK: native → JS
    private func call(_ fn: String, _ payload: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: payload), let json = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript("window.GameCenterBridge && window.GameCenterBridge.\(fn)(\(json));", completionHandler: nil)
        }
    }
}
