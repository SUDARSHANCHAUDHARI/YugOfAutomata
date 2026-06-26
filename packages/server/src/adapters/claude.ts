import { join } from 'node:path';
import {
  contextWindowForModel,
  type AdapterObservation,
  type AutomatonState
} from '@yug-of-automata/shared';
import type { AdapterContext, SourceAdapter } from './types.js';
import { watchTranscripts } from './tail.js';

export function claudeRoot(home: string): string {
  return join(home, '.claude', 'projects');
}

const TOOL_ALIASES: Record<string, string> = {
  Bash: 'shell',
  Edit: 'edit_file',
  MultiEdit: 'edit_file',
  Write: 'write_file',
  NotebookEdit: 'edit_file',
  Read: 'read_file',
  Grep: 'rg',
  Glob: 'search',
  WebSearch: 'web_search',
  WebFetch: 'web_fetch',
  Task: 'subagent'
};

function normalizeTool(name: string): string {
  return TOOL_ALIASES[name] ?? name;
}

function detailOf(input: Record<string, unknown> | undefined): string | undefined {
  if (!input) return undefined;
  const keys = ['command', 'cmd', 'file_path', 'path', 'pattern', 'query', 'url'];
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  const firstString = Object.values(input).find((value) => typeof value === 'string');
  return typeof firstString === 'string' ? firstString : undefined;
}

function textFromContent(content: unknown): string | undefined {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return undefined;
  for (const block of content) {
    if (block && typeof block === 'object' && (block as { type?: string }).type === 'text') {
      const text = (block as { text?: string }).text;
      if (typeof text === 'string') return text;
    }
  }
  return undefined;
}

function lastToolUse(content: unknown): { name: string; input?: Record<string, unknown> } | undefined {
  if (!Array.isArray(content)) return undefined;
  let found: { name: string; input?: Record<string, unknown> } | undefined;
  for (const block of content) {
    if (block && typeof block === 'object' && (block as { type?: string }).type === 'tool_use') {
      const b = block as { name?: string; input?: Record<string, unknown> };
      if (typeof b.name === 'string') found = { name: b.name, input: b.input };
    }
  }
  return found;
}

interface ClaudeLine {
  type?: string;
  sessionId?: string;
  cwd?: string;
  gitBranch?: string;
  isSidechain?: boolean;
  uuid?: string;
  timestamp?: string;
  message?: {
    role?: string;
    model?: string;
    stop_reason?: string;
    usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      output_tokens?: number;
    };
    content?: unknown;
  };
}

export function createClaudeParser() {
  let title: string | undefined;
  let outputTotal = 0;

  return {
    parse(raw: string): AdapterObservation | undefined {
      let line: ClaudeLine;
      try {
        line = JSON.parse(raw) as ClaudeLine;
      } catch {
        return undefined;
      }

      const sessionId = line.sessionId;
      if (!sessionId) return undefined;
      const ts = line.timestamp ?? new Date().toISOString();
      const base: AdapterObservation = {
        source: 'claude',
        sessionId,
        ts,
        cwd: line.cwd,
        gitBranch: line.gitBranch
      };

      if (line.type === 'user') {
        const text = textFromContent(line.message?.content);
        if (text && !title) title = text.slice(0, 80);
        return { ...base, title, state: 'thinking' };
      }

      if (line.type !== 'assistant') return undefined;

      const message = line.message ?? {};
      const tool = lastToolUse(message.content);
      const usage = message.usage ?? {};
      const context =
        (usage.input_tokens ?? 0) +
        (usage.cache_creation_input_tokens ?? 0) +
        (usage.cache_read_input_tokens ?? 0);
      outputTotal += usage.output_tokens ?? 0;

      const state: AutomatonState = tool
        ? 'working'
        : message.stop_reason === 'end_turn'
          ? 'awaiting-input'
          : 'thinking';

      if (line.isSidechain) {
        return {
          ...base,
          model: message.model,
          worker: {
            id: line.uuid ?? `${sessionId}-worker`,
            title: tool ? normalizeTool(tool.name) : 'subagent',
            state
          }
        };
      }

      return {
        ...base,
        title,
        model: message.model,
        tool: tool ? normalizeTool(tool.name) : undefined,
        toolDetail: tool ? detailOf(tool.input) : undefined,
        state,
        tokens: {
          input: context,
          output: outputTotal,
          context,
          contextWindow: contextWindowForModel(message.model)
        }
      };
    }
  };
}

export const claudeAdapter: SourceAdapter = {
  id: 'claude',
  start(context: AdapterContext): () => void {
    const parsers = new Map<string, ReturnType<typeof createClaudeParser>>();
    return watchTranscripts({
      roots: claudeRoot(context.home),
      match: (path) => path.endsWith('.jsonl'),
      activeWindowMs: context.activeWindowMs,
      usePolling: context.usePolling,
      onLines: (path, lines) => {
        let parser = parsers.get(path);
        if (!parser) {
          parser = createClaudeParser();
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
