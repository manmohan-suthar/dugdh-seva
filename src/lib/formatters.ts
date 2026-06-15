/**
 * Helper utilities for formatting dairy metrics, currency, dates, and shifts.
 */

/**
 * Format currency to Indian Rupee (₹) layout
 * Example: 1234.5 -> ₹1,234.50
 */
export function formatCurrency(value: number): string {
  const cleanValue = isNaN(value) ? 0 : value;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(cleanValue).replace('INR', '₹').trim();
}

/**
 * Format milk quantity to Liters (L)
 * Example: 5 -> 5.00 L
 */
export function formatLiters(value: number): string {
  const cleanValue = isNaN(value) ? 0 : value;
  return `${cleanValue.toFixed(2)} L`;
}

/**
 * Format dates to DD MMM YYYY
 * Example: 2026-06-15T10:54:00Z -> 15 Jun 2026
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-IN', options);
}

/**
 * Format Shift Time with Hindi Translation
 * Example: morning -> Morning (सुबह)
 */
export function formatShift(shift: 'morning' | 'evening'): string {
  if (shift === 'morning') {
    return 'Morning (सुबह)';
  }
  return 'Evening (शाम)';
}
