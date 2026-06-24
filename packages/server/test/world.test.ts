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
