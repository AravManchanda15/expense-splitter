export type Category =
  | 'Food'
  | 'Transport'
  | 'Lodging'
  | 'Entertainment'
  | 'Other'
  | 'Settlement';

export interface Person {
  id: string;
  name: string;
  color: string;
  initials: string;
}

export interface Share {
  personId: string;
  /** Weight of this person's share; normally all shares sum to ~100. */
  percentage: number;
}

export interface Expense {
  id: string;
  description: string;
  /** Amount in integer cents. */
  amount: number;
  category: Category;
  paidBy: string;
  shares: Share[];
  /** ISO date YYYY-MM-DD */
  date: string;
  /** Data-URL of a compressed receipt photo. */
  photo?: string;
  createdAt: number;
}

export interface Trip {
  id: string;
  name: string;
  createdDate: string;
  members: Person[];
  expenses: Expense[];
}

export type Theme = 'system' | 'light' | 'dark';

export interface AppState {
  trips: Trip[];
  activeTripId: string | null;
  theme: Theme;
}

export type TabId = 'trips' | 'expenses' | 'settle' | 'settings';
