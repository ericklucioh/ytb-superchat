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
  const pathname = decodePathname(requestUrl.pathname);

  if (pathname === null) {
    sendBadRequest(res);
    return;
  }

  if (pathname === "/src" || pathname === "/src/" || pathname === "/src/index.html") {
    redirect(res, "/portal");
    return;
  }

  if (pathname === "/privacy" || pathname === "/privacy/") {
    serveSpecificFile(path.join(portalRoot, "privacy", "index.html"), res);
    return;
  }

  if (pathname === "/portal" || pathname === "/portal/") {
    serveSpecificFile(path.join(portalRoot, "index.html"), res);
    return;
  }

  if (pathname === "/portal/runtime-env.js") {
    serveRuntimeEnv(res);
    return;
  }

  if (pathname.startsWith("/portal/")) {
    const relativePath = pathname.slice("/portal/".length);
    serveFromRoot(portalRoot, relativePath, res);
    return;
  }

  if (pathname === "/overlay" || pathname === "/overlay/") {
    serveSpecificFile(path.join(overlayRoot, "index.html"), res);
    return;
  }

  if (pathname === "/overlay/runtime-env.js") {
    serveRuntimeEnv(res);
    return;
  }

  if (pathname.startsWith("/overlay/")) {
    const relativePath = pathname.slice("/overlay/".length);
    serveFromRoot(overlayRoot, relativePath, res);
    return;
  }

  if (pathname === "/" || pathname === "/index.html") {
    serveSpecificFile(landingFile, res);
    return;
  }

  if (pathname === "/chrome-extension.zip") {
    redirect(res, "https://chromewebstore.google.com/detail/ajnmlnhekekoagppphkfpgngdnpieaka?utm_source=item-share-cb");
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not found");
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

function decodePathname(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

function serveSpecificFile(filePath, res) {
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

function serveFromRoot(root, relativePath, res) {
  const filePath = resolvePathWithinRoot(root, relativePath);
  if (!filePath) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      const indexPath = resolvePathWithinRoot(root, path.join(relativePath || "", "index.html"));
      if (!indexPath) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Not found");
        return;
      }

      serveFile(indexPath, res);
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
}

function resolvePathWithinRoot(root, relativePath = "") {
  const resolvedRoot = path.resolve(root);
  const candidate = path.resolve(root, path.normalize(relativePath || "index.html"));
  const rootPrefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;

  if (candidate !== resolvedRoot && !candidate.startsWith(rootPrefix)) {
    return null;
  }

  return candidate;
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

function sendBadRequest(res) {
  res.statusCode = 400;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Bad request");
}
