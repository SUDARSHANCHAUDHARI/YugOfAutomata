# Yug of Automata Foundation Demo Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable Yug of Automata application: a TypeScript npm workspaces repo with CLI, Fastify server, WebSocket world snapshots, React/PixiJS client, demo simulation, and tests.

**Architecture:** The app is a local-first monorepo. `packages/shared` defines protocol and domain types, `packages/server` owns the world state and WebSocket server, `packages/client` renders the RTS dashboard, and `packages/cli` starts the local app. This plan intentionally implements demo mode first so the product is runnable before real transcript adapters are added in later plans.

**Tech Stack:** Node.js 22+, pnpm workspaces, TypeScript, Fastify, ws, React, Vite, PixiJS, Zustand, Vitest.

## Global Constraints

- Runtime: Node.js 22+.
- Package manager: pnpm.
- Server: Fastify.
- Realtime: WebSocket.
- Client: React + Vite.
- Rendering: PixiJS.
- Tests: Vitest.
- npm package: `yug-of-automata`.
- binary: `yoa`.
- long binary alias: `yug-of-automata`.
- CLI binds to `127.0.0.1` by default.
- Demo mode must run without reading user transcripts or writing config.
- The visual identity must avoid copied assets, copied screenshots, copied layout details, and copied wording from other tools.

---

## File Structure

Create these files during this plan:

- `package.json`: root package metadata, workspace scripts.
- `pnpm-workspace.yaml`: pnpm workspace package globs.
- `tsconfig.base.json`: shared TypeScript compiler options.
- `.gitignore`: Node, build, local config, and env ignores.
- `README.md`: initial product docs and demo quick start.
- `packages/shared/package.json`: shared package manifest.
- `packages/shared/tsconfig.json`: shared TypeScript config.
- `packages/shared/src/index.ts`: domain protocol, snapshots, events, building mapping.
- `packages/shared/test/mapping.test.ts`: mapping tests.
- `packages/server/package.json`: server package manifest.
- `packages/server/tsconfig.json`: server TypeScript config.
- `packages/server/src/world.ts`: in-memory world state and event emitter.
- `packages/server/src/demo.ts`: deterministic demo simulation.
- `packages/server/src/server.ts`: Fastify HTTP server and WebSocket broadcaster.
- `packages/server/src/index.ts`: dev entrypoint.
- `packages/server/test/world.test.ts`: world reducer/event tests.
- `packages/server/test/server.test.ts`: health and snapshot tests.
- `packages/client/package.json`: client package manifest.
- `packages/client/tsconfig.json`: client TypeScript config.
- `packages/client/vite.config.ts`: Vite config.
- `packages/client/index.html`: HTML shell.
- `packages/client/src/main.tsx`: React entrypoint.
- `packages/client/src/App.tsx`: app layout.
- `packages/client/src/store.ts`: Zustand world store.
- `packages/client/src/ws.ts`: WebSocket connection.
- `packages/client/src/GameCanvas.tsx`: PixiJS renderer host.
- `packages/client/src/styles.css`: original UI styling.
- `packages/client/test/store.test.ts`: client event reducer tests.
- `packages/cli/package.json`: CLI package manifest.
- `packages/cli/tsconfig.json`: CLI TypeScript config.
- `packages/cli/src/index.ts`: CLI argument parser and startup.
- `packages/cli/test/args.test.ts`: CLI parser tests.
- `scripts/build-server.mjs`: bundle server and CLI for package builds.

---

### Task 1: Workspace And Shared Protocol

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/test/mapping.test.ts`

**Interfaces:**
- Produces: `AgentSourceId`, `AutomatonState`, `AutomatonSnapshot`, `WorkerSnapshot`, `CitySnapshot`, `WorldSnapshot`, `WorldEvent`, `BuildingId`, `DEFAULT_BUILDING_MAPPING`, `resolveBuilding(toolName, detail, mapping)`.
- Consumes: none.

- [ ] **Step 1: Create root workspace files**

Create `package.json`:

```json
{
  "name": "yug-of-automata",
  "version": "0.1.0",
  "description": "A local RTS dashboard for your AI coding automata.",
  "type": "module",
  "private": true,
  "license": "MIT",
  "author": "SUDARSHANCHAUDHARI",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev -w @yug-of-automata/server & npm run dev -w @yug-of-automata/client",
    "demo": "npm run dev -w @yug-of-automata/server -- --demo & npm run dev -w @yug-of-automata/client",
    "build": "npm run build -w @yug-of-automata/shared && npm run build -w @yug-of-automata/server && npm run build -w @yug-of-automata/client && npm run build -w @yug-of-automata/cli",
    "test": "npm run test -w @yug-of-automata/shared && npm run test -w @yug-of-automata/server && npm run test -w @yug-of-automata/client && npm run test -w @yug-of-automata/cli",
    "typecheck": "npm run typecheck -ws --if-present"
  },
  "engines": {
    "node": ">=22"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "typescript": "^5.7.0",
    "vitest": "^3.2.0"
  }
}
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
.DS_Store
.env
.env.*
!.env.example
*.log
coverage/
.vite/
local.properties
```

- [ ] **Step 2: Create shared package manifest**

Create `packages/shared/package.json`:

```json
{
  "name": "@yug-of-automata/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.2.0"
  }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write failing shared mapping tests**

