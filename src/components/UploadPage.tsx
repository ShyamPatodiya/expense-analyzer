import { useState, useCallback } from 'react';
import { FileUpload } from './FileUpload';
import { ColumnMapper } from './ColumnMapper';
import type { ParseResult } from '../services/fileParser';
import type { ColumnMapping } from '../types';
import { parseDate } from '../utils/dateHelpers';
import { parseCurrency } from '../utils/currencyParser';
import { getCategoryFromDetail } from '../utils/categorization';
import type { Transaction } from '../types';
import * as db from '../services/database';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * When Amount and Dr/Cr are in separate columns: combine to signed debitCredit.
 */
function parseDebitCredit(row: Record<string, string>, mapping: ColumnMapping): number {
  const amtStr = (row[mapping.debitCredit] ?? '0').trim();
  const drCrCol = mapping.debitCreditType ? (row[mapping.debitCreditType] ?? '').trim().toUpperCase() : '';
  if (mapping.debitCreditType && drCrCol) {
    const num = parseFloat(amtStr.replace(/[,₹\s]/g, '')) || 0;
    return drCrCol === 'DR' ? -Math.abs(num) : Math.abs(num);
  }
  return parseCurrency(row[mapping.debitCredit] ?? '0');
}

function mapToTransactions(
  data: Record<string, string>[],
  mapping: ColumnMapping,
  source: string
): Transaction[] {
  const now = new Date();
  const result: Transaction[] = [];
  for (const row of data) {
    const txDate = parseDate(row[mapping.transactionDate] ?? '');
    const valDate = parseDate(row[mapping.valueDate] ?? '') ?? txDate;
    if (!txDate) continue; // skip invalid date rows
    const debitCredit = parseDebitCredit(row, mapping);
    const balance = parseCurrency(row[mapping.balance] ?? '0');
    const details = (row[mapping.transactionDetails] ?? '').trim();
    const category = getCategoryFromDetail(details);
    result.push({
      id: generateId(),
      transactionDate: txDate,
      valueDate: valDate ?? txDate,
      transactionDetails: details,
      chqRefNo: (row[mapping.chqRefNo] ?? '').trim(),
      debitCredit,
      balance,
      category,
      tags: [],
      source,
      uploadDate: now,
    });
  }
  return result;
}

interface UploadPageProps {
  onImportComplete: () => void;
}

export function UploadPage({ onImportComplete }: UploadPageProps) {
  const [step, setStep] = useState<'upload' | 'map'>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importedCount, setImportedCount] = useState(0);

  const handleParsed = useCallback((result: ParseResult) => {
    setParseResult(result);
    setStep('map');
    setImportError('');
  }, []);

  const handleConfirmMapping = useCallback(
    async (mapping: ColumnMapping) => {
      if (!parseResult) return;
      setImporting(true);
      setImportError('');
      try {
        const source = 'upload';
        const transactions = mapToTransactions(
          parseResult.data,
          mapping,
          source
        );
        let added = 0;
        const toAdd: Transaction[] = [];
        for (const t of transactions) {
          const isDup = await db.checkDuplicates(t);
          if (!isDup) {
            toAdd.push(t);
            added++;
          }
        }
        if (toAdd.length > 0) {
          await db.addTransactions(toAdd);
        }
        setImportedCount(added);
        setStep('upload');
        setParseResult(null);
        onImportComplete();
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Import failed');
      } finally {
        setImporting(false);
      }
    },
    [parseResult, onImportComplete]
  );

  const handleCancelMapping = useCallback(() => {
    setStep('upload');
    setParseResult(null);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        Upload Statement
      </h1>
      {step === 'upload' && (
        <>
          <FileUpload onParsed={handleParsed} />
          {importedCount > 0 && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Last import: {importedCount} new transaction(s) added.
            </p>
          )}
        </>
      )}
      {step === 'map' && parseResult && (
        <>
          {parseResult.metadata && (parseResult.metadata.accountHolder || parseResult.metadata.accountNo || parseResult.metadata.periodFrom || parseResult.metadata.periodTo || parseResult.metadata.currency || parseResult.metadata.closingBalance || (parseResult.metadata.extra && Object.keys(parseResult.metadata.extra).length > 0)) && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 text-sm">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Statement details</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-gray-600 dark:text-gray-400">
                {parseResult.metadata.accountHolder && (
                  <>
                    <dt>Account holder</dt>
                    <dd>{parseResult.metadata.accountHolder}</dd>
                  </>
                )}
                {parseResult.metadata.accountNo && (
                  <>
                    <dt>Account no.</dt>
                    <dd>{parseResult.metadata.accountNo}</dd>
                  </>
                )}
                {(parseResult.metadata.periodFrom || parseResult.metadata.periodTo) && (
                  <>
                    <dt>Period</dt>
                    <dd>{[parseResult.metadata.periodFrom, parseResult.metadata.periodTo].filter(Boolean).join(' – ')}</dd>
                  </>
                )}
                {parseResult.metadata.currency && (
                  <>
                    <dt>Currency</dt>
                    <dd>{parseResult.metadata.currency}</dd>
                  </>
                )}
                {parseResult.metadata.closingBalance && (
                  <>
                    <dt>Closing balance</dt>
                    <dd>{parseResult.metadata.closingBalance}</dd>
                  </>
                )}
              </dl>
            </div>
          )}
          <ColumnMapper
            columns={parseResult.columns}
            data={parseResult.data}
            onConfirm={handleConfirmMapping}
            onCancel={handleCancelMapping}
          />
          {importing && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Importing...
            </p>
          )}
          {importError && (
            <p className="text-sm text-red-600 dark:text-red-400">{importError}</p>
          )}
        </>
      )}
    </div>
  );
}
