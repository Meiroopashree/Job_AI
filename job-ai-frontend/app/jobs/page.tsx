"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { apiDetail } from "@/lib/apiError";
import {
  ArrowRight,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  RefreshCw,
  Search,
  SearchX,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const PAGE_SIZE = 10;

interface JobRow {
  id: number;
  title: string;
  company: string;
  location: string;
  skills: string[];
  description: string;
  apply_url: string;
  created_at: string;
}

export default function BrowseJobsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [companyInput, setCompanyInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState("");
  const [descFilling, setDescFilling] = useState(false);
  const [descFillMsg, setDescFillMsg] = useState("");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (search) params.search = search;
      if (company) params.company = company;
      if (location) params.location = location;
      const res = await api.get("/jobs", { params });
      setJobs(res.data.jobs || []);
      setTotalPages(res.data.total_pages || 1);
      setTotalJobs(res.data.total_jobs || 0);
    } catch (err) {
      setError(apiDetail(err, "Failed to load jobs"));
    } finally {
      setLoading(false);
    }
  }, [page, search, company, location]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }
    if (!user) return;
    void Promise.resolve().then(fetchJobs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchJobs, user, isLoading]);

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setCompany(companyInput.trim());
    setLocation(locationInput.trim());
    setPage(1);
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillMsg("");
    try {
      const res = await api.post("/jobs/backfill");
      setBackfillMsg(res.data?.message || "Skills re-scanned");
      fetchJobs();
    } catch (err) {
      setBackfillMsg(apiDetail(err, "Failed to re-scan skills"));
    } finally {
      setBackfilling(false);
    }
  };

  const handleDescBackfill = async () => {
    setDescFilling(true);
    setDescFillMsg("");
    try {
      const res = await api.post("/jobs/backfill/descriptions", null, {
        params: { limit: 20 },
      });
      const d = res.data;
      setDescFillMsg(
        d?.message || "Fetched missing descriptions"
      );
      if (typeof d?.updated === "number" && typeof d?.failed === "number" && typeof d?.remaining === "number") {
        setDescFillMsg(
          `${d.updated} updated, ${d.skipped ?? 0} skipped, ${d.failed} failed · ${d.remaining} remaining. Run again to fetch more.`
        );
      }
      fetchJobs();
    } catch (err) {
      setDescFillMsg(apiDetail(err, "Failed to fetch descriptions"));
    } finally {
      setDescFilling(false);
    }
  };

  if (isLoading || !user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 animate-in">
      <PageHeader
        className="mb-6"
        eyebrow="Browse Jobs"
        eyebrowIcon={Briefcase}
        title="Find your next role"
        subtitle={
          totalJobs > 0
            ? `${totalJobs} job${totalJobs === 1 ? "" : "s"} in the database`
            : "All jobs scraped from LinkedIn and Indeed"
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1 rounded-md bg-white/12 px-2 py-0.5 font-medium">
              Search by title, company or location
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-white/12 px-2 py-0.5 font-medium">
              {PAGE_SIZE} per page
            </span>
          </>
        }
      />

      <details className="group/ops mb-6 surface p-3 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
          <span className="flex items-center gap-1.5">
            <Wrench className="size-3.5" />
            Maintenance tools
          </span>
          <ChevronRight className="size-3.5 transition-transform group-open/ops:rotate-90" />
        </summary>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200/70 pt-3 dark:border-slate-800">
          <button
            onClick={handleBackfill}
            disabled={backfilling}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`size-4 ${backfilling ? "animate-spin" : ""}`} />
            Re-scan job skills
          </button>
          <button
            onClick={handleDescBackfill}
            disabled={descFilling}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`size-4 ${descFilling ? "animate-spin" : ""}`} />
            Fetch missing descriptions
          </button>
        </div>
      </details>

      {backfillMsg && (
        <div className="mb-4 animate-pop rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
          {backfillMsg}
        </div>
      )}

      {descFillMsg && (
        <div className="mb-4 animate-pop rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400">
          {descFillMsg}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 grid gap-3 surface p-4 shadow-sm sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Title, company or keyword"
              className="input-base h-11 rounded-lg pl-9 pr-3"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Company
          </label>
          <input
            type="text"
            value={companyInput}
            onChange={(e) => setCompanyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="e.g. Stripe"
            className="input-base h-11 rounded-lg px-3"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Location
          </label>
          <input
            type="text"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="e.g. Dallas, TX"
            className="input-base h-11 rounded-lg px-3"
          />
        </div>
        <button
          onClick={handleSearch}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          <Search className="size-4" />
          Search
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-200/60 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70"
            >
              <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-2 h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
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
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No jobs found</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Try different filters or scrape new jobs from the dashboard
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <>
          <div className="mb-6 space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="group surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <Briefcase className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/jobs/job/${job.id}`}
                        className="truncate text-base font-semibold text-slate-900 transition-colors hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                      >
                        {job.title || "Untitled Position"}
                      </Link>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3.5" />
                          {job.company || "Unknown Company"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5" />
                          {job.location || "Location not specified"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {job.apply_url && (
                      <a
                        href={job.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                      >
                        Apply
                        <ArrowRight className="size-3.5" />
                      </a>
                    )}
                    <Link
                      href={`/jobs/job/${job.id}`}
                      aria-label="View details"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-800 dark:hover:text-indigo-400"
                    >
                      <Search className="size-4" />
                    </Link>
                  </div>
                </div>

                {job.skills?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.skills.slice(0, 8).map((s: string, i: number) => (
                      <span
                        key={i}
                        className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-400"
                      >
                        {s}
                      </span>
                    ))}
                    {job.skills.length > 8 && (
                      <span className="text-xs text-slate-400">+{job.skills.length - 8} more</span>
                    )}
                  </div>
                )}

                {job.description && (
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {job.description}
                  </p>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200/70 pt-4 sm:flex-row dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages} &middot; {totalJobs} jobs
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
                        ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25"
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