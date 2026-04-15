import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const target = process.argv[2];
const port = getPort();
const session = getSession();

if (!target || !["site", "overlay"].includes(target)) {
  console.error("Usage: node src/scripts/open.mjs <site|overlay>");
  process.exit(1);
}

const pathPart = target === "site"
  ? "/portal"
  : `/extension/index.html${session ? `?session=${encodeURIComponent(session)}` : ""}`;

const url = `http://localhost:${port}${pathPart}`;

if (process.platform === "win32") {
  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
} else if (process.platform === "darwin") {
  spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
} else {
  openUrlOnLinux(url);
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

function openUrlOnLinux(url) {
  const commands = [
    ["xdg-open", [url]],
    ["gio", ["open", url]],
    ["gnome-open", [url]],
    ["kde-open", [url]]
  ];

  for (const [command, args] of commands) {
    const result = spawnSync(command, args, { stdio: "ignore", detached: true });
    if (!result.error) {
      return;
    }
  }

  console.error(`Could not open the browser automatically. Open this URL manually: ${url}`);
}
