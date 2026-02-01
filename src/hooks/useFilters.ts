import { useMemo } from 'react';
import type { Transaction, FilterOptions } from '../types';

export function useFilters(
  transactions: Transaction[],
  filters: FilterOptions
): Transaction[] {
  return useMemo(() => {
    let result = [...transactions];

    const { dateRange, amountRange, transactionType, searchText, categories, banks } =
      filters;

    if (dateRange.start) {
      result = result.filter(
        (t) => new Date(t.transactionDate) >= dateRange.start!
      );
    }
    if (dateRange.end) {
      result = result.filter(
        (t) => new Date(t.transactionDate) <= dateRange.end!
      );
    }

    if (amountRange.min != null) {
      result = result.filter((t) => Math.abs(t.debitCredit) >= amountRange.min!);
    }
    if (amountRange.max != null) {
      result = result.filter((t) => Math.abs(t.debitCredit) <= amountRange.max!);
    }

    if (transactionType === 'debit') {
      result = result.filter((t) => t.debitCredit < 0);
    } else if (transactionType === 'credit') {
      result = result.filter((t) => t.debitCredit >= 0);
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      result = result.filter((t) => {
        const details = (t.transactionDetails ?? '').toLowerCase();
        const refNo = (t.chqRefNo ?? '').toLowerCase();
        const cat = (t.category ?? 'Uncategorized').toLowerCase();
        return details.includes(q) || refNo.includes(q) || cat.includes(q);
      });
    }

    if (categories.length > 0) {
      const catLower = categories.map((c) => (c ?? '').toLowerCase());
      result = result.filter((t) => {
        const cat = (t.category ?? 'Uncategorized').toLowerCase();
        return catLower.includes(cat);
      });
    }

    if (banks.length > 0) {
      const bankLower = banks.map((b) => (b ?? '').toLowerCase());
      result = result.filter((t) => {
        const bank = (t.bank ?? '').toLowerCase();
        return bankLower.includes(bank);
      });
    }

    return result;
  }, [transactions, filters]);
}
