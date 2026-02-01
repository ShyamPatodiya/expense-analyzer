import { useMemo, useState, useEffect, useRef } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  subMonths,
  subYears,
  isAfter,
  parseISO,
  isValid,
} from 'date-fns';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, Calendar } from 'lucide-react';
import type { Transaction } from '../types';
import { getTopExpenses } from '../services/dataAnalysis';
import { Charts } from './Charts';

// type PresetKey = '1d' | '1m' | '3m' | '6m' | '1y' | 'custom';
type PresetKey = '1m' | '3m' | '6m' | '1y' | 'custom';

interface DashboardProps {
  transactions: Transaction[];
  dateRange: { start: Date | null; end: Date | null };
  darkMode?: boolean;
}

function getRangeForPreset(preset: PresetKey): { start: Date; end: Date } {
  const today = new Date();
  const end = endOfDay(today);
  switch (preset) {
    // case '1d':
    //   return { start: startOfDay(today), end };
    case '1m':
      return { start: startOfDay(subMonths(today, 1)), end };
    case '3m':
      return { start: startOfDay(subMonths(today, 3)), end };
    case '6m':
      return { start: startOfDay(subMonths(today, 6)), end };
    case '1y':
      return { start: startOfDay(subYears(today, 1)), end };
    default:
      return { start: startOfDay(subMonths(today, 1)), end };
  }
}

export function Dashboard({ transactions, dateRange: propsDateRange, darkMode = false }: DashboardProps) {
  const [preset, setPreset] = useState<PresetKey>('custom');
  const [dashboardRange, setDashboardRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [customStartStr, setCustomStartStr] = useState('');
  const [customEndStr, setCustomEndStr] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const customFullRangeInitialized = useRef(false);

  useEffect(() => {
    if (preset !== 'custom') {
      const r = getRangeForPreset(preset);
      setDashboardRange({ start: r.start, end: r.end });
      setCustomError(null);
      return;
    }
    if (transactions.length === 0) return;
    if (customFullRangeInitialized.current) return;
    const dates = transactions.map((t) => new Date(t.transactionDate).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const minStr = format(minDate, 'yyyy-MM-dd');
    const maxStr = format(maxDate, 'yyyy-MM-dd');
    setDashboardRange({ start: startOfDay(minDate), end: endOfDay(maxDate) });
    setCustomStartStr(minStr);
    setCustomEndStr(maxStr);
    customFullRangeInitialized.current = true;
  }, [preset, transactions]);

  const applyCustomRange = () => {
    setCustomError(null);
    if (!customStartStr.trim() || !customEndStr.trim()) {
      setCustomError('Please select both start and end date.');
      return;
    }
    const startDate = parseISO(customStartStr);
    const endDate = parseISO(customEndStr);
    if (!isValid(startDate) || !isValid(endDate)) {
      setCustomError('Please enter valid dates.');
      return;
    }
    if (isAfter(startDate, endDate)) {
      setCustomError('Start date must be on or before end date.');
      return;
    }
    if (dataMinStr && dataMaxStr) {
      const dataMin = parseISO(dataMinStr);
      const dataMax = parseISO(dataMaxStr);
      if (isAfter(dataMin, startDate)) {
        setCustomError(`Start date cannot be before ${format(dataMin, 'MMM d, yyyy')} (no data).`);
        return;
      }
      if (isAfter(endDate, dataMax)) {
        setCustomError(`End date cannot be after ${format(dataMax, 'MMM d, yyyy')} (no data).`);
        return;
      }
    }
    setDashboardRange({ start: startOfDay(startDate), end: endOfDay(endDate) });
  };

  const dateRange = dashboardRange.start != null && dashboardRange.end != null ? dashboardRange : propsDateRange;
  const hasRange = dateRange.start != null && dateRange.end != null;
  const start = dateRange.start ?? startOfMonth(new Date());
  const end = dateRange.end ?? endOfMonth(new Date());

  /** Min/max dates from available transaction data (YYYY-MM-DD for date inputs). */
  const { dataMinStr, dataMaxStr } = useMemo(() => {
    if (transactions.length === 0) return { dataMinStr: '', dataMaxStr: '' };
    const dates = transactions.map((t) => new Date(t.transactionDate).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    return {
      dataMinStr: format(minDate, 'yyyy-MM-dd'),
      dataMaxStr: format(maxDate, 'yyyy-MM-dd'),
    };
  }, [transactions]);

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

  const hasData = transactions.length > 0;

  /** Income vs expense ratio 0–100%: 100% = all income, 50% = break-even, 0% = all expense. */
  const incomeExpenseAlert = useMemo(() => {
    const total = metrics.income + metrics.expense;
    if (total <= 0) return null;
    const ratioPercent = (metrics.income / total) * 100;
    if (ratioPercent >= 75) {
      return {
        message: "Keep it up! Income is well ahead of expenses — you're saving nicely.",
        gradient: 'from-emerald-500 to-green-600 dark:from-emerald-600 dark:to-green-700',
        textClass: 'text-white',
      };
    }
    if (ratioPercent >= 50) {
      return {
        message: "You're doing well. Income is ahead of expenses.",
        gradient: 'from-green-400 to-emerald-500 dark:from-green-600 dark:to-emerald-600',
        textClass: 'text-white',
      };
    }
    if (ratioPercent >= 25) {
      return {
        message: 'Expenses are catching up. Consider reviewing your spending.',
        gradient: 'from-amber-400 to-orange-500 dark:from-amber-500 dark:to-orange-600',
        textClass: 'text-white',
      };
    }
    return {
      message: 'Expenses exceed income. Review your budget and spending.',
      gradient: 'from-red-500 to-rose-600 dark:from-red-600 dark:to-rose-700',
      textClass: 'text-white',
    };
  }, [metrics.income, metrics.expense]);

  const presets: { key: PresetKey; label: string }[] = [
    // { key: '1d', label: '1D' },
    { key: '1m', label: '1M' },
    { key: '3m', label: '3M' },
    { key: '6m', label: '6M' },
    { key: '1y', label: '1Y' },
    { key: 'custom', label: 'Custom' },
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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Range
          </span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setPreset(key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  preset === key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 mt-2 w-full sm:mt-0 sm:w-auto">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
              <input
                type="date"
                value={customStartStr}
                onChange={(e) => setCustomStartStr(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                min={dataMinStr || undefined}
                max={customEndStr || dataMaxStr || undefined}
              />
              <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={customEndStr}
                onChange={(e) => setCustomEndStr(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                min={customStartStr || dataMinStr || undefined}
                max={dataMaxStr || undefined}
              />
              <button
                type="button"
                onClick={applyCustomRange}
                className="rounded-lg px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Apply
              </button>
              {customError && (
                <p className="text-sm text-red-600 dark:text-red-400 w-full sm:w-auto" role="alert">
                  {customError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {!hasData && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No data</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Upload a statement from the Upload page to get started.
          </p>
        </div>
      )}

      {hasData && incomeExpenseAlert && (
        <div
          className={`rounded-xl bg-gradient-to-r ${incomeExpenseAlert.gradient} px-4 py-3 shadow-sm border border-white/20 dark:border-white/10`}
        >
          <p className={`text-sm font-medium ${incomeExpenseAlert.textClass}`}>
            {incomeExpenseAlert.message}
          </p>
        </div>
      )}

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
