/**
 * File parsing service: CSV (PapaParse) and PDF.
 * Auto-detect transaction header row, extract metadata from rows above, skip footer.
 */

import Papa from 'papaparse';
import type { ColumnMapping, StatementMetadata } from '../types';

export interface ParseResult {
  data: Record<string, string>[];
  columns: string[];
  metadata?: StatementMetadata;
}

/** Check if a row looks like a transaction header (has Transaction Date/Date, Amount/Balance, etc.) */
function isTransactionHeaderRow(cells: string[]): boolean {
  const joined = cells.join(' ').toLowerCase();
  const hasDate =
    joined.includes('transaction date') ||
    joined.includes('value date') ||
    (joined.includes('date') && (joined.includes('transaction') || joined.includes('value')));
  const hasAmount =
    joined.includes('amount') ||
    joined.includes('balance') ||
    joined.includes('debit') ||
    joined.includes('credit');
  return hasDate && hasAmount;
}

// dd/mm/yyyy, dd-mm-yyyy, or dd-MMM-yyyy (Excel: 21-Sep-2025)
const DATE_LIKE = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|^\d{1,2}-[A-Za-z]{3}-\d{2,4}/;

/** Check if a data row looks like a transaction (Sl. No., date in second col, or date in any col) */
function looksLikeTransactionRow(row: Record<string, string>, columns: string[]): boolean {
  const firstCol = columns[0];
  const val = (row[firstCol] ?? '').trim();
  if (/^\d+$/.test(val)) return true; // Sl. No.
  const secondCol = columns[1] ?? columns[0];
  const secondVal = (row[secondCol] ?? '').trim();
  if (DATE_LIKE.test(secondVal)) return true; // date in second column
  // Excel or alternate formats: any column looks like date
  for (const col of columns) {
    if (DATE_LIKE.test((row[col] ?? '').trim())) return true;
  }
  return false;
}

/** Check if row is footer (Closing balance, summary block, contact info, etc.) */
function isFooterRow(cells: string[]): boolean {
  const first = (cells[0] ?? '').toLowerCase();
  return (
    first.includes('closing balance') ||
    first.includes('opening balance') ||
    first.includes('total debit') ||
    first.includes('you may call') ||
    first.includes('write to us') ||
    first.includes('customer contact')
  );
}

/** Extract metadata from rows above the transaction header. Scans all cells for label: value pairs. */
function extractMetadata(rawRows: string[][]): StatementMetadata {
  const meta: StatementMetadata = { extra: {} };
  const labelKeys = ['full name', 'name', 'account no', 'account no.', 'period', 'currency', 'branch', 'closing balance'];
  for (const row of rawRows) {
    for (let i = 0; i < row.length - 1; i++) {
      const key = (row[i] ?? '').trim();
      const value = (row[i + 1] ?? '').trim();
      if (!key || !value) continue;
      const k = key.toLowerCase();
      if (k.includes('full name') || k === 'name') meta.accountHolder = value;
      else if (k.includes('account no') || k === 'account no.') meta.accountNo = value;
      else if (k.includes('period') && value.toLowerCase().includes('to')) {
        const match = value.match(/From\s*([^T]+)\s*To\s*(.+)/i) || value.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*To\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
        if (match) {
          meta.periodFrom = match[1].trim();
          meta.periodTo = match[2].trim();
        } else {
          (meta.extra as Record<string, string>)[key] = value;
        }
      } else if (k.includes('currency')) meta.currency = value;
      else if (k.includes('branch')) meta.branch = value;
      else if (k.includes('closing balance')) meta.closingBalance = value;
      else if (!labelKeys.some((lk) => k.includes(lk))) (meta.extra as Record<string, string>)[key] = value;
    }
    const first = (row[0] ?? '').trim();
    if (first && !meta.accountHolder && (first.toLowerCase().includes('name') || first.length > 3)) {
      const v = row.slice(1).find((c) => (c ?? '').trim())?.trim();
      if (v && !meta.accountHolder) meta.accountHolder = first;
    }
  }
  return meta;
}

