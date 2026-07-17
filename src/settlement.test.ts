/**
 * Standalone settlement-algorithm tests. Run with: npm test
 * (Node 23+ executes TypeScript natively via type stripping.)
 */
import { computeBalances, minimizeSettlements, totalSpend } from './settlement.ts';
import type { Expense, Person } from './types.ts';

let failures = 0;
function assert(cond: boolean, label: string) {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.error(`  FAIL  ${label}`);
  }
}

function person(id: string, name: string): Person {
  return { id, name, color: '#000', initials: name.slice(0, 2).toUpperCase() };
}

function expense(
  paidBy: string,
  amount: number,
  shares: { personId: string; percentage: number }[],
  category: Expense['category'] = 'Food',
): Expense {
  return {
    id: Math.random().toString(36).slice(2),
    description: 'test',
    amount,
    category,
    paidBy,
    shares,
    date: '2026-07-17',
    createdAt: Date.now(),
  };
}

const alice = person('a', 'Alice');
const bob = person('b', 'Bob');
const charlie = person('c', 'Charlie');
const dana = person('d', 'Dana');
const members = [alice, bob, charlie, dana];

console.log('\n— Equal split conservation —');
{
  // $100 paid by Alice, split equally 4 ways: 100/4 = $25 each.
  const exps = [
    expense('a', 10000, members.map((m) => ({ personId: m.id, percentage: 25 }))),
  ];
  const bal = computeBalances(members, exps);
  assert(bal['a'] === 7500, 'Alice is owed $75.00');
  assert(bal['b'] === -2500 && bal['c'] === -2500 && bal['d'] === -2500, 'others owe $25.00 each');
  assert(Object.values(bal).reduce((s, v) => s + v, 0) === 0, 'balances sum to zero');
}

console.log('\n— Rounding: $100 split 3 ways stays exact —');
{
  const three = [alice, bob, charlie];
  const exps = [
    expense('a', 10000, three.map((m) => ({ personId: m.id, percentage: 100 / 3 }))),
  ];
  const bal = computeBalances(three, exps);
  assert(Object.values(bal).reduce((s, v) => s + v, 0) === 0, 'balances sum to zero despite 33.33% shares');
}

console.log('\n— Unequal split 40/60 —');
{
  const exps = [
    expense('a', 5000, [
      { personId: 'a', percentage: 40 },
      { personId: 'b', percentage: 60 },
    ]),
  ];
  const bal = computeBalances([alice, bob], exps);
  assert(bal['a'] === 3000, 'Alice net +$30.00 (paid 50, owes her 40% = 20)');
  assert(bal['b'] === -3000, 'Bob net -$30.00');
}

console.log('\n— Payer not a benefiter —');
{
  const exps = [
    expense('a', 6000, [
      { personId: 'b', percentage: 50 },
      { personId: 'c', percentage: 50 },
    ]),
  ];
  const bal = computeBalances(members, exps);
  assert(bal['a'] === 6000, 'Alice is owed the full $60.00');
  assert(bal['b'] === -3000 && bal['c'] === -3000, 'Bob and Charlie owe $30.00 each');
  assert(bal['d'] === 0, 'Dana unaffected');
}

console.log('\n— Greedy minimization: circular debt collapses —');
{
  // A owes B $20, B owes C $20, C owes A $10 → nets: A -10, B 0, C +10 → 1 transaction.
  const bal = { a: -1000, b: 0, c: 1000 };
  const s = minimizeSettlements(bal);
  assert(s.length === 1, `single transaction (got ${s.length})`);
  assert(s[0].from === 'a' && s[0].to === 'c' && s[0].amount === 1000, 'A pays C $10.00');
}

console.log('\n— Minimization: n people ⇒ ≤ n-1 transactions —');
{
  const exps = [
    expense('a', 12000, members.map((m) => ({ personId: m.id, percentage: 25 }))),
    expense('b', 8000, members.map((m) => ({ personId: m.id, percentage: 25 }))),
    expense('c', 4400, [
      { personId: 'c', percentage: 40 },
      { personId: 'd', percentage: 60 },
    ]),
    expense('d', 3000, [
      { personId: 'a', percentage: 50 },
      { personId: 'b', percentage: 50 },
    ]),
    expense('a', 2500, [
      { personId: 'b', percentage: 100 },
    ]),
  ];
  const bal = computeBalances(members, exps);
  const s = minimizeSettlements(bal);
  assert(s.length <= 3, `at most 3 transactions for 4 people (got ${s.length})`);

  // Applying the settlements must zero every balance.
  const after = { ...bal };
  for (const t of s) {
    after[t.from] += t.amount;
    after[t.to] -= t.amount;
  }
  assert(Object.values(after).every((v) => v === 0), 'applying settlements zeroes all balances');
}

console.log('\n— Settlement expenses zero out debt —');
{
  const exps = [
    expense('a', 4000, [
      { personId: 'a', percentage: 50 },
      { personId: 'b', percentage: 50 },
    ]),
    // Bob pays Alice back $20 — recorded as a Settlement expense.
    expense('b', 2000, [{ personId: 'a', percentage: 100 }], 'Settlement'),
  ];
  const bal = computeBalances([alice, bob], exps);
  assert(bal['a'] === 0 && bal['b'] === 0, 'both settled after reimbursement');
  assert(totalSpend(exps) === 4000, 'totalSpend excludes settlement transfers');
}

console.log('\n— Empty and edge cases —');
{
  assert(minimizeSettlements({}).length === 0, 'no balances → no settlements');
  assert(minimizeSettlements({ a: 0, b: 0 }).length === 0, 'all-zero → no settlements');
  const bal = computeBalances(members, []);
  assert(Object.values(bal).every((v) => v === 0), 'no expenses → all zero');
}

if (failures > 0) {
  console.error(`\n${failures} test(s) FAILED`);
  process.exit(1);
}
console.log('\nAll settlement tests passed ✔');
