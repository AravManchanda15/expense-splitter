import { useApp } from '../store';
import type { TabId } from '../types';
import { computeBalances, minimizeSettlements, totalSpend } from '../settlement';
import { fmt, todayStr, uid } from '../utils';
import Avatar from '../components/Avatar';
import DebtGraph from '../components/DebtGraph';

export default function SettleView({ setTab }: { setTab: (t: TabId) => void }) {
  const { dispatch, activeTrip } = useApp();

  if (!activeTrip) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">💸</div>
        <h3>No trip selected</h3>
        <p>Pick a trip to see who owes whom.</p>
        <button className="btn-primary" onClick={() => setTab('trips')}>
          Go to Trips
        </button>
      </div>
    );
  }

  const balances = computeBalances(activeTrip.members, activeTrip.expenses);
  const settlements = minimizeSettlements(balances);
  const personById = new Map(activeTrip.members.map((m) => [m.id, m]));
  const spend = totalSpend(activeTrip.expenses);

  const markPaid = (from: string, to: string, amount: number) => {
    const payer = personById.get(from);
    const payee = personById.get(to);
    if (!payer || !payee) return;
    if (!confirm(`Record that ${payer.name} paid ${payee.name} ${fmt(amount)}?`)) return;
    dispatch({
      type: 'ADD_EXPENSE',
      tripId: activeTrip.id,
      expense: {
        id: uid(),
        description: `Settlement: ${payer.name} → ${payee.name}`,
        amount,
        category: 'Settlement',
        paidBy: from,
        shares: [{ personId: to, percentage: 100 }],
        date: todayStr(),
        createdAt: Date.now(),
      },
    });
  };

  return (
    <>
      <header className="view-header">
        <h1>Settle Up</h1>
        <p className="subtitle">
          {activeTrip.name} · {fmt(spend)} total spend
        </p>
      </header>

      {activeTrip.expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">🪄</div>
          <h3>Nothing to settle</h3>
          <p>Add some expenses first, then come back to see optimal payments.</p>
          <button className="btn-primary" onClick={() => setTab('expenses')}>
            Add Expenses
          </button>
        </div>
      ) : (
        <>
          <section className="card">
            <h3 className="card-title">Balances</h3>
            {activeTrip.members.map((m) => {
              const b = balances[m.id] ?? 0;
              return (
                <div key={m.id} className="balance-row">
                  <Avatar person={m} size={30} />
                  <span className="balance-name">{m.name}</span>
                  <span
                    className={`balance-chip ${
                      b > 0 ? 'chip-pos' : b < 0 ? 'chip-neg' : 'chip-zero'
                    }`}
                  >
                    {b > 0 ? `gets back ${fmt(b)}` : b < 0 ? `owes ${fmt(-b)}` : 'settled ✓'}
                  </span>
                </div>
              );
            })}
          </section>

          {settlements.length > 0 && (
            <section className="card">
              <h3 className="card-title">Debt Flow</h3>
              <DebtGraph members={activeTrip.members} settlements={settlements} />
            </section>
          )}

          <section className="card">
            <h3 className="card-title">
              {settlements.length > 0
                ? `Optimal payments — just ${settlements.length} transaction${
                    settlements.length === 1 ? '' : 's'
                  }`
                : 'All settled'}
            </h3>
            {settlements.length === 0 && (
              <p className="all-settled">🎉 Everyone is square. Nothing owed.</p>
            )}
            {settlements.map((s, i) => {
              const from = personById.get(s.from);
              const to = personById.get(s.to);
              if (!from || !to) return null;
              return (
                <div key={i} className="settlement-row">
                  <Avatar person={from} size={28} />
                  <span className="settlement-text">
                    <strong>{from.name}</strong> owes <strong>{to.name}</strong>
                  </span>
                  <Avatar person={to} size={28} />
                  <span className="settlement-amount">{fmt(s.amount)}</span>
                  <button
                    className="btn-mini"
                    onClick={() => markPaid(s.from, s.to, s.amount)}
                    aria-label={`Mark ${from.name} paid ${to.name}`}
                  >
                    ✓ Paid
                  </button>
                </div>
              );
            })}
          </section>
        </>
      )}
    </>
  );
}
