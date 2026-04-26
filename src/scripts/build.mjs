import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { writeRuntimeEnvScript } from "./runtime-env.mjs";

const rootDir = process.cwd();
const outDir = path.join(rootDir, "out");
const extensionDir = path.join(rootDir, "extension");
const zipPath = path.join(outDir, "chrome-extension.zip");

const assets = [
  { source: "src/landing.html", destination: "index.html" },
  { source: "src/index.html", destination: "portal/index.html" },
  { source: "src/privacy", destination: "privacy" },
  { source: "src/site", destination: "portal/site" },
  { source: "src/overlay", destination: "portal/overlay" },
  { source: "src/overlay", destination: "overlay" },
  { source: "src/icons", destination: "icons" },
  { source: "src/streamer.css", destination: "portal/streamer.css" },
  { source: "src/logoWhite.svg", destination: "portal/logoWhite.svg" },
  { source: "src/twitch.png", destination: "portal/twitch.png" },
  { source: "src/youtube.png", destination: "portal/youtube.png" }
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const asset of assets) {
  copyAsset(path.join(rootDir, asset.source), path.join(outDir, asset.destination));
}

writeRedirectPage(path.join(outDir, "src", "index.html"), "/portal");
writeRuntimeEnvScript(path.join(outDir, "portal", "runtime-env.js"));
writeRuntimeEnvScript(path.join(outDir, "portal", "overlay", "runtime-env.js"));
writeRuntimeEnvScript(path.join(outDir, "overlay", "runtime-env.js"));

createExtensionZip(extensionDir, zipPath);

console.log(`Built static site in ${path.relative(rootDir, outDir)}`);
console.log(`Built Chrome extension zip at ${path.relative(rootDir, zipPath)}`);

function copyAsset(source, destination) {
  const stats = fs.statSync(source);
  fs.mkdirSync(path.dirname(destination), { recursive: true });

  if (stats.isDirectory()) {
    fs.cpSync(source, destination, { recursive: true, force: true });
    return;
  }

  fs.copyFileSync(source, destination);
}

function writeRedirectPage(filePath, location) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    [
      "<!DOCTYPE html>",
      '<html lang="pt-BR">',
      "<head>",
      '  <meta charset="utf-8">',
      '  <meta http-equiv="refresh" content="0; url=' + location + '">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1">',
      "  <title>Redirecionando...</title>",
      "  <script>",
      "    window.location.replace(" + JSON.stringify(location) + ");",
      "  </script>",
      "</head>",
      "<body>",
      '  <p>Redirecting to <a href="' + location + '">' + location + "</a>...</p>",
      "</body>",
      "</html>",
      ""
    ].join("\n")
  );
}

function createExtensionZip(sourceDir, destinationZip) {
  fs.rmSync(destinationZip, { force: true });

  if (process.platform === "win32") {
    const command = `Compress-Archive -Path "${path.join(sourceDir, "*")}" -DestinationPath "${destinationZip}" -Force`;
    const result = spawnSync("powershell", ["-NoProfile", "-Command", command], {
      stdio: "inherit"
    });

    if (result.status !== 0) {
      throw new Error("Failed to create Chrome extension zip with Compress-Archive.");
    }
    return;
  }

  const pythonCandidates = ["python3", "python"];
  const pythonScript = [
    "import os",
    "import sys",
    "import zipfile",
    "",
    "source_dir = sys.argv[1]",
    "destination_zip = sys.argv[2]",
    "",
    'with zipfile.ZipFile(destination_zip, "w", compression=zipfile.ZIP_DEFLATED) as archive:',
    "    for root, _, files in os.walk(source_dir):",
    "        for file_name in files:",
    "            file_path = os.path.join(root, file_name)",
    "            arcname = os.path.relpath(file_path, source_dir)",
    "            archive.write(file_path, arcname)"
  ].join("\n");

  for (const python of pythonCandidates) {
    const result = spawnSync(python, ["-c", pythonScript, sourceDir, destinationZip], {
      stdio: "inherit"
    });

    if (result.error?.code === "ENOENT") {
      continue;
    }

    if (result.status === 0) {
      return;
    }

    throw new Error(`Failed to create Chrome extension zip with ${python}.`);
  }

  const result = spawnSync("zip", ["-r", destinationZip, "."], {
    cwd: sourceDir,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error("Failed to create Chrome extension zip with zip or python.");
  }
}
