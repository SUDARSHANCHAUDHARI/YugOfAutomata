import { useEffect, useState } from 'react';
import type { BuildingId } from '@yug-of-automata/shared';
import { getBuildingStats, type BuildingStats } from './api';

type Window = 'current' | 'day' | 'week' | 'month';
const WINDOWS: { id: Window; label: string }[] = [
  { id: 'current', label: 'Now' },
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' }
];

function topBuildings(counts: Partial<Record<BuildingId, number>>): [string, number][] {
  return Object.entries(counts)
    .map(([b, c]) => [b, c ?? 0] as [string, number])
    .sort((a, b) => b[1] - a[1]);
}

export function StatsPanel({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<BuildingStats | undefined>();
  const [window, setWindow] = useState<Window>('day');

  useEffect(() => {
    let active = true;
    const load = () => getBuildingStats().then((s) => active && setStats(s)).catch(() => undefined);
    load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const rows = stats ? topBuildings(stats[window]) : [];
  const max = rows.reduce((m, [, c]) => Math.max(m, c), 0) || 1;

  return (
    <div className="settings-panel stats-panel">
      <header>
        <h2>Building stats</h2>
        <button type="button" className="ghost" onClick={onClose}>Close</button>
      </header>

      <div className="seg">
        {WINDOWS.map((w) => (
          <button
            key={w.id}
            type="button"
            className={window === w.id ? 'seg-btn active' : 'seg-btn'}
            onClick={() => setWindow(w.id)}
          >
            {w.label}
          </button>
        ))}
      </div>

      {!stats ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">No activity recorded for this window yet.</p>
      ) : (
        <ul className="stats-bars">
          {rows.map(([building, count]) => (
            <li key={building}>
              <span className={`feed-building b-${building}`}>{building}</span>
              <span className="stats-bar"><span style={{ width: `${(count / max) * 100}%` }} /></span>
              <strong>{count}</strong>
            </li>
          ))}
        </ul>
      )}
      <p className="muted">History is recorded in live mode only.</p>
    </div>
  );
}
