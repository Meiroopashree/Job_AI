"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { apiDetail } from "@/lib/apiError";
import JobCard from "@/components/JobCard";
import { ArrowLeft, Briefcase, ChevronLeft, ChevronRight, SearchX } from "lucide-react";

const PAGE_SIZE = 5;

interface JobItem {
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
    description?: string;
    apply_url?: string;
    salary_min?: number | null;
    salary_max?: number | null;
    salary_interval?: string | null;
    salary_currency?: string | null;
    date_posted?: string | null;
    source?: string | null;
  };
  match_percentage: number;
  explanation?: {
    matched_skills?: string[];
    missing_skills?: string[];
    required_skills?: string[];
    strengths?: string[];
    summary?: string;
  };
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [onlyRecent, setOnlyRecent] = useState(false);
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const profileId = params.profileId as string;

  useEffect(() => {
    if (!isLoading && !user) { router.push("/login"); return; }
    if (!user || !profileId) return;

    const fetchJobs = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/match/${profileId}`, {
          params: { page, limit: PAGE_SIZE, days: onlyRecent ? 7 : undefined },
        });
        setJobs(res.data.results || []);
        setTotalPages(res.data.total_pages || 1);
        setTotalJobs(res.data.total_jobs || 0);
      } catch (err) {
        setError(apiDetail(err, "Failed to fetch jobs"));
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, user, page, onlyRecent]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [profileId, onlyRecent]);

  if (isLoading || !user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 animate-in">
      <div className="mb-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Job Matches
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Briefcase className="size-4" />
              {totalJobs > 0 ? `${totalJobs} jobs ranked for your profile` : "AI-matched jobs based on your profile"}
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-3.5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800">
            <input
              type="checkbox"
              checked={onlyRecent}
              onChange={(e) => setOnlyRecent(e.target.checked)}
              className="size-4 accent-blue-600"
            />
            New matches (last 7 days)
          </label>
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-200/60 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/70"
            >
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="size-14 rounded-xl bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="mt-5 space-y-2">
                <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="animate-pop rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="animate-fade-up rounded-2xl border border-slate-200/60 bg-white/80 py-16 text-center dark:border-slate-800 dark:bg-slate-900/70">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <SearchX className="size-8" />
          </span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No matches found</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Try scraping more jobs or uploading a different resume
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <>
          <div className="mb-8 space-y-4">
            {jobs.map((item: JobItem, index: number) => (
              <JobCard key={item?.job?.id ?? index} item={item} profileId={Number(profileId)} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200/70 pt-4 sm:flex-row dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    aria-current={p === page ? "page" : undefined}
                    className={`size-9 rounded-lg text-sm font-medium transition-all ${
                      p === page
                        ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}