import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { loadAppEnv } from "./app-env.mjs";
import { renderRuntimeEnvScript } from "./runtime-env.mjs";

const rootDir = process.cwd();
const appEnv = loadAppEnv(rootDir);
const port = getPort();
const landingFile = path.join(rootDir, "src", "landing.html");
const portalRoot = path.join(rootDir, "src");
const overlayRoot = path.join(rootDir, "src", "overlay");

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

  if (pathname === "/src" || pathname === "/src/" || pathname === "/src/index.html") {
    redirect(res, "/portal");
    return;
  }

  if (pathname === "/portal" || pathname === "/portal/") {
    serveFile(path.join(portalRoot, "index.html"), res);
    return;
  }

  if (pathname === "/portal/runtime-env.js") {
    serveRuntimeEnv(res);
    return;
  }

  if (pathname.startsWith("/portal/")) {
    const relativePath = pathname.slice("/portal/".length);
    servePortalFile(relativePath, res);
    return;
  }

  if (pathname === "/overlay" || pathname === "/overlay/") {
    serveFile(path.join(overlayRoot, "index.html"), res);
    return;
  }

  if (pathname === "/overlay/runtime-env.js") {
    serveRuntimeEnv(res);
    return;
  }

  if (pathname.startsWith("/overlay/")) {
    const relativePath = pathname.slice("/overlay/".length);
    serveOverlayFile(relativePath, res);
    return;
  }

  if (pathname === "/" || pathname === "/index.html") {
    serveFile(landingFile, res);
    return;
  }

  if (pathname === "/chrome-extension.zip") {
    const zipPath = path.join(rootDir, "out", "chrome-extension.zip");
    if (fs.existsSync(zipPath)) {
      serveFile(zipPath, res);
      return;
    }
  }

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

    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
  });
});

server.listen(port, () => {
  console.log(`Serving ${rootDir}`);
  console.log(`http://localhost:${port}/`);
  console.log(`http://localhost:${port}/portal`);
  console.log(`http://localhost:${port}/overlay`);
  console.log(`http://localhost:${port}/src/index.html`);
  console.log(`http://localhost:${port}/overlay?session=YOUR_SESSION_ID`);
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

  return Number(appEnv.PORT) || 8000;
}

function resolvePath(pathname) {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const normalized = path.normalize(relative);
  return path.join(rootDir, normalized);
}

function servePortalFile(relativePath, res) {
  const normalized = path.normalize(relativePath || "index.html");
  const filePath = path.join(portalRoot, normalized);
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      serveFile(filePath, res);
      return;
    }

    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
  });
}

function serveOverlayFile(relativePath, res) {
  const normalized = path.normalize(relativePath || "index.html");
  const filePath = path.join(overlayRoot, normalized);
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      serveFile(filePath, res);
      return;
    }

    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
  });
}

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.end();
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

function serveRuntimeEnv(res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.end(renderRuntimeEnvScript());
}
