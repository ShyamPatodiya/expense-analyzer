import { useState, useCallback } from 'react';
import type { ColumnMapping } from '../types';
import { validateData } from '../services/fileParser';

const FIELDS: (keyof ColumnMapping)[] = [
  'transactionDate',
  'valueDate',
  'transactionDetails',
  'chqRefNo',
  'debitCredit',
  'debitCreditType',
  'debitColumn',
  'creditColumn',
  'balance',
];

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  transactionDate: 'Transaction Date',
  valueDate: 'Value Date',
  transactionDetails: 'Transaction Details',
  chqRefNo: 'Chq / Ref No',
  debitCredit: 'Amount',
  debitCreditType: 'Dr/Cr (optional)',
  debitColumn: 'Debit column (optional)',
  creditColumn: 'Credit column (optional)',
  balance: 'Balance',
};

interface ColumnMapperProps {
  columns: string[];
  data: Record<string, string>[];
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel?: () => void;
}

const emptyMapping = (): ColumnMapping => ({
  transactionDate: '',
  valueDate: '',
  transactionDetails: '',
  chqRefNo: '',
  debitCredit: '',
  debitCreditType: '',
  debitColumn: '',
  creditColumn: '',
  balance: '',
});

export function ColumnMapper({ columns, data, onConfirm, onCancel }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    const m = emptyMapping();
    // Auto-map by matching header names (case-insensitive)
    let amountCol = '';
    for (const col of columns) {
      const lower = col.toLowerCase();
      if (lower.includes('transaction date') || lower === 'date') m.transactionDate = col;
      else if (lower.includes('value date')) m.valueDate = col;
      else if (lower.includes('detail') || lower.includes('description') || lower.includes('particulars')) m.transactionDetails = col;
      else if (lower.includes('chq') || lower.includes('ref') || lower.includes('cheque')) m.chqRefNo = col;
      else if (lower === 'amount') {
        m.debitCredit = col;
        amountCol = col;
      } else if (/^dr\s*\/\s*cr$/i.test(lower) || lower === 'dr / cr') {
        if (!m.debitCreditType) m.debitCreditType = col;
      } else if (lower === 'debit' || (lower.includes('debit') && !lower.includes('credit'))) {
        m.debitColumn = col;
      } else if (lower === 'credit' || (lower.includes('credit') && !lower.includes('debit'))) {
        m.creditColumn = col;
      } else if (lower.includes('debit') || lower.includes('credit')) {
        if (!m.debitCredit) m.debitCredit = col;
        else if (!m.debitCreditType) m.debitCreditType = col;
      } else if (lower.includes('balance') && !lower.includes('dr')) m.balance = col;
    }
    if (!m.debitCredit && amountCol) m.debitCredit = amountCol;
    return m;
  });
  const [validationError, setValidationError] = useState('');

  const handleChange = useCallback((field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
    setValidationError('');
  }, []);

  const handleConfirm = useCallback(() => {
    const { valid, errors } = validateData(data, mapping);
    if (!valid) {
      setValidationError(errors[0] ?? 'Validation failed');
      return;
    }
    onConfirm(mapping);
  }, [data, mapping, onConfirm]);

  const previewRows = data.slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Map columns to fields
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.filter((f) => f !== 'debitCreditType' || columns.some((c) => /dr\s*\/\s*cr/i.test(c))).map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {FIELD_LABELS[field]}
            </label>
            <select
              value={mapping[field]}
              onChange={(e) => handleChange(field, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">-- Select column --</option>
              {columns.map((col, idx) => (
                <option key={`col-${idx}-${col}`} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {previewRows.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preview (first 5 rows)
          </p>
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded-lg">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  {FIELDS.map((f) => (
                    <th
                      key={f}
                      className="px-3 py-2 text-left text-gray-700 dark:text-gray-300"
                    >
                      {FIELD_LABELS[f]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-t border-gray-200 dark:border-gray-600"
                  >
                    {FIELDS.map((f) => (
                      <td
                        key={f}
                        className="px-3 py-2 text-gray-900 dark:text-gray-100 max-w-[200px] truncate"
                      >
                        {mapping[f] ? row[mapping[f]] ?? '—' : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {validationError && (
        <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
        >
          Confirm & Import
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
