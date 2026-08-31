package com.niuniu.reader;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.HttpCookie;
import java.net.URI;
import java.net.URLEncoder;
import java.net.URL;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.zip.GZIPInputStream;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 设置全屏沉浸模式，防止滑动时系统栏导致的抖动
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            // 隐藏系统栏
            controller.hide(WindowInsetsCompat.Type.systemBars());
            // 设置为 BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE，滑动时临时显示但不会改变布局
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
        
        // 防止布局随系统栏变化而调整
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
        
        // 配置 WebView
        WebView webView = getBridge().getWebView();
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        
        // 启用混合内容（允许HTTPS页面加载HTTP资源）
        WebSettings settings = webView.getSettings();
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        webView.addJavascriptInterface(new FanqieOfficialBridge(this), "NiuniuFanqie");
        webView.addJavascriptInterface(new BookSourceHttpBridge(), "NiuniuBookSource");
    }

    public static class BookSourceHttpBridge {
        private final CookieManager cookieManager = new CookieManager(null, CookiePolicy.ACCEPT_ALL);

        @JavascriptInterface
        public String getCookie(String url) {
            try {
                URI uri = cookieUri(url);
                Map<String, List<String>> headers = cookieManager.get(uri, Collections.emptyMap());
                StringBuilder value = new StringBuilder();
                for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
                    if (!"cookie".equalsIgnoreCase(entry.getKey())) continue;
                    for (String item : entry.getValue()) {
                        if (item == null || item.isEmpty()) continue;
                        if (value.length() > 0) value.append("; ");
                        value.append(item);
                    }
                }
                return value.toString();
            } catch (Exception ignored) {
                return "";
            }
        }

        @JavascriptInterface
        public boolean setCookie(String url, String value) {
            try {
                cookieManager.put(cookieUri(url), Collections.singletonMap("Set-Cookie", Collections.singletonList(value == null ? "" : value)));
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean removeCookie(String url) {
            try {
                URI uri = cookieUri(url);
                boolean removed = false;
                for (HttpCookie item : cookieManager.getCookieStore().get(uri)) {
                    removed = cookieManager.getCookieStore().remove(uri, item) || removed;
                }
                return removed;
            } catch (Exception ignored) {
                return false;
            }
        }

        private static URI cookieUri(String value) throws Exception {
            String target = value == null ? "" : value.trim();
            if (target.isEmpty()) throw new IllegalArgumentException("Cookie 地址为空");
            if (!target.matches("^[A-Za-z][A-Za-z0-9+.-]*://.*$")) target = "https://" + target;
            return new URI(target);
        }

        private static String sanitizeUrl(String value) {
            return value
                .replace("{", "%7B")
                .replace("}", "%7D")
                .replace("\"", "%22")
                .replace(" ", "%20");
        }

        @JavascriptInterface
        public String request(String requestJson) {
            HttpURLConnection connection = null;
            try {
                JSONObject options = new JSONObject(requestJson == null ? "{}" : requestJson);
                String target = options.optString("url", "").trim();
                if (target.isEmpty()) throw new IllegalArgumentException("请求地址为空");
                target = sanitizeUrl(target);
                URL url = new URL(target);
                URI uri = url.toURI();
                connection = (HttpURLConnection) url.openConnection();
                connection.setInstanceFollowRedirects(options.optBoolean("followRedirects", true));
                int timeout = Math.max(1000, options.optInt("timeout", 30000));
                connection.setConnectTimeout(timeout);
                connection.setReadTimeout(timeout);
                String method = options.optString("method", "GET").toUpperCase();
                connection.setRequestMethod(method);
                connection.setUseCaches(false);

                JSONObject requestHeaders = options.optJSONObject("headers");
                boolean hasCookieHeader = false;
                if (requestHeaders != null) {
                    for (java.util.Iterator<String> keys = requestHeaders.keys(); keys.hasNext();) {
                        String key = keys.next();
                        String value = requestHeaders.optString(key, "");
                        connection.setRequestProperty(key, value);
                        if ("cookie".equalsIgnoreCase(key)) hasCookieHeader = true;
                    }
                }
                if (!hasCookieHeader) {
                    Map<String, List<String>> cookieHeaders = cookieManager.get(uri, Collections.emptyMap());
                    for (Map.Entry<String, List<String>> entry : cookieHeaders.entrySet()) {
                        if (!entry.getValue().isEmpty()) connection.setRequestProperty(entry.getKey(), String.join("; ", entry.getValue()));
                    }
                }
                connection.setRequestProperty("Accept-Encoding", "gzip");

                if (!"GET".equals(method) && !"HEAD".equals(method) && options.has("body")) {
                    byte[] bytes = options.optString("body", "").getBytes(StandardCharsets.UTF_8);
                    connection.setDoOutput(true);
                    connection.setFixedLengthStreamingMode(bytes.length);
                    try (OutputStream output = connection.getOutputStream()) {
                        output.write(bytes);
                    }
                }

                int status = connection.getResponseCode();
                Map<String, List<String>> responseHeaders = connection.getHeaderFields();
                cookieManager.put(uri, responseHeaders);
                InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
                if (stream == null) stream = connection.getInputStream();
                if ("gzip".equalsIgnoreCase(connection.getContentEncoding())) stream = new GZIPInputStream(stream);
                byte[] bytes = readAllBytes(stream);
                Charset charset = responseCharset(connection.getContentType(), options.optString("charset", "utf-8"));

                JSONObject headers = new JSONObject();
                for (Map.Entry<String, List<String>> entry : responseHeaders.entrySet()) {
                    if (entry.getKey() != null && entry.getValue() != null) headers.put(entry.getKey(), String.join(", ", entry.getValue()));
                }
                return new JSONObject()
                    .put("status", status)
                    .put("url", connection.getURL().toString())
                    .put("headers", headers)
                    .put("body", new String(bytes, charset))
                    .toString();
            } catch (Exception error) {
                try {
                    return new JSONObject().put("error", error.getMessage() == null ? error.toString() : error.getMessage()).toString();
                } catch (Exception ignored) {
                    return "{\"error\":\"native request failed\"}";
                }
            } finally {
                if (connection != null) connection.disconnect();
            }
        }

        @JavascriptInterface
        public String md5(String value) {
            try {
                byte[] digest = MessageDigest.getInstance("MD5").digest((value == null ? "" : value).getBytes(StandardCharsets.UTF_8));
                StringBuilder output = new StringBuilder(digest.length * 2);
                for (byte item : digest) output.append(String.format("%02x", item & 0xff));
                return output.toString();
            } catch (Exception error) {
                return "";
            }
        }

        private static byte[] readAllBytes(InputStream stream) throws Exception {
            if (stream == null) return new byte[0];
            try (InputStream input = stream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                return output.toByteArray();
            }
        }

        private static Charset responseCharset(String contentType, String fallback) {
            if (contentType != null) {
                for (String part : contentType.split(";")) {
                    String value = part.trim();
                    if (value.toLowerCase().startsWith("charset=")) {
                        try { return Charset.forName(value.substring(8).trim().replace("\"", "")); } catch (Exception ignored) { }
                    }
                }
            }
            try { return Charset.forName(fallback == null || fallback.isEmpty() ? "UTF-8" : fallback); } catch (Exception ignored) { return StandardCharsets.UTF_8; }
        }
    }

    public static class FanqieOfficialBridge {
        private static final String SEARCH_URL = "https://api5-normal-sinfonlinec.fqnovel.com/reading/bookapi/search/tab/v";
        private static final String PREFS_NAME = "fanqie_official_client";
        private static final String USER_AGENT = "com.dragon.read.oversea.gp/68132 (Linux; U; Android 10; zh_CN; OnePlus11; Build/V291IR;tt-ok/3.12.13.4-tiktok)";
        private final SharedPreferences prefs;

        public FanqieOfficialBridge(Context context) {
            prefs = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            ensureClientIdentity();
        }

        @JavascriptInterface
        public String search(String keyword) {
            try {
                String query = keyword == null ? "" : keyword.trim();
                if (query.isEmpty()) {
                    return new JSONObject().put("items", new JSONArray()).toString();
                }

                JSONObject raw = requestOfficialSearch(query);
                JSONArray items = extractBooks(raw);
                return new JSONObject().put("items", items).put("raw", raw).toString();
            } catch (Exception e) {
                try {
                    return new JSONObject()
                        .put("items", new JSONArray())
                        .put("error", e.getMessage() == null ? e.toString() : e.getMessage())
                        .toString();
                } catch (Exception ignored) {
                    return "{\"items\":[],\"error\":\"native search failed\"}";
                }
            }
        }

        private JSONObject requestOfficialSearch(String query) throws Exception {
            long now = System.currentTimeMillis();
            String searchSessionId = UUID.randomUUID().toString();
            Map<String, String> params = new LinkedHashMap<>();
            params.put("ac", "wifi");
            params.put("channel", "0");
            params.put("aid", "1967");
            params.put("app_name", "novelapp");
            params.put("version_code", "68132");
            params.put("version_name", "6.8.1.32");
            params.put("manifest_version_code", "68132");
            params.put("update_version_code", "68132");
            params.put("device_platform", "android");
            params.put("device_type", "OnePlus11");
            params.put("device_brand", "OnePlus");
            params.put("device_model", "OnePlus11");
            params.put("device_id", getPref("device_id"));
            params.put("iid", getPref("install_id"));
            params.put("openudid", getPref("openudid"));
            params.put("cdid", getPref("cdid"));
            params.put("language", "zh");
            params.put("os", "android");
            params.put("os_api", "29");
            params.put("os_version", "10");
            params.put("resolution", "1080*2400");
            params.put("dpi", "480");
            params.put("_rticket", String.valueOf(now));
            params.put("ts", String.valueOf(now / 1000));
            params.put("host_abi", "arm64-v8a");
            params.put("cpu_support64", "true");
            params.put("dragon_device_type", "phone");
            params.put("rom_version", "V291IR+release-key");
            params.put("bookshelf_search_plan", "4");
            params.put("offset", "0");
            params.put("search_source_id", "");
            params.put("last_search_page_interval", "0");
            params.put("last_consume_interval", "0");
            params.put("pad_column_cover", "0");
            params.put("is_first_enter_search", "1");
            params.put("tab_type", "3");
            params.put("normal_session_id", searchSessionId);
            params.put("cold_start_session_id", getPref("cold_start_session_id"));
            params.put("charging", "0");
            params.put("screen_brightness", "100");
            params.put("battery_pct", "100");
            params.put("down_speed", "0");
            params.put("sys_dark_mode", "0");
            params.put("app_dark_mode", "0");
            params.put("font_scale", "100");
            params.put("network_type", "wifi");
            params.put("current_volume", "0");
            params.put("search_id", searchSessionId);
            params.put("client_ab_info", "");
            params.put("query", query);
            params.put("key", query);

            URL url = new URL(SEARCH_URL + "?" + encodeParams(params));
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            conn.setRequestProperty("User-Agent", USER_AGENT);
            conn.setRequestProperty("Accept", "application/json; charset=utf-8,application/x-protobuf");
            conn.setRequestProperty("Accept-Encoding", "gzip");
            conn.setRequestProperty("Cookie", buildCookieHeader());
            conn.setRequestProperty("x-ss-dp", "1967");
            conn.setRequestProperty("x-tt-token", "");
            conn.setRequestProperty("x-xs-from-web", "1");
            conn.setRequestProperty("x-reading-request", "1");
            conn.setRequestProperty("x-vc-bdturing-sdk-version", "3.7.2.cn");
            conn.setRequestProperty("sdk-version", "2");
            conn.setRequestProperty("passport-sdk-version", "50564");
            conn.setRequestProperty("x-tt-store-region", "cn-zj");
            conn.setRequestProperty("x-tt-store-region-src", "did");

            int status = conn.getResponseCode();
            String body = readBody(conn);
            if (body.trim().isEmpty()) {
                throw new IllegalStateException("官方 App 搜索返回为空，服务端需要真实 App 签名/初始化参数");
            }
            JSONObject parsed = new JSONObject(body);
            if (status < 200 || status >= 300) {
                throw new IllegalStateException("HTTP " + status + ": " + body);
            }
            JSONObject data = parsed.optJSONObject("data");
            return data != null ? data : parsed;
        }

        private JSONArray extractBooks(JSONObject raw) {
            JSONArray items = new JSONArray();
            JSONArray direct = raw.optJSONArray("search_book_data_list");
            if (direct != null) {
                for (int i = 0; i < direct.length(); i++) {
                    JSONObject book = direct.optJSONObject(i);
                    if (book != null) items.put(book);
                }
            }

            JSONArray tabs = raw.optJSONArray("search_tabs");
            if (tabs == null) return items;
            for (int i = 0; i < tabs.length(); i++) {
                JSONObject tab = tabs.optJSONObject(i);
                if (tab == null) continue;
                JSONArray data = tab.optJSONArray("data");
                if (data == null) continue;
                for (int j = 0; j < data.length(); j++) {
                    JSONObject entry = data.optJSONObject(j);
                    if (entry == null) continue;
                    JSONArray books = entry.optJSONArray("book_data");
                    if (books == null) continue;
                    for (int k = 0; k < books.length(); k++) {
                        JSONObject book = books.optJSONObject(k);
                        if (book != null) items.put(book);
                    }
                }
            }
            return items;
        }

        private void ensureClientIdentity() {
            if (prefs.contains("device_id")) return;
            prefs.edit()
                .putString("device_id", randomDigits(19))
                .putString("install_id", randomDigits(19))
                .putString("openudid", Long.toHexString(UUID.randomUUID().getMostSignificantBits()) + Long.toHexString(UUID.randomUUID().getLeastSignificantBits()))
                .putString("cdid", UUID.randomUUID().toString())
                .putString("cold_start_session_id", UUID.randomUUID().toString())
                .apply();
        }

        private String getPref(String key) {
            ensureClientIdentity();
            return prefs.getString(key, "");
        }

        private String buildCookieHeader() {
            return "install_id=" + getPref("install_id")
                + "; ttreq=1$" + getPref("install_id")
                + "; odin_tt=" + getPref("openudid");
        }

        private static String randomDigits(int length) {
            StringBuilder out = new StringBuilder(length);
            out.append((int) (Math.random() * 9) + 1);
            while (out.length() < length) {
                out.append((int) (Math.random() * 10));
            }
            return out.toString();
        }

        private static String encodeParams(Map<String, String> params) throws Exception {
            StringBuilder out = new StringBuilder();
            for (Map.Entry<String, String> entry : params.entrySet()) {
                if (out.length() > 0) out.append('&');
                out.append(URLEncoder.encode(entry.getKey(), "UTF-8"));
                out.append('=');
                out.append(URLEncoder.encode(entry.getValue(), "UTF-8"));
            }
            return out.toString();
        }

        private static String readBody(HttpURLConnection conn) throws Exception {
            InputStream stream;
            try {
                stream = conn.getInputStream();
            } catch (Exception e) {
                stream = conn.getErrorStream();
                if (stream == null) throw e;
            }
            if ("gzip".equalsIgnoreCase(conn.getContentEncoding())) {
                stream = new GZIPInputStream(stream);
            }
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                StringBuilder body = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    body.append(line);
                }
                return body.toString();
            }
        }
    }
}
