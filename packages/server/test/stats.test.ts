import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StatsStore } from '../src/stats.js';

let dir: string;
const DAY = 24 * 60 * 60 * 1000;
const base = Date.parse('2026-06-26T12:00:00.000Z');

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'yoa-stats-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('StatsStore', () => {
  it('aggregates today, week, and month windows', () => {
    const store = new StatsStore();
    store.record('forge', base);
    store.record('forge', base);
    store.record('mine', base - 3 * DAY); // within week
    store.record('archive', base - 20 * DAY); // within month only

    expect(store.aggregate('day', base)).toEqual({ forge: 2 });
    expect(store.aggregate('week', base)).toEqual({ forge: 2, mine: 1 });
    expect(store.aggregate('month', base)).toEqual({ forge: 2, mine: 1, archive: 1 });
  });

  it('excludes records older than the window', () => {
    const store = new StatsStore();
    store.record('forge', base - 40 * DAY);
    expect(store.aggregate('month', base)).toEqual({});
  });

  it('persists and reloads daily buckets', async () => {
    const store = new StatsStore();
    store.record('forge', base);
    await store.save(dir);

    const reloaded = new StatsStore();
    await reloaded.load(dir);
    expect(reloaded.aggregate('day', base)).toEqual({ forge: 1 });
  });

  it('loads empty when no file exists', async () => {
    const store = new StatsStore();
    await store.load(dir);
    expect(store.aggregate('month', base)).toEqual({});
  });
});
