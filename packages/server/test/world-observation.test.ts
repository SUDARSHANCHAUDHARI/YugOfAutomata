import { describe, expect, it } from 'vitest';
import {
  RECENT_ACTIONS_CAP,
  type AdapterObservation,
  type BuildingMapping
} from '@yug-of-automata/shared';
import { World } from '../src/world.js';

function obs(overrides: Partial<AdapterObservation> = {}): AdapterObservation {
  return {
    source: 'claude',
    sessionId: 'sess-1',
    ts: '2026-06-26T00:00:00.000Z',
    cwd: '/Users/dev/MyApp',
    model: 'claude-sonnet-4-6',
    title: 'Build the feature',
    tool: 'apply_patch',
    toolDetail: 'App.tsx',
    state: 'working',
    tokens: { input: 100, output: 20, context: 5000 },
    ...overrides
  };
}

describe('World.applyObservation', () => {
  it('creates an automaton and derives the city from cwd', () => {
    const world = new World();
    world.applyObservation(obs());

    const snap = world.snapshot();
    expect(snap.automata).toHaveLength(1);
    expect(snap.automata[0].cityName).toBe('MyApp');
    expect(snap.automata[0].currentBuilding).toBe('forge');
    expect(snap.cities[0].activeAutomata).toBe(1);
  });

  it('merges partial token updates instead of replacing them', () => {
    const world = new World();
    world.applyObservation(obs({ tokens: { input: 100, output: 20 } }));
    world.applyObservation(obs({ tokens: { output: 50 } }));

    const a = world.snapshot().automata[0];
    expect(a.tokens.input).toBe(100);
    expect(a.tokens.output).toBe(50);
  });

  it('caps recent actions to RECENT_ACTIONS_CAP', () => {
    const world = new World();
    for (let i = 0; i < RECENT_ACTIONS_CAP + 5; i += 1) {
      world.applyObservation(obs({ tool: `tool_${i}`, toolDetail: String(i) }));
    }
    expect(world.snapshot().automata[0].recentActions).toHaveLength(RECENT_ACTIONS_CAP);
  });

  it('routes awaiting-input to the shrine and errors to the infirmary', () => {
    const world = new World();
    world.applyObservation(obs({ state: 'awaiting-input', tool: undefined }));
    expect(world.snapshot().automata[0].currentBuilding).toBe('shrine');

    world.applyObservation(obs({ state: 'error', isError: true, tool: undefined }));
    expect(world.snapshot().automata[0].currentBuilding).toBe('infirmary');
  });

  it('creates a worker linked to its parent session', () => {
    const world = new World();
    world.applyObservation(obs({ worker: { id: 'w1', title: 'subagent' } }));

    const w = world.snapshot().workers;
    expect(w).toHaveLength(1);
    expect(w[0].workerId).toBe('w1');
    expect(w[0].parentSessionId).toBe('sess-1');
    expect(w[0].currentBuilding).toBe('barracks');
  });

  it('honors a replaced mapping via setMapping', () => {
    const world = new World();
    const mapping: BuildingMapping = {
      rules: [{ kind: 'exact', tool: 'apply_patch', building: 'workshop' }],
      fallback: 'core'
    };
    world.setMapping(mapping);
    world.applyObservation(obs());
    expect(world.snapshot().automata[0].currentBuilding).toBe('workshop');
  });
});

describe('World.prune', () => {
  it('removes stale automata and emits a removal event', () => {
    const world = new World();
    world.applyObservation(obs({ ts: '2026-06-26T00:00:00.000Z' }));

    const events: string[] = [];
    world.onEvent((e) => events.push(e.type));

    const later = new Date('2026-06-26T00:10:00.000Z').getTime();
    world.prune(later, 5 * 60 * 1000);

    expect(world.snapshot().automata).toHaveLength(0);
    expect(events).toContain('automaton-removed');
  });

  it('keeps fresh automata', () => {
    const world = new World();
    const now = new Date('2026-06-26T00:00:00.000Z').getTime();
    world.applyObservation(obs({ ts: '2026-06-26T00:00:00.000Z' }));
    world.prune(now + 1000, 5 * 60 * 1000);
    expect(world.snapshot().automata).toHaveLength(1);
  });
});
