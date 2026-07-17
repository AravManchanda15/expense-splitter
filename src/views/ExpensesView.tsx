import { useMemo, useState } from 'react';
import { useApp } from '../store';
import type { Expense, TabId } from '../types';
import { CATEGORIES, categoryEmoji, fmt, formatDate } from '../utils';
import Avatar from '../components/Avatar';
import ExpenseForm from '../components/ExpenseForm';

export default function ExpensesView({ setTab }: { setTab: (t: TabId) => void }) {
  const { state, dispatch, activeTrip } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [personFilter, setPersonFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filtered = useMemo(() => {
    if (!activeTrip) return [];
    return activeTrip.expenses
      .filter((e) => {
        if (q && !e.description.toLowerCase().includes(q.toLowerCase())) return false;
        if (catFilter && e.category !== catFilter) return false;
        if (
          personFilter &&
          e.paidBy !== personFilter &&
          !e.shares.some((s) => s.personId === personFilter)
        )
          return false;
        if (fromDate && e.date < fromDate) return false;
        if (toDate && e.date > toDate) return false;
        return true;
      })
      .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date < a.date ? -1 : 1));
  }, [activeTrip, q, catFilter, personFilter, fromDate, toDate]);

  if (!activeTrip) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">🧾</div>
        <h3>No trip selected</h3>
        <p>Create or pick a trip first — expenses live inside trips.</p>
        <button className="btn-primary" onClick={() => setTab('trips')}>
          Go to Trips
        </button>
      </div>
    );
  }

  const personById = new Map(activeTrip.members.map((m) => [m.id, m]));
  const filteredTotal = filtered.reduce((s, e) => s + e.amount, 0);
  const anyFilter = q || catFilter || personFilter || fromDate || toDate;

  return (
    <>
      <header className="view-header">
        <h1>Expenses</h1>
        {state.trips.length > 1 ? (
          <select
            className="trip-switcher"
            value={activeTrip.id}
            onChange={(e) => dispatch({ type: 'SET_ACTIVE', tripId: e.target.value })}
            aria-label="Switch trip"
          >
            {state.trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="subtitle">{activeTrip.name}</p>
        )}
      </header>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="Search expenses…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className={`btn-secondary ${showFilters || anyFilter ? 'btn-secondary-active' : ''}`}
          onClick={() => setShowFilters((v) => !v)}
        >
          Filters {anyFilter ? '•' : ''}
        </button>
      </div>

      {showFilters && (
        <div className="card filter-panel">
          <div className="field-row">
            <div className="field">
              <label htmlFor="f-cat">Category</label>
              <select id="f-cat" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="">All</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
                <option value="Settlement">🤝 Settlement</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-person">Person</label>
              <select
                id="f-person"
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
              >
                <option value="">Everyone</option>
                {activeTrip.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="f-from">From</label>
              <input id="f-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="f-to">To</label>
              <input id="f-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          {anyFilter && (
            <button
              className="btn-secondary"
              onClick={() => {
                setQ('');
                setCatFilter('');
                setPersonFilter('');
                setFromDate('');
                setToDate('');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <p className="list-summary">
        {filtered.length} expense{filtered.length === 1 ? '' : 's'} · {fmt(filteredTotal)}
      </p>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">✨</div>
          <h3>{anyFilter ? 'Nothing matches' : 'No expenses yet'}</h3>
          <p>{anyFilter ? 'Try loosening the filters.' : 'Tap + to add the first expense.'}</p>
        </div>
      )}

      <div className="expense-list">
        {filtered.map((e) => {
          const payer = personById.get(e.paidBy);
          return (
            <button key={e.id} className="card expense-card" onClick={() => setEditing(e)}>
              <span className="expense-emoji" aria-hidden="true">
                {categoryEmoji(e.category)}
              </span>
              <span className="expense-mid">
                <span className="expense-desc">
                  {e.description}
                  {e.photo && <span title="Has receipt photo"> 📎</span>}
                </span>
                <span className="hint">
                  {payer ? `${payer.name} paid` : 'Unknown paid'} · {formatDate(e.date)}
                </span>
                <span className="avatar-row avatar-row-tight">
                  {e.shares.map((s) => {
                    const p = personById.get(s.personId);
                    return p ? <Avatar key={s.personId} person={p} size={20} /> : null;
                  })}
                </span>
              </span>
              <span className="expense-amount">{fmt(e.amount)}</span>
            </button>
          );
        })}
      </div>

      <button className="fab" onClick={() => setShowForm(true)} aria-label="Add expense">
        +
      </button>

      {showForm && <ExpenseForm trip={activeTrip} onClose={() => setShowForm(false)} />}
      {editing && (
        <ExpenseForm trip={activeTrip} existing={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
