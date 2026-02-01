import { useState, useCallback } from 'react';
import { Upload, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { parseCSV, parsePDF, parseXLSX, type ParseResult } from '../services/fileParser';

interface FileUploadProps {
  onParsed: (result: ParseResult) => void;
}

const ACCEPT = '.csv,.pdf,.xlsx,.xls';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUpload({ onParsed }: FileUploadProps) {
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError('');
      setFileName(file.name);
      setLoading(true);
      try {
        const name = file.name.toLowerCase();
        const isCsv = name.endsWith('.csv');
        const isPdf = name.endsWith('.pdf');
        const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');
        if (isCsv) {
          const result = await parseCSV(file);
          onParsed(result);
        } else if (isPdf) {
          const result = await parsePDF(file);
          onParsed(result);
        } else if (isExcel) {
          const result = await parseXLSX(file);
          onParsed(result);
        } else {
          throw new Error('Only CSV, Excel (.xlsx, .xls), and PDF files are supported.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse file');
      } finally {
        setLoading(false);
      }
    },
    [onParsed]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (file.size > MAX_SIZE) {
        setError('File too large (max 10MB)');
        return;
      }
      handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_SIZE) {
        setError('File too large (max 10MB)');
        return;
      }
      handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  return (
    <div className="space-y-4">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          drag
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
        }`}
      >
        <input
          type="file"
          accept={ACCEPT}
          onChange={onInputChange}
          className="hidden"
          id="file-upload"
          disabled={loading}
        />
        <label htmlFor="file-upload" className="cursor-pointer block">
          {loading ? (
            <Loader2 className="w-12 h-12 mx-auto text-indigo-600 dark:text-indigo-400 animate-spin" />
          ) : (
            <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500" />
          )}
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {loading ? 'Parsing...' : 'Drop file here or click to upload'}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            CSV, Excel (.xlsx, .xls), or PDF, max 10MB
          </p>
          {fileName && !loading && (
            <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
              {/\.(csv|xlsx|xls)$/i.test(fileName) ? (
                <FileSpreadsheet size={14} />
              ) : (
                <FileText size={14} />
              )}
              {fileName}
            </p>
          )}
        </label>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
