import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const extensionDir = path.join(rootDir, 'extension');
const outDir = path.join(rootDir, 'out');
const zipPath = path.join(outDir, 'chrome-extension.zip');

const excludedNames = new Set([
  '.git',
  '.github',
  '.gitignore',
  '.env',
  '.env.example',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.test',
  'package.json',
  'package-lock.json',
  'streamer.js',
  'Dockerfile',
  'docker-compose.yml',
  'scripts',
  'app',
  'public',
  'services',
  'my-next-app',
  'next.config.ts',
  'postcss.config.mjs',
  'eslint.config.mjs',
  'tsconfig.json',
  'index copy.html',
  'mock.json',
  'README.md',
  'REQUISITOS.md',
  '.next',
  'node_modules',
  'out'
]);

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
  if (excludedNames.has(entry.name)) {
    continue;
  }

  const source = path.join(rootDir, entry.name);
  const destination = path.join(outDir, entry.name);
  fs.cpSync(source, destination, { recursive: true, force: true });
}

createExtensionZip(extensionDir, zipPath);
console.log(`Built static site in ${path.relative(rootDir, outDir)}`);
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
