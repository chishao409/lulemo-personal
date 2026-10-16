package com.lulemo.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.util.Iterator;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

@CapacitorPlugin(name = "NativeWebDav")
public class NativeWebDavPlugin extends Plugin {
  private final OkHttpClient client = new OkHttpClient();

  @PluginMethod
  public void request(PluginCall call) {
    String url = call.getString("url");
    String method = call.getString("method", "GET");

    if (url == null || url.trim().isEmpty()) {
      call.reject("Missing WebDAV url");
      return;
    }

    getBridge().execute(
      () -> {
        try {
          Request.Builder builder = new Request.Builder().url(url);
          JSObject headers = call.getObject("headers", new JSObject());
          Iterator<String> keys = headers.keys();
          while (keys.hasNext()) {
            String key = keys.next();
            String value = headers.optString(key, null);
            if (value != null) {
              builder.header(key, value);
            }
          }

          String data = call.getString("data", null);
          RequestBody body = data == null
            ? null
            : RequestBody.create(data, MediaType.parse(headers.optString("Content-Type", "text/plain; charset=utf-8")));
          builder.method(method, requiresRequestBody(method) ? safeBody(body) : body);

          try (Response response = client.newCall(builder.build()).execute()) {
            JSObject result = new JSObject();
            result.put("status", response.code());
            result.put("data", readBody(response.body()));

            JSObject responseHeaders = new JSObject();
            for (String name : response.headers().names()) {
              responseHeaders.put(name, response.header(name));
            }
            result.put("headers", responseHeaders);
            call.resolve(result);
          }
        } catch (Exception ex) {
          call.reject(ex.getMessage(), ex);
        }
      }
    );
  }

  private boolean requiresRequestBody(String method) {
    return "POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method) || "PATCH".equalsIgnoreCase(method);
  }

  private RequestBody safeBody(RequestBody body) {
    if (body != null) return body;
    return RequestBody.create(new byte[0], null);
  }

  private String readBody(ResponseBody body) throws IOException {
    if (body == null) return "";
    return body.string();
  }
}
