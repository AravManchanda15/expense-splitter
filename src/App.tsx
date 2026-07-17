import { useEffect, useState } from 'react';
import { useApp } from './store';
import type { TabId } from './types';
import TripsView from './views/TripsView';
import ExpensesView from './views/ExpensesView';
import SettleView from './views/SettleView';
import SettingsView from './views/SettingsView';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'trips', label: 'Trips', icon: '🧳' },
  { id: 'expenses', label: 'Expenses', icon: '🧾' },
  { id: 'settle', label: 'Settle Up', icon: '💸' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const { state } = useApp();
  const [tab, setTab] = useState<TabId>(state.trips.length > 0 ? 'expenses' : 'trips');

  // Resolve 'system' theme and react to OS changes.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = state.theme === 'system' ? (mq.matches ? 'dark' : 'light') : state.theme;
      document.documentElement.dataset.theme = resolved;
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [state.theme]);

  return (
    <div className="app">
      <main className="view">
        {tab === 'trips' && <TripsView setTab={setTab} />}
        {tab === 'expenses' && <ExpensesView setTab={setTab} />}
        {tab === 'settle' && <SettleView setTab={setTab} />}
        {tab === 'settings' && <SettingsView />}
      </main>

      <nav className="tabbar" aria-label="Main navigation">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'tab-active' : ''}`}
            onClick={() => setTab(t.id)}
            aria-label={t.label}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            <span className="tab-icon" aria-hidden="true">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
