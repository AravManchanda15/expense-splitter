import { useMemo, useState } from 'react';
import { useApp } from '../store';
import type { Category, Expense, Share, Trip } from '../types';
import { CATEGORIES, compressImage, parseAmount, todayStr, uid } from '../utils';
import Avatar from './Avatar';
import Modal from './Modal';

export default function ExpenseForm({
  trip,
  existing,
  onClose,
}: {
  trip: Trip;
  existing?: Expense;
  onClose: () => void;
}) {
  const { dispatch } = useApp();

  const [description, setDescription] = useState(existing?.description ?? '');
  const [amountStr, setAmountStr] = useState(
    existing ? (existing.amount / 100).toFixed(2) : '',
  );
  const [category, setCategory] = useState<Category>(existing?.category ?? 'Food');
  const [paidBy, setPaidBy] = useState(existing?.paidBy ?? trip.members[0]?.id ?? '');
  const [date, setDate] = useState(existing?.date ?? todayStr());
  const [photo, setPhoto] = useState<string | undefined>(existing?.photo);

  const existingIsCustom = useMemo(() => {
    if (!existing) return false;
    const pcts = existing.shares.map((s) => s.percentage);
    return new Set(pcts.map((p) => p.toFixed(4))).size > 1;
  }, [existing]);

  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>(
    existingIsCustom ? 'custom' : 'equal',
  );
  const [checked, setChecked] = useState<Set<string>>(
    () =>
      new Set(
        existing ? existing.shares.map((s) => s.personId) : trip.members.map((m) => m.id),
      ),
  );
  const [pct, setPct] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (existing) {
      for (const s of existing.shares) init[s.personId] = String(+s.percentage.toFixed(2));
    }
    return init;
  });

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const customTotal = [...checked].reduce((sum, id) => sum + (parseFloat(pct[id] || '0') || 0), 0);

  const onPhotoPick = async (file: File | null) => {
    if (!file) return;
    try {
      setPhoto(await compressImage(file));
    } catch {
      alert("Couldn't process that photo — the expense will be saved without it.");
    }
  };

  const save = () => {
    const amount = parseAmount(amountStr);
    if (!description.trim()) return alert('Add a short description.');
    if (amount === null) return alert('Enter a valid amount greater than zero.');
    if (!paidBy) return alert('Pick who paid.');
    if (checked.size === 0) return alert('Pick at least one person who benefited.');
    let shares: Share[];
    if (splitMode === 'equal') {
      shares = [...checked].map((personId) => ({ personId, percentage: 100 / checked.size }));
    } else {
      if (Math.abs(customTotal - 100) > 0.5) {
        return alert(`Custom shares must add up to 100% (currently ${customTotal.toFixed(1)}%).`);
      }
      shares = [...checked].map((personId) => ({
        personId,
        percentage: parseFloat(pct[personId] || '0') || 0,
      }));
      if (shares.some((s) => s.percentage <= 0)) {
        return alert('Every selected person needs a share above 0%.');
      }
    }

    const expense: Expense = {
      id: existing?.id ?? uid(),
      description: description.trim(),
      amount,
      category,
      paidBy,
      shares,
      date,
      photo,
      createdAt: existing?.createdAt ?? Date.now(),
    };
    if (existing) dispatch({ type: 'UPDATE_EXPENSE', tripId: trip.id, expense });
    else dispatch({ type: 'ADD_EXPENSE', tripId: trip.id, expense });
    onClose();
  };

  return (
    <Modal title={existing ? 'Edit Expense' : 'Add Expense'} onClose={onClose}>
      <div className="field">
        <label htmlFor="exp-desc">Description</label>
        <input
          id="exp-desc"
          type="text"
          placeholder="e.g. Groceries, Uber to airport"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="exp-amount">Amount</label>
          <input
            id="exp-amount"
            type="text"
            inputMode="decimal"
            placeholder="$0.00"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="exp-date">Date</label>
          <input
            id="exp-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label>Category</label>
        <div className="chip-row">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip ${category === c.id ? 'chip-active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="exp-payer">Who paid?</label>
        <select id="exp-payer" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
          {trip.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <div className="split-header">
          <label>Who benefited?</label>
          <div className="segmented">
            <button
              type="button"
              className={splitMode === 'equal' ? 'seg-active' : ''}
              onClick={() => setSplitMode('equal')}
            >
              Equally
            </button>
            <button
              type="button"
              className={splitMode === 'custom' ? 'seg-active' : ''}
              onClick={() => setSplitMode('custom')}
            >
              Custom %
            </button>
          </div>
        </div>

        {trip.members.map((m) => (
          <div key={m.id} className="benefiter-row">
            <label className="benefiter-check">
              <input
                type="checkbox"
                checked={checked.has(m.id)}
                onChange={() => toggle(m.id)}
              />
              <Avatar person={m} size={26} />
              <span>{m.name}</span>
            </label>
            {splitMode === 'custom' && checked.has(m.id) && (
              <span className="pct-input">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  aria-label={`${m.name} share percent`}
                  value={pct[m.id] ?? ''}
                  onChange={(e) => setPct((p) => ({ ...p, [m.id]: e.target.value }))}
                />
                %
              </span>
            )}
            {splitMode === 'equal' && checked.has(m.id) && (
              <span className="hint">{(100 / checked.size).toFixed(1)}%</span>
            )}
          </div>
        ))}

        {splitMode === 'custom' && (
          <p className={`hint ${Math.abs(customTotal - 100) > 0.5 ? 'hint-warn' : 'hint-ok'}`}>
            Total: {customTotal.toFixed(1)}% {Math.abs(customTotal - 100) <= 0.5 ? '✓' : '(must be 100%)'}
          </p>
        )}
      </div>

      <div className="field">
        <label>Receipt photo (optional)</label>
        {photo ? (
          <div className="receipt-preview">
            <img src={photo} alt="Receipt" />
            <button type="button" className="btn-secondary" onClick={() => setPhoto(undefined)}>
              Remove
            </button>
          </div>
        ) : (
          <label className="photo-picker">
            📷 Snap or choose a receipt
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => onPhotoPick(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>

      <button className="btn-primary" onClick={save}>
        {existing ? 'Save Changes' : 'Add Expense'}
      </button>

      {existing && (
        <button
          className="btn-danger"
          onClick={() => {
            if (confirm('Delete this expense?')) {
              dispatch({ type: 'DELETE_EXPENSE', tripId: trip.id, expenseId: existing.id });
              onClose();
            }
          }}
        >
          Delete Expense
        </button>
      )}
    </Modal>
  );
}
