export const SERVER_PORT = 8123;
export const WS_PATH = '/ws';

export type AgentSourceId = 'codex' | 'claude' | 'opencode' | 'local-llm' | 'demo';

export type AutomatonState =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'awaiting-input'
  | 'returning'
  | 'error'
  | 'recovering';

export type BuildingId =
  | 'core'
  | 'forge'
  | 'archive'
  | 'mine'
  | 'observatory'
  | 'guildhall'
  | 'caravan'
  | 'workshop'
  | 'barracks'
  | 'shrine'
  | 'infirmary'
  | 'storehouse';

export const BUILDING_IDS: BuildingId[] = [
  'core',
  'forge',
  'archive',
  'mine',
  'observatory',
  'guildhall',
  'caravan',
  'workshop',
  'barracks',
  'shrine',
  'infirmary',
  'storehouse'
];

export const RECENT_ACTIONS_CAP = 8;

export interface ActionEntry {
  tool: string;
  detail?: string;
  building: BuildingId;
  ts: string;
}

export interface TokenUsage {
  input: number;
  output: number;
  context?: number;
  contextWindow?: number;
}

export interface AutomatonSnapshot {
  sessionId: string;
  source: AgentSourceId;
  title: string;
  cityId: string;
  cityName: string;
  workingDir?: string;
  model?: string;
  state: AutomatonState;
  currentTool?: string;
  toolDetail?: string;
  currentBuilding: BuildingId;
  tokens: TokenUsage;
  recentActions: ActionEntry[];
  startedAt: string;
  lastActivityAt: string;
}

export interface WorkerSnapshot {
  workerId: string;
  parentSessionId: string;
  title: string;
  state: AutomatonState;
  currentBuilding: BuildingId;
}

export interface CitySnapshot {
  cityId: string;
  name: string;
  workingDir?: string;
  activeAutomata: number;
}

export interface WorldSnapshot {
  automata: AutomatonSnapshot[];
  workers: WorkerSnapshot[];
  cities: CitySnapshot[];
  updatedAt: string;
}

export type WorldEvent =
  | ({ type: 'snapshot' } & WorldSnapshot)
  | { type: 'automaton-updated'; automaton: AutomatonSnapshot }
  | { type: 'automaton-removed'; sessionId: string }
  | { type: 'worker-updated'; worker: WorkerSnapshot }
  | { type: 'worker-removed'; workerId: string }
  | { type: 'city-updated'; city: CitySnapshot };

export type MappingRule =
  | { kind: 'exact'; tool: string; building: BuildingId }
  | { kind: 'prefix'; prefix: string; building: BuildingId }
  | { kind: 'detail'; tool: string; pattern: string; building: BuildingId };

export interface BuildingMapping {
  rules: MappingRule[];
  fallback: BuildingId;
}

export const DEFAULT_BUILDING_MAPPING: BuildingMapping = {
  rules: [
    { kind: 'detail', tool: 'shell', pattern: '\\bgit\\s+(commit|push|pull|merge|rebase|tag)\\b', building: 'caravan' },
    { kind: 'prefix', prefix: 'mcp__', building: 'guildhall' },
    { kind: 'exact', tool: 'apply_patch', building: 'forge' },
    { kind: 'exact', tool: 'write_file', building: 'forge' },
    { kind: 'exact', tool: 'edit_file', building: 'forge' },
    { kind: 'exact', tool: 'read_file', building: 'archive' },
    { kind: 'exact', tool: 'rg', building: 'archive' },
    { kind: 'exact', tool: 'search', building: 'archive' },
    { kind: 'exact', tool: 'shell', building: 'mine' },
    { kind: 'exact', tool: 'exec_command', building: 'mine' },
    { kind: 'exact', tool: 'web_search', building: 'observatory' },
    { kind: 'exact', tool: 'web_fetch', building: 'observatory' },
    { kind: 'exact', tool: 'test', building: 'workshop' },
    { kind: 'exact', tool: 'typecheck', building: 'workshop' },
    { kind: 'exact', tool: 'subagent', building: 'barracks' }
  ],
  fallback: 'core'
};

export function resolveBuilding(
  tool: string | undefined,
  detail: string | undefined,
  mapping: BuildingMapping
): BuildingId {
  if (!tool) return mapping.fallback;

  if (detail) {
    for (const rule of mapping.rules) {
      if (rule.kind !== 'detail' || rule.tool !== tool) continue;
      try {
        if (new RegExp(rule.pattern, 'i').test(detail)) return rule.building;
      } catch {
        continue;
      }
    }
  }

  let prefixMatch: { length: number; building: BuildingId } | undefined;
  for (const rule of mapping.rules) {
    if (rule.kind !== 'prefix' || !tool.startsWith(rule.prefix)) continue;
    if (!prefixMatch || rule.prefix.length > prefixMatch.length) {
      prefixMatch = { length: rule.prefix.length, building: rule.building };
    }
  }
  if (prefixMatch) return prefixMatch.building;

  for (const rule of mapping.rules) {
    if (rule.kind === 'exact' && rule.tool === tool) return rule.building;
  }

  return mapping.fallback;
}

/**
 * A normalized activity signal emitted by a source adapter. Adapters translate
 * source-specific transcript lines into these partial observations; the world
 * state machine merges them into automata and workers.
 */
export interface AdapterObservation {
  source: AgentSourceId;
  sessionId: string;
  ts: string;
  cwd?: string;
  gitBranch?: string;
  model?: string;
  title?: string;
  tool?: string;
  toolDetail?: string;
  state?: AutomatonState;
  isError?: boolean;
  tokens?: Partial<TokenUsage>;
  worker?: { id: string; title?: string; state?: AutomatonState };
}

export interface SourceSettings {
  enabled: boolean;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  sources: Record<AgentSourceId, SourceSettings>;
  mapping: BuildingMapping;
}

interface ModelWindow {
  match: string;
  window: number;
}

const DEFAULT_CONTEXT_WINDOW = 200000;

export const MODEL_CONTEXT_WINDOWS: ModelWindow[] = [
  { match: 'gpt-5', window: 272000 },
  { match: 'gpt-4.1', window: 1000000 },
  { match: 'o3', window: 200000 },
  { match: 'sonnet', window: 200000 },
  { match: 'opus', window: 200000 },
  { match: 'haiku', window: 200000 },
  { match: 'claude', window: 200000 }
];

export function contextWindowForModel(model?: string): number {
  if (!model) return DEFAULT_CONTEXT_WINDOW;
  const normalized = model.toLowerCase();
  for (const entry of MODEL_CONTEXT_WINDOWS) {
    if (normalized.includes(entry.match)) return entry.window;
  }
  return DEFAULT_CONTEXT_WINDOW;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'dark',
  sources: {
    codex: { enabled: true },
    claude: { enabled: true },
    opencode: { enabled: true },
    'local-llm': { enabled: true },
    demo: { enabled: true }
  },
  mapping: DEFAULT_BUILDING_MAPPING
};
