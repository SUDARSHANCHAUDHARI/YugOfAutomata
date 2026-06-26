import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { startServer, type RunningServer } from '../src/server.js';

let running: RunningServer | undefined;
let configDir: string;
let home: string;

beforeEach(async () => {
  configDir = await mkdtemp(join(tmpdir(), 'yoa-srv-cfg-'));
  home = await mkdtemp(join(tmpdir(), 'yoa-srv-home-'));
});

afterEach(async () => {
  await running?.close();
  running = undefined;
  await rm(configDir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('startServer', () => {
  it('serves health in demo mode', async () => {
    running = await startServer({ port: 0, demo: true, configDir, home });
    const response = await fetch(`${running.url}/health`);
    await expect(response.json()).resolves.toEqual({ ok: true, demo: true });
  });

  it('runs zero source adapters in demo mode (privacy)', async () => {
    running = await startServer({ port: 0, demo: true, configDir, home });
    expect(running.sources).toEqual([]);
  });

  it('activates live adapters when not in demo mode', async () => {
    running = await startServer({ port: 0, demo: false, configDir, home, sources: ['codex'] });
    expect(running.sources).toEqual(['codex']);
  });

  it('sends a snapshot when a websocket connects', async () => {
    running = await startServer({ port: 0, demo: true, configDir, home });
    const message = await new Promise<string>((resolve, reject) => {
      const socket = new WebSocket(`${running?.url.replace('http:', 'ws:')}/ws`);
      socket.on('message', (data) => {
        resolve(String(data));
        socket.close();
      });
      socket.on('error', reject);
    });

    const event = JSON.parse(message) as { type: string; automata: unknown[] };
    expect(event.type).toBe('snapshot');
    expect(event.automata.length).toBeGreaterThan(0);
  });

  it('exposes settings and persists a mapping update', async () => {
    running = await startServer({ port: 0, demo: true, configDir, home });

    const settings = await (await fetch(`${running.url}/settings`)).json();
    expect(settings.theme).toBe('dark');

    const mapping = { rules: [{ kind: 'exact', tool: 'read_file', building: 'archive' }], fallback: 'core' };
    const put = await fetch(`${running.url}/mapping`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(mapping)
    });
    await expect(put.json()).resolves.toEqual(mapping);

    const after = await (await fetch(`${running.url}/mapping`)).json();
    expect(after.rules[0].building).toBe('archive');
  });

  it('reports building stats', async () => {
    running = await startServer({ port: 0, demo: true, configDir, home });
    // Give the demo loop a tick to populate.
    await new Promise((r) => setTimeout(r, 50));
    const stats = await (await fetch(`${running.url}/building-stats`)).json();
    expect(typeof stats).toBe('object');
  });
});
