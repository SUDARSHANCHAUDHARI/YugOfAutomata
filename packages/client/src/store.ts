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
