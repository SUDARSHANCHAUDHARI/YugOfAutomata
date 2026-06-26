import { join } from 'node:path';
import {
  contextWindowForModel,
  type AdapterObservation,
  type AutomatonState
} from '@yug-of-automata/shared';
import type { AdapterContext, SourceAdapter } from './types.js';
import { watchFiles } from './tail.js';

export function opencodeRoot(home: string, env: NodeJS.ProcessEnv = process.env): string {
  const dataHome = env.XDG_DATA_HOME && env.XDG_DATA_HOME.length > 0
    ? env.XDG_DATA_HOME
    : join(home, '.local', 'share');
  return join(dataHome, 'opencode', 'storage');
}

const TOOL_ALIASES: Record<string, string> = {
  bash: 'shell',
  edit: 'edit_file',
  write: 'write_file',
  read: 'read_file',
  grep: 'rg',
  glob: 'search',
  websearch: 'web_search',
  webfetch: 'web_fetch',
  task: 'subagent'
};

function normalizeTool(name: string): string {
  return TOOL_ALIASES[name] ?? name;
}

function detailOf(input: Record<string, unknown> | undefined): string | undefined {
  if (!input) return undefined;
  const keys = ['command', 'filePath', 'file_path', 'path', 'pattern', 'query', 'url'];
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

interface OpenCodeFile {
  // session
  id?: string;
  directory?: string;
  projectID?: string;
  parentID?: string;
  title?: string;
  // message
  sessionID?: string;
  role?: string;
  modelID?: string;
  path?: { cwd?: string };
  tokens?: { input?: number; output?: number; cache?: { read?: number; write?: number } };
  summary?: { title?: string };
  // part
  type?: string;
  tool?: string;
  state?: { status?: string; input?: Record<string, unknown> };
}

/**
 * Parse a single OpenCode storage file (session, message, or part) into a
 * normalized observation. OpenCode splits a session across many small JSON
 * files; each maps to a partial observation that the world merges by session.
 */
export function parseOpenCodeFile(raw: string): AdapterObservation | undefined {
  let file: OpenCodeFile;
  try {
    file = JSON.parse(raw) as OpenCodeFile;
  } catch {
    return undefined;
  }

  // Session file: has a project + working directory.
  if (file.directory && file.projectID && file.id) {
    if (file.parentID) {
      return {
        source: 'opencode',
        sessionId: file.parentID,
        ts: new Date().toISOString(),
        worker: { id: file.id, title: file.title }
      };
    }
    return {
      source: 'opencode',
      sessionId: file.id,
      ts: new Date().toISOString(),
      cwd: file.directory,
      title: file.title
    };
  }

  // Message file: has a role.
  if (file.role && file.sessionID) {
    const base: AdapterObservation = {
      source: 'opencode',
      sessionId: file.sessionID,
      ts: new Date().toISOString()
    };
    if (file.role === 'user') {
      return { ...base, title: file.summary?.title, state: 'thinking' };
    }
    const tokens = file.tokens ?? {};
    const context = (tokens.input ?? 0) + (tokens.cache?.read ?? 0) + (tokens.cache?.write ?? 0);
    return {
      ...base,
      cwd: file.path?.cwd,
      model: file.modelID,
      state: 'working',
      tokens: {
        input: context,
        output: tokens.output,
        context,
        contextWindow: contextWindowForModel(file.modelID)
      }
    };
  }

  // Part file: only tool parts carry activity we map to a building.
  if (file.type === 'tool' && file.sessionID && file.tool) {
    const status = file.state?.status;
    const state: AutomatonState = status === 'error' ? 'error' : 'working';
    return {
      source: 'opencode',
      sessionId: file.sessionID,
      ts: new Date().toISOString(),
      tool: normalizeTool(file.tool),
      toolDetail: detailOf(file.state?.input),
      state,
      isError: status === 'error' ? true : undefined
    };
  }

  return undefined;
}

export const opencodeAdapter: SourceAdapter = {
  id: 'opencode',
  start(context: AdapterContext): () => void {
    const root = opencodeRoot(context.home);
    return watchFiles({
      roots: [join(root, 'session'), join(root, 'message'), join(root, 'part')],
      match: (path) => path.endsWith('.json'),
      activeWindowMs: context.activeWindowMs,
      usePolling: context.usePolling,
      onFile: (_path, contents) => {
        const observation = parseOpenCodeFile(contents);
        if (observation) context.emit(observation);
      }
    });
  }
};
