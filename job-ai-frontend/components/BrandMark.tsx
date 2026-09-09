import Link from "next/link";

export function BrandMark({ showName = true }: { showName?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <span className="relative inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-600/25 ring-1 ring-white/20 transition-transform group-hover:scale-105">
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </span>
      {showName && (
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          Job<span className="text-blue-600 dark:text-blue-400">AI</span>
        </span>
      )}
    </Link>
  );
}