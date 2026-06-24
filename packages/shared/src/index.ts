export const SERVER_PORT = 8123;
export const WS_PATH = '/ws';

export type AgentSourceId = 'codex' | 'claude' | 'opencode' | 'koda' | 'local-llm' | 'demo';

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

export interface ActionEntry {
  tool: string;
  detail?: string;
  building: BuildingId;
  ts: string;
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
  tokens: {
    input: number;
    output: number;
    context?: number;
    contextWindow?: number;
  };
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
  | { type: 'worker-updated'; worker: WorkerSnapshot }
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
