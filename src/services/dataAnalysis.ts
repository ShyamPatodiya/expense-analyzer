/**
 * Data analysis: monthly summary, category breakdown, auto-categorization, top expenses.
 */

import { format } from 'date-fns';
import type { Transaction, MonthlyData, CategoryData } from '../types';
import { getCategoryFromDetail } from '../utils/categorization';

/**
 * Monthly summary: income, expense, balance per month.
 */
export function getMonthlySummary(transactions: Transaction[]): MonthlyData[] {
  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    const key = format(new Date(t.transactionDate), 'yyyy-MM');
    const entry = byMonth.get(key) ?? { income: 0, expense: 0 };
    if (t.debitCredit >= 0) {
      entry.income += t.debitCredit;
    } else {
      entry.expense += Math.abs(t.debitCredit);
    }
    byMonth.set(key, entry);
  }
  const result: MonthlyData[] = [];
  const sorted = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let runningBalance = 0;
  for (const [monthKey, { income, expense }] of sorted) {
    runningBalance += income - expense;
    const month = format(new Date(monthKey + '-01'), 'MMM-yyyy');
    result.push({
      month,
      income,
      expense,
      balance: runningBalance,
    });
  }
  return result;
}

/**
 * Category breakdown: total amount and count per category.
 */
export function getCategoryBreakdown(transactions: Transaction[]): CategoryData[] {
  const byCategory = new Map<string, { amount: number; count: number }>();
  let total = 0;
  for (const t of transactions) {
    const cat = t.category ?? getCategoryFromDetail(t.transactionDetails);
    const amt = t.debitCredit < 0 ? Math.abs(t.debitCredit) : 0;
    total += amt;
    const entry = byCategory.get(cat) ?? { amount: 0, count: 0 };
    entry.amount += amt;
    entry.count += 1;
    byCategory.set(cat, entry);
  }
  return [...byCategory.entries()].map(([category, { amount, count }]) => ({
    category,
    amount,
    count,
    percentage: total > 0 ? (amount / total) * 100 : 0,
  }));
}

/**
 * Auto-categorize transaction detail using keyword rules.
 */
export function autoCategorize(detail: string): string {
  return getCategoryFromDetail(detail);
}

/**
 * Top N expenses (largest debits).
 */
export function getTopExpenses(
  transactions: Transaction[],
  limit: number
): Transaction[] {
  return transactions
    .filter((t) => t.debitCredit < 0)
    .sort((a, b) => a.debitCredit - b.debitCredit) // most negative first
    .slice(0, limit);
}

/**
 * Top N incomes (largest credits).
 */
export function getTopIncomes(
  transactions: Transaction[],
  limit: number
): Transaction[] {
  return transactions
    .filter((t) => t.debitCredit > 0)
    .sort((a, b) => b.debitCredit - a.debitCredit) // largest first
    .slice(0, limit);
}
