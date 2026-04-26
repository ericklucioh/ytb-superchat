import fs from "node:fs";
import path from "node:path";
import { loadAppEnv } from "./app-env.mjs";

export function resolveRuntimeEnv() {
  const env = loadAppEnv();
  const goPort = readPort(env, ["YTB_GO_PORT", "GO_PORT"], 8080);
  const portalPort = readPort(env, ["PORT"], 8000);
  const sessionId = readText(env, ["YTB_SESSION_ID", "SESSION"]);
  const portalMockMode = readBool(env, ["YTB_PORTAL_MOCK", "PORTAL_MOCK"]);
  const apiToken = readText(env, ["YTB_API_TOKEN", "YTB_SHARED_SECRET"]);
  const overlayApiBaseUrl = resolveOverlayApiBaseUrl(env, goPort);
  const overlayWsUrl = readText(env, ["YTB_OVERLAY_WS_URL"]) || deriveWebSocketUrl(overlayApiBaseUrl, goPort);

  return {
    appEnv: env.YTB_APP_ENV || "development",
    goPort,
    portalPort,
    sessionId,
    portalMockMode,
    apiToken,
    overlayApiBaseUrl,
    overlayWsUrl
  };
}

export function renderRuntimeEnvScript() {
  const env = resolveRuntimeEnv();
  return [
    "window.__YTB_ENV__ = " + JSON.stringify(env) + ";",
    "window.__YTB_API_TOKEN__ = " + JSON.stringify(env.apiToken) + ";",
    "window.__OVERLAY_API_BASE_URL__ = " + JSON.stringify(env.overlayApiBaseUrl) + ";",
    "window.__OVERLAY_WS_URL__ = " + JSON.stringify(env.overlayWsUrl) + ";",
    ""
  ].join("\n");
}

export function writeRuntimeEnvScript(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, renderRuntimeEnvScript());
}

function resolveOverlayApiBaseUrl(env, goPort) {
  const explicit = readText(env, ["YTB_OVERLAY_API_BASE_URL"]);
  if (explicit) {
    return normalizeUrl(explicit);
  }

  if ((env.YTB_APP_ENV || "development") === "production") {
    throw new Error("Missing YTB_OVERLAY_API_BASE_URL in production mode");
  }

  return normalizeUrl(`http://localhost:${goPort}`);
}

function readText(env, keys) {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function readPort(env, keys, fallback) {
  for (const key of keys) {
    const value = Number(env[key]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return fallback;
}

function readBool(env, keys) {
  for (const key of keys) {
    const value = String(env[key] || "").trim().toLowerCase();
    if (!value) {
      continue;
    }

    if (["1", "true", "yes", "on"].includes(value)) {
      return true;
    }

    if (["0", "false", "no", "off"].includes(value)) {
      return false;
    }
  }

  return false;
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

function normalizeUrl(value) {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  if (!raw) {
    return "";
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)) {
    return raw;
  }

  if (raw.startsWith("//")) {
    return `${typeof window !== "undefined" && window.location ? window.location.protocol : "https:"}${raw}`;
  }

  const protocol = typeof window !== "undefined" && window.location && window.location.protocol === "http:"
    ? "http://"
    : "https://";
  return `${protocol}${raw}`;
}
