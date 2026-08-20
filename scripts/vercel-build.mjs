#!/usr/bin/env node
/**
 * Build script for Vercel deployment.
 * Ensures all packages are built in the correct order before next build.
 *
 * IMPORTANT: Each build step cleans its dist/ before running to avoid
 * EPERM (operation not permitted) on Windows when old files are locked.
 */

import { execSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function run(cmd, cwd, envOverrides = {}) {
  console.log(`[build] Running: ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true, env: { ...process.env, ...envOverrides } });
}

function cleanDist(dir) {
  const distPath = path.join(dir, 'dist');
  try {
    rm(distPath, { recursive: true, force: true });
  } catch {
    // ignore if already gone
  }
}

console.log('[build] Building all packages...');

// Build in order of dependencies
const buildSteps = [
  // 1. mathml2omml (no dependencies on other local packages)
  { dir: 'packages/mathml2omml', cmd: 'npm run build' },
  // 2. pptxgenjs (depends on mathml2omml indirectly)
  { dir: 'packages/pptxgenjs', cmd: 'npm run build' },
  // 3. @openmaic/dsl (no external deps)
  { dir: 'packages/@openmaic/dsl', cmd: 'pnpm run build' },
  // 4. @openmaic/generation (depends on dsl)
  { dir: 'packages/@openmaic/generation', cmd: 'pnpm run build' },
  // 5. @openmaic/storage (depends on dsl)
  { dir: 'packages/@openmaic/storage', cmd: 'pnpm run build' },
  // 6. @openmaic/importer (heavy rollup bundle; needs more heap)
  {
    dir: 'packages/@openmaic/importer',
    cmd: 'pnpm run build',
    env: { NODE_OPTIONS: '--max-old-space-size=4096' },
  },
  // 7. @openmaic/renderer (depends on dsl, generation)
  { dir: 'packages/@openmaic/renderer', cmd: 'pnpm run build' },
  // 8. @openmaic/editor (depends on renderer)
  { dir: 'packages/@openmaic/editor', cmd: 'pnpm run build' },
];

for (const step of buildSteps) {
  const pkgDir = path.join(root, step.dir);
  cleanDist(pkgDir); // delete dist/ before building to avoid EPERM on Windows
  run(step.cmd, pkgDir);
}

// Sync maic-importer to public/vendor
console.log('[build] Syncing maic-importer...');
run('node scripts/sync-maic-importer.mjs', root);

console.log('[build] All packages built successfully!');
