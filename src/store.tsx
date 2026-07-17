import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import type { Dispatch, ReactNode } from 'react';
import type { AppState, Expense, Person, Theme, Trip } from './types';

const STORAGE_KEY = 'expense-splitter-state-v1';

export type Action =
  | { type: 'ADD_TRIP'; trip: Trip }
  | { type: 'UPDATE_TRIP'; tripId: string; name: string }
  | { type: 'DELETE_TRIP'; tripId: string }
  | { type: 'SET_ACTIVE'; tripId: string | null }
  | { type: 'ADD_MEMBER'; tripId: string; person: Person }
  | { type: 'REMOVE_MEMBER'; tripId: string; personId: string }
  | { type: 'ADD_EXPENSE'; tripId: string; expense: Expense }
  | { type: 'UPDATE_EXPENSE'; tripId: string; expense: Expense }
  | { type: 'DELETE_EXPENSE'; tripId: string; expenseId: string }
  | { type: 'SET_THEME'; theme: Theme }
  | { type: 'CLEAR_ALL' };

const initialState: AppState = { trips: [], activeTripId: null, theme: 'system' };

function withTrip(state: AppState, tripId: string, fn: (t: Trip) => Trip): AppState {
  return { ...state, trips: state.trips.map((t) => (t.id === tripId ? fn(t) : t)) };
}

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'ADD_TRIP':
      return { ...state, trips: [a.trip, ...state.trips], activeTripId: a.trip.id };
    case 'UPDATE_TRIP':
      return withTrip(state, a.tripId, (t) => ({ ...t, name: a.name }));
    case 'DELETE_TRIP': {
      const trips = state.trips.filter((t) => t.id !== a.tripId);
      return {
        ...state,
        trips,
        activeTripId:
          state.activeTripId === a.tripId ? (trips[0]?.id ?? null) : state.activeTripId,
      };
    }
    case 'SET_ACTIVE':
      return { ...state, activeTripId: a.tripId };
    case 'ADD_MEMBER':
      return withTrip(state, a.tripId, (t) => ({ ...t, members: [...t.members, a.person] }));
    case 'REMOVE_MEMBER':
      return withTrip(state, a.tripId, (t) => ({
        ...t,
        members: t.members.filter((m) => m.id !== a.personId),
      }));
    case 'ADD_EXPENSE':
      return withTrip(state, a.tripId, (t) => ({ ...t, expenses: [a.expense, ...t.expenses] }));
    case 'UPDATE_EXPENSE':
      return withTrip(state, a.tripId, (t) => ({
        ...t,
        expenses: t.expenses.map((e) => (e.id === a.expense.id ? a.expense : e)),
      }));
    case 'DELETE_EXPENSE':
      return withTrip(state, a.tripId, (t) => ({
        ...t,
        expenses: t.expenses.filter((e) => e.id !== a.expenseId),
      }));
    case 'SET_THEME':
      return { ...state, theme: a.theme };
    case 'CLEAR_ALL':
      return initialState;
    default:
      return state;
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      return {
        trips: Array.isArray(parsed.trips) ? parsed.trips : [],
        activeTripId: parsed.activeTripId ?? null,
        theme: parsed.theme ?? 'system',
      };
    }
  } catch (err) {
    console.warn('Could not load saved data:', err);
  }
  return initialState;
}

interface Ctx {
  state: AppState;
  dispatch: Dispatch<Action>;
  activeTrip: Trip | null;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  // Auto-save on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Could not save (storage full?):', err);
    }
  }, [state]);

  const activeTrip = useMemo(
    () => state.trips.find((t) => t.id === state.activeTripId) ?? null,
    [state.trips, state.activeTripId],
  );

  const value = useMemo(() => ({ state, dispatch, activeTrip }), [state, activeTrip]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
