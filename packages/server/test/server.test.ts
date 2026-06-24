import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { startServer, type RunningServer } from '../src/server.js';

let running: RunningServer | undefined;

afterEach(async () => {
  await running?.close();
  running = undefined;
});

describe('startServer', () => {
  it('serves health in demo mode', async () => {
    running = await startServer({ port: 0, demo: true });
    const response = await fetch(`${running.url}/health`);
    await expect(response.json()).resolves.toEqual({ ok: true, demo: true });
  });

  it('sends a snapshot when a websocket connects', async () => {
    running = await startServer({ port: 0, demo: true });
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
});
