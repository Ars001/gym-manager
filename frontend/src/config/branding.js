// Fallback branding defaults.
// WHY: used before the tenant's real settings load (or if the API is down) so
// the UI never renders unstyled. Live values come from the tenant record via
// AuthContext; these are just the safe defaults.

export const DEFAULT_BRANDING = {
  name: 'Gym Manager',
  primary_color: '#2563eb',
  secondary_color: '#1e293b',
  currency: 'USD',
};

// Format an integer number of cents as currency for display.
export function formatMoney(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    (cents || 0) / 100
  );
}
