"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useResume } from "@/contexts/ResumeContext";
import { api } from "@/lib/api";
import { apiDetail } from "@/lib/apiError";
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  Building2,
  ChevronRight,
  MapPin,
  RefreshCw,
  Search,
  SearchX,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 10;

interface JobRow {
  id: number;
  title: string;
  company: string;
  location: string;
  skills: string[];
  description: string;
  apply_url: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_interval?: string | null;
  salary_currency?: string | null;
  is_remote?: boolean;
  created_at: string;
}

function formatSalary(min?: number | null, max?: number | null, interval?: string | null, currency?: string | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));
  const cur = currency || "$";
  const intervalLabel = interval === "hourly" ? "/hr" : interval === "monthly" ? "/mo" : interval === "yearly" ? "/yr" : "";
  if (min && max) return `${cur}${fmt(min)} - ${cur}${fmt(max)}${intervalLabel}`;
  if (min) return `${cur}${fmt(min)}+${intervalLabel}`;
  return `Up to ${cur}${fmt(max!)}${intervalLabel}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function BrowseJobsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { profiles, selectedProfileId, setSelectedProfileId } = useResume();

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [postedDays, setPostedDays] = useState(0);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [sort, setSort] = useState("newest");
  const [savedOnly, setSavedOnly] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
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
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState("");
  const [fetchMsgType, setFetchMsgType] = useState<"ok" | "err" | "">("");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (search) params.search = search;
      if (company) params.company = company;
      if (location) params.location = location;
      if (postedDays) params.posted_days = postedDays;
      if (salaryMin.trim()) params.min_salary = Number(salaryMin);
      if (salaryMax.trim()) params.max_salary = Number(salaryMax);
      if (sort !== "newest") params.sort = sort;
      const res = await api.get("/jobs", { params });
      setJobs(res.data.jobs || []);
      setTotalPages(res.data.total_pages || 1);
      setTotalJobs(res.data.total_jobs || 0);
    } catch (err) {
      setError(apiDetail(err, "Failed to load jobs"));
    } finally {
      setLoading(false);
    }
  }, [page, search, company, location, postedDays, salaryMin, salaryMax, sort]);

  const fetchBookmarks = useCallback(async () => {
    try {
      const res = await api.get("/jobs/bookmarks");
      const ids = new Set<number>((res.data.bookmarks || []).map((b: { id: number }) => b.id));
      setBookmarkedIds(ids);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }
    if (!user) return;
    void Promise.resolve().then(fetchJobs);
    void Promise.resolve().then(fetchBookmarks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchJobs, user, isLoading]);

  const toggleBookmark = async (jobId: number) => {
    const isBookmarked = bookmarkedIds.has(jobId);
    try {
      if (isBookmarked) await api.delete(`/jobs/${jobId}/bookmark`);
      else await api.post(`/jobs/${jobId}/bookmark`);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (isBookmarked) next.delete(jobId);
        else next.add(jobId);
        return next;
      });
    } catch {
      // ignore
    }
  };

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setCompany(companyInput.trim());
    setLocation(locationInput.trim());
    setPage(1);
  };

  const handlePostedChange = (value: string) => {
    setPostedDays(Number(value) || 0);
    setPage(1);
  };

  const pollScrapeJob = async (jobId: number, attempts = 60) => {
    for (let i = 0; i < attempts; i++) {
      await sleep(2500);
      const res = await api.get(`/jobs/scrape-recommend/${jobId}`);
      const s = res.data?.status;
      if (s === "done" || s === "failed") return res.data;
    }
    return { status: "failed", error: "Timed out waiting for the scrape to finish." };
  };

  const applyScrapeResult = (d: { added?: number | string; error?: string }) => {
    const added = Number(d?.added) || 0;
    if (added > 0) {
      setFetchMsg(
        `Fetched fresh jobs for your resume — added ${added} new job${added === 1 ? "" : "s"} to the database. Showing them below.`
      );
      setFetchMsgType("ok");
    } else {
      setFetchMsg(
        d?.error
          ? `Scraping failed: ${d.error}`
          : "No new jobs found for your resume right now. Try again later."
      );
      setFetchMsgType(d?.error ? "err" : "");
    }
    setPostedDays(0);
    setSearch("");
    setCompany("");
    setLocation("");
    setSearchInput("");
    setCompanyInput("");
    setLocationInput("");
    setPage(1);
    fetchJobs();
  };

  const handleFetchNew = async () => {
    setFetching(true);
    setFetchMsg("");
    setFetchMsgType("");
    try {
      const res = await api.post("/jobs/scrape-recommend", {
        profile_id: selectedProfileId || undefined,
      });
      const d = res.data;
      if (d?.job_id) {
        setFetchMsg("Scraping fresh jobs in the background — this may take a minute...");
        setFetchMsgType("");
        applyScrapeResult(await pollScrapeJob(Number(d.job_id)));
      } else if (d?.detail) {
        setFetchMsg(d.detail);
        setFetchMsgType("err");
      } else {
        setFetchMsg("No new jobs found for your resume right now. Try again later.");
        setFetchMsgType("");
      }
    } catch (err) {
      setFetchMsg(apiDetail(err, "Failed to fetch new jobs"));
      setFetchMsgType("err");
    } finally {
      setFetching(false);
    }
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

      {/* Fetch fresh jobs for the selected resume */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Need fresh matches?
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Scrapes LinkedIn + Indeed using the selected resume&apos;s skills and location, stores
            them, and shows the best new matches.
          </p>
          {profiles.length > 0 && (
            <label className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="whitespace-nowrap">Resume</span>
              <select
                value={selectedProfileId || ""}
                onChange={(e) => setSelectedProfileId(Number(e.target.value))}
                className="h-8 max-w-56 rounded-lg border border-indigo-200 bg-white px-2 text-xs font-medium text-slate-900 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.file_name || `Resume #${p.id}`}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <button
          onClick={handleFetchNew}
          disabled={fetching}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${fetching ? "animate-spin" : ""}`} />
          {fetching ? "Scraping..." : "Fetch new jobs for my resume"}
        </button>
      </div>

      {fetchMsg && (
        <div
          className={`mb-4 animate-pop rounded-xl border px-4 py-2.5 text-sm ${
            fetchMsgType === "err"
              ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400"
              : "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
          }`}
        >
          {fetchMsg}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 grid gap-3 surface p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_150px_150px_150px] lg:items-end">
        <div className="sm:col-span-2 lg:col-span-1">
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
            placeholder="e.g. Bengaluru"
            className="input-base h-11 rounded-lg px-3"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Posted
          </label>
          <select
            value={postedDays}
            onChange={(e) => handlePostedChange(e.target.value)}
            className="input-base h-11 rounded-lg px-3"
          >
            <option value={0}>Anytime</option>
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Min salary
          </label>
          <input
            type="number"
            min={0}
            value={salaryMin}
            onChange={(e) => {
              setSalaryMin(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. 80000"
            className="input-base h-11 rounded-lg px-3"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Max salary
          </label>
          <input
            type="number"
            min={0}
            value={salaryMax}
            onChange={(e) => {
              setSalaryMax(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. 150000"
            className="input-base h-11 rounded-lg px-3"
          />
        </div>
        <div className="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Sort
            </label>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="input-base h-11 rounded-lg px-3"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="salary_desc">Highest salary</option>
              <option value="salary_asc">Lowest salary</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>
          <label className="flex h-11 cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={savedOnly}
              onChange={(e) => {
                setSavedOnly(e.target.checked);
                setPage(1);
              }}
              className="size-4 accent-indigo-600"
            />
            Saved only
          </label>
          <button
            onClick={handleSearch}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-transform hover:scale-[1.01] active:scale-[0.99] lg:ml-auto"
          >
            <Search className="size-4" />
            Search
          </button>
        </div>
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
            {jobs
              .filter((job) => !savedOnly || bookmarkedIds.has(job.id))
              .map((job) => {
                const isBookmarked = bookmarkedIds.has(job.id);
                const salary = formatSalary(job.salary_min, job.salary_max, job.salary_interval, job.salary_currency);
                return (
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
                        {job.is_remote && (
                          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                            Remote
                          </span>
                        )}
                        {salary && (
                          <span className="font-medium text-slate-600 dark:text-slate-300">{salary}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => toggleBookmark(job.id)}
                      aria-label={isBookmarked ? "Remove bookmark" : "Bookmark job"}
                      title={isBookmarked ? "Remove bookmark" : "Bookmark job"}
                      className={`inline-flex size-8 items-center justify-center rounded-lg border transition-colors ${
                        isBookmarked
                          ? "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                          : "border-slate-300 text-slate-500 hover:border-amber-300 hover:text-amber-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-amber-800 dark:hover:text-amber-400"
                      }`}
                    >
                      <Bookmark className={`size-4 ${isBookmarked ? "fill-current" : ""}`} />
                    </button>
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
                );
              })}
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              summary={`Page ${page} of ${totalPages} \u00B7 ${totalJobs} jobs`}
            />
          )}
        </>
      )}
    </div>
  );
}