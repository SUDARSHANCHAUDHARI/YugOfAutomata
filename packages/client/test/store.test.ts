import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_BUILDING_MAPPING,
  type WorldEvent
} from '@yug-of-automata/shared';
import {
  addExactRule,
  applyWorldEvent,
  createInitialWorldState,
  removeRuleAt,
  toggleSourceEnabled
} from '../src/store.js';

describe('toggleSourceEnabled', () => {
  it('flips a source enabled flag without mutating the input', () => {
    const next = toggleSourceEnabled(DEFAULT_APP_SETTINGS, 'codex');
    expect(next.sources.codex.enabled).toBe(false);
    expect(DEFAULT_APP_SETTINGS.sources.codex.enabled).toBe(true);
    expect(next.sources.claude.enabled).toBe(true);
  });
});

describe('mapping editor helpers', () => {
  it('adds an exact rule at the front', () => {
    const next = addExactRule(DEFAULT_BUILDING_MAPPING, 'jest', 'workshop');
    expect(next.rules[0]).toEqual({ kind: 'exact', tool: 'jest', building: 'workshop' });
    expect(DEFAULT_BUILDING_MAPPING.rules).not.toContainEqual({ kind: 'exact', tool: 'jest', building: 'workshop' });
  });

  it('replaces an existing exact rule for the same tool', () => {
    const once = addExactRule(DEFAULT_BUILDING_MAPPING, 'jest', 'workshop');
    const twice = addExactRule(once, 'jest', 'archive');
    const jestRules = twice.rules.filter((r) => r.kind === 'exact' && r.tool === 'jest');
    expect(jestRules).toHaveLength(1);
    expect(jestRules[0]).toMatchObject({ building: 'archive' });
  });

  it('ignores a blank tool', () => {
    expect(addExactRule(DEFAULT_BUILDING_MAPPING, '   ', 'forge')).toEqual(DEFAULT_BUILDING_MAPPING);
  });

  it('removes a rule by index', () => {
    const next = removeRuleAt(DEFAULT_BUILDING_MAPPING, 0);
    expect(next.rules).toHaveLength(DEFAULT_BUILDING_MAPPING.rules.length - 1);
    expect(next.rules[0]).toEqual(DEFAULT_BUILDING_MAPPING.rules[1]);
  });
});

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

  it('removes an automaton and its workers on automaton-removed', () => {
    const seeded = {
      ...createInitialWorldState(),
      automata: [
        {
          sessionId: 'a1',
          source: 'demo' as const,
          title: 'Build',
          cityId: 'c1',
          cityName: 'City',
          state: 'working' as const,
          currentBuilding: 'forge' as const,
          tokens: { input: 1, output: 2 },
          recentActions: [],
          startedAt: 't',
          lastActivityAt: 't'
        }
      ],
      workers: [
        { workerId: 'w1', parentSessionId: 'a1', title: 'sub', state: 'working' as const, currentBuilding: 'barracks' as const }
      ]
    };

    const next = applyWorldEvent(seeded, { type: 'automaton-removed', sessionId: 'a1' });
    expect(next.automata).toHaveLength(0);
    expect(next.workers).toHaveLength(0);
  });

  it('removes a worker on worker-removed', () => {
    const seeded = {
      ...createInitialWorldState(),
      workers: [
        { workerId: 'w1', parentSessionId: 'a1', title: 'sub', state: 'working' as const, currentBuilding: 'barracks' as const }
      ]
    };
    const next = applyWorldEvent(seeded, { type: 'worker-removed', workerId: 'w1' });
    expect(next.workers).toHaveLength(0);
  });
});
