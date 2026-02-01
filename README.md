# Expense Analyzer

A React + TypeScript expense analysis application that runs entirely in the browser. All data is encrypted and stored locally (IndexedDB).

## Features

- **Encrypted storage**: AES-256 encryption with PBKDF2 key derivation; data is never stored in plain text.
- **CSV & PDF import**: Upload bank statement CSV or PDF; map columns and import with duplicate detection.
- **Dashboard**: Monthly income/expense, balance, top expenses, and multiple charts (Recharts).
- **Transactions**: Paginated list with filters (date, amount, type, category, search), edit category, delete, export CSV.
- **Dark mode**: Toggle via header.
- **Responsive**: Works on mobile (320px+) and desktop.

## Tech Stack

- React 18, TypeScript, Vite
- Tailwind CSS
- idb (IndexedDB), crypto-js (encryption), PapaParse (CSV), pdfjs-dist (PDF), Recharts, Lucide React, date-fns

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173. On first run, set a password (used only for local encryption). Then upload a statement or use the sample CSV in `public/sample-statement.csv`.

## Build

```bash
npm run build
npm run preview
```

## Project Structure

- `src/components/` – UI components (Dashboard, FileUpload, ColumnMapper, TransactionList, FilterPanel, Charts, SecuritySetup, Layout)
- `src/services/` – encryption, database, fileParser, dataAnalysis
- `src/hooks/` – useTransactions, useEncryption, useFilters
- `src/utils/` – dateHelpers, currencyParser, categorization
- `src/types/` – TypeScript interfaces

## Security

- Password is never sent over the network; key derivation and encryption happen in the browser.
- All transaction data in IndexedDB is stored encrypted.
