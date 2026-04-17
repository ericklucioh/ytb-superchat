import fs from "node:fs";
import path from "node:path";

export function resolveRuntimeEnv() {
  const goPort = readPort(["YTB_GO_PORT", "GO_PORT"], 8080);
  const portalPort = readPort(["PORT"], 8000);
  const sessionId = readText(["YTB_SESSION_ID", "SESSION"]);
  const overlayApiBaseUrl = readText(["YTB_OVERLAY_API_BASE_URL"]) || `http://localhost:${goPort}`;
  const overlayWsUrl = readText(["YTB_OVERLAY_WS_URL"]) || deriveWebSocketUrl(overlayApiBaseUrl, goPort);

  return {
    goPort,
    portalPort,
    sessionId,
    overlayApiBaseUrl,
    overlayWsUrl
  };
}

export function renderRuntimeEnvScript() {
  const env = resolveRuntimeEnv();
  return [
    "window.__YTB_ENV__ = " + JSON.stringify(env) + ";",
    "window.__OVERLAY_API_BASE_URL__ = " + JSON.stringify(env.overlayApiBaseUrl) + ";",
    "window.__OVERLAY_WS_URL__ = " + JSON.stringify(env.overlayWsUrl) + ";",
    ""
  ].join("\n");
}

export function writeRuntimeEnvScript(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, renderRuntimeEnvScript());
}

function readText(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function readPort(keys, fallback) {
  for (const key of keys) {
    const value = Number(process.env[key]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return fallback;
}

function deriveWebSocketUrl(overlayApiBaseUrl, goPort) {
  if (!overlayApiBaseUrl) {
    return `ws://localhost:${goPort}/ws`;
  }

  try {
    const parsed = new URL(overlayApiBaseUrl);
    const protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${parsed.host}/ws`;
  } catch {
    return `ws://localhost:${goPort}/ws`;
  }
}
