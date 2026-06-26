import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registerStatic, resolveClientDir } from '../src/static.js';

let dir: string;
let app: FastifyInstance;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'yoa-static-'));
  app = Fastify({ logger: false });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

describe('registerStatic', () => {
  it('serves index.html at the root when a client build exists', async () => {
    await writeFile(join(dir, 'index.html'), '<!doctype html><title>YOA</title>');
    const served = await registerStatic(app, dir);
    expect(served).toBe(true);

    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('YOA');
  });

  it('falls back to index.html for unknown client routes (SPA)', async () => {
    await writeFile(join(dir, 'index.html'), '<!doctype html><title>YOA</title>');
    await registerStatic(app, dir);

    const res = await app.inject({ method: 'GET', url: '/some/client/route' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('YOA');
  });

  it('does nothing when the directory has no build', async () => {
    const served = await registerStatic(app, join(dir, 'missing'));
    expect(served).toBe(false);
  });
});

describe('resolveClientDir', () => {
  it('returns undefined when no candidate contains index.html', () => {
    expect(resolveClientDir([join(dir, 'nope')])).toBeUndefined();
  });

  it('returns the first candidate that contains index.html', async () => {
    await writeFile(join(dir, 'index.html'), 'x');
    expect(resolveClientDir([join(dir, 'nope'), dir])).toBe(dir);
  });
});
