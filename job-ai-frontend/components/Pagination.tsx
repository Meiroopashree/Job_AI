"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PageItem = number | "ellipsis-start" | "ellipsis-end";

function getPageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis-end", total];
  if (current >= total - 3) return [1, "ellipsis-start", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis-start", current - 1, current, current + 1, "ellipsis-end", total];
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  summary?: string;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, summary, className }: PaginationProps) {
  const items = getPageItems(page, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 border-t border-slate-200/70 pt-4 sm:flex-row",
        className
      )}
    >
      {summary && <p className="text-sm text-slate-500 dark:text-slate-400">{summary}</p>}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="size-4" />
        </button>
        {items.map((item, index) =>
          item === "ellipsis-start" || item === "ellipsis-end" ? (
            <span
              key={`${item}-${index}`}
              className="box-content w-4 shrink-0 text-center text-sm text-slate-400 dark:text-slate-500"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "size-9 rounded-lg text-sm font-medium transition-all",
                item === page
                  ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              {item}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}