import {
  DEFAULT_BUILDING_MAPPING,
  RECENT_ACTIONS_CAP,
  resolveBuilding,
  type ActionEntry,
  type AdapterObservation,
  type AutomatonSnapshot,
  type AutomatonState,
  type BuildingId,
  type BuildingMapping,
  type CitySnapshot,
  type WorkerSnapshot,
  type WorldEvent,
  type WorldSnapshot
} from '@yug-of-automata/shared';

type Listener = (event: WorldEvent) => void;

export class World {
  private readonly automata = new Map<string, AutomatonSnapshot>();
  private readonly workers = new Map<string, WorkerSnapshot>();
  private readonly listeners = new Set<Listener>();
  private mapping: BuildingMapping = DEFAULT_BUILDING_MAPPING;

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

  setMapping(mapping: BuildingMapping): void {
    this.mapping = mapping;
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

  /**
   * Merge a normalized observation from a source adapter into the world,
   * recomputing the current building from the active mapping.
   */
  applyObservation(obs: AdapterObservation): void {
    if (obs.worker) {
      this.upsertWorker({
        workerId: obs.worker.id,
        parentSessionId: obs.sessionId,
        title: obs.worker.title ?? 'subagent',
        state: obs.worker.state ?? 'working',
        currentBuilding: 'barracks'
      });
      return;
    }

    const existing = this.automata.get(obs.sessionId);
    const cwd = obs.cwd ?? existing?.workingDir;
    const state = obs.state ?? existing?.state ?? 'thinking';
    const tool = obs.tool ?? existing?.currentTool;
    const detail = obs.toolDetail ?? existing?.toolDetail;
    const building = this.buildingFor(state, tool, detail);

    const merged: AutomatonSnapshot = {
      sessionId: obs.sessionId,
      source: obs.source,
      title: obs.title ?? existing?.title ?? 'Untitled session',
      cityId: cwd ?? existing?.cityId ?? 'unknown',
      cityName: cwd ? cityNameFor(cwd) : existing?.cityName ?? 'Unknown',
      workingDir: cwd,
      model: obs.model ?? existing?.model,
      state,
      currentTool: obs.tool ?? (obs.state ? undefined : existing?.currentTool),
      toolDetail: obs.toolDetail ?? (obs.state ? undefined : existing?.toolDetail),
      currentBuilding: building,
      tokens: { ...(existing?.tokens ?? { input: 0, output: 0 }), ...obs.tokens },
      recentActions: this.nextActions(existing?.recentActions, obs, building),
      startedAt: existing?.startedAt ?? obs.ts,
      lastActivityAt: obs.ts
    };

    this.upsertAutomaton(merged);
  }

  /** Remove automata (and their workers) inactive for longer than ttlMs. */
  prune(now: number, ttlMs: number): void {
    for (const [sessionId, automaton] of this.automata) {
      if (now - Date.parse(automaton.lastActivityAt) <= ttlMs) continue;
      this.automata.delete(sessionId);
      this.emit({ type: 'automaton-removed', sessionId });
      const city = this.cityFor(automaton.cityId);
      if (city) this.emit({ type: 'city-updated', city });
      for (const [workerId, worker] of this.workers) {
        if (worker.parentSessionId !== sessionId) continue;
        this.workers.delete(workerId);
        this.emit({ type: 'worker-removed', workerId });
      }
    }
  }

  private buildingFor(state: AutomatonState, tool?: string, detail?: string): BuildingId {
    switch (state) {
      case 'awaiting-input':
        return 'shrine';
      case 'error':
      case 'recovering':
        return 'infirmary';
      case 'returning':
        return 'storehouse';
      case 'working':
        return resolveBuilding(tool, detail, this.mapping);
      default:
        return 'core';
    }
  }

  private nextActions(
    current: ActionEntry[] | undefined,
    obs: AdapterObservation,
    building: BuildingId
  ): ActionEntry[] {
    const actions = current ? [...current] : [];
    if (!obs.tool) return actions;
    const last = actions[actions.length - 1];
    if (last && last.tool === obs.tool && last.detail === obs.toolDetail) return actions;
    actions.push({ tool: obs.tool, detail: obs.toolDetail, building, ts: obs.ts });
    return actions.slice(-RECENT_ACTIONS_CAP);
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

function cityNameFor(cwd: string): string {
  const parts = cwd.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? cwd;
}
