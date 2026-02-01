/**
 * IndexedDB service for Expense Analyzer.
 * All data is encrypted before storing (AES-256 via encryption service).
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Transaction } from '../types';
import { encrypt, decrypt } from './encryption';

const DB_NAME = 'ExpenseAnalyzerDB';
const DB_VERSION = 1;
const STORE_TRANSACTIONS = 'transactions';
const STORE_SETTINGS = 'settings';

function serializeTransaction(t: Transaction): string {
  return JSON.stringify(t);
}

function deserializeTransaction(encrypted: string): Transaction {
  const json = decrypt(encrypted);
  const raw = JSON.parse(json);
  return {
    ...raw,
    transactionDate: new Date(raw.transactionDate),
    valueDate: new Date(raw.valueDate),
    uploadDate: new Date(raw.uploadDate),
  } as Transaction;
}

// All data stored as encrypted JSON; indexes omitted to keep full encryption.
interface TransactionRecord {
  id: string;
  encrypted: string;
}

interface ExpenseAnalyzerDBSchema extends DBSchema {
  [STORE_TRANSACTIONS]: {
    key: string;
    value: TransactionRecord;
  };
  [STORE_SETTINGS]: {
    key: string;
    value: { key: string; encrypted: string };
  };
}

let dbPromise2: Promise<IDBPDatabase<ExpenseAnalyzerDBSchema>> | null = null;

async function getDB2(): Promise<IDBPDatabase<ExpenseAnalyzerDBSchema>> {
  if (!dbPromise2) {
    dbPromise2 = openDB<ExpenseAnalyzerDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
          db.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise2;
}

export async function addTransactions(transactions: Transaction[]): Promise<void> {
  try {
    const database = await getDB2();
    const tx = database.transaction(STORE_TRANSACTIONS, 'readwrite');
    for (const t of transactions) {
      const encrypted = encrypt(serializeTransaction(t));
      await tx.store.put({ id: t.id, encrypted });
    }
    await tx.done;
  } catch (err) {
    console.error('addTransactions error:', err);
    throw new Error('Failed to save transactions.');
  }
}

export async function getAllTransactions(): Promise<Transaction[]> {
  try {
    const database = await getDB2();
    const records = await database.getAll(STORE_TRANSACTIONS);
    return records.map((r) => deserializeTransaction(r.encrypted));
  } catch (err) {
    console.error('getAllTransactions error:', err);
    throw new Error('Failed to load transactions.');
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  try {
    const database = await getDB2();
    await database.delete(STORE_TRANSACTIONS, id);
  } catch (err) {
    console.error('deleteTransaction error:', err);
    throw new Error('Failed to delete transaction.');
  }
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  try {
    const encrypted = encrypt(serializeTransaction(transaction));
    const database = await getDB2();
    await database.put(STORE_TRANSACTIONS, { id: transaction.id, encrypted });
  } catch (err) {
    console.error('updateTransaction error:', err);
    throw new Error('Failed to update transaction.');
  }
}

export async function clearAllData(): Promise<void> {
  try {
    const database = await getDB2();
    const tx = database.transaction([STORE_TRANSACTIONS, STORE_SETTINGS], 'readwrite');
    await tx.objectStore(STORE_TRANSACTIONS).clear();
    await tx.objectStore(STORE_SETTINGS).clear();
    await tx.done;
  } catch (err) {
    console.error('clearAllData error:', err);
    throw new Error('Failed to clear data.');
  }
}

/**
 * Check if a transaction already exists (same date, amount, details).
 */
export async function checkDuplicates(transaction: Transaction): Promise<boolean> {
  try {
    const all = await getAllTransactions();
    return all.some(
      (t) =>
        t.transactionDate.getTime() === transaction.transactionDate.getTime() &&
        t.debitCredit === transaction.debitCredit &&
        t.transactionDetails === transaction.transactionDetails
    );
  } catch {
    return false;
  }
}
