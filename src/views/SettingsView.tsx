import { useApp } from '../store';
import type { Theme } from '../types';

const THEMES: { id: Theme; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export default function SettingsView() {
  const { state, dispatch } = useApp();

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splittrip-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <header className="view-header">
        <h1>Settings</h1>
        <p className="subtitle">Appearance and your data.</p>
      </header>

      <section className="card">
        <h3 className="card-title">Appearance</h3>
        <div className="segmented segmented-wide">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={state.theme === t.id ? 'seg-active' : ''}
              onClick={() => dispatch({ type: 'SET_THEME', theme: t.id })}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h3 className="card-title">Data</h3>
        <p className="hint">
          Everything is stored locally on this device — no accounts, no servers. Trips:{' '}
          {state.trips.length}.
        </p>
        <button className="btn-secondary" onClick={exportData}>
          Export backup (JSON)
        </button>
        <button
          className="btn-danger"
          onClick={() => {
            if (
              confirm('Delete ALL trips, people, and expenses?') &&
              confirm('Really sure? This cannot be undone.')
            ) {
              dispatch({ type: 'CLEAR_ALL' });
            }
          }}
        >
          Erase all data
        </button>
      </section>

      <section className="card">
        <h3 className="card-title">About</h3>
        <p className="hint">
          SplitTrip v1.0 — itemized expenses, unequal splits, receipt photos, and a greedy
          settlement algorithm that minimizes the number of payments.
        </p>
      </section>
    </>
  );
}
