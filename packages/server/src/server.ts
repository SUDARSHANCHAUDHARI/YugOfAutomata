import Fastify from 'fastify';
import { homedir } from 'node:os';
import { WebSocket, WebSocketServer } from 'ws';
import {
  SERVER_PORT,
  WS_PATH,
  type AgentSourceId,
  type AppSettings,
  type BuildingId,
  type BuildingMapping,
  type WorldEvent,
  type WorldSnapshot
} from '@yug-of-automata/shared';
import { selectAdapters } from './adapters/index.js';
import { startDemoWorld } from './demo.js';
import { loadSettings, saveSettings, settingsDir } from './settings.js';
import { StatsStore } from './stats.js';
import { registerStatic, resolveClientDir } from './static.js';
import { World } from './world.js';

export interface StartServerOptions {
  port?: number;
  host?: string;
  demo: boolean;
  sources?: AgentSourceId[];
  home?: string;
  activeWindowMs?: number;
  configDir?: string;
  usePolling?: boolean;
}

export interface RunningServer {
  url: string;
  port: number;
  sources: AgentSourceId[];
  close: () => Promise<void>;
}

const DEFAULT_ACTIVE_WINDOW_MS = 5 * 60 * 1000;

function buildingStats(snapshot: WorldSnapshot): Record<string, number> {
  const counts: Partial<Record<BuildingId, number>> = {};
  for (const automaton of snapshot.automata) {
    counts[automaton.currentBuilding] = (counts[automaton.currentBuilding] ?? 0) + 1;
  }
  return counts;
}

export async function startServer(options: StartServerOptions): Promise<RunningServer> {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? SERVER_PORT;
  const home = options.home ?? homedir();
  const activeWindowMs = options.activeWindowMs ?? DEFAULT_ACTIVE_WINDOW_MS;
  const configDir = options.configDir ?? settingsDir();

  const app = Fastify({ logger: false });
  const world = new World();
  let settings: AppSettings = await loadSettings(configDir);
  world.setMapping(settings.mapping);

  // Historical building stats persist only in live mode; demo writes nothing.
  const stats = new StatsStore();
  if (!options.demo) await stats.load(configDir);

  app.get('/health', async () => ({ ok: true, demo: options.demo }));
  app.get('/settings', async () => settings);
  app.put<{ Body: AppSettings }>('/settings', async (request) => {
    settings = await saveSettings(configDir, request.body);
    world.setMapping(settings.mapping);
    return settings;
  });
  app.get('/mapping', async () => settings.mapping);
  app.put<{ Body: BuildingMapping }>('/mapping', async (request) => {
    settings = await saveSettings(configDir, { ...settings, mapping: request.body });
    world.setMapping(settings.mapping);
    return settings.mapping;
  });
  app.get('/sessions', async () => world.snapshot().automata);
  app.get('/building-stats', async () => ({
    current: buildingStats(world.snapshot()),
    day: stats.aggregate('day'),
    week: stats.aggregate('week'),
    month: stats.aggregate('month')
  }));

  const clientDir = resolveClientDir();
  if (clientDir) await registerStatic(app, clientDir);

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

  const stops: Array<() => void> = [];
  const activeSources: AgentSourceId[] = [];

  if (options.demo) {
    stops.push(startDemoWorld(world));
  } else {
    // Record each new building action once (deduped by its timestamp).
    const lastActionTs = new Map<string, string>();
    stops.push(
      world.onEvent((event) => {
        if (event.type !== 'automaton-updated') return;
        const action = event.automaton.recentActions.at(-1);
        if (!action) return;
        if (lastActionTs.get(event.automaton.sessionId) === action.ts) return;
        lastActionTs.set(event.automaton.sessionId, action.ts);
        stats.record(action.building, Date.parse(action.ts) || Date.now());
      })
    );
    const saveTimer = setInterval(() => {
      void stats.save(configDir);
    }, 30000);
    saveTimer.unref();
    stops.push(() => {
      clearInterval(saveTimer);
      void stats.save(configDir);
    });

    const adapters = selectAdapters(options.sources).filter(
      (adapter) => settings.sources[adapter.id]?.enabled !== false
    );
    for (const adapter of adapters) {
      stops.push(
        adapter.start({
          home,
          activeWindowMs,
          usePolling: options.usePolling,
          emit: (observation) => world.applyObservation(observation)
        })
      );
      activeSources.push(adapter.id);
    }
    const pruneTimer = setInterval(
      () => world.prune(Date.now(), activeWindowMs * 2),
      Math.min(activeWindowMs, 30000)
    );
    pruneTimer.unref();
    stops.push(() => clearInterval(pruneTimer));
  }

  return {
    url,
    port: actualPort,
    sources: activeSources,
    close: async () => {
      for (const stop of stops) stop();
      offWorld();
      await new Promise<void>((resolve, reject) => {
        wss.close((error) => (error ? reject(error) : resolve()));
      });
      await app.close();
    }
  };
}
