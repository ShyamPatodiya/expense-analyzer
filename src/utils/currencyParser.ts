/**
 * Parses various currency formats used in bank statements.
 * Handles: "₹1,234.56", "-₹500", "+1000", "1234.56 Dr", Indian lakhs/crores.
 * Returns positive for credits, negative for debits.
 */
export function parseCurrency(value: string | number): number {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  if (typeof value !== 'string' || !value.trim()) {
    return 0;
  }

  const str = value.trim();
  const isDebit =
    /dr\.?$/i.test(str) ||
    /debit/i.test(str) ||
    (str.startsWith('-') && !/^-\s*\+/.test(str)) ||
    /^\d.*\s+dr\.?$/i.test(str);

  // Remove currency symbols, commas, and text indicators
  let cleaned = str
    .replace(/[₹$€£,\s]/g, '')
    .replace(/dr\.?$/gi, '')
    .replace(/cr\.?$/gi, '')
    .replace(/debit/gi, '')
    .replace(/credit/gi, '')
    .trim();

  // Handle + or - prefix
  const hasMinus = cleaned.startsWith('-');
  const hasPlus = cleaned.startsWith('+');
  if (hasMinus || hasPlus) {
    cleaned = cleaned.slice(1).trim();
  }

  // Parse number - support Indian format (e.g. 1,50,000.00)
  const numStr = cleaned.replace(/,/g, '');
  const num = parseFloat(numStr);

  if (isNaN(num)) {
    return 0;
  }

  // Determine sign: debit = negative, credit = positive
  if (isDebit || hasMinus) {
    return -Math.abs(num);
  }
  if (hasPlus) {
    return Math.abs(num);
  }
  // If no indicator, positive value is credit, negative string was already handled
  return num;
}
