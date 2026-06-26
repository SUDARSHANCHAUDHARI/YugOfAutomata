#!/usr/bin/env node
// Bundles the CLI + server + shared workspace code into a single self-contained
// file so the published `yug-of-automata` package has no workspace:* deps, and
// copies the built client into dist/public for the server to serve.
import { build } from 'esbuild';
import { cp, rm, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cliDist = join(root, 'packages/cli/dist');
const clientDist = join(root, 'packages/client/dist');

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(join(clientDist, 'index.html')))) {
  console.error('Missing client build. Run the client build before build-release.');
  process.exit(1);
}

await rm(cliDist, { recursive: true, force: true });

await build({
  entryPoints: [join(root, 'packages/cli/src/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: join(cliDist, 'index.js'),
  // Keep runtime npm deps external (declared in the published package.json);
  // bundle only our workspace packages.
  external: ['fastify', 'ws', '@fastify/static', 'chokidar'],
  logLevel: 'info'
});

await cp(clientDist, join(cliDist, 'public'), { recursive: true });
console.log('Release bundle ready: packages/cli/dist/index.js (+ public/)');
