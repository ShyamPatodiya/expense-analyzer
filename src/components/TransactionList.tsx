import { useState, useCallback, useMemo, useRef, useEffect, forwardRef } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Download, ChevronUp, ChevronDown, Check, Minus } from 'lucide-react';
import { format } from 'date-fns';
import Papa from 'papaparse';
import type { Transaction } from '../types';
import { formatDisplayDate } from '../utils/dateHelpers';

const PAGE_SIZE = 20;
const EMPTY = '-';

const StyledCheckbox = forwardRef<
  HTMLInputElement,
  {
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    indeterminate?: boolean;
    'aria-label'?: string;
  }
>(function StyledCheckbox({ checked, onChange, indeterminate, 'aria-label': ariaLabel }, ref) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        className="peer sr-only"
      />
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-gray-800 ${
          indeterminate
            ? 'border-indigo-500 bg-indigo-500'
            : checked
              ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500'
              : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
        }`}
      >
        {indeterminate ? (
          <Minus size={12} className="text-white stroke-[3]" aria-hidden />
        ) : checked ? (
          <Check size={12} className="text-white stroke-[3]" aria-hidden />
        ) : null}
      </span>
    </label>
  );
});

function cell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return EMPTY;
  if (typeof value === 'string' && value.trim() === '') return EMPTY;
  return String(value);
}

type SortKey = 'transactionDate' | 'transactionDetails' | 'chqRefNo' | 'debitCredit' | 'balance' | 'category';
type SortDir = 'asc' | 'desc';

interface TransactionListProps {
  transactions: Transaction[];
  onUpdate: (t: Transaction) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function compare(a: Transaction, b: Transaction, key: SortKey, dir: SortDir): number {
  let diff = 0;
  switch (key) {
    case 'transactionDate':
      diff = new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
      break;
    case 'transactionDetails':
      diff = (a.transactionDetails ?? '').localeCompare(b.transactionDetails ?? '');
      break;
    case 'chqRefNo':
      diff = (a.chqRefNo ?? '').localeCompare(b.chqRefNo ?? '');
      break;
    case 'debitCredit':
      diff = a.debitCredit - b.debitCredit;
      break;
    case 'balance':
      diff = a.balance - b.balance;
      break;
    case 'category':
      diff = (a.category ?? '').localeCompare(b.category ?? '');
      break;
    default:
      return 0;
  }
  return dir === 'asc' ? diff : -diff;
}

export function TransactionList({
  transactions,
  onUpdate,
  onDelete,
}: TransactionListProps) {
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteSelectedConfirm, setDeleteSelectedConfirm] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [sort, setSort] = useState<{ sortBy: SortKey; sortDir: SortDir }>({
    sortBy: 'transactionDate',
    sortDir: 'desc',
  });

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => compare(a, b, sort.sortBy, sort.sortDir));
  }, [transactions, sort.sortBy, sort.sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const pageData = sortedTransactions.slice(start, start + PAGE_SIZE);

  const handleSort = useCallback((key: SortKey) => {
    setSort((prev) => ({
      sortBy: key,
      sortDir:
        prev.sortBy === key
          ? prev.sortDir === 'asc'
            ? 'desc'
            : 'asc'
          : 'asc',
    }));
    setPage(0);
  }, []);

  const SortHeader = useCallback(
    ({ columnKey, label, align = 'left' }: { columnKey: SortKey; label: string; align?: 'left' | 'right' }) => (
      <th
        role="button"
        tabIndex={0}
        onClick={() => handleSort(columnKey)}
        onKeyDown={(e) => e.key === 'Enter' && handleSort(columnKey)}
        className={`px-3 py-2 text-gray-700 dark:text-gray-300 select-none cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${align === 'right' ? 'text-right' : 'text-left'}`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {sort.sortBy === columnKey ? (
            sort.sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
          ) : (
            <span className="w-3.5 inline-block opacity-30">
              <ChevronUp size={14} />
            </span>
          )}
        </span>
      </th>
    ),
    [sort.sortBy, sort.sortDir, handleSort]
  );

  const handleSaveCategory = useCallback(
    async (t: Transaction) => {
      if (editCategory.trim() === '') return;
      await onUpdate({ ...t, category: editCategory.trim() });
      setEditingId(null);
      setEditCategory('');
    },
    [editCategory, onUpdate]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await onDelete(id);
      setDeleteConfirm(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [onDelete]
  );

  const pageIds = useMemo(() => new Set(pageData.map((t) => t.id)), [pageData]);
  const allOnPageSelected = pageIds.size > 0 && pageData.every((t) => selectedIds.has(t.id));
  const selectAllHeaderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = selectAllHeaderRef.current;
    if (el) el.indeterminate = selectedIds.size > 0 && !allOnPageSelected;
  }, [selectedIds.size, allOnPageSelected]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllOnPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }, [allOnPageSelected, pageIds]);

  const handleDeleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    for (const id of ids) {
      await onDelete(id);
    }
    setSelectedIds(new Set());
    setDeleteSelectedConfirm(false);
  }, [selectedIds, onDelete]);

  const handleDeleteAll = useCallback(async () => {
    for (const t of transactions) {
      await onDelete(t.id);
    }
    setSelectedIds(new Set());
    setDeleteAllConfirm(false);
  }, [transactions, onDelete]);

  const exportCSV = useCallback(() => {
    const rows = transactions.map((t) => ({
      Date: format(t.transactionDate, 'yyyy-MM-dd'),
      Details: t.transactionDetails,
      'Chq/Ref': t.chqRefNo,
      Amount: t.debitCredit < 0 ? Math.abs(t.debitCredit) : t.debitCredit,
      'Dr/Cr': t.debitCredit < 0 ? 'DR' : 'CR',
      Balance: t.balance,
      Category: t.category ?? '',
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transactions]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Transactions ({transactions.length})
        </h2>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedIds.size} selected
              </span>
              {!deleteSelectedConfirm ? (
                <button
                  onClick={() => setDeleteSelectedConfirm(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  <Trash2 size={16} />
                  Delete selected
                </button>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="text-sm text-red-600 dark:text-red-400">Delete {selectedIds.size}?</span>
                  <button
                    onClick={handleDeleteSelected}
                    className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setDeleteSelectedConfirm(false)}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
                  >
                    No
                  </button>
                </span>
              )}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
              >
                Clear selection
              </button>
            </>
          )}
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            <Download size={16} />
            Export CSV
          </button>
          {transactions.length > 0 && (
            !deleteAllConfirm ? (
              <button
                onClick={() => setDeleteAllConfirm(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-red-600 dark:border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                <Trash2 size={16} />
                Delete all
              </button>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-sm text-red-600 dark:text-red-400">Delete all {transactions.length}?</span>
                <button
                  onClick={handleDeleteAll}
                  className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  Yes
                </button>
                <button
                  onClick={() => setDeleteAllConfirm(false)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  No
                </button>
              </span>
            )
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="px-2 py-2 w-10">
                <StyledCheckbox
                  ref={selectAllHeaderRef}
                  checked={allOnPageSelected}
                  onChange={toggleSelectAllOnPage}
                  indeterminate={selectedIds.size > 0 && !allOnPageSelected}
                  aria-label="Select all on page"
                />
              </th>
              <SortHeader columnKey="transactionDate" label="Date" />
              <SortHeader columnKey="transactionDetails" label="Details" />
              <SortHeader columnKey="chqRefNo" label="Ref No" />
              <SortHeader columnKey="debitCredit" label="Amount (DR/CR)" align="right" />
              <SortHeader columnKey="balance" label="Balance" align="right" />
              <SortHeader columnKey="category" label="Category" />
              <th className="px-3 py-2 w-10" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {pageData.map((t) => (
              <tr
                key={t.id}
                className={`border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedIds.has(t.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
              >
                <td className="px-2 py-2">
                  <StyledCheckbox
                    checked={selectedIds.has(t.id)}
                    onChange={() => toggleSelect(t.id)}
                    aria-label={`Select transaction ${t.id}`}
                  />
                </td>
                <td className="px-3 py-2 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {t.transactionDate ? formatDisplayDate(t.transactionDate) : EMPTY}
                </td>
                <td className="px-3 py-2 text-gray-900 dark:text-gray-100 max-w-[200px] truncate">
                  {cell(t.transactionDetails)}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{cell(t.chqRefNo)}</td>
                <td className="px-3 py-2 text-right">
                  {t.debitCredit === 0 ? (
                    EMPTY
                  ) : t.debitCredit < 0 ? (
                    <span className="text-red-600 dark:text-red-400">
                      ₹{Math.abs(t.debitCredit).toLocaleString('en-IN')} DR
                    </span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">
                      ₹{t.debitCredit.toLocaleString('en-IN')} CR
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                  {`₹${t.balance.toLocaleString('en-IN')}`}
                </td>
                <td className="px-3 py-2">
                  {editingId === t.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                        placeholder="Category"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveCategory(t)}
                        className="text-xs text-indigo-600 dark:text-indigo-400"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditCategory(''); }}
                        className="text-xs text-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(t.id);
                        setEditCategory(t.category ?? '');
                      }}
                      className="text-left text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {cell(t.category) === EMPTY ? <>{EMPTY} <span className="text-indigo-500">Set category</span></> : cell(t.category)}
                    </button>
                  )}
                </td>
                <td className="px-3 py-2">
                  {deleteConfirm === t.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-red-600">Delete?</span>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-xs text-red-600 font-medium"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs text-gray-500"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(t.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
