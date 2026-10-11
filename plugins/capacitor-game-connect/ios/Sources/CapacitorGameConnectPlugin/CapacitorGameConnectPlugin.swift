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
        CAPPluginMethod(name: "showLeaderboard", returnType: CAPPluginReturnPromise)
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

    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true, completion: nil)
    }
}
