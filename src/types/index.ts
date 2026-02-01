export interface Transaction {
  id: string;
  transactionDate: Date;
  valueDate: Date;
  transactionDetails: string;
  chqRefNo: string;
  debitCredit: number; // positive for credit, negative for debit
  balance: number;
  category?: string;
  tags?: string[];
  source: string;
  uploadDate: Date;
}

export interface ColumnMapping {
  transactionDate: string;
  valueDate: string;
  transactionDetails: string;
  chqRefNo: string;
  debitCredit: string;
    /** Optional: when amount and Dr/Cr are in separate columns (e.g. "Amount" + "Dr / Cr") */
  debitCreditType?: string;
  balance: string;
}

/** Metadata extracted from statement header/footer (account, period, etc.) */
export interface StatementMetadata {
  accountHolder?: string;
  accountNo?: string;
  periodFrom?: string;
  periodTo?: string;
  currency?: string;
  branch?: string;
  closingBalance?: string;
  /** Any other key-value pairs from header/footer rows */
  extra?: Record<string, string>;
}

export interface FilterOptions {
  dateRange: { start: Date | null; end: Date | null };
  amountRange: { min: number | null; max: number | null };
  transactionType: 'all' | 'debit' | 'credit';
  searchText: string;
  categories: string[];
}

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryData {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}
