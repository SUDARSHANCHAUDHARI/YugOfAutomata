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