/**
 * Process raw rows (from CSV or Excel) into ParseResult: detect header, metadata, footer, transaction rows.
 * Shared by parseCSV and parseXLSX so both formats use the same structure.
 */
function processRawRows(rawRows: string[][]): ParseResult {
  if (rawRows.length === 0) {
    return { data: [], columns: [] };
  }

  let headerIndex = -1;
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (isTransactionHeaderRow(row)) {
      headerIndex = i;
      break;
    }
  }

  let columns: string[];
  let dataRows: string[][];
  let metadata: StatementMetadata | undefined;

  if (headerIndex >= 0) {
    const headerRow = rawRows[headerIndex];
    const seen = new Map<string, number>();
    columns = headerRow.map((c, i) => {
      const name = (c ?? '').trim() || `Col_${i}`;
      const count = seen.get(name) ?? 0;
      seen.set(name, count + 1);
      return count === 0 ? name : `${name} (${count + 1})`;
    });
    const metaRows = rawRows.slice(0, headerIndex);
    metadata = extractMetadata(metaRows);
    dataRows = rawRows.slice(headerIndex + 1);
  } else {
    const first = rawRows[0];
    columns = first.map((c, i) => (c ?? '').trim() || `Column${i}`);
    dataRows = rawRows.slice(1);
  }

  const data: Record<string, string>[] = [];
  for (const row of dataRows) {
    if (isFooterRow(row)) break;
    const obj: Record<string, string> = {};
    columns.forEach((col, i) => {
      obj[col] = (row[i] ?? '').trim();
    });
    if (!Object.values(obj).some((v) => v)) continue;
    data.push(obj);
  }

  const transactionData = data.filter((row) => looksLikeTransactionRow(row, columns));
  return { data: transactionData, columns, metadata };
}

/**
 * Parse CSV: detect transaction header row, extract metadata from rows above, return only transaction data.
 * Supports bank statements with leading metadata rows and footer.
 */
export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: false,
      complete(results) {
        if (results.errors.length > 0) {
          const msg = results.errors.map((e) => e.message).join('; ');
          reject(new Error(`CSV parse error: ${msg}`));
          return;
        }
        const rawRows = (results.data as string[][]).filter((row) => Array.isArray(row) && row.length > 0);
        resolve(processRawRows(rawRows));
      },
      error(err) {
        reject(new Error(err.message || 'Failed to parse CSV'));
      },
    });
  });
}

/** Convert a single cell to string for sheet rows. */
function cellToString(cell: unknown): string {
  if (cell == null || cell === '') return '';
  return String(cell).trim();
}

/** Convert a sheet row (array or object with numeric keys) to string[]. */
function sheetRowToArray(row: unknown): string[] {
  if (Array.isArray(row)) {
    return row.map(cellToString);
  }
  if (row && typeof row === 'object') {
    const obj = row as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => /^\d+$/.test(k))
      .map((k) => parseInt(k, 10));
    if (keys.length === 0) return [];
    const max = Math.max(...keys);
    return Array.from({ length: max + 1 }, (_, i) => cellToString(obj[String(i)]));
  }
  return [];
}

/**
 * Parse Excel (.xlsx, .xls): first sheet as rows, same header/metadata/footer logic as CSV.
 * Cell values are stringified so the rest of the pipeline matches CSV.
 */
export async function parseXLSX(file: File): Promise<ParseResult> {
  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { data: [], columns: [] };
  }
  const sheet = workbook.Sheets[firstSheetName];
  const sheetData = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: true,
  }) as unknown[];
  const rawRows: string[][] = sheetData
    .map((row) => sheetRowToArray(row))
    .filter((row) => row.length > 0);
  if (rawRows.length === 0) {
    return { data: [], columns: [] };
  }
  return processRawRows(rawRows);
}

