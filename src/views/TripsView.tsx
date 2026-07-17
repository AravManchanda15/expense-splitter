import { useState } from 'react';
import { useApp } from '../store';
import type { Person, TabId, Trip } from '../types';
import { PALETTE, fmt, formatDate, initialsOf, todayStr, uid } from '../utils';
import { totalSpend } from '../settlement';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';

function MemberEditor({
  members,
  onAdd,
  onRemove,
  canRemove,
}: {
  members: Person[];
  onAdd: (p: Person) => void;
  onRemove: (id: string) => void;
  canRemove: (id: string) => boolean;
}) {
  const [name, setName] = useState('');

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({
      id: uid(),
      name: trimmed,
      color: PALETTE[members.length % PALETTE.length],
      initials: initialsOf(trimmed),
    });
    setName('');
  };

  return (
    <div className="field">
      <label>People</label>
      <div className="member-add-row">
        <input
          type="text"
          placeholder="Add a person…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button type="button" className="btn-secondary" onClick={add}>
          Add
        </button>
      </div>
      <div className="member-list">
        {members.map((m) => (
          <span key={m.id} className="member-chip">
            <Avatar person={m} size={24} />
            {m.name}
            <button
              type="button"
              className="chip-x"
              aria-label={`Remove ${m.name}`}
              onClick={() => {
                if (!canRemove(m.id)) {
                  alert(`${m.name} is part of existing expenses and can't be removed.`);
                  return;
                }
                onRemove(m.id);
              }}
            >
              ✕
            </button>
          </span>
        ))}
        {members.length === 0 && <span className="hint">No people yet — add at least two.</span>}
      </div>
    </div>
  );
}

function NewTripSheet({ onClose }: { onClose: () => void }) {
  const { dispatch } = useApp();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<Person[]>([]);

  const create = () => {
    if (!name.trim()) {
      alert('Give the trip a name.');
      return;
    }
    if (members.length < 2) {
      alert('Add at least two people so there is something to split.');
      return;
    }
    const trip: Trip = {
      id: uid(),
      name: name.trim(),
      createdDate: todayStr(),
      members,
      expenses: [],
    };
    dispatch({ type: 'ADD_TRIP', trip });
    onClose();
  };

  return (
    <Modal title="New Trip" onClose={onClose}>
      <div className="field">
        <label htmlFor="trip-name">Trip name</label>
        <input
          id="trip-name"
          type="text"
          placeholder="e.g. Tahoe Weekend"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <MemberEditor
        members={members}
        onAdd={(p) => setMembers((ms) => [...ms, p])}
        onRemove={(id) => setMembers((ms) => ms.filter((m) => m.id !== id))}
        canRemove={() => true}
      />
      <button className="btn-primary" onClick={create}>
        Create Trip
      </button>
    </Modal>
  );
}

function EditTripSheet({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { dispatch } = useApp();
  const [name, setName] = useState(trip.name);

  const involved = (personId: string) =>
    trip.expenses.some(
      (e) => e.paidBy === personId || e.shares.some((s) => s.personId === personId),
    );

  return (
    <Modal title="Edit Trip" onClose={onClose}>
      <div className="field">
        <label htmlFor="edit-trip-name">Trip name</label>
        <input
          id="edit-trip-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim()) dispatch({ type: 'UPDATE_TRIP', tripId: trip.id, name: name.trim() });
          }}
        />
      </div>
      <MemberEditor
        members={trip.members}
        onAdd={(p) => dispatch({ type: 'ADD_MEMBER', tripId: trip.id, person: p })}
        onRemove={(id) => dispatch({ type: 'REMOVE_MEMBER', tripId: trip.id, personId: id })}
        canRemove={(id) => !involved(id)}
      />
      <button
        className="btn-danger"
        onClick={() => {
          if (confirm(`Delete "${trip.name}" and all its expenses? This can't be undone.`)) {
            dispatch({ type: 'DELETE_TRIP', tripId: trip.id });
            onClose();
          }
        }}
      >
        Delete Trip
      </button>
    </Modal>
  );
}

export default function TripsView({ setTab }: { setTab: (t: TabId) => void }) {
  const { state, dispatch } = useApp();
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Trip | null>(null);

  return (
    <>
      <header className="view-header">
        <h1>Trips</h1>
        <p className="subtitle">Every getaway, dinner, or household — one place.</p>
      </header>

      {state.trips.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">🏝️</div>
          <h3>No trips yet</h3>
          <p>Create your first trip and add the people splitting costs.</p>
        </div>
      )}

      <div className="trip-list">
        {state.trips.map((t) => {
          const active = t.id === state.activeTripId;
          return (
            <button
              key={t.id}
              className={`card trip-card ${active ? 'trip-card-active' : ''}`}
              onClick={() => {
                dispatch({ type: 'SET_ACTIVE', tripId: t.id });
                setTab('expenses');
              }}
            >
              <div className="trip-card-top">
                <div>
                  <h3>{t.name}</h3>
                  <span className="hint">
                    {formatDate(t.createdDate)} · {t.expenses.length} expense
                    {t.expenses.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="trip-total">{fmt(totalSpend(t.expenses))}</div>
              </div>
              <div className="trip-card-bottom">
                <div className="avatar-row">
                  {t.members.map((m) => (
                    <Avatar key={m.id} person={m} size={28} />
                  ))}
                </div>
                <span
                  className="link"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(t);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                      setEditing(t);
                    }
                  }}
                >
                  Edit
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <button className="fab" onClick={() => setShowNew(true)} aria-label="New trip">
        +
      </button>

      {showNew && <NewTripSheet onClose={() => setShowNew(false)} />}
      {editing && <EditTripSheet trip={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
