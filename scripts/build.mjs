import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const outDir = path.join(rootDir, 'out');

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

console.log(`Built static site in ${path.relative(rootDir, outDir)}`);
