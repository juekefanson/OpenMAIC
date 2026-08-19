#!/usr/bin/env node
/**
 * Build script for Vercel deployment.
 * Ensures all packages are built in the correct order before next build.
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function run(cmd, cwd) {
  console.log(`[build] Running: ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
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
  // 6. @openmaic/importer (depends on dsl)
  { dir: 'packages/@openmaic/importer', cmd: 'pnpm run build' },
  // 7. @openmaic/renderer (depends on dsl, generation)
  { dir: 'packages/@openmaic/renderer', cmd: 'pnpm run build' },
  // 8. @openmaic/editor (depends on renderer)
  { dir: 'packages/@openmaic/editor', cmd: 'pnpm run build' },
];

for (const step of buildSteps) {
  const cwd = path.join(root, step.dir);
  run(step.cmd, cwd);
}

// Sync maic-importer to public/vendor
console.log('[build] Syncing maic-importer...');
run('node scripts/sync-maic-importer.mjs', root);

console.log('[build] All packages built successfully!');
