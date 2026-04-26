import { spawn, spawnSync } from "node:child_process";
import { loadAppEnv } from "./app-env.mjs";

const parsed = parseArgs(process.argv.slice(2));
const target = parsed.target;
const appEnv = loadAppEnv();
const port = parsed.port || getPort(appEnv);
const session = parsed.session || getSession(appEnv);

if (!target || !["site", "overlay"].includes(target)) {
  console.error("Usage: node src/scripts/open.mjs <site|overlay> [--port <port>] [--session <id>]");
  process.exit(1);
}

const url = buildUrl(target, port, session);

if (process.platform === "win32") {
  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
} else if (process.platform === "darwin") {
  spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
} else {
  openUrlOnLinux(url);
}

function parseArgs(args) {
  const result = {
    target: "",
    port: 0,
    session: ""
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith("--") && !result.target) {
      result.target = arg;
      continue;
    }

    if (arg === "--port" && args[index + 1]) {
      result.port = Number(args[++index]) || 0;
      continue;
    }

    if (arg.startsWith("--port=")) {
      result.port = Number(arg.split("=", 2)[1]) || 0;
      continue;
    }

    if (arg === "--session" && args[index + 1]) {
      result.session = String(args[++index] || "");
      continue;
    }

    if (arg.startsWith("--session=")) {
      result.session = String(arg.split("=", 2)[1] || "");
    }
  }

  return result;
}

function buildUrl(target, port, session) {
  const pathPart = target === "site"
    ? "/portal"
    : `/overlay${session ? `?session=${encodeURIComponent(session)}` : ""}`;

  return `http://localhost:${port}${pathPart}`;
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
