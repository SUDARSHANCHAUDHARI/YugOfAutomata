import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BuildingId } from '@yug-of-automata/shared';

export type StatsWindow = 'day' | 'week' | 'month';

const WINDOW_DAYS: Record<StatsWindow, number> = { day: 1, week: 7, month: 30 };
const MAX_RETAINED_DAYS = 31;

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Records building activity in per-day buckets and aggregates them over
 * day/week/month windows. Persisted as a small JSON file alongside settings so
 * historical usage survives restarts. Old days are pruned on save.
 */
export class StatsStore {
  private readonly daily = new Map<string, Partial<Record<BuildingId, number>>>();

  record(building: BuildingId, atMs: number = Date.now()): void {
    const key = dayKey(atMs);
    const bucket = this.daily.get(key) ?? {};
    bucket[building] = (bucket[building] ?? 0) + 1;
    this.daily.set(key, bucket);
  }

  aggregate(window: StatsWindow, nowMs: number = Date.now()): Partial<Record<BuildingId, number>> {
    const cutoff = nowMs - WINDOW_DAYS[window] * 24 * 60 * 60 * 1000;
    const totals: Partial<Record<BuildingId, number>> = {};
    for (const [key, bucket] of this.daily) {
      // Compare by day start; a record stamped today counts for the day window.
      if (Date.parse(`${key}T23:59:59.999Z`) < cutoff) continue;
      for (const [building, count] of Object.entries(bucket)) {
        const id = building as BuildingId;
        totals[id] = (totals[id] ?? 0) + (count ?? 0);
      }
    }
    return totals;
  }

  private file(dir: string): string {
    return join(dir, 'stats.json');
  }

  async load(dir: string): Promise<void> {
    try {
      const raw = await readFile(this.file(dir), 'utf8');
      const parsed = JSON.parse(raw) as { daily?: Record<string, Partial<Record<BuildingId, number>>> };
      this.daily.clear();
      for (const [key, bucket] of Object.entries(parsed.daily ?? {})) {
        if (bucket && typeof bucket === 'object') this.daily.set(key, bucket);
      }
    } catch {
      // No stats yet; start empty.
    }
  }

  async save(dir: string): Promise<void> {
    this.prune();
    await mkdir(dir, { recursive: true });
    const daily = Object.fromEntries(this.daily);
    await writeFile(this.file(dir), `${JSON.stringify({ daily }, null, 2)}\n`, 'utf8');
  }

  private prune(): void {
    const keys = [...this.daily.keys()].sort();
    while (keys.length > MAX_RETAINED_DAYS) {
      const oldest = keys.shift();
      if (oldest) this.daily.delete(oldest);
    }
  }
}
