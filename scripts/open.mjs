import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const target = process.argv[2];
const port = getPort();
const session = getSession();

if (!target || !["streamer", "overlay"].includes(target)) {
  console.error("Usage: node scripts/open.mjs <streamer|overlay>");
  process.exit(1);
}

const pathPart = target === "streamer"
  ? "/streamer.html"
  : `/index.html${session ? `?session=${encodeURIComponent(session)}` : ""}`;

const url = `http://localhost:${port}${pathPart}`;

if (process.platform === "win32") {
  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
} else if (process.platform === "darwin") {
  spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
} else {
  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

function getPort() {
  return Number(process.env.PORT || readDotEnvValue("PORT")) || 8000;
}

function getSession() {
  return process.env.SESSION || readDotEnvValue("SESSION") || "";
}

function readDotEnvValue(key) {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return "";
  }

  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const [entryKey, ...rest] = trimmed.split("=");
    if (entryKey.trim() === key) {
      return rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }

  return "";
}
