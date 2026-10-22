package com.simbtech.sms;

import android.app.DownloadManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private NativeDownloader downloader;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // So the channel is listed under Settings > Notifications from first
        // launch, rather than only appearing after the first push arrives.
        // NotificationServiceExtension creates it too — see NotificationChannels.
        NotificationChannels.ensureCreated(this);
        insetContentFromSystemBars();
        enableDownloads();
    }

    /**
     * Teaches the web view how to download, which it cannot do on its own.
     *
     * <p>Two routes, because there are two kinds of download in the app:
     *
     * <ul>
     *   <li>Files the page builds in JavaScript and saves through an
     *       {@code <a download>} on a {@code blob:} URL — every PDF, CSV and
     *       report card export. The web view ignores the download attribute and
     *       never reports blob URLs to a {@link DownloadListener}, so the page
     *       hands the bytes to {@link NativeDownloader} instead
     *       (see {@code src/lib/download.ts}).</li>
     *   <li>Plain http(s) links to a file, which do reach the download
     *       listener but are dropped unless something handles them — those go
     *       to the system {@link DownloadManager}.</li>
     * </ul>
     */
    private void enableDownloads() {
        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        downloader = new NativeDownloader(this, webView);
        webView.addJavascriptInterface(downloader, NativeDownloader.JS_INTERFACE_NAME);

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                        String mimeType, long contentLength) {
                downloadThroughSystem(url, userAgent, contentDisposition, mimeType);
            }
        });
    }

    private void downloadThroughSystem(String url, String userAgent, String contentDisposition, String mimeType) {
        if (!URLUtil.isNetworkUrl(url)) {
            // blob: and data: URLs cannot be fetched by the download manager;
            // the page saves those through NativeDownloader.
            Toast.makeText(this, "This file could not be downloaded.", Toast.LENGTH_LONG).show();
            return;
        }

        try {
            String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);

            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setMimeType(mimeType);
            request.addRequestHeader("User-Agent", userAgent);
            // The session lives in the web view's cookie jar, so an
            // authenticated file link 404s without this.
            String cookies = CookieManager.getInstance().getCookie(url);
            if (cookies != null) request.addRequestHeader("Cookie", cookies);
            request.setDescription(filename);
            request.setTitle(filename);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);

            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            if (manager == null) throw new IllegalStateException();
            manager.enqueue(request);

            Toast.makeText(this, "Downloading " + filename, Toast.LENGTH_SHORT).show();
        } catch (Exception err) {
            Toast.makeText(this, "This file could not be downloaded.", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        // Pre-Android 10 downloads need the storage permission; everything else
        // belongs to Capacitor's plugins.
        if (downloader != null && downloader.onRequestPermissionsResult(requestCode, grantResults)) return;
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    /**
     * Keeps the web view clear of the status bar, the navigation bar, any
     * display cutout, and the on-screen keyboard.
     *
     * <p>Android 16 (API 36) lays every app out edge to edge and no longer
     * reserves room for the system bars, so from the moment this app targets 36
     * the web view fills the whole screen and its header would sit underneath
     * the clock and battery icons. Capacitor 6 does nothing about window
     * insets, so the app has to.
     *
     * <p>Padding the content view rather than letting the page draw behind the
     * bars reproduces the pre-Android-16 layout, so the web app needs no
     * changes. The padded strips show through to the content view's own
     * background, hence the explicit colour.
     */
    private void insetContentFromSystemBars() {
        View content = findViewById(android.R.id.content);
        content.setBackgroundResource(R.color.systemBarBackdrop);

        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars()
                            | WindowInsetsCompat.Type.displayCutout());
            // adjustResize no longer moves the window for apps targeting 35+,
            // so the keyboard has to be treated as another inset. It overlaps
            // the navigation bar rather than stacking on top of it.
            Insets keyboard = windowInsets.getInsets(WindowInsetsCompat.Type.ime());

            view.setPadding(
                    bars.left,
                    bars.top,
                    bars.right,
                    Math.max(bars.bottom, keyboard.bottom));

            return WindowInsetsCompat.CONSUMED;
        });
    }
}
