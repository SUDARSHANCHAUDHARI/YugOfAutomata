import { useMemo } from 'react';
import type { AutomatonSnapshot } from '@yug-of-automata/shared';

interface FeedItem {
  key: string;
  cityName: string;
  source: string;
  tool: string;
  detail?: string;
  building: string;
  ts: string;
}

const MAX_FEED = 12;

export function ActivityFeed({ automata }: { automata: AutomatonSnapshot[] }) {
  const items = useMemo<FeedItem[]>(() => {
    const all: FeedItem[] = [];
    for (const automaton of automata) {
      for (const action of automaton.recentActions) {
        all.push({
          key: `${automaton.sessionId}-${action.ts}-${action.tool}`,
          cityName: automaton.cityName,
          source: automaton.source,
          tool: action.tool,
          detail: action.detail,
          building: action.building,
          ts: action.ts
        });
      }
    }
    return all.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, MAX_FEED);
  }, [automata]);

  return (
    <div className="activity-feed">
      <h2>Activity</h2>
      {items.length === 0 ? (
        <p className="muted">No recent actions yet.</p>
      ) : (
        <ul className="feed-list">
          {items.map((item) => (
            <li key={item.key}>
              <span className={`feed-building b-${item.building}`}>{item.building}</span>
              <span className="feed-tool">{item.tool}</span>
              {item.detail ? <span className="feed-detail">{item.detail}</span> : null}
              <span className="feed-city">{item.cityName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
