import type { AgentSourceId } from '@yug-of-automata/shared';

export interface CliOptions {
  demo: boolean;
  open: boolean;
  sources?: AgentSourceId[];
  port?: number;
  host?: string;
  proxy: boolean;
  proxyPort?: number;
  proxyUpstream?: string;
}

const validSources = new Set<AgentSourceId>(['codex', 'claude', 'opencode', 'koda', 'local-llm', 'demo']);

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { demo: false, open: false, proxy: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--demo') options.demo = true;
    else if (arg === '--open') options.open = true;
    else if (arg === '--proxy' || arg === 'local-proxy') options.proxy = true;
    else if (arg === '--sources') {
      const raw = argv[index + 1] ?? '';
      index += 1;
      options.sources = raw
        .split(',')
        .map((value) => value.trim())
        .filter((value): value is AgentSourceId => validSources.has(value as AgentSourceId));
    } else if (arg === '--port') {
      const value = Number(argv[index + 1]);
      index += 1;
      if (Number.isInteger(value)) options.port = value;
    } else if (arg === '--host') {
      options.host = argv[index + 1];
      index += 1;
    } else if (arg === '--proxy-port') {
      const value = Number(argv[index + 1]);
      index += 1;
      if (Number.isInteger(value)) {
        options.proxyPort = value;
        options.proxy = true;
      }
    } else if (arg === '--proxy-upstream') {
      options.proxyUpstream = argv[index + 1];
      index += 1;
      options.proxy = true;
    }
  }
  return options;
}
