import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const rootDir = process.cwd();
const port = getPort();

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=utf-8"]
]);

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url || "/", "http://localhost");
  const pathname = decodeURIComponent(requestUrl.pathname);
  const filePath = resolvePath(pathname);

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      serveFile(path.join(filePath, "index.html"), res);
      return;
    }

    if (!err && stats.isFile()) {
      serveFile(filePath, res);
      return;
    }

    if (pathname === "/") {
      serveFile(path.join(rootDir, "index.html"), res);
      return;
    }

    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
  });
});

server.listen(port, () => {
  console.log(`Serving ${rootDir}`);
  console.log(`http://localhost:${port}/streamer.html`);
  console.log(`http://localhost:${port}/index.html?session=YOUR_SESSION_ID`);
});

function getPort() {
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--port" && args[index + 1]) {
      return Number(args[index + 1]) || 8000;
    }
    if (arg.startsWith("--port=")) {
      return Number(arg.split("=", 2)[1]) || 8000;
    }
  }

  return Number(process.env.PORT) || loadDotEnvPort() || 8000;
}

function loadDotEnvPort() {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) {
    return 0;
  }

  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const [key, ...rest] = trimmed.split("=");
    if (key.trim() === "PORT") {
      const value = rest.join("=").trim().replace(/^["']|["']$/g, "");
      return Number(value) || 0;
    }
  }

  return 0;
}

function resolvePath(pathname) {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const normalized = path.normalize(relative);
  return path.join(rootDir, normalized);
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", mimeTypes.get(ext) || "application/octet-stream");
    res.end(data);
  });
}
