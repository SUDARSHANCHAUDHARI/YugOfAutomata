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
