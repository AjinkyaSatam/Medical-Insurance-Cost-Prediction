/**
 * Currency Formatting & Indian Numbering Utilities
 * Formats figures in INR using Intl.NumberFormat('en-IN') and Lakh/Crore short forms.
 */

export const DEFAULT_USD_TO_INR_RATE = 96.0;
export const DEFAULT_INDIA_COST_FACTOR = 1.0;

/**
 * Converts a USD value to India-adjusted INR
 */
export function convertUsdToInr(usdVal, rate = DEFAULT_USD_TO_INR_RATE, factor = DEFAULT_INDIA_COST_FACTOR) {
  if (usdVal === null || usdVal === undefined || isNaN(usdVal)) return 0;
  return Number(usdVal) * rate * factor;
}

/**
 * Returns Lakh / Crore condensed representation of an INR value
 * Examples:
 *   1,25,000 -> "1.25 Lakh"
 *   1,50,00,000 -> "1.50 Crore"
 */
export function formatInrLakhCrore(inrVal) {
  if (inrVal === null || inrVal === undefined || isNaN(inrVal)) return '';
  const num = Math.abs(Number(inrVal));
  const sign = Number(inrVal) < 0 ? '-' : '';

  if (num >= 10000000) {
    return `${sign}₹${(num / 10000000).toFixed(2)} Cr`;
  } else if (num >= 100000) {
    return `${sign}₹${(num / 100000).toFixed(2)} Lakh`;
  } else if (num >= 1000) {
    return `${sign}₹${(num / 1000).toFixed(1)}k`;
  }
  return `${sign}₹${num.toFixed(0)}`;
}

/**
 * Primary formatting function supporting INR (en-IN) and USD (en-US)
 */
export function formatCurrency(amount, currency = 'INR', options = { withShort: false, decimals: 0 }) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  const num = Number(amount);

  if (currency === 'INR') {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: options.decimals ?? 0,
    }).format(num);

    if (options.withShort) {
      const short = formatInrLakhCrore(num);
      return `${formatted} (${short})`;
    }
    return formatted;
  }

  // Fallback to USD
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: options.decimals ?? 0,
  }).format(num);
}
