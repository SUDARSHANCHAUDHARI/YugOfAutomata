import { join } from 'node:path';
import {
  contextWindowForModel,
  type AdapterObservation,
  type AutomatonState
} from '@yug-of-automata/shared';
import type { AdapterContext, SourceAdapter } from './types.js';
import { watchTranscripts } from './tail.js';

export function codexRoot(home: string): string {
  return join(home, '.codex', 'sessions');
}

interface CodexLine {
  type?: string;
  timestamp?: string;
  payload?: Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function commandDetail(args: unknown): string | undefined {
  if (typeof args !== 'string') return undefined;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(args) as Record<string, unknown>;
  } catch {
    return args.slice(0, 80);
  }
  const cmd = parsed.cmd ?? parsed.command ?? parsed.query ?? parsed.pattern ?? parsed.path;
  if (Array.isArray(cmd)) return cmd.map((part) => String(part)).join(' ');
  return asString(cmd);
}

export function createCodexParser() {
  let sessionId: string | undefined;
  let cwd: string | undefined;
  let model: string | undefined;
  let title: string | undefined;
  let lastState: AutomatonState = 'thinking';

  const base = (ts: string): AdapterObservation | undefined => {
    if (!sessionId) return undefined;
    return { source: 'codex', sessionId, ts, cwd, model, title };
  };

  return {
    parse(raw: string): AdapterObservation | undefined {
      let line: CodexLine;
      try {
        line = JSON.parse(raw) as CodexLine;
      } catch {
        return undefined;
      }
      const payload = line.payload ?? {};
      const ts = line.timestamp ?? new Date().toISOString();

      if (line.type === 'session_meta') {
        sessionId = asString(payload.id) ?? sessionId;
        cwd = asString(payload.cwd) ?? cwd;
        return base(ts);
      }

      if (line.type === 'turn_context') {
        model = asString(payload.model) ?? model;
        cwd = asString(payload.cwd) ?? cwd;
        return base(ts);
      }

      if (line.type === 'response_item') {
        if (payload.type === 'function_call' || payload.type === 'custom_tool_call') {
          const rawName = asString(payload.name) ?? 'tool';
          const tool = rawName === 'exec_command' ? 'shell' : rawName;
          lastState = 'working';
          return { ...base(ts)!, tool, toolDetail: commandDetail(payload.arguments), state: 'working' };
        }
        if (payload.type === 'web_search_call') {
          lastState = 'working';
          return { ...base(ts)!, tool: 'web_search', state: 'working' };
        }
        if (payload.type === 'reasoning') {
          lastState = 'thinking';
          return { ...base(ts)!, state: 'thinking', tool: undefined };
        }
        return undefined;
      }

      if (line.type !== 'event_msg') return undefined;
      const kind = payload.type;

      if (kind === 'user_message') {
        const text = asString(payload.message);
        if (text && !title) title = text.slice(0, 80);
        lastState = 'thinking';
        return { ...base(ts)!, state: 'thinking' };
      }

      if (kind === 'task_started') {
        lastState = 'working';
        return { ...base(ts)!, state: 'working' };
      }

      if (kind === 'task_complete') {
        lastState = 'awaiting-input';
        return { ...base(ts)!, state: 'awaiting-input', tool: undefined };
      }

      if (kind === 'error') {
        lastState = 'error';
        return { ...base(ts)!, state: 'error', isError: true, tool: undefined };
      }

      if (kind === 'agent_message') {
        lastState = 'working';
        return { ...base(ts)!, state: 'working' };
      }

      if (kind === 'token_count') {
        const window = contextWindowForModel(model);
        const info = payload.info as Record<string, unknown> | null | undefined;
        if (info) {
          const total = info.total_token_usage as Record<string, unknown> | undefined;
          const last = info.last_token_usage as Record<string, unknown> | undefined;
          const contextWindow = asNumber(info.model_context_window) ?? window;
          const context =
            asNumber(last?.total_tokens) ?? asNumber(total?.total_tokens) ?? undefined;
          return {
            ...base(ts)!,
            state: lastState,
            tokens: {
              input: asNumber(total?.input_tokens),
              output: asNumber(total?.output_tokens),
              context,
              contextWindow
            }
          };
        }
        const limits = payload.rate_limits as Record<string, unknown> | undefined;
        const primary = limits?.primary as Record<string, unknown> | undefined;
        const pct = asNumber(primary?.used_percent);
        if (pct === undefined) return base(ts);
        return {
          ...base(ts)!,
          state: lastState,
          tokens: { context: Math.round((pct / 100) * window), contextWindow: window }
        };
      }

      return undefined;
    }
  };
}

export const codexAdapter: SourceAdapter = {
  id: 'codex',
  start(context: AdapterContext): () => void {
    const parsers = new Map<string, ReturnType<typeof createCodexParser>>();
    return watchTranscripts({
      roots: codexRoot(context.home),
      match: (path) => path.endsWith('.jsonl'),
      activeWindowMs: context.activeWindowMs,
      usePolling: context.usePolling,
      onLines: (path, lines) => {
        let parser = parsers.get(path);
        if (!parser) {
          parser = createCodexParser();
          parsers.set(path, parser);
        }
        for (const line of lines) {
          const observation = parser.parse(line);
          if (observation) context.emit(observation);
        }
      }
    });
  }
};
