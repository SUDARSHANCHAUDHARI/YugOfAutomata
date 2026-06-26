import { useEffect, useMemo, useState } from 'react';
import type { AutomatonSnapshot } from '@yug-of-automata/shared';
import { ActivityFeed } from './ActivityFeed';
import { GameCanvas } from './GameCanvas';
import { SettingsPanel } from './SettingsPanel';
import { StatsPanel } from './StatsPanel';
import { getSettings } from './api';
import { useWorld } from './store';
import { connectWorld } from './ws';

export function App() {
  const { connected, automata, workers, cities, selectedCityId, setSelectedCity } = useWorld();
  const settings = useWorld((state) => state.settings);
  const setSettings = useWorld((state) => state.setSettings);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const theme = settings?.theme ?? 'dark';

  const visibleAutomata = useMemo(
    () => (selectedCityId ? automata.filter((item) => item.cityId === selectedCityId) : automata),
    [automata, selectedCityId]
  );
  const visibleSessionIds = useMemo(
    () => new Set(visibleAutomata.map((item) => item.sessionId)),
    [visibleAutomata]
  );
  const visibleWorkers = useMemo(
    () => workers.filter((worker) => visibleSessionIds.has(worker.parentSessionId)),
    [workers, visibleSessionIds]
  );
  const selected = useMemo(
    () => visibleAutomata.find((item) => item.sessionId === selectedId) ?? visibleAutomata[0],
    [visibleAutomata, selectedId]
  );

  useEffect(() => {
    connectWorld();
    getSettings()
      .then(setSettings)
      .catch(() => undefined);
  }, [setSettings]);

  return (
    <main className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <div>
          <h1>Yug of Automata</h1>
          <p>A local RTS dashboard for your AI coding automata. Runs on 127.0.0.1 — your transcripts never leave this machine.</p>
        </div>
        <div className="topbar-actions">
          <div className={connected ? 'status online' : 'status offline'}>
            {connected ? 'Connected' : 'Reconnecting'}
          </div>
          <button type="button" className="ghost" onClick={() => setShowStats((value) => !value)}>
            Stats
          </button>
          <button type="button" className="ghost" onClick={() => setShowSettings((value) => !value)}>
            Settings
          </button>
        </div>
      </header>

      {showStats ? <StatsPanel onClose={() => setShowStats(false)} /> : null}
      {showSettings ? <SettingsPanel onClose={() => setShowSettings(false)} /> : null}

      <section className="workspace">
        <aside className="city-panel">
          <h2>Cities</h2>
          <button
            className={selectedCityId ? 'city-button' : 'city-button active'}
            type="button"
            onClick={() => setSelectedCity(undefined)}
          >
            <span>All cities</span>
            <strong>{automata.length}</strong>
          </button>
          {cities.map((city) => (
            <button
              key={city.cityId}
              className={selectedCityId === city.cityId ? 'city-button active' : 'city-button'}
              type="button"
              onClick={() => setSelectedCity(city.cityId)}
            >
              <span>{city.name}</span>
              <strong>{city.activeAutomata}</strong>
            </button>
          ))}
          <ActivityFeed automata={visibleAutomata} />
        </aside>

        <GameCanvas
          automata={visibleAutomata}
          workers={visibleWorkers}
          selectedId={selected?.sessionId}
          onSelect={setSelectedId}
        />

        <aside className="detail-panel">
          <SessionPanel automaton={selected} />
        </aside>
      </section>
    </main>
  );
}

function SessionPanel({ automaton }: { automaton?: AutomatonSnapshot }) {
  if (!automaton) {
    return (
      <div className="empty-panel">
        <h2>No automata yet</h2>
        <p>Start demo mode or connect a source to see the city wake up.</p>
      </div>
    );
  }

  const context = automaton.tokens.context ?? 0;
  const windowSize = automaton.tokens.contextWindow ?? 200000;
  const contextPercent = Math.min(100, Math.round((context / windowSize) * 100));

  return (
    <div>
      <h2>{automaton.title}</h2>
      <p className="muted">{automaton.cityName} · {automaton.source}</p>
      <dl className="stats">
        <div><dt>State</dt><dd>{automaton.state}</dd></div>
        <div><dt>Building</dt><dd>{automaton.currentBuilding}</dd></div>
        <div><dt>Tool</dt><dd>{automaton.currentTool ?? 'none'}</dd></div>
        <div><dt>Input</dt><dd>{automaton.tokens.input.toLocaleString()}</dd></div>
        <div><dt>Output</dt><dd>{automaton.tokens.output.toLocaleString()}</dd></div>
      </dl>
      <div className="meter">
        <span style={{ width: `${contextPercent}%` }} />
      </div>
      <p className="muted">Context {contextPercent}%</p>
      <h3>Recent</h3>
      <ul className="actions">
        {automaton.recentActions.map((action) => (
          <li key={`${action.ts}-${action.tool}`}>
            <strong>{action.tool}</strong>
            <span>{action.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
