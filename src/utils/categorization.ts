/**
 * Keyword-based rules for auto-categorization of transaction details.
 * Order matters: first match wins.
 */
const CATEGORY_RULES: { keywords: string[]; category: string }[] = [
  { keywords: ['salary', 'salary credit', 'payroll'], category: 'Salary' },
  { keywords: ['atm', 'cash withdrawal', 'cash with'], category: 'Cash Withdrawal' },
  { keywords: ['upi', 'gpay', 'phonepe', 'paytm', 'bhimi'], category: 'Digital Payment' },
  { keywords: ['neft', 'imps', 'rtgs', 'transfer', 'fund transfer'], category: 'Transfer' },
  { keywords: ['grocery', 'supermarket', 'big basket', 'grofers'], category: 'Grocery' },
  { keywords: ['electricity', 'electric bill', 'power'], category: 'Utilities' },
  { keywords: ['water bill', 'municipal'], category: 'Utilities' },
  { keywords: ['gas', 'lpg', 'cylinder'], category: 'Utilities' },
  { keywords: ['rent', 'house rent'], category: 'Rent' },
  { keywords: ['emi', 'loan', 'repayment'], category: 'Loan/EMI' },
  { keywords: ['insurance', 'premium'], category: 'Insurance' },
  { keywords: ['fuel', 'petrol', 'diesel', 'petrol pump'], category: 'Fuel' },
  { keywords: ['restaurant', 'swiggy', 'zomato', 'food', 'dining'], category: 'Food & Dining' },
  { keywords: ['medical', 'hospital', 'pharmacy', 'doctor'], category: 'Healthcare' },
  { keywords: ['education', 'school', 'college', 'tuition'], category: 'Education' },
  { keywords: ['subscription', 'netflix', 'spotify', 'amazon prime'], category: 'Subscriptions' },
  { keywords: ['shopping', 'amazon', 'flipkart', 'myntra'], category: 'Shopping' },
  { keywords: ['interest', 'interest credit', 'interest earned'], category: 'Interest' },
  { keywords: ['refund', 'reversal', 'reversed'], category: 'Refund' },
  { keywords: ['tax', 'gst', 'tds'], category: 'Tax' },
  { keywords: ['investment', 'mutual fund', 'sip', 'stock'], category: 'Investment' },
];

/**
 * Get category for a transaction detail string using keyword rules.
 */
export function getCategoryFromDetail(detail: string): string {
  if (!detail || typeof detail !== 'string') {
    return 'Uncategorized';
  }
  const lower = detail.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category;
    }
  }
  return 'Uncategorized';
}