/**
 * Parse PDF file. Browser-compatible: extract text via PDF.js.
 * For table extraction we return text lines; caller can map to rows.
 */
export async function parsePDF(file: File): Promise<ParseResult> {
  // Dynamic import for pdfjs-dist (browser build)
  try {
    const pdfjsLib = await import('pdfjs-dist');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const textParts: string[] = [];
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      textParts.push(strings);
    }
    const fullText = textParts.join('\n');
    // Simple table detection: split by newlines, then by whitespace
    const lines = fullText.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) {
      return { data: [], columns: [] };
    }
    // First line as headers, rest as data (tab or multiple spaces as separator)
    const sep = /\t+|  +/;
    const headers = lines[0].split(sep).map((h) => h.trim()).filter(Boolean);
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(sep).map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, j) => {
        row[h] = values[j] ?? '';
      });
      rows.push(row);
    }
    return { data: rows, columns: headers };
  } catch (err) {
    console.error('PDF parse error:', err);
    throw new Error('Failed to parse PDF. Ensure the file is a valid PDF.');
  }
}

/**
 * Return list of column names from parsed data (first row keys).
 */
export function detectColumns(data: Record<string, string>[]): string[] {
  if (data.length === 0) return [];
  return Object.keys(data[0]);
}

/**
 * Validate parsed data against column mapping. Returns validation result with errors.
 * Supports: single Amount; Amount + Dr/Cr; or separate Debit + Credit columns.
 */
export function validateData(
  data: Record<string, string>[],
  mapping: ColumnMapping
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const hasDebitCol = Boolean(mapping.debitColumn);
  const hasCreditCol = Boolean(mapping.creditColumn);
  if (hasDebitCol !== hasCreditCol) {
    errors.push('When using separate Debit/Credit columns, both Debit and Credit must be mapped.');
  }
  const useSeparateDebitCredit = hasDebitCol && hasCreditCol;
  const required: string[] = [
    mapping.transactionDate,
    mapping.valueDate,
    mapping.transactionDetails,
    mapping.chqRefNo,
    mapping.balance,
  ].filter(Boolean);
  if (useSeparateDebitCredit) {
    required.push(mapping.debitColumn!, mapping.creditColumn!);
  } else {
    required.push(mapping.debitCredit);
    if (mapping.debitCreditType) required.push(mapping.debitCreditType);
  }

  if (data.length === 0) {
    errors.push('No rows to validate.');
    return { valid: false, errors };
  }

  const columns = Object.keys(data[0]);
  for (const req of required) {
    if (req && !columns.includes(req)) {
      errors.push(`Missing required column: ${req}`);
    }
  }

  const dateLike = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    const dateVal = mapping.transactionDate ? row[mapping.transactionDate] : '';
    if (dateVal && isNaN(Date.parse(dateVal)) && !dateLike.test(dateVal)) {
      errors.push(`Row ${i + 1}: Invalid date format in transaction date`);
    }
    if (useSeparateDebitCredit) {
      const debitVal = (row[mapping.debitColumn!] ?? '').trim();
      const creditVal = (row[mapping.creditColumn!] ?? '').trim();
      const numDebit = parseFloat((debitVal || '0').replace(/[,₹\s]/g, ''));
      const numCredit = parseFloat((creditVal || '0').replace(/[,₹\s]/g, ''));
      if (debitVal && isNaN(numDebit)) {
        errors.push(`Row ${i + 1}: Invalid amount in Debit column`);
      }
      if (creditVal && isNaN(numCredit)) {
        errors.push(`Row ${i + 1}: Invalid amount in Credit column`);
      }
    } else {
      const amtVal = mapping.debitCredit ? row[mapping.debitCredit] : '';
      const numVal = parseFloat((amtVal ?? '').replace(/[,₹\s]/g, ''));
      if (amtVal && isNaN(numVal) && amtVal.trim() !== '') {
        errors.push(`Row ${i + 1}: Invalid amount in debit/credit column`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
