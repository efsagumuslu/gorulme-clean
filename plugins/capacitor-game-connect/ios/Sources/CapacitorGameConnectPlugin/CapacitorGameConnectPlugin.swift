import Foundation
import Capacitor
import GameKit

/// Minimal Game Center bridge: signIn, submitScore, showLeaderboard.
/// JS name `CapacitorGameConnect` (same API shape the game already uses).
@objc(CapacitorGameConnectPlugin)
public class CapacitorGameConnectPlugin: CAPPlugin, CAPBridgedPlugin, GKGameCenterControllerDelegate {
    public let identifier = "CapacitorGameConnectPlugin"
    public let jsName = "CapacitorGameConnect"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showLeaderboard", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLeaderboardEntries", returnType: CAPPluginReturnPromise)
    ]

    private func playerInfo(_ player: GKLocalPlayer) -> [String: Any] {
        return [
            "player_name": player.displayName,
            "player_id": player.gamePlayerID
        ]
    }

    @objc func signIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let player = GKLocalPlayer.local
            if player.isAuthenticated {
                call.resolve(self.playerInfo(player))
                return
            }
            var finished = false
            player.authenticateHandler = { [weak self] viewController, error in
                guard let self = self else { return }
                if let vc = viewController {
                    // Game Center wants to show its login UI; the handler fires again afterwards.
                    self.bridge?.viewController?.present(vc, animated: true, completion: nil)
                    return
                }
                if finished { return }
                finished = true
                if player.isAuthenticated {
                    call.resolve(self.playerInfo(player))
                } else {
                    call.reject(error?.localizedDescription ?? "Game Center sign-in failed")
                }
            }
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard let leaderboardID = call.getString("leaderboardID") else {
            call.reject("leaderboardID is required")
            return
        }
        guard let score = call.getInt("totalScoreAmount") else {
            call.reject("totalScoreAmount is required")
            return
        }
        guard GKLocalPlayer.local.isAuthenticated else {
            call.reject("Not signed in to Game Center")
            return
        }
        GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [leaderboardID]) { error in
            if let error = error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve()
            }
        }
    }

    @objc func showLeaderboard(_ call: CAPPluginCall) {
        guard let leaderboardID = call.getString("leaderboardID") else {
            call.reject("leaderboardID is required")
            return
        }
        DispatchQueue.main.async {
            guard GKLocalPlayer.local.isAuthenticated else {
                call.reject("Not signed in to Game Center")
                return
            }
            let vc = GKGameCenterViewController(leaderboardID: leaderboardID, playerScope: .global, timeScope: .allTime)
            vc.gameCenterDelegate = self
            self.bridge?.viewController?.present(vc, animated: true, completion: nil)
            call.resolve()
        }
    }

    /// Returns the top entries (global or friends) plus the local player's own entry,
    /// so the game can draw its own leaderboard screen.
    @objc func getLeaderboardEntries(_ call: CAPPluginCall) {
        guard let leaderboardID = call.getString("leaderboardID") else {
            call.reject("leaderboardID is required")
            return
        }
        guard GKLocalPlayer.local.isAuthenticated else {
            call.reject("Not signed in to Game Center")
            return
        }
        let friendsOnly = call.getBool("friendsOnly") ?? false
        let count = max(1, min(call.getInt("count") ?? 25, 50))
        let myId = GKLocalPlayer.local.gamePlayerID
        func toDict(_ e: GKLeaderboard.Entry) -> [String: Any] {
            return [
                "rank": e.rank,
                "score": e.score,
                "name": e.player.displayName,
                "isMe": e.player.gamePlayerID == myId
            ]
        }
        GKLeaderboard.loadLeaderboards(IDs: [leaderboardID]) { boards, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            guard let board = boards?.first else {
                call.reject("Leaderboard not found")
                return
            }
            let scope: GKLeaderboard.PlayerScope = friendsOnly ? .friendsOnly : .global
            board.loadEntries(for: scope, timeScope: .allTime, range: NSRange(location: 1, length: count)) { local, entries, total, error in
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }
                var result: [String: Any] = [
                    "entries": (entries ?? []).map { toDict($0) },
                    "total": total
                ]
                if let me = local {
                    result["me"] = toDict(me)
                }
                call.resolve(result)
            }
        }
    }

    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true, completion: nil)
    }
}
