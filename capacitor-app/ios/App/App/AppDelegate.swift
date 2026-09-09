import UIKit
import WebKit
import Capacitor

/// The iPhone has no hardware back button — its equivalent is the swipe from
/// the left screen edge, which WKWebView turns off by default. Enabling it
/// gives iOS the same "go back a page" affordance the Android back button
/// provides, walking the same history stack.
///
/// This lives in AppDelegate.swift rather than its own file on purpose: the
/// Xcode project is still objectVersion 48, which predates file-system
/// synchronized groups, so a new source file would have to be registered in
/// project.pbxproj by hand — and `cap sync` never touches app sources.
/// Main.storyboard points its view controller at this class.
class MainViewController: CAPBridgeViewController {
    /// The name the web app posts download requests to. Kept in step with
    /// `src/lib/download.ts`.
    private static let downloadMessageName = "smsDownload"

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.allowsBackForwardNavigationGestures = true
        enableDownloads()
    }

    /// Gives the web app somewhere to send files it wants saved.
    ///
    /// WKWebView will not save an `<a download>` pointing at a `blob:` URL —
    /// which is how every PDF, CSV and report card export in the app is
    /// produced — so the page base64-encodes the blob and posts it here
    /// instead. The file is written into the app's Documents folder (visible in
    /// the Files app, see `UIFileSharingEnabled`) and then offered through a
    /// share sheet, which is where an iOS user expects to choose "Save to
    /// Files", AirDrop, or another app.
    private func enableDownloads() {
        webView?.configuration.userContentController.add(
            DownloadMessageHandler(controller: self),
            name: Self.downloadMessageName)
    }

    fileprivate func handleDownload(_ body: [String: Any]) {
        guard let requestId = body["requestId"] as? String else { return }

        guard let base64 = body["base64"] as? String,
              let data = Data(base64Encoded: base64) else {
            report(requestId: requestId, ok: false, message: "The file could not be read.")
            return
        }

        let filename = Self.sanitise(body["filename"] as? String ?? "download")

        do {
            let url = try write(data, named: filename)
            report(requestId: requestId, ok: true, message: "Saved to Files")
            presentShareSheet(for: url)
        } catch {
            report(requestId: requestId, ok: false, message: error.localizedDescription)
        }
    }

    /// Writes into Documents, stepping the name aside rather than overwriting.
    private func write(_ data: Data, named filename: String) throws -> URL {
        let documents = try FileManager.default.url(
            for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)

        var target = documents.appendingPathComponent(filename)
        if FileManager.default.fileExists(atPath: target.path) {
            let stem = (filename as NSString).deletingPathExtension
            let ext = (filename as NSString).pathExtension
            for index in 1..<1000 {
                let candidate = ext.isEmpty ? "\(stem) (\(index))" : "\(stem) (\(index)).\(ext)"
                target = documents.appendingPathComponent(candidate)
                if !FileManager.default.fileExists(atPath: target.path) { break }
            }
        }

        try data.write(to: target, options: .atomic)
        return target
    }

    private func presentShareSheet(for url: URL) {
        let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        // Required on iPad, where a share sheet is a popover and iOS traps if
        // it has nothing to point at.
        sheet.popoverPresentationController?.sourceView = view
        sheet.popoverPresentationController?.sourceRect = CGRect(
            x: view.bounds.midX, y: view.bounds.midY, width: 0, height: 0)
        sheet.popoverPresentationController?.permittedArrowDirections = []
        present(sheet, animated: true)
    }

    /// Settles the promise the web app is waiting on.
    private func report(requestId: String, ok: Bool, message: String) {
        let script = "window.__smsNativeDownloadResult && window.__smsNativeDownloadResult("
            + "\(Self.quote(requestId)), \(ok), \(Self.quote(message)))"
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(script, completionHandler: nil)
        }
    }

    private static func quote(_ value: String) -> String {
        let data = try? JSONSerialization.data(withJSONObject: [value], options: [])
        guard let data = data, var json = String(data: data, encoding: .utf8) else { return "\"\"" }
        json.removeFirst()  // [
        json.removeLast()   // ]
        return json
    }

    private static func sanitise(_ filename: String) -> String {
        let cleaned = filename
            .components(separatedBy: CharacterSet(charactersIn: "/\\:*?\"<>|"))
            .joined(separator: "_")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return cleaned.isEmpty ? "download" : cleaned
    }
}

/// Held separately because `WKUserContentController` retains its handlers, and
/// the view controller must not be kept alive by its own web view.
private final class DownloadMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var controller: MainViewController?

    init(controller: MainViewController) {
        self.controller = controller
    }

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any] else { return }
        controller?.handleDownload(body)
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
