import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { FastifyInstance } from 'fastify';

const here = dirname(fileURLToPath(import.meta.url));

/** Candidate locations for the built client, most specific first. */
export function clientDirCandidates(env: NodeJS.ProcessEnv = process.env): string[] {
  const candidates: string[] = [];
  if (env.YOA_CLIENT_DIR) candidates.push(env.YOA_CLIENT_DIR);
  candidates.push(
    join(here, 'public'), // bundled release: dist/public
    join(here, '..', 'public'),
    join(here, '..', '..', 'client', 'dist') // workspace dev: server/dist -> client/dist
  );
  return candidates;
}

export function resolveClientDir(
  candidates: string[] = clientDirCandidates()
): string | undefined {
  return candidates.find((dir) => existsSync(join(dir, 'index.html')));
}

/**
 * Serve the built client from `dir` with an SPA fallback. Returns false (and
 * registers nothing) when no build is present, so demo/dev still work via Vite.
 */
export async function registerStatic(app: FastifyInstance, dir: string): Promise<boolean> {
  if (!existsSync(join(dir, 'index.html'))) return false;

  await app.register(fastifyStatic, { root: dir, wildcard: false });
  app.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api')) {
      return reply.type('text/html').sendFile('index.html');
    }
    return reply.code(404).send({ error: 'not_found' });
  });
  return true;
}
