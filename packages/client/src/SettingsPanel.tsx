import type { AgentSourceId, AppSettings } from '@yug-of-automata/shared';
import { putSettings } from './api';
import { toggleSourceEnabled, useWorld } from './store';

const LIVE_SOURCES: AgentSourceId[] = ['claude', 'codex'];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useWorld((state) => state.settings);
  const setSettings = useWorld((state) => state.setSettings);

  if (!settings) {
    return (
      <div className="settings-panel">
        <header>
          <h2>Settings</h2>
          <button type="button" className="ghost" onClick={onClose}>Close</button>
        </header>
        <p className="muted">Loading settings…</p>
      </div>
    );
  }

  const persist = async (next: AppSettings) => {
    setSettings(next); // optimistic
    try {
      const saved = await putSettings(next);
      setSettings(saved);
    } catch {
      // Keep optimistic state; the server is local and will retry on next change.
    }
  };

  return (
    <div className="settings-panel">
      <header>
        <h2>Settings</h2>
        <button type="button" className="ghost" onClick={onClose}>Close</button>
      </header>

      <section>
        <h3>Theme</h3>
        <div className="seg">
          {(['dark', 'light'] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              className={settings.theme === theme ? 'seg-btn active' : 'seg-btn'}
              onClick={() => persist({ ...settings, theme })}
            >
              {theme}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Sources</h3>
        {LIVE_SOURCES.map((id) => (
          <label key={id} className="toggle-row">
            <span>{id}</span>
            <input
              type="checkbox"
              checked={settings.sources[id]?.enabled ?? true}
              onChange={() => persist(toggleSourceEnabled(settings, id))}
            />
          </label>
        ))}
        <p className="muted">Source changes apply on next launch.</p>
      </section>

      <section>
        <h3>Tool → building mapping</h3>
        <ul className="mapping-list">
          {settings.mapping.rules.map((rule, index) => (
            <li key={`${rule.kind}-${index}`}>
              <code>
                {rule.kind === 'prefix'
                  ? `${rule.prefix}*`
                  : rule.kind === 'detail'
                    ? `${rule.tool} ~ ${rule.pattern}`
                    : rule.tool}
              </code>
              <span className="arrow">→</span>
              <span className={`feed-building b-${rule.building}`}>{rule.building}</span>
            </li>
          ))}
        </ul>
        <p className="muted">Fallback: {settings.mapping.fallback}</p>
      </section>
    </div>
  );
}
