import { createServer, type IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
import {
  contextWindowForModel,
  type AdapterObservation,
  type AutomatonState
} from '@yug-of-automata/shared';
import type { World } from './world.js';

interface ChatMessage {
  role?: string;
  content?: unknown;
  tool_calls?: { function?: { name?: string; arguments?: string } }[];
}

interface ChatRequest {
  model?: string;
  messages?: ChatMessage[];
  stream?: boolean;
}

interface ChatResponse {
  choices?: { message?: ChatMessage; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

function userTitle(messages: ChatMessage[] | undefined): string | undefined {
  if (!messages) return undefined;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role === 'user' && typeof message.content === 'string' && message.content.length > 0) {
      return message.content.slice(0, 80);
    }
  }
  return undefined;
}

/**
 * Build a normalized observation from an OpenAI-compatible chat completion
 * request (and response when available). With no response — e.g. a streamed
 * call — the request alone yields a "working" observation without tokens.
 */
export function observationFromCompletion(
  request: ChatRequest,
  response: ChatResponse | undefined,
  sessionId: string
): AdapterObservation | undefined {
  if (!request || !Array.isArray(request.messages)) return undefined;

  const model = request.model;
  const title = userTitle(request.messages);
  const choice = response?.choices?.[0];
  const toolCall = choice?.message?.tool_calls?.[0]?.function?.name;

  let state: AutomatonState = 'working';
  if (toolCall) state = 'working';
  else if (choice?.finish_reason === 'stop') state = 'awaiting-input';

  const observation: AdapterObservation = {
    source: 'local-llm',
    sessionId,
    ts: new Date().toISOString(),
    model,
    title,
    state,
    tool: toolCall
  };

  const usage = response?.usage;
  if (usage) {
    observation.tokens = {
      input: usage.prompt_tokens,
      output: usage.completion_tokens,
      context: usage.prompt_tokens,
      contextWindow: contextWindowForModel(model)
    };
  }

  return observation;
}

function parseJson(buffer: Buffer): Record<string, unknown> {
  try {
    return JSON.parse(buffer.toString('utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function sessionFor(req: IncomingMessage): string {
  const header = req.headers['x-yoa-session'];
  if (typeof header === 'string' && header.length > 0) return `local-${header}`;
  return 'local-llm';
}

export interface LocalProxyOptions {
  world: World;
  port: number;
  host?: string;
  upstream: string;
}

export interface RunningProxy {
  port: number;
  upstream: string;
  close: () => Promise<void>;
}

/**
 * An OpenAI-compatible logging proxy. Forwards every request to `upstream`
 * unchanged and, for chat completions, records activity into the world as a
 * `local-llm` source. Non-JSON (streamed) responses are piped through; their
 * request still produces a lightweight observation.
 */
export async function startLocalProxy(options: LocalProxyOptions): Promise<RunningProxy> {
  const host = options.host ?? '127.0.0.1';
  const upstream = options.upstream.replace(/\/$/, '');

  const server = createServer((req, res) => {
    void (async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = Buffer.concat(chunks);

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined || key === 'host' || key === 'content-length') continue;
        headers.set(key, Array.isArray(value) ? value.join(',') : value);
      }

      let upstreamRes: Response;
      try {
        upstreamRes = await fetch(`${upstream}${req.url ?? ''}`, {
          method: req.method,
          headers,
          body: body.length > 0 ? body : undefined
        });
      } catch {
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'upstream_unreachable' }));
        return;
      }

      const isChat = req.method === 'POST' && (req.url ?? '').includes('/chat/completions');
      const contentType = upstreamRes.headers.get('content-type') ?? '';
      const outHeaders: Record<string, string> = {};
      upstreamRes.headers.forEach((value, key) => {
        if (key !== 'content-encoding' && key !== 'content-length') outHeaders[key] = value;
      });

      if (isChat && contentType.includes('application/json')) {
        const respBuf = Buffer.from(await upstreamRes.arrayBuffer());
        res.writeHead(upstreamRes.status, outHeaders);
        res.end(respBuf);
        const obs = observationFromCompletion(parseJson(body), parseJson(respBuf), sessionFor(req));
        if (obs) options.world.applyObservation(obs);
        return;
      }

      // Stream/other: pipe through, but still log the request for chat calls.
      if (isChat) {
        const obs = observationFromCompletion(parseJson(body), undefined, sessionFor(req));
        if (obs) options.world.applyObservation(obs);
      }
      res.writeHead(upstreamRes.status, outHeaders);
      if (upstreamRes.body) {
        Readable.fromWeb(upstreamRes.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
      } else {
        res.end();
      }
    })();
  });

  await new Promise<void>((resolve) => server.listen(options.port, host, resolve));
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : options.port;

  return {
    port: actualPort,
    upstream,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  };
}
