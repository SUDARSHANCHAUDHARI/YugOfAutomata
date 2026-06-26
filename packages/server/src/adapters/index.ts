import type { AgentSourceId } from '@yug-of-automata/shared';
import { claudeAdapter } from './claude.js';
import { codexAdapter } from './codex.js';
import type { SourceAdapter } from './types.js';

export type { AdapterContext, SourceAdapter, Emit } from './types.js';

/** Live source adapters supported in this release. */
export const availableAdapters: SourceAdapter[] = [claudeAdapter, codexAdapter];

/**
 * Pick the adapters to run. With no filter, all available live adapters run.
 * Requested sources that aren't supported live (demo, opencode, koda, local-llm)
 * are ignored.
 */
export function selectAdapters(sources: AgentSourceId[] | undefined): SourceAdapter[] {
  if (!sources || sources.length === 0) return availableAdapters;
  return availableAdapters.filter((adapter) => sources.includes(adapter.id));
}
