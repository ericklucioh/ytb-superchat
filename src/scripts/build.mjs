import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeRuntimeEnvScript } from './runtime-env.mjs';

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
  '.env.development.example',
  '.env.production.example',
  '.env.local',
  '.env.development.local',
  '.env.development',
  '.env.production.local',
  '.env.production',
  '.env.test',
  '.codex',
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
  'src',
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

fs.copyFileSync(path.join(rootDir, 'src', 'landing.html'), path.join(outDir, 'index.html'));
fs.cpSync(path.join(rootDir, 'src'), path.join(outDir, 'portal'), { recursive: true, force: true });
fs.cpSync(path.join(rootDir, 'src', 'privacy'), path.join(outDir, 'privacy'), { recursive: true, force: true });
writeRuntimeEnvScript(path.join(outDir, 'portal', 'runtime-env.js'));
writeRuntimeEnvScript(path.join(outDir, 'portal', 'overlay', 'runtime-env.js'));
writeRedirectPage(path.join(outDir, 'src', 'index.html'), '/portal');

createExtensionZip(extensionDir, zipPath);
console.log(`Built static site in ${path.relative(rootDir, outDir)}`);
console.log(`Built Chrome extension zip at ${path.relative(rootDir, zipPath)}`);

function writeRedirectPage(filePath, location) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    [
      '<!DOCTYPE html>',
      '<html lang="pt-BR">',
      '<head>',
      '  <meta charset="utf-8">',
      '  <meta http-equiv="refresh" content="0; url=' + location + '">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1">',
      '  <title>Redirecionando...</title>',
      '  <script>',
      '    window.location.replace(' + JSON.stringify(location) + ');',
      '  </script>',
      '</head>',
      '<body>',
      '  <p>Redirecting to <a href="' + location + '">' + location + '</a>...</p>',
      '</body>',
      '</html>',
      ''
    ].join('\n')
  );
}

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

  const pythonCandidates = ['python3', 'python'];
  const pythonScript = [
    'import os',
    'import sys',
    'import zipfile',
    '',
    'source_dir = sys.argv[1]',
    'destination_zip = sys.argv[2]',
    '',
    'with zipfile.ZipFile(destination_zip, "w", compression=zipfile.ZIP_DEFLATED) as archive:',
    '    for root, _, files in os.walk(source_dir):',
    '        for file_name in files:',
    '            file_path = os.path.join(root, file_name)',
    '            arcname = os.path.relpath(file_path, source_dir)',
    '            archive.write(file_path, arcname)'
  ].join('\n');

  for (const python of pythonCandidates) {
    const result = spawnSync(python, ['-c', pythonScript, sourceDir, destinationZip], {
      stdio: 'inherit'
    });

    if (result.error?.code === 'ENOENT') {
      continue;
    }

    if (result.status === 0) {
      return;
    }

    throw new Error(`Failed to create Chrome extension zip with ${python}.`);
  }

  const result = spawnSync('zip', ['-r', destinationZip, '.'], {
    cwd: sourceDir,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error('Failed to create Chrome extension zip with zip or python.');
  }
}
