import Cocoa
import WebKit
import UserNotifications

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var healthTimer: Timer?
    private var alertTimer: Timer?
    private var lastAlerts: Set<String> = []
    private let projectDir = "/Users/serba/IdeaProjects/MyHome"
    private let appURL = URL(string: "http://localhost:4173")!
    private let healthURL = URL(string: "http://localhost:4173/api/config")!
    private let alertsURL = URL(string: "http://localhost:4173/api/alerts")!

    func applicationDidFinishLaunching(_ notification: Notification) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
        startServer()
        buildWindow()
        loadWhenServerIsReady(attempt: 0)
        healthTimer = Timer.scheduledTimer(withTimeInterval: 20, repeats: true) { [weak self] _ in
            self?.checkServerHealth()
        }
        alertTimer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            self?.checkAlerts()
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return false
    }

    private func buildWindow() {
        let configuration = WKWebViewConfiguration()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
        webView = WKWebView(frame: .zero, configuration: configuration)

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1280, height: 820),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.center()
        window.title = "MyHome"
        window.contentView = webView
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func startServer() {
        let process = Process()
        process.launchPath = "/bin/zsh"
        process.arguments = ["-lc", "cd '\(projectDir)' && ./scripts/start-background.command"]
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        try? process.run()
    }

    private func checkServerHealth() {
        var request = URLRequest(url: healthURL)
        request.timeoutInterval = 3
        URLSession.shared.dataTask(with: request) { _, response, _ in
            let ok = (response as? HTTPURLResponse)?.statusCode == 200
            if !ok {
                self.startServer()
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    self.webView.load(URLRequest(url: self.appURL))
                }
            }
        }.resume()
    }

    private func loadWhenServerIsReady(attempt: Int) {
        var request = URLRequest(url: healthURL)
        request.timeoutInterval = 2
        URLSession.shared.dataTask(with: request) { _, response, _ in
            let ok = (response as? HTTPURLResponse)?.statusCode == 200
            DispatchQueue.main.async {
                if ok {
                    self.webView.load(URLRequest(url: self.appURL))
                } else if attempt < 12 {
                    self.startServer()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                        self.loadWhenServerIsReady(attempt: attempt + 1)
                    }
                } else {
                    self.webView.loadHTMLString("<html><body style='font-family:-apple-system;padding:32px'><h1>MyHome TV</h1><p>Локальный сервер запускается. Окно обновится автоматически.</p></body></html>", baseURL: nil)
                }
            }
        }.resume()
    }
    private func checkAlerts() {
        var request = URLRequest(url: alertsURL)
        request.timeoutInterval = 5
        URLSession.shared.dataTask(with: request) { [weak self] data, _, _ in
            guard let self = self,
                  let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let alerts = json["alerts"] as? [[String: Any]] else { return }

            for alert in alerts {
                guard let text = alert["text"] as? String else { continue }
                let level = alert["level"] as? String ?? "warn"
                if self.lastAlerts.contains(text) { continue }
                self.lastAlerts.insert(text)

                let content = UNMutableNotificationContent()
                content.title = "MyHome"
                content.body = text
                if level == "bad" {
                    content.sound = UNNotificationSound.defaultCritical
                } else {
                    content.sound = .default
                }

                let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
                let id = "alert-" + String(text.hash)
                UNUserNotificationCenter.current().add(
                    UNNotificationRequest(identifier: id, content: content, trigger: trigger)
                )
            }

            if alerts.isEmpty {
                self.lastAlerts.removeAll()
            }
        }.resume()
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