Create `packages/shared/test/mapping.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_BUILDING_MAPPING, resolveBuilding } from '../src/index.js';

describe('resolveBuilding', () => {
  it('maps edit tools to the forge', () => {
    expect(resolveBuilding('apply_patch', undefined, DEFAULT_BUILDING_MAPPING)).toBe('forge');
    expect(resolveBuilding('write_file', 'App.tsx', DEFAULT_BUILDING_MAPPING)).toBe('forge');
  });

  it('maps shell git publishing work to the caravan', () => {
    expect(resolveBuilding('shell', 'git push origin main', DEFAULT_BUILDING_MAPPING)).toBe('caravan');
  });

  it('maps MCP-style tools to the guildhall', () => {
    expect(resolveBuilding('mcp__github__list_prs', undefined, DEFAULT_BUILDING_MAPPING)).toBe('guildhall');
  });

  it('falls back to core for unknown tools', () => {
    expect(resolveBuilding('mystery_tool', undefined, DEFAULT_BUILDING_MAPPING)).toBe('core');
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -w @yug-of-automata/shared`

Expected: FAIL because `packages/shared/src/index.ts` does not exist.

- [ ] **Step 5: Implement shared protocol**

Create `packages/shared/src/index.ts`:

```ts
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
```

- [ ] **Step 6: Run shared tests and typecheck**

Run: `npm test -w @yug-of-automata/shared`

Expected: PASS.

Run: `npm run typecheck -w @yug-of-automata/shared`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.base.json .gitignore packages/shared/package.json packages/shared/tsconfig.json packages/shared/src/index.ts packages/shared/test/mapping.test.ts
git commit -m "feat: add shared protocol and mapping"
```

---

### Task 2: Server World And Demo Simulation

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/src/world.ts`
- Create: `packages/server/src/demo.ts`
- Create: `packages/server/test/world.test.ts`

**Interfaces:**
- Consumes: shared `WorldSnapshot`, `WorldEvent`, `AutomatonSnapshot`, `WorkerSnapshot`, `CitySnapshot`, `DEFAULT_BUILDING_MAPPING`, `resolveBuilding`.
- Produces: `World` class with `snapshot()`, `upsertAutomaton()`, `upsertWorker()`, `onEvent(listener)`, `startDemoWorld(world)`.

- [ ] **Step 1: Create server package files**

Create `packages/server/package.json`:

```json
{
  "name": "@yug-of-automata/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@yug-of-automata/shared": "*",
    "fastify": "^5.2.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.13",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.2.0"
  }
}
```

Create `packages/server/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Write failing world tests**

Create `packages/server/test/world.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { AutomatonSnapshot } from '@yug-of-automata/shared';
import { World } from '../src/world.js';

function automaton(overrides: Partial<AutomatonSnapshot> = {}): AutomatonSnapshot {
  const now = '2026-06-25T00:00:00.000Z';
  return {
    sessionId: 'session-1',
    source: 'demo',
    title: 'Build renderer',
    cityId: 'city-yug',
    cityName: 'YugOfAutomata',
    state: 'working',
    currentTool: 'apply_patch',
    currentBuilding: 'forge',
    tokens: { input: 100, output: 50, context: 150, contextWindow: 200000 },
    recentActions: [],
    startedAt: now,
    lastActivityAt: now,
    ...overrides
  };
}

