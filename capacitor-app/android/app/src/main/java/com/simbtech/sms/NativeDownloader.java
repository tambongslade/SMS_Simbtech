package com.simbtech.sms;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.json.JSONObject;

/**
 * The download handler the web app talks to.
 *
 * <p>The Android web view has no download manager of its own: an
 * {@code <a download>} pointing at a {@code blob:} URL — which is how every
 * export in the web app is produced — is silently ignored, and a blob URL never
 * reaches a {@link android.webkit.DownloadListener} either. So the web app
 * hands the bytes over itself: {@code src/lib/download.ts} base64-encodes the
 * blob and calls {@link #save}, and this class writes it into the shared
 * Downloads collection where the Files app and the notification shade can find
 * it.
 *
 * <p>The result is reported back to {@code window.__smsNativeDownloadResult} so
 * the page's toast reflects what actually happened.
 */
public class NativeDownloader {

    /** The name the web app looks for on `window` to detect this bridge. */
    public static final String JS_INTERFACE_NAME = "SMSNativeDownloader";

    private static final int REQUEST_WRITE_STORAGE = 8801;

    private final Activity activity;
    private final WebView webView;
    private final ExecutorService io = Executors.newSingleThreadExecutor();

    /**
     * A save parked while the storage permission dialog is up. Only pre-Android
     * 10 needs the permission, and only one download can be in flight from a
     * tap, so a single slot is enough.
     */
    private PendingSave awaitingPermission;

    private static final class PendingSave {
        final String requestId;
        final byte[] bytes;
        final String filename;
        final String mimeType;

        PendingSave(String requestId, byte[] bytes, String filename, String mimeType) {
            this.requestId = requestId;
            this.bytes = bytes;
            this.filename = filename;
            this.mimeType = mimeType;
        }
    }

