import { useState, useCallback, useEffect } from 'react';
import type { Transaction } from '../types';
import * as db from '../services/database';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await db.getAllTransactions();
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addTransactions = useCallback(async (list: Transaction[]) => {
    setError(null);
    try {
      await db.addTransactions(list);
      await load();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to add transactions');
    }
  }, [load]);

  const updateTransaction = useCallback(async (t: Transaction) => {
    setError(null);
    try {
      await db.updateTransaction(t);
      setTransactions((prev) =>
        prev.map((x) => (x.id === t.id ? t : x))
      );
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update');
    }
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    setError(null);
    try {
      await db.deleteTransaction(id);
      setTransactions((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete');
    }
  }, []);

  const clearAll = useCallback(async () => {
    setError(null);
    try {
      await db.clearAllData();
      setTransactions([]);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to clear data');
    }
  }, []);

  return {
    transactions,
    loading,
    error,
    reload: load,
    addTransactions,
    updateTransaction,
    deleteTransaction,
    clearAll,
  };
}
