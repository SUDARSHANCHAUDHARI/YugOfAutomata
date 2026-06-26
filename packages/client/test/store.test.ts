import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS, type WorldEvent } from '@yug-of-automata/shared';
import { applyWorldEvent, createInitialWorldState, toggleSourceEnabled } from '../src/store.js';

describe('toggleSourceEnabled', () => {
  it('flips a source enabled flag without mutating the input', () => {
    const next = toggleSourceEnabled(DEFAULT_APP_SETTINGS, 'codex');
    expect(next.sources.codex.enabled).toBe(false);
    expect(DEFAULT_APP_SETTINGS.sources.codex.enabled).toBe(true);
    expect(next.sources.claude.enabled).toBe(true);
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
