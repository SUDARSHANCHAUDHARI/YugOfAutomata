import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { observationFromCompletion, startLocalProxy, type RunningProxy } from '../src/proxy.js';
import { World } from '../src/world.js';

const request = {
  model: 'llama3.1:8b',
  messages: [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'Refactor the auth module' }
  ]
};

describe('observationFromCompletion', () => {
  it('derives model, title, and token usage', () => {
    const obs = observationFromCompletion(request, {
      choices: [{ message: { role: 'assistant', content: 'Sure.' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1200, completion_tokens: 300, total_tokens: 1500 }
    }, 'sess-1');

    expect(obs?.source).toBe('local-llm');
    expect(obs?.sessionId).toBe('sess-1');
    expect(obs?.model).toBe('llama3.1:8b');
    expect(obs?.title).toBe('Refactor the auth module');
    expect(obs?.tokens?.context).toBe(1200);
    expect(obs?.tokens?.output).toBe(300);
    expect(obs?.state).toBe('awaiting-input');
  });

  it('maps a tool call to a working state with the tool name', () => {
    const obs = observationFromCompletion(request, {
      choices: [{
        message: { role: 'assistant', tool_calls: [{ function: { name: 'run_tests', arguments: '{}' } }] },
        finish_reason: 'tool_calls'
      }],
      usage: { prompt_tokens: 10, completion_tokens: 5 }
    }, 'sess-1');

    expect(obs?.state).toBe('working');
    expect(obs?.tool).toBe('run_tests');
  });

  it('returns undefined for a non-chat payload', () => {
    expect(observationFromCompletion({}, {}, 'sess-1')).toBeUndefined();
  });

  it('tolerates a missing response (e.g. streaming) using the request only', () => {
    const obs = observationFromCompletion(request, undefined, 'sess-1');
    expect(obs?.model).toBe('llama3.1:8b');
    expect(obs?.state).toBe('working');
    expect(obs?.tokens).toBeUndefined();
  });
});

describe('startLocalProxy', () => {
  let upstream: Server;
  let proxy: RunningProxy | undefined;

  afterEach(async () => {
    await proxy?.close();
    proxy = undefined;
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
  });

  it('forwards chat completions and records them into the world', async () => {
    upstream = createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        choices: [{ message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 42, completion_tokens: 7 }
      }));
    });
    const upstreamPort = await new Promise<number>((resolve) => {
      upstream.listen(0, '127.0.0.1', () => {
        const addr = upstream.address();
        resolve(typeof addr === 'object' && addr ? addr.port : 0);
      });
    });

    const world = new World();
    proxy = await startLocalProxy({ world, port: 0, upstream: `http://127.0.0.1:${upstreamPort}` });

    const res = await fetch(`http://127.0.0.1:${proxy.port}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-yoa-session': 'abc' },
      body: JSON.stringify({ model: 'llama3.1:8b', messages: [{ role: 'user', content: 'Hello' }] })
    });
    const json = await res.json();
    expect(json.usage.prompt_tokens).toBe(42); // response forwarded intact

    const automata = world.snapshot().automata;
    expect(automata).toHaveLength(1);
    expect(automata[0].source).toBe('local-llm');
    expect(automata[0].sessionId).toBe('local-abc');
    expect(automata[0].tokens.context).toBe(42);
  });
});