describe('World', () => {
  it('adds automata and derives city snapshots', () => {
    const world = new World();
    world.upsertAutomaton(automaton());

    expect(world.snapshot().automata).toHaveLength(1);
    expect(world.snapshot().cities).toEqual([
      { cityId: 'city-yug', name: 'YugOfAutomata', activeAutomata: 1, workingDir: undefined }
    ]);
  });

  it('emits automaton update events', () => {
    const world = new World();
    const events: string[] = [];
    world.onEvent((event) => events.push(event.type));

    world.upsertAutomaton(automaton());

    expect(events).toEqual(['automaton-updated', 'city-updated']);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -w @yug-of-automata/server -- world.test.ts`

Expected: FAIL because `World` does not exist.

- [ ] **Step 4: Implement World**

Create `packages/server/src/world.ts`:

```ts
import type {
  AutomatonSnapshot,
  CitySnapshot,
  WorkerSnapshot,
  WorldEvent,
  WorldSnapshot
} from '@yug-of-automata/shared';

type Listener = (event: WorldEvent) => void;

export class World {
  private readonly automata = new Map<string, AutomatonSnapshot>();
  private readonly workers = new Map<string, WorkerSnapshot>();
  private readonly listeners = new Set<Listener>();

  snapshot(): WorldSnapshot {
    return {
      automata: [...this.automata.values()],
      workers: [...this.workers.values()],
      cities: this.cities(),
      updatedAt: new Date().toISOString()
    };
  }

  onEvent(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  upsertAutomaton(automaton: AutomatonSnapshot): void {
    this.automata.set(automaton.sessionId, automaton);
    this.emit({ type: 'automaton-updated', automaton });
    const city = this.cityFor(automaton.cityId);
    if (city) this.emit({ type: 'city-updated', city });
  }

  upsertWorker(worker: WorkerSnapshot): void {
    this.workers.set(worker.workerId, worker);
    this.emit({ type: 'worker-updated', worker });
  }

  private cities(): CitySnapshot[] {
    const cities = new Map<string, CitySnapshot>();
    for (const automaton of this.automata.values()) {
      const existing = cities.get(automaton.cityId);
      cities.set(automaton.cityId, {
        cityId: automaton.cityId,
        name: automaton.cityName,
        workingDir: automaton.workingDir,
        activeAutomata: (existing?.activeAutomata ?? 0) + 1
      });
    }
    return [...cities.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  private cityFor(cityId: string): CitySnapshot | undefined {
    return this.cities().find((city) => city.cityId === cityId);
  }

  private emit(event: WorldEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
```

- [ ] **Step 5: Implement demo simulation**

Create `packages/server/src/demo.ts`:

```ts
import {
  DEFAULT_BUILDING_MAPPING,
  type AutomatonSnapshot,
  type AutomatonState,
  resolveBuilding
} from '@yug-of-automata/shared';
import type { World } from './world.js';

const tools = [
  ['read_file', 'Inspecting project files'],
  ['rg', 'Finding source references'],
  ['apply_patch', 'Editing renderer'],
  ['shell', 'npm test'],
  ['web_search', 'Researching docs'],
  ['mcp__github__list_prs', 'Checking pull requests'],
  ['shell', 'git push origin main']
] as const;

const states: AutomatonState[] = ['thinking', 'working', 'working', 'awaiting-input', 'returning'];

export function startDemoWorld(world: World): () => void {
  let tick = 0;
  const startedAt = new Date().toISOString();

  const update = () => {
    const now = new Date().toISOString();
    for (let index = 0; index < 4; index += 1) {
      const [tool, detail] = tools[(tick + index) % tools.length];
      const state = states[(tick + index) % states.length];
      const currentBuilding = state === 'working'
        ? resolveBuilding(tool, detail, DEFAULT_BUILDING_MAPPING)
        : state === 'awaiting-input'
          ? 'shrine'
          : state === 'returning'
            ? 'storehouse'
            : 'core';

      const automaton: AutomatonSnapshot = {
        sessionId: `demo-${index + 1}`,
        source: index % 2 === 0 ? 'codex' : 'claude',
        title: ['Shape the city', 'Wire transcript parser', 'Polish command hall', 'Prepare release'][index],
        cityId: index < 2 ? 'city-yug' : 'city-sample',
        cityName: index < 2 ? 'YugOfAutomata' : 'SamplePlugin',
        workingDir: index < 2 ? '/demo/YugOfAutomata' : '/demo/SamplePlugin',
        model: index % 2 === 0 ? 'gpt-5.4-codex' : 'sonnet',
        state,
        currentTool: state === 'working' ? tool : undefined,
        toolDetail: state === 'working' ? detail : undefined,
        currentBuilding,
        tokens: {
          input: 5000 + tick * 120 + index * 900,
          output: 700 + tick * 45 + index * 120,
          context: 12000 + tick * 320 + index * 2000,
          contextWindow: 200000
        },
        recentActions: [
          {
            tool,
            detail,
            building: resolveBuilding(tool, detail, DEFAULT_BUILDING_MAPPING),
            ts: now
          }
        ],
        startedAt,
        lastActivityAt: now
      };
      world.upsertAutomaton(automaton);
    }
    tick += 1;
  };

  update();
  const interval = setInterval(update, 1500);
  return () => clearInterval(interval);
}
```

- [ ] **Step 6: Run server tests**

Run: `npm test -w @yug-of-automata/server -- world.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/server/package.json packages/server/tsconfig.json packages/server/src/world.ts packages/server/src/demo.ts packages/server/test/world.test.ts
git commit -m "feat: add server world and demo simulation"
```

---

### Task 3: Fastify Server And WebSocket Snapshots

**Files:**
- Create: `packages/server/src/server.ts`
- Create: `packages/server/src/index.ts`
- Create: `packages/server/test/server.test.ts`

**Interfaces:**
- Consumes: `World`, `startDemoWorld`, `SERVER_PORT`, `WS_PATH`.
- Produces: `startServer(options): Promise<RunningServer>`.

- [ ] **Step 1: Write failing server test**

Create `packages/server/test/server.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { startServer, type RunningServer } from '../src/server.js';

let running: RunningServer | undefined;

afterEach(async () => {
  await running?.close();
  running = undefined;
});

describe('startServer', () => {
  it('serves health in demo mode', async () => {
    running = await startServer({ port: 0, demo: true });
    const response = await fetch(`${running.url}/health`);
    await expect(response.json()).resolves.toEqual({ ok: true, demo: true });
  });

  it('sends a snapshot when a websocket connects', async () => {
    running = await startServer({ port: 0, demo: true });
    const message = await new Promise<string>((resolve, reject) => {
      const socket = new WebSocket(`${running?.url.replace('http:', 'ws:')}/ws`);
      socket.on('message', (data) => {
        resolve(String(data));
        socket.close();
      });
      socket.on('error', reject);
    });

    const event = JSON.parse(message) as { type: string; automata: unknown[] };
    expect(event.type).toBe('snapshot');
    expect(event.automata.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @yug-of-automata/server -- server.test.ts`

Expected: FAIL because `startServer` does not exist.

- [ ] **Step 3: Implement server**

Create `packages/server/src/server.ts`:

```ts
import Fastify from 'fastify';
import { WebSocket, WebSocketServer } from 'ws';
import { SERVER_PORT, WS_PATH, type WorldEvent } from '@yug-of-automata/shared';
import { startDemoWorld } from './demo.js';
import { World } from './world.js';

export interface StartServerOptions {
  port?: number;
  host?: string;
  demo: boolean;
}

export interface RunningServer {
  url: string;
  port: number;
  close: () => Promise<void>;
}

export async function startServer(options: StartServerOptions): Promise<RunningServer> {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? SERVER_PORT;
  const app = Fastify({ logger: false });
  const world = new World();

  app.get('/health', async () => ({ ok: true, demo: options.demo }));

  await app.listen({ host, port });
  const address = app.server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  const url = `http://${host}:${actualPort}`;

  const wss = new WebSocketServer({ server: app.server, path: WS_PATH });
  const send = (socket: WebSocket, event: WorldEvent): void => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
  };

  wss.on('connection', (socket) => {
    send(socket, { type: 'snapshot', ...world.snapshot() });
  });

  const offWorld = world.onEvent((event) => {
    for (const socket of wss.clients) send(socket, event);
  });
  const stopDemo = options.demo ? startDemoWorld(world) : undefined;

  return {
    url,
    port: actualPort,
    close: async () => {
      stopDemo?.();
      offWorld();
      await new Promise<void>((resolve, reject) => {
        wss.close((error) => (error ? reject(error) : resolve()));
      });
      await app.close();
    }
  };
}
```

Create `packages/server/src/index.ts`:

```ts
import { SERVER_PORT } from '@yug-of-automata/shared';
import { startServer } from './server.js';

const demo = process.argv.includes('--demo');
const server = await startServer({ port: SERVER_PORT, demo });

console.log(`Yug of Automata server: ${server.url}`);
console.log(`Mode: ${demo ? 'demo' : 'live'}`);
```

- [ ] **Step 4: Run server tests**

Run: `npm test -w @yug-of-automata/server`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/server.ts packages/server/src/index.ts packages/server/test/server.test.ts
git commit -m "feat: add local server and websocket snapshots"
```

---

### Task 4: React Store And WebSocket Client

**Files:**
- Create: `packages/client/package.json`
- Create: `packages/client/tsconfig.json`
- Create: `packages/client/vite.config.ts`
- Create: `packages/client/index.html`
- Create: `packages/client/src/store.ts`
- Create: `packages/client/src/ws.ts`
- Create: `packages/client/test/store.test.ts`

**Interfaces:**
- Consumes: shared `WorldEvent`, `WorldSnapshot`.
- Produces: `createInitialWorldState()`, `applyWorldEvent(state, event)`, `useWorld`, `connectWorld()`.

- [ ] **Step 1: Create client package files**

Create `packages/client/package.json`:

```json
{
  "name": "@yug-of-automata/client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json --noEmit && vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@yug-of-automata/shared": "*",
    "@vitejs/plugin-react": "^4.3.0",
    "pixi.js": "^8.6.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.2.0"
  }
}
```

Create `packages/client/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["src", "test", "vite.config.ts"]
}
```

Create `packages/client/vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:8123',
        ws: true
      },
      '/health': 'http://127.0.0.1:8123'
    }
  }
});
```

Create `packages/client/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Yug of Automata</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Write failing store tests**

Create `packages/client/test/store.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { WorldEvent } from '@yug-of-automata/shared';
import { applyWorldEvent, createInitialWorldState } from '../src/store.js';

describe('applyWorldEvent', () => {
  it('replaces state on snapshot', () => {
    const next = applyWorldEvent(createInitialWorldState(), {
      type: 'snapshot',
      updatedAt: '2026-06-25T00:00:00.000Z',
      automata: [],
      workers: [],
      cities: []
    });

    expect(next.connected).toBe(false);
    expect(next.automata).toEqual([]);
  });

  it('upserts automata updates', () => {
    const event: WorldEvent = {
      type: 'automaton-updated',
      automaton: {
        sessionId: 'a1',
        source: 'demo',
        title: 'Build',
        cityId: 'c1',
        cityName: 'City',
        state: 'working',
        currentBuilding: 'forge',
        tokens: { input: 1, output: 2 },
        recentActions: [],
        startedAt: '2026-06-25T00:00:00.000Z',
        lastActivityAt: '2026-06-25T00:00:00.000Z'
      }
    };

    const next = applyWorldEvent(createInitialWorldState(), event);
    expect(next.automata).toHaveLength(1);
    expect(next.automata[0].title).toBe('Build');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -w @yug-of-automata/client -- store.test.ts`

Expected: FAIL because `store.ts` does not exist.

- [ ] **Step 4: Implement store and websocket client**

Create `packages/client/src/store.ts`:

```ts
import { create } from 'zustand';
import type { AutomatonSnapshot, CitySnapshot, WorkerSnapshot, WorldEvent } from '@yug-of-automata/shared';

export interface WorldState {
  connected: boolean;
  automata: AutomatonSnapshot[];
  workers: WorkerSnapshot[];
  cities: CitySnapshot[];
  updatedAt?: string;
  setConnected: (connected: boolean) => void;
  apply: (event: WorldEvent) => void;
}

export function createInitialWorldState(): Omit<WorldState, 'setConnected' | 'apply'> {
  return {
    connected: false,
    automata: [],
    workers: [],
    cities: []
  };
}

export function applyWorldEvent(
  state: Omit<WorldState, 'setConnected' | 'apply'>,
  event: WorldEvent
): Omit<WorldState, 'setConnected' | 'apply'> {
  if (event.type === 'snapshot') {
    return {
      ...state,
      automata: event.automata,
      workers: event.workers,
      cities: event.cities,
      updatedAt: event.updatedAt
    };
  }
  if (event.type === 'automaton-updated') {
    return {
      ...state,
      automata: upsertBy(state.automata, event.automaton, (item) => item.sessionId)
    };
  }
  if (event.type === 'worker-updated') {
    return {
      ...state,
      workers: upsertBy(state.workers, event.worker, (item) => item.workerId)
    };
  }
  if (event.type === 'city-updated') {
    return {
      ...state,
      cities: upsertBy(state.cities, event.city, (item) => item.cityId)
    };
  }
  return state;
}

function upsertBy<T>(items: T[], next: T, key: (item: T) => string): T[] {
  const existing = items.findIndex((item) => key(item) === key(next));
  if (existing === -1) return [...items, next];
  return items.map((item, index) => (index === existing ? next : item));
}

export const useWorld = create<WorldState>((set) => ({
  ...createInitialWorldState(),
  setConnected: (connected) => set({ connected }),
  apply: (event) => set((state) => applyWorldEvent(state, event))
}));
```

Create `packages/client/src/ws.ts`:

```ts
import { WS_PATH, type WorldEvent } from '@yug-of-automata/shared';
import { useWorld } from './store';

export function connectWorld(): void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}${WS_PATH}`;
  let retryMs = 1000;

  const open = () => {
    const socket = new WebSocket(url);
    socket.onopen = () => {
      retryMs = 1000;
      useWorld.getState().setConnected(true);
    };
    socket.onmessage = (message) => {
      const event = JSON.parse(String(message.data)) as WorldEvent;
      useWorld.getState().apply(event);
    };
    socket.onclose = () => {
      useWorld.getState().setConnected(false);
      window.setTimeout(open, retryMs);
      retryMs = Math.min(retryMs * 2, 15000);
    };
  };

  open();
}
```

- [ ] **Step 5: Run client store tests**

Run: `npm test -w @yug-of-automata/client -- store.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/client/package.json packages/client/tsconfig.json packages/client/vite.config.ts packages/client/index.html packages/client/src/store.ts packages/client/src/ws.ts packages/client/test/store.test.ts
git commit -m "feat: add client world store"
```

---

### Task 5: Original RTS UI Shell

**Files:**
- Create: `packages/client/src/main.tsx`
- Create: `packages/client/src/App.tsx`
- Create: `packages/client/src/GameCanvas.tsx`
- Create: `packages/client/src/styles.css`

**Interfaces:**
- Consumes: `useWorld`, `connectWorld`, shared snapshots.
- Produces: Visible app with PixiJS canvas, HUD, city list, session panel, resource bar.

- [ ] **Step 1: Implement React entrypoint**

Create `packages/client/src/main.tsx`:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 2: Implement app shell**

Create `packages/client/src/App.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { AutomatonSnapshot } from '@yug-of-automata/shared';
import { GameCanvas } from './GameCanvas';
import { useWorld } from './store';
import { connectWorld } from './ws';

export function App() {
  const { connected, automata, cities } = useWorld();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const selected = useMemo(
    () => automata.find((item) => item.sessionId === selectedId) ?? automata[0],
    [automata, selectedId]
  );

  useEffect(() => {
    connectWorld();
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Yug of Automata</h1>
          <p>A local RTS dashboard for your AI coding automata.</p>
        </div>
        <div className={connected ? 'status online' : 'status offline'}>
          {connected ? 'Connected' : 'Reconnecting'}
        </div>
      </header>

      <section className="workspace">
        <aside className="city-panel">
          <h2>Cities</h2>
          {cities.map((city) => (
            <button key={city.cityId} className="city-button">
              <span>{city.name}</span>
              <strong>{city.activeAutomata}</strong>
            </button>
          ))}
        </aside>

        <GameCanvas automata={automata} selectedId={selected?.sessionId} onSelect={setSelectedId} />

        <aside className="detail-panel">
          <SessionPanel automaton={selected} />
        </aside>
      </section>
    </main>
  );
}

function SessionPanel({ automaton }: { automaton?: AutomatonSnapshot }) {
  if (!automaton) {
    return (
      <div className="empty-panel">
        <h2>No automata yet</h2>
        <p>Start demo mode or connect a source to see the city wake up.</p>
      </div>
    );
  }

  const context = automaton.tokens.context ?? 0;
  const windowSize = automaton.tokens.contextWindow ?? 200000;
  const contextPercent = Math.min(100, Math.round((context / windowSize) * 100));

  return (
    <div>
      <h2>{automaton.title}</h2>
      <p className="muted">{automaton.cityName} · {automaton.source}</p>
      <dl className="stats">
        <div><dt>State</dt><dd>{automaton.state}</dd></div>
        <div><dt>Building</dt><dd>{automaton.currentBuilding}</dd></div>
        <div><dt>Tool</dt><dd>{automaton.currentTool ?? 'none'}</dd></div>
        <div><dt>Input</dt><dd>{automaton.tokens.input.toLocaleString()}</dd></div>
        <div><dt>Output</dt><dd>{automaton.tokens.output.toLocaleString()}</dd></div>
      </dl>
      <div className="meter">
        <span style={{ width: `${contextPercent}%` }} />
      </div>
      <p className="muted">Context {contextPercent}%</p>
      <h3>Recent</h3>
      <ul className="actions">
        {automaton.recentActions.map((action) => (
          <li key={`${action.ts}-${action.tool}`}>
            <strong>{action.tool}</strong>
            <span>{action.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Implement PixiJS renderer**

Create `packages/client/src/GameCanvas.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Text } from 'pixi.js';
import type { AutomatonSnapshot, BuildingId } from '@yug-of-automata/shared';

const buildingPositions: Record<BuildingId, { x: number; y: number; label: string; color: number }> = {
  core: { x: 420, y: 260, label: 'Core', color: 0x8b9bb4 },
  forge: { x: 230, y: 180, label: 'Forge', color: 0xd96b3b },
  archive: { x: 610, y: 180, label: 'Archive', color: 0x58a6ff },
  mine: { x: 210, y: 390, label: 'Mine', color: 0xc9a227 },
  observatory: { x: 650, y: 380, label: 'Observatory', color: 0x8f7cf6 },
  guildhall: { x: 420, y: 110, label: 'Guildhall', color: 0x4ec9a2 },
  caravan: { x: 120, y: 280, label: 'Caravan', color: 0xe0b15a },
  workshop: { x: 730, y: 275, label: 'Workshop', color: 0x7cc66a },
  barracks: { x: 350, y: 430, label: 'Barracks', color: 0xc05c7e },
  shrine: { x: 500, y: 430, label: 'Shrine', color: 0xf2d16b },
  infirmary: { x: 560, y: 300, label: 'Infirmary', color: 0xef6f6c },
  storehouse: { x: 300, y: 300, label: 'Storehouse', color: 0xb88b4a }
};

export function GameCanvas({
  automata,
  selectedId,
  onSelect
}: {
  automata: AutomatonSnapshot[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    if (!hostRef.current || appRef.current) return;
    const app = new Application();
    appRef.current = app;

    void app.init({ width: 900, height: 560, background: '#151a22', antialias: true }).then(() => {
      hostRef.current?.appendChild(app.canvas);
    });

    return () => {
      app.destroy(true);
      appRef.current = null;
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    app.stage.removeChildren();

    const world = new Container();
    app.stage.addChild(world);

    drawGround(world);
    for (const [id, building] of Object.entries(buildingPositions) as [BuildingId, (typeof buildingPositions)[BuildingId]][]) {
      drawBuilding(world, building.x, building.y, building.label, building.color);
    }

    automata.forEach((automaton, index) => {
      const target = buildingPositions[automaton.currentBuilding] ?? buildingPositions.core;
      const angle = index * 1.7;
      const x = target.x + Math.cos(angle) * 34;
      const y = target.y + Math.sin(angle) * 24;
      drawAutomaton(world, x, y, automaton, automaton.sessionId === selectedId, onSelect);
    });
  }, [automata, selectedId, onSelect]);

  return <section className="game-frame" ref={hostRef} />;
}

function drawGround(stage: Container) {
  const ground = new Graphics();
  ground.roundRect(40, 40, 820, 480, 18).fill(0x202a25).stroke({ color: 0x30463b, width: 2 });
  for (let x = 100; x < 820; x += 80) {
    ground.moveTo(x, 70).lineTo(x - 90, 510).stroke({ color: 0x2d3b34, width: 1, alpha: 0.35 });
  }
  stage.addChild(ground);
}

function drawBuilding(stage: Container, x: number, y: number, label: string, color: number) {
  const g = new Graphics();
  g.roundRect(x - 42, y - 28, 84, 56, 6).fill(color).stroke({ color: 0x0f141b, width: 3 });
  g.moveTo(x - 42, y - 28).lineTo(x, y - 58).lineTo(x + 42, y - 28).fill(color + 0x101010);
  const text = new Text({ text: label, style: { fill: '#f4f1e8', fontSize: 11, fontFamily: 'Inter, sans-serif' } });
  text.anchor.set(0.5, 0);
  text.position.set(x, y + 34);
  stage.addChild(g, text);
}

function drawAutomaton(
  stage: Container,
  x: number,
  y: number,
  automaton: AutomatonSnapshot,
  selected: boolean,
  onSelect: (id: string) => void
) {
  const g = new Graphics();
  g.circle(x, y, selected ? 15 : 12).fill(selected ? 0xf6d36b : 0xd8e6ff).stroke({ color: 0x0b0f16, width: 3 });
  g.rect(x - 5, y - 24, 10, 16).fill(0x9fb7ff);
  g.eventMode = 'static';
  g.cursor = 'pointer';
  g.on('pointertap', () => onSelect(automaton.sessionId));

  const text = new Text({ text: automaton.source, style: { fill: '#10151c', fontSize: 9, fontWeight: '700' } });
  text.anchor.set(0.5);
  text.position.set(x, y);
  stage.addChild(g, text);
}
```

- [ ] **Step 4: Add styling**

Create `packages/client/src/styles.css`:

```css
:root {
  color: #f3efe4;
  background: #10151c;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background: #10151c;
}

button {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
}

.topbar {
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #263241;
  background: #151b24;
}

.topbar h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: 0;
}

.topbar p,
.muted {
  margin: 4px 0 0;
  color: #aab5c3;
  font-size: 13px;
}

.status {
  padding: 8px 11px;
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid #3a4656;
}

.status.online {
  color: #9ce7bd;
}

.status.offline {
  color: #f2bd87;
}

.workspace {
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 300px;
}

.city-panel,
.detail-panel {
  padding: 16px;
  border-color: #263241;
  background: #121820;
  overflow: auto;
}

.city-panel {
  border-right: 1px solid #263241;
}

.detail-panel {
  border-left: 1px solid #263241;
}

.city-panel h2,
.detail-panel h2 {
  margin: 0 0 12px;
  font-size: 15px;
}

.city-button {
  width: 100%;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #f3efe4;
  background: #1b2430;
  border: 1px solid #2d3a4b;
  border-radius: 6px;
  cursor: pointer;
}

.game-frame {
  min-width: 0;
  min-height: 0;
  display: grid;
  place-items: center;
  background: #0f141b;
  overflow: hidden;
}

.game-frame canvas {
  max-width: 100%;
  height: auto;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 16px 0;
}

.stats div {
  padding: 9px;
  border: 1px solid #2b3848;
  border-radius: 6px;
  background: #19212c;
}

.stats dt {
  color: #9ba8b8;
  font-size: 11px;
}

.stats dd {
  margin: 4px 0 0;
  font-size: 13px;
}

.meter {
  height: 9px;
  border-radius: 999px;
  background: #273244;
  overflow: hidden;
}

.meter span {
  display: block;
  height: 100%;
  background: #d7b75a;
}

.actions {
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
}

.actions li {
  display: grid;
  gap: 3px;
  padding: 9px 0;
  border-bottom: 1px solid #273241;
}

.actions span {
  color: #aab5c3;
  font-size: 12px;
}
```

- [ ] **Step 5: Run client build**

Run: `npm run build -w @yug-of-automata/client`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/main.tsx packages/client/src/App.tsx packages/client/src/GameCanvas.tsx packages/client/src/styles.css
git commit -m "feat: add RTS dashboard UI shell"
```

---

### Task 6: CLI Startup

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/test/args.test.ts`
- Modify: `packages/server/src/server.ts`

**Interfaces:**
- Consumes: `startServer`.
- Produces: `parseArgs(argv): CliOptions`, executable CLI with `yoa`, `yoa --demo`, `yoa --open`.

- [ ] **Step 1: Create CLI package files**

Create `packages/cli/package.json`:

```json
{
  "name": "@yug-of-automata/cli",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "yoa": "dist/index.js",
    "yug-of-automata": "dist/index.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@yug-of-automata/server": "*",
    "@yug-of-automata/shared": "*"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.2.0"
  }
}
```

Create `packages/cli/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Write failing CLI parser tests**

Create `packages/cli/test/args.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseArgs } from '../src/index.js';

describe('parseArgs', () => {
  it('enables demo and open flags', () => {
    expect(parseArgs(['--demo', '--open'])).toMatchObject({ demo: true, open: true });
  });

  it('parses source filters', () => {
    expect(parseArgs(['--sources', 'codex,claude']).sources).toEqual(['codex', 'claude']);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -w @yug-of-automata/cli`

Expected: FAIL because `parseArgs` does not exist.

- [ ] **Step 4: Implement CLI**

Create `packages/cli/src/index.ts`:

```ts
#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { platform } from 'node:os';
import { startServer } from '@yug-of-automata/server';
import type { AgentSourceId } from '@yug-of-automata/shared';

export interface CliOptions {
  demo: boolean;
  open: boolean;
  sources?: AgentSourceId[];
}

const validSources = new Set<AgentSourceId>(['codex', 'claude', 'opencode', 'koda', 'local-llm', 'demo']);

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { demo: false, open: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--demo') options.demo = true;
    else if (arg === '--open') options.open = true;
    else if (arg === '--sources') {
      const raw = argv[index + 1] ?? '';
      index += 1;
      options.sources = raw
        .split(',')
        .map((value) => value.trim())
        .filter((value): value is AgentSourceId => validSources.has(value as AgentSourceId));
    }
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const server = await startServer({ demo: options.demo });
  console.log(`Yug of Automata: ${server.url}`);
  console.log(`Mode: ${options.demo ? 'demo' : 'live'}`);
  if (options.sources?.length) console.log(`Sources: ${options.sources.join(', ')}`);
  if (options.open) openBrowser(server.url);
}

function openBrowser(url: string): void {
  const command = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'cmd' : 'xdg-open';
  const args = platform() === 'win32' ? ['/c', 'start', url] : [url];
  execFile(command, args, { stdio: 'ignore' });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
```

- [ ] **Step 5: Run CLI tests**

Run: `npm test -w @yug-of-automata/cli`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/package.json packages/cli/tsconfig.json packages/cli/src/index.ts packages/cli/test/args.test.ts
git commit -m "feat: add Yug of Automata CLI"
```

---

### Task 7: README And Verification

**Files:**
- Create: `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: all previous packages.
- Produces: verified demo vertical slice and clear quick start docs.

- [ ] **Step 1: Write README**

Create `README.md`:

```md
# Yug of Automata

A local RTS dashboard for your AI coding automata.

Yug of Automata runs on your machine, starts a localhost dashboard, and visualizes AI coding sessions as automata working across a living city. The first vertical slice includes demo mode, real-time WebSocket snapshots, a Fastify server, and a React/PixiJS dashboard.

## Quick Start

```bash
npm install
npm run demo
```

Open the Vite URL printed by the client, usually:

```text
http://localhost:5173
```

## Scripts

```bash
npm test
npm run build
npm run typecheck
```

## Privacy

Demo mode does not read local transcripts or write local config. Live source adapters will be local-first and opt-in as they are added.

## Status

This repository is under active construction. The product target is a full local-first RTS observability dashboard for Codex, Claude Code, OpenCode, Koda, and local LLM workflows.
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: creates `package-lock.json` and installs workspace dependencies.

- [ ] **Step 3: Run full tests**

Run: `npm test`

Expected: PASS for shared, server, client, and cli packages.

- [ ] **Step 4: Run full build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Run demo smoke check**

Run: `npm run demo`

Expected:

- Server prints `Yug of Automata server: http://127.0.0.1:8123`.
- Client prints a Vite URL.
- Browser at `http://localhost:5173` displays the Yug of Automata UI with demo automata.

- [ ] **Step 6: Commit**

```bash
git add README.md package-lock.json package.json
git commit -m "docs: add quick start and verify foundation"
```

---

## Follow-On Plans

This plan intentionally ends with a working demo vertical slice. The approved product spec remains larger and requires follow-on plans:

1. Real source adapters: Codex and Claude first.
2. OpenCode, Koda, and local LLM proxy.
3. Configurable settings, mappings, and model registry.
4. Building stats, context history, and session timelines.
5. Optional hooks/control layer.
6. Optional agent launch beta.
7. Original asset pack and visual polish.
8. npm packaging and release hardening.

## Self-Review

- Spec coverage: This plan covers the monorepo, CLI, server, WebSocket, demo mode, client world, original UI shell, mapping, tests, and initial docs. Real transcript adapters, control, launch, and packaging are explicitly assigned to follow-on plans because they are independent subsystems.
- Placeholder scan: No `TBD`, `TODO`, or undefined "fill later" steps are used.
- Type consistency: Shared types are defined in Task 1 and consumed by server/client/cli tasks with matching names.
