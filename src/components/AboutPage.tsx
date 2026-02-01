const VERSION = 'V 0.1';
const AUTHOR = 'Shyam Patodiya';

export function AboutPage() {
  return (
    <div className="relative min-h-[60vh] flex items-center justify-center overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
      {/* Minimalist animated background */}
      <div
        className="absolute inset-0 bg-gray-50 dark:bg-gray-900/80"
        aria-hidden
      >
        {/* Subtle moving gradient */}
        <div
          className="absolute inset-0 opacity-[0.4] dark:opacity-[0.25]"
          style={{
            background:
              'linear-gradient(120deg, transparent 0%, rgba(99, 102, 241, 0.08) 25%, transparent 50%, rgba(139, 92, 246, 0.06) 75%, transparent 100%)',
            backgroundSize: '400% 400%',
            animation: 'gradientShift 15s ease infinite',
          }}
        />
        {/* Dot grid - light mode */}
        <div
          className="absolute inset-0 opacity-50 dark:opacity-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Dot grid - dark mode */}
        <div
          className="absolute inset-0 opacity-0 dark:opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #475569 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Soft orbs - very subtle */}
        <div
          className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-indigo-200/30 dark:bg-indigo-500/10 blur-3xl"
          style={{ animation: 'float 20s ease-in-out infinite' }}
        />
        <div
          className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-violet-200/30 dark:bg-violet-500/10 blur-3xl"
          style={{ animation: 'float 18s ease-in-out infinite 2s' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 py-12">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
          Expense Analyzer
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Track, categorize & visualize your transactions
        </p>
        <div className="inline-flex flex-col gap-3 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700/80 px-8 py-6 shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Version
            </span>
            <span className="text-lg font-medium text-indigo-600 dark:text-indigo-400">
              {VERSION}
            </span>
          </div>
          <div className="h-px bg-gray-200 dark:bg-gray-600 w-16 mx-auto" />
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Author
            </span>
            <span className="text-lg font-medium text-gray-800 dark:text-gray-200">
              {AUTHOR}
            </span>
          </div>
        </div>
      </div>

      {/* Keyframes - inject once via style tag to keep component clean */}
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(12px, -12px) scale(1.02); }
          66% { transform: translate(-8px, 8px) scale(0.98); }
        }
      `}</style>
    </div>
  );
}
