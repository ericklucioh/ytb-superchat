import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const extensionDir = path.join(rootDir, 'extension');
const outDir = path.join(rootDir, 'out');
const zipPath = path.join(outDir, 'chrome-extension.zip');

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

createExtensionZip(extensionDir, zipPath);
console.log(`Built Chrome extension zip at ${path.relative(rootDir, zipPath)}`);

function createExtensionZip(sourceDir, destinationZip) {
  fs.rmSync(destinationZip, { force: true });

  if (process.platform === 'win32') {
    const command = `Compress-Archive -Path "${path.join(sourceDir, '*')}" -DestinationPath "${destinationZip}" -Force`;
    const result = spawnSync('powershell', ['-NoProfile', '-Command', command], {
      stdio: 'inherit'
    });

    if (result.status !== 0) {
      throw new Error('Failed to create Chrome extension zip with Compress-Archive.');
    }
    return;
  }

  const result = spawnSync('zip', ['-r', destinationZip, '.'], {
    cwd: sourceDir,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error('Failed to create Chrome extension zip with zip.');
  }
}
