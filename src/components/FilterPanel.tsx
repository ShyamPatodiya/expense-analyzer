import { useCallback } from 'react';
import { format } from 'date-fns';
import type { FilterOptions } from '../types';
import { getCurrentMonthRange, getLastThreeMonthsRange } from '../utils/dateHelpers';

interface FilterPanelProps {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
  categories: string[];
  banks: string[];
}

const PRESETS = [
  { label: 'This Month', getRange: getCurrentMonthRange },
  { label: 'Last 3 Months', getRange: getLastThreeMonthsRange },
];

export function FilterPanel({ filters, onChange, categories, banks }: FilterPanelProps) {
  const setPreset = useCallback(
    (getRange: () => { start: Date; end: Date }) => {
      const { start, end } = getRange();
      onChange({
        ...filters,
        dateRange: { start, end },
      });
    },
    [filters, onChange]
  );

  const update = useCallback(
    (patch: Partial<FilterOptions>) => {
      onChange({ ...filters, ...patch });
    },
    [filters, onChange]
  );

  const clearAll = useCallback(() => {
    onChange({
      dateRange: { start: null, end: null },
      amountRange: { min: null, max: null },
      transactionType: 'all',
      searchText: '',
      categories: [],
      banks: [],
    });
  }, [onChange]);

  const toggleCategory = useCallback(
    (cat: string) => {
      const list = filters.categories.includes(cat)
        ? filters.categories.filter((c) => c !== cat)
        : [...filters.categories, cat];
      update({ categories: list });
    },
    [filters.categories, update]
  );

  const toggleBank = useCallback(
    (bank: string) => {
      const list = filters.banks.includes(bank)
        ? filters.banks.filter((b) => b !== bank)
        : [...filters.banks, bank];
      update({ banks: list });
    },
    [filters.banks, update]
  );

  const hasActive =
    filters.dateRange.start ||
    filters.dateRange.end ||
    filters.amountRange.min != null ||
    filters.amountRange.max != null ||
    filters.transactionType !== 'all' ||
    filters.searchText.trim() !== '' ||
    filters.categories.length > 0 ||
    filters.banks.length > 0;

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Filters
        </h3>
        {hasActive && (
          <button
            onClick={clearAll}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Date presets */}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Date range
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(({ label, getRange }) => (
            <button
              key={label}
              onClick={() => setPreset(getRange)}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {label}
            </button>
          ))}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={filters.dateRange.start ? format(filters.dateRange.start, 'yyyy-MM-dd') : ''}
              onChange={(e) =>
                update({
                  dateRange: {
                    ...filters.dateRange,
                    start: e.target.value ? new Date(e.target.value) : null,
                  },
                })
              }
              className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={filters.dateRange.end ? format(filters.dateRange.end, 'yyyy-MM-dd') : ''}
              onChange={(e) =>
                update({
                  dateRange: {
                    ...filters.dateRange,
                    end: e.target.value ? new Date(e.target.value) : null,
                  },
                })
              }
              className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Amount range */}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Amount
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.amountRange.min ?? ''}
            onChange={(e) =>
              update({
                amountRange: {
                  ...filters.amountRange,
                  min: e.target.value ? Number(e.target.value) : null,
                },
              })
            }
            className="w-24 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.amountRange.max ?? ''}
            onChange={(e) =>
              update({
                amountRange: {
                  ...filters.amountRange,
                  max: e.target.value ? Number(e.target.value) : null,
                },
              })
            }
            className="w-24 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Type */}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Type
        </p>
        <div className="flex gap-2">
          {(['all', 'debit', 'credit'] as const).map((type) => (
            <button
              key={type}
              onClick={() => update({ transactionType: type })}
              className={`px-3 py-1.5 text-xs rounded-lg capitalize ${
                filters.transactionType === type
                  ? 'bg-indigo-600 text-white'
                  : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Search details
        </p>
        <input
          type="text"
          placeholder="Search..."
          value={filters.searchText}
          onChange={(e) => update({ searchText: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Categories
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 text-xs rounded-lg ${
                  filters.categories.includes(cat)
                    ? 'bg-indigo-600 text-white'
                    : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bank (Bank Name) */}
      {banks.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Bank
          </p>
          <div className="flex flex-wrap gap-2">
            {banks.map((bank) => (
              <button
                key={bank}
                onClick={() => toggleBank(bank)}
                className={`px-3 py-1.5 text-xs rounded-lg ${
                  filters.banks.includes(bank)
                    ? 'bg-indigo-600 text-white'
                    : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {bank}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
