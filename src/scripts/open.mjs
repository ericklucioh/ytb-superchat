import { spawn, spawnSync } from "node:child_process";
import { loadAppEnv } from "./app-env.mjs";

const target = process.argv[2];
const appEnv = loadAppEnv();
const port = getPort(appEnv);
const session = getSession(appEnv);

if (!target || !["site", "overlay"].includes(target)) {
  console.error("Usage: node src/scripts/open.mjs <site|overlay>");
  process.exit(1);
}

const pathPart = target === "site"
  ? "/portal"
  : `/overlay${session ? `?session=${encodeURIComponent(session)}` : ""}`;

const url = `http://localhost:${port}${pathPart}`;

if (process.platform === "win32") {
  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
} else if (process.platform === "darwin") {
  spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
} else {
  openUrlOnLinux(url);
}

function getPort(env) {
  return Number(env.PORT) || 8000;
}

function getSession(env) {
  return env.YTB_SESSION_ID || env.SESSION || "";
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
