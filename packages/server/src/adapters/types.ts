import type { AdapterObservation, AgentSourceId } from '@yug-of-automata/shared';

export type Emit = (observation: AdapterObservation) => void;

export interface AdapterContext {
  /** Home directory root (overridable in tests). */
  home: string;
  /** Files inactive longer than this are ignored by watchers. */
  activeWindowMs: number;
  usePolling?: boolean;
  emit: Emit;
}

export interface SourceAdapter {
  id: AgentSourceId;
  /** Begin watching this source. Returns a stop function. */
  start(context: AdapterContext): () => void;
}
