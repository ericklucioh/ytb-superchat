import fs from "node:fs";
import path from "node:path";

export function resolveAppEnvMode() {
  const raw = String(process.env.YTB_APP_ENV || process.env.NODE_ENV || "").trim().toLowerCase();
  if (raw === "production" || raw === "prod") {
    return "production";
  }

  return "development";
}

export function loadAppEnv(cwd = process.cwd()) {
  const mode = resolveAppEnvMode();
  const files = mode === "production"
    ? [".env.production.local", ".env.production", ".env.local"]
    : [".env.development.local", ".env.development", ".env.local"];

  const env = {};

  for (const fileName of files) {
    mergeEnvFile(env, path.join(cwd, fileName));
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      env[key] = value;
    }
  }

  env.YTB_APP_ENV = mode;
  return env;
}

function mergeEnvFile(target, filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    if (!key) {
      continue;
    }

    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    target[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
