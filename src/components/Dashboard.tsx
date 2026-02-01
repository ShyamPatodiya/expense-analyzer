import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from 'lucide-react';
import type { Transaction } from '../types';
import { getTopExpenses } from '../services/dataAnalysis';
import { Charts } from './Charts';

interface DashboardProps {
  transactions: Transaction[];
  dateRange: { start: Date | null; end: Date | null };
  darkMode?: boolean;
}

export function Dashboard({ transactions, dateRange, darkMode = false }: DashboardProps) {
  const hasRange = dateRange.start != null && dateRange.end != null;
  const start = dateRange.start ?? startOfMonth(new Date());
  const end = dateRange.end ?? endOfMonth(new Date());

  const metrics = useMemo(() => {
    const inRange = hasRange
      ? transactions.filter((t) => {
          const d = new Date(t.transactionDate);
          return d >= start && d <= end;
        })
      : transactions;
    const income = inRange.filter((t) => t.debitCredit >= 0).reduce((s, t) => s + t.debitCredit, 0);
    const expense = inRange.filter((t) => t.debitCredit < 0).reduce((s, t) => s + Math.abs(t.debitCredit), 0);
    const top = getTopExpenses(inRange, 1);
    const latestBalance = [...transactions].sort(
      (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    )[0]?.balance ?? 0;

    return {
      income,
      expense,
      balance: latestBalance,
      largestExpense: top[0] ? Math.abs(top[0].debitCredit) : 0,
    };
  }, [transactions, start, end, hasRange]);

  const cards = [
    {
      label: 'Total Income (period)',
      value: `₹${metrics.income.toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Total Expenses (period)',
      value: `₹${metrics.expense.toLocaleString('en-IN')}`,
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: 'Current Balance',
      value: `₹${metrics.balance.toLocaleString('en-IN')}`,
      icon: Wallet,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
    {
      label: 'Largest Expense (period)',
      value: metrics.largestExpense ? `₹${metrics.largestExpense.toLocaleString('en-IN')}` : '—',
      icon: AlertCircle,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {hasRange ? `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}` : 'All time'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${bg}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {label}
              </span>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className={`mt-2 text-lg font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <Charts transactions={transactions} dateRange={dateRange} darkMode={darkMode} />
    </div>
  );
}
