// Fallback branding defaults + small display helpers.
// WHY: used before the tenant's real settings load (or if the API is down) so
// the UI never renders unstyled. Live values come from the tenant record via
// AuthContext; these are just the safe defaults.

export const DEFAULT_BRANDING = {
  name: 'Gym Manager',
  primary_color: '#4f46e5',
  secondary_color: '#0f172a',
  currency: 'USD',
};

// Format an integer number of cents as currency for display.
export function formatMoney(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents || 0) / 100);
}

// Up-to-2-letter initials from a name or email, for avatars/logos.
export function initials(value) {
  if (!value) return '?';
  const base = String(value).split('@')[0].replace(/[._-]+/g, ' ').trim();
  const parts = base.split(/\s+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : base.slice(0, 2);
  return letters.toUpperCase();
}
