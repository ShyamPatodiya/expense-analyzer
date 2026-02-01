import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SecuritySetup } from './components/SecuritySetup';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { FilterPanel } from './components/FilterPanel';
import { UploadPage } from './components/UploadPage';
import { AboutPage } from './components/AboutPage';
import { useEncryption } from './hooks/useEncryption';
import { useTransactions } from './hooks/useTransactions';
import { useFilters } from './hooks/useFilters';
import type { FilterOptions } from './types';

const DEFAULT_FILTERS: FilterOptions = {
  dateRange: { start: null, end: null },
  amountRange: { min: null, max: null },
  transactionType: 'all',
  searchText: '',
  categories: [],
};

const DARK_MODE_KEY = 'expense_analyzer_dark';

function getInitialDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(DARK_MODE_KEY);
  if (stored !== null) return stored === 'true';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDarkMode(dark: boolean) {
  if (typeof document === 'undefined') return;
  if (dark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  localStorage.setItem(DARK_MODE_KEY, String(dark));
}

function LoginScreen({
  onLogin,
  error,
}: {
  onLogin: (password: string) => Promise<void>;
  error: string;
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(error);

  useEffect(() => {
    setMsg(error);
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      await onLogin(password);
    } catch {
      setMsg('Login failed. Check your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Expense Analyzer
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter password"
              autoFocus
            />
          </div>
          {msg && <p className="text-sm text-red-600 dark:text-red-400">{msg}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg"
          >
            {loading ? 'Logging in...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        Settings
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Change password and app preferences. Data is stored locally and encrypted.
      </p>
    </div>
  );
}

export default function App() {
  const { isSetup, isAuthenticated, setup, login, logout } = useEncryption();
  const [loginError, setLoginError] = useState('');

  // Apply dark mode on mount so SecuritySetup and LoginScreen follow it (before Layout mounts)
  useEffect(() => {
    const dark = getInitialDarkMode();
    applyDarkMode(dark);
  }, []);

  const handleSetup = useCallback(
    async (password: string) => {
      await setup(password);
    },
    [setup]
  );

  const handleLogin = useCallback(
    async (password: string) => {
      const ok = await login(password);
      if (!ok) setLoginError('Invalid password');
    },
    [login]
  );

  if (!isSetup) {
    return <SecuritySetup onComplete={handleSetup} />;
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        error={loginError}
      />
    );
  }

  return (
    <BrowserRouter>
      <AppWithRouter logout={logout} />
    </BrowserRouter>
  );
}

function AppWithRouter({ logout }: { logout: () => void }) {
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);

  useEffect(() => {
    applyDarkMode(darkMode);
  }, [darkMode]);

  const { transactions, loading, error, updateTransaction, deleteTransaction, reload } = useTransactions();
  const filtered = useFilters(transactions, filters);
  const categories = Array.from(
    new Set(transactions.map((t) => t.category ?? 'Uncategorized').filter(Boolean))
  ).sort();
  // When no date filter is set, use all data so charts aren't empty (e.g. data from past months)
  const dateRangeForCharts =
    filters.dateRange.start && filters.dateRange.end
      ? filters.dateRange
      : { start: null as Date | null, end: null as Date | null };

  return (
    <Layout
      onLogout={logout}
      darkMode={darkMode}
      onDarkModeToggle={() => setDarkMode((d) => !d)}
    >
      <Routes>
        <Route path="/about" element={<AboutPage />} />
        <Route
          path="/"
          element={
            <Dashboard transactions={transactions} dateRange={dateRangeForCharts} darkMode={darkMode} />
          }
        />
        <Route
          path="/transactions"
          element={
            <div className="space-y-4">
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                categories={categories}
              />
              {loading ? (
                <p className="text-gray-500 dark:text-gray-400">Loading...</p>
              ) : error ? (
                <p className="text-red-600 dark:text-red-400">{error}</p>
              ) : (
                <TransactionList
                  transactions={filtered}
                  onUpdate={updateTransaction}
                  onDelete={deleteTransaction}
                />
              )}
            </div>
          }
        />
        <Route
          path="/upload"
          element={<UploadPage onImportComplete={reload} />}
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
