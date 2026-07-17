import type { Expense, Person, Share } from './types';

/**
 * Net balance per person in integer cents.
 * Positive = the group owes this person money (they are a creditor).
 * Negative = this person owes the group money (they are a debtor).
 *
 * Allocation is done in integer cents with the final share absorbing the
 * rounding remainder, so balances always sum to exactly zero.
 */
export function computeBalances(
  members: Person[],
  expenses: Expense[],
): Record<string, number> {
  const bal: Record<string, number> = {};
  for (const m of members) bal[m.id] = 0;

  for (const e of expenses) {
    if (!(e.paidBy in bal)) continue;
    const shares: Share[] = e.shares.filter((s) => s.personId in bal);
    if (shares.length === 0) continue;

    bal[e.paidBy] += e.amount;

    const totalWeight = shares.reduce((sum, s) => sum + s.percentage, 0);
    if (totalWeight <= 0) continue;

    let allocated = 0;
    shares.forEach((s, i) => {
      const cut =
        i === shares.length - 1
          ? e.amount - allocated
          : Math.round((e.amount * s.percentage) / totalWeight);
      allocated += cut;
      bal[s.personId] -= cut;
    });
  }
  return bal;
}

export interface Settlement {
  from: string; // debtor person id
  to: string; // creditor person id
  amount: number; // cents
}

/**
 * Greedy transaction minimization: repeatedly match the largest debtor with
 * the largest creditor and settle min(debt, credit). Produces at most n-1
 * transactions for n people with nonzero balances.
 */
export function minimizeSettlements(
  balances: Record<string, number>,
): Settlement[] {
  const debtors: { id: string; amt: number }[] = [];
  const creditors: { id: string; amt: number }[] = [];
  for (const [id, b] of Object.entries(balances)) {
    if (b < 0) debtors.push({ id, amt: -b });
    else if (b > 0) creditors.push({ id, amt: b });
  }

  const result: Settlement[] = [];
  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort((a, b) => b.amt - a.amt);
    creditors.sort((a, b) => b.amt - a.amt);
    const d = debtors[0];
    const c = creditors[0];
    const pay = Math.min(d.amt, c.amt);
    result.push({ from: d.id, to: c.id, amount: pay });
    d.amt -= pay;
    c.amt -= pay;
    if (d.amt === 0) debtors.shift();
    if (c.amt === 0) creditors.shift();
  }
  return result;
}

/** Total genuine spending (settlement transfers excluded). */
export function totalSpend(expenses: Expense[]): number {
  return expenses
    .filter((e) => e.category !== 'Settlement')
    .reduce((sum, e) => sum + e.amount, 0);
}
