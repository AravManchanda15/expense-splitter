import type { Category } from './types';

export const uid = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** Calm, trust-focused palette — assigned round-robin to trip members. */
export const PALETTE = [
  '#4F8EF7', // blue
  '#34C77B', // green
  '#F7B84F', // amber
  '#F76D6D', // coral
  '#9B6DF7', // violet
  '#2BC8D9', // teal
  '#F76DC3', // pink
  '#8AC926', // lime
  '#FF9F1C', // orange
  '#5C7AEA', // indigo
];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/** Format integer cents as $X.XX */
export function fmt(cents: number): string {
  return currency.format(cents / 100);
}

/** Parse a user-typed dollar string into integer cents, or null if invalid. */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '');
  if (!/^\d*\.?\d{0,2}$/.test(cleaned) || cleaned === '' || cleaned === '.') return null;
  const cents = Math.round(parseFloat(cleaned) * 100);
  return Number.isFinite(cents) && cents > 0 ? cents : null;
}

export function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'Food', label: 'Food', emoji: '🍜' },
  { id: 'Transport', label: 'Transport', emoji: '🚕' },
  { id: 'Lodging', label: 'Lodging', emoji: '🏨' },
  { id: 'Entertainment', label: 'Entertainment', emoji: '🎟️' },
  { id: 'Other', label: 'Other', emoji: '📦' },
];

export function categoryEmoji(cat: Category): string {
  if (cat === 'Settlement') return '🤝';
  return CATEGORIES.find((c) => c.id === cat)?.emoji ?? '📦';
}

/**
 * Compress an image file to a JPEG data-URL (max 1000px on the long edge)
 * so receipt photos fit comfortably in localStorage.
 */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.onload = () => {
        const MAX = 1000;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
