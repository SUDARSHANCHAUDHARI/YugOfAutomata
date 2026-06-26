import { create } from 'zustand';
import type { AutomatonSnapshot, CitySnapshot, WorkerSnapshot, WorldEvent } from '@yug-of-automata/shared';

export interface WorldState {
  connected: boolean;
  automata: AutomatonSnapshot[];
  workers: WorkerSnapshot[];
  cities: CitySnapshot[];
  selectedCityId?: string;
  updatedAt?: string;
  setConnected: (connected: boolean) => void;
  setSelectedCity: (cityId?: string) => void;
  apply: (event: WorldEvent) => void;
}

type WorldSlice = Omit<WorldState, 'setConnected' | 'setSelectedCity' | 'apply'>;

export function createInitialWorldState(): WorldSlice {
  return {
    connected: false,
    automata: [],
    workers: [],
    cities: []
  };
}

export function applyWorldEvent(state: WorldSlice, event: WorldEvent): WorldSlice {
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
  if (event.type === 'automaton-removed') {
    return {
      ...state,
      automata: state.automata.filter((item) => item.sessionId !== event.sessionId),
      workers: state.workers.filter((item) => item.parentSessionId !== event.sessionId)
    };
  }
  if (event.type === 'worker-updated') {
    return {
      ...state,
      workers: upsertBy(state.workers, event.worker, (item) => item.workerId)
    };
  }
  if (event.type === 'worker-removed') {
    return {
      ...state,
      workers: state.workers.filter((item) => item.workerId !== event.workerId)
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
  setSelectedCity: (selectedCityId) => set({ selectedCityId }),
  apply: (event) => set((state) => applyWorldEvent(state, event))
}));