    public NativeDownloader(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    /**
     * Writes a base64-encoded file to the device's Downloads folder.
     *
     * <p>Called from the web view's JavaScript thread, so the decode and the
     * write both move to a background executor.
     */
    @JavascriptInterface
    public void save(final String requestId, final String base64, final String filename, final String mimeType) {
        io.execute(new Runnable() {
            @Override
            public void run() {
                byte[] bytes;
                try {
                    bytes = Base64.decode(base64, Base64.DEFAULT);
                } catch (IllegalArgumentException err) {
                    report(requestId, false, "The file could not be read.");
                    return;
                }

                PendingSave pending = new PendingSave(requestId, bytes, sanitise(filename), resolveMimeType(filename, mimeType));

                if (needsStoragePermission()) {
                    awaitingPermission = pending;
                    activity.runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            ActivityCompat.requestPermissions(
                                    activity,
                                    new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE},
                                    REQUEST_WRITE_STORAGE);
                        }
                    });
                    return;
                }

                write(pending);
            }
        });
    }

    /**
     * Hands the parked save its answer. MainActivity forwards the permission
     * result here.
     *
     * @return true when this class handled the request code.
     */
    public boolean onRequestPermissionsResult(int requestCode, int[] grantResults) {
        if (requestCode != REQUEST_WRITE_STORAGE) return false;

        final PendingSave pending = awaitingPermission;
        awaitingPermission = null;
        if (pending == null) return true;

        final boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        io.execute(new Runnable() {
            @Override
            public void run() {
                if (granted) {
                    write(pending);
                } else {
                    // Without the permission the public Downloads folder is off
                    // limits, but the app's own external folder is not — save
                    // there and offer to open or share it right away, so the
                    // file is not simply lost.
                    writeToAppStorage(pending);
                }
            }
        });
        return true;
    }

    private boolean needsStoragePermission() {
        // Android 10 writes through MediaStore, which needs no permission at
        // all; below 23 the permission is granted at install time.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) return false;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false;
        return ContextCompat.checkSelfPermission(activity, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                != PackageManager.PERMISSION_GRANTED;
    }

    private void write(PendingSave pending) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                writeThroughMediaStore(pending);
            } else {
                writeToPublicDownloads(pending);
            }
            toast("Saved to Downloads: " + pending.filename);
            report(pending.requestId, true, "Saved to Downloads");
        } catch (Exception err) {
            report(pending.requestId, false, describe(err));
        }
    }

    /** Android 10+: the Downloads collection, no permission required. */
    private void writeThroughMediaStore(PendingSave pending) throws Exception {
        ContentValues values = new ContentValues();
        values.put(android.provider.MediaStore.Downloads.DISPLAY_NAME, pending.filename);
        values.put(android.provider.MediaStore.Downloads.MIME_TYPE, pending.mimeType);
        values.put(android.provider.MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
        // Hides the row from other apps until the bytes are all there.
        values.put(android.provider.MediaStore.Downloads.IS_PENDING, 1);

        Uri collection = android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI;
        Uri item = activity.getContentResolver().insert(collection, values);
        if (item == null) throw new IllegalStateException("Downloads folder is unavailable.");

        try {
            OutputStream out = activity.getContentResolver().openOutputStream(item);
            if (out == null) throw new IllegalStateException("Downloads folder is unavailable.");
            try {
                out.write(pending.bytes);
                out.flush();
            } finally {
                out.close();
            }

            values.clear();
            values.put(android.provider.MediaStore.Downloads.IS_PENDING, 0);
            activity.getContentResolver().update(item, values, null, null);
        } catch (Exception err) {
            activity.getContentResolver().delete(item, null, null);
            throw err;
        }
    }

    /** Android 9 and below: the real Downloads directory on external storage. */
    private void writeToPublicDownloads(PendingSave pending) throws Exception {
        File directory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (!directory.exists() && !directory.mkdirs()) {
            throw new IllegalStateException("Downloads folder is unavailable.");
        }

        File target = uniqueFile(directory, pending.filename);
        writeBytes(target, pending.bytes);

        // Otherwise the file stays invisible to the Files app until the next
        // media scan.
        Intent scan = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE, Uri.fromFile(target));
        activity.sendBroadcast(scan);
    }

    /** The fallback when the user turns the storage permission down. */
    private void writeToAppStorage(PendingSave pending) {
        try {
            File directory = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (directory == null) directory = new File(activity.getFilesDir(), "downloads");
            if (!directory.exists() && !directory.mkdirs()) {
                throw new IllegalStateException("No storage is available.");
            }

            File target = uniqueFile(directory, pending.filename);
            writeBytes(target, pending.bytes);
            report(pending.requestId, true, "Saved inside the app");
            share(target, pending.mimeType);
        } catch (Exception err) {
            report(pending.requestId, false, describe(err));
        }
    }

    /** Offers the just-saved file to whatever can open it. */
    private void share(final File file, final String mimeType) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Uri uri = FileProvider.getUriForFile(
                            activity, activity.getPackageName() + ".fileprovider", file);
                    Intent intent = new Intent(Intent.ACTION_SEND);
                    intent.setType(mimeType);
                    intent.putExtra(Intent.EXTRA_STREAM, uri);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    activity.startActivity(Intent.createChooser(intent, "Save or open " + file.getName()));
                } catch (Exception ignored) {
                    // Nothing installed can take the file — it is still on disk.
                }
            }
        });
    }

    private static void writeBytes(File target, byte[] bytes) throws Exception {
        FileOutputStream out = new FileOutputStream(target);
        try {
            out.write(bytes);
            out.flush();
        } finally {
            out.close();
        }
    }

    /** "report.pdf" -> "report (1).pdf" rather than overwriting. */
    private static File uniqueFile(File directory, String filename) {
        File candidate = new File(directory, filename);
        if (!candidate.exists()) return candidate;

        int dot = filename.lastIndexOf('.');
        String stem = dot > 0 ? filename.substring(0, dot) : filename;
        String extension = dot > 0 ? filename.substring(dot) : "";

        for (int i = 1; i < 1000; i++) {
            candidate = new File(directory, stem + " (" + i + ")" + extension);
            if (!candidate.exists()) return candidate;
        }
        return candidate;
    }

    private static String sanitise(String filename) {
        String cleaned = filename == null ? "" : filename.replaceAll("[\\\\/:*?\"<>|]+", "_").trim();
        return cleaned.isEmpty() ? "download" : cleaned;
    }

    private static String resolveMimeType(String filename, String mimeType) {
        if (mimeType != null && !mimeType.isEmpty() && !"application/octet-stream".equals(mimeType)) {
            return mimeType;
        }
        String extension = MimeTypeMap.getFileExtensionFromUrl(Uri.encode(filename));
        String guessed = extension == null
                ? null
                : MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.toLowerCase());
        return guessed == null ? "application/octet-stream" : guessed;
    }

    private static String describe(Exception err) {
        String message = err.getMessage();
        return message == null || message.isEmpty() ? "The file could not be saved." : message;
    }

    private void toast(final String message) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Toast.makeText(activity, message, Toast.LENGTH_LONG).show();
            }
        });
    }

    /** Settles the promise the web app is waiting on. */
    private void report(final String requestId, final boolean ok, final String message) {
        final String script = "window.__smsNativeDownloadResult && window.__smsNativeDownloadResult("
                + JSONObject.quote(requestId) + ", " + ok + ", " + JSONObject.quote(message == null ? "" : message) + ")";
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                webView.evaluateJavascript(script, null);
            }
        });
    }
}
