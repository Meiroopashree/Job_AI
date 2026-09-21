"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { apiDetail } from "@/lib/apiError";
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  Building2,
  MapPin,
  SearchX,
  DollarSign,
  Calendar,
  Globe,
  Wand2,
  Bookmark,
} from "lucide-react";
import { PageHeader, HeroPrimaryButton, HeroSecondaryButton } from "@/components/PageHeader";

interface JobDetail {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string[];
  apply_url: string;
  created_at: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_interval?: string | null;
  salary_currency?: string | null;
  date_posted?: string | null;
  source?: string | null;
}

function formatSalary(min?: number | null, max?: number | null, interval?: string | null, currency?: string | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(Math.round(n));
  };
  const cur = currency || "$";
  const intervalLabel = interval === "hourly" ? "/hr" : interval === "monthly" ? "/mo" : interval === "yearly" ? "/yr" : "";
  if (min && max) return `${cur}${fmt(min)} - ${cur}${fmt(max)}${intervalLabel}`;
  if (min) return `${cur}${fmt(min)}+${intervalLabel}`;
  return `Up to ${cur}${fmt(max!)}${intervalLabel}`;
}

export default function JobDetailPage() {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const jobId = params.jobId as string;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }
    if (!user || !jobId) return;

    const fetchJob = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/jobs/${jobId}`);
        setJob(res.data);
      } catch (err) {
        setError(apiDetail(err, "Failed to load job"));
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
    api
      .get("/jobs/bookmarks")
      .then((res) => {
        const ids = new Set<number>((res.data.bookmarks || []).map((b: { id: number }) => b.id));
        setBookmarked(ids.has(Number(jobId)));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, user, isLoading]);

  const toggleBookmark = async () => {
    if (bookmarkBusy) return;
    setBookmarkBusy(true);
    try {
      if (bookmarked) await api.delete(`/jobs/${jobId}/bookmark`);
      else await api.post(`/jobs/${jobId}/bookmark`);
      setBookmarked(!bookmarked);
    } catch {
      // ignore
    } finally {
      setBookmarkBusy(false);
    }
  };

  if (isLoading || !user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 animate-in">
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Dashboard
      </button>

      {loading && (
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-5 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-8 h-40 w-full rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      )}

      {error && (
        <div className="animate-pop rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && !job && (
        <div className="animate-fade-up rounded-2xl border border-slate-200/60 bg-white/80 py-16 text-center dark:border-slate-800 dark:bg-slate-900/70">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <SearchX className="size-8" />
          </span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Job not found</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This job may have been removed
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {!loading && !error && job && (
        <div className="animate-fade-up">
          <PageHeader
            className="mb-6"
            eyebrow="Job details"
            eyebrowIcon={Briefcase}
            title={job.title || "Untitled Position"}
            subtitle={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-4 shrink-0" />
                  {job.company || "Unknown Company"}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0" />
                  {job.location || "Location not specified"}
                </span>
              </span>
            }
            meta={
              <>
                {(() => {
                  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_interval, job.salary_currency);
                  if (!salary) return null;
                  return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/12 px-2 py-0.5 font-medium">
                      <DollarSign className="size-3" />
                      {salary}
                    </span>
                  );
                })()}
                {job.date_posted && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/12 px-2 py-0.5 font-medium">
                    <Calendar className="size-3" />
                    Posted {job.date_posted}
                  </span>
                )}
                {job.source && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/12 px-2 py-0.5 font-medium uppercase tracking-wide">
                    <Globe className="size-3" />
                    {job.source}
                  </span>
                )}
              </>
            }
            actions={
              <>
                <button
                  onClick={toggleBookmark}
                  disabled={bookmarkBusy}
                  title={bookmarked ? "Remove bookmark" : "Bookmark for later"}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                    bookmarked
                      ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                      : "border-slate-300 text-slate-600 hover:border-amber-300 hover:text-amber-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-amber-800 dark:hover:text-amber-400"
                  }`}
                >
                  <Bookmark className={`size-4 ${bookmarked ? "fill-current" : ""}`} />
                  {bookmarked ? "Bookmarked" : "Bookmark"}
                </button>
                <HeroPrimaryButton href={`/jobs/job/${job.id}/apply`}>
                  <Wand2 className="size-4" />
                  Auto-Fill Apply
                </HeroPrimaryButton>
                {job.apply_url && (
                  <HeroSecondaryButton href={job.apply_url} target="_blank" rel="noopener noreferrer">
                    Open listing
                    <ArrowUpRight className="size-4" />
                  </HeroSecondaryButton>
                )}
              </>
            }
          />

          {job.skills?.length > 0 && (
            <div className="mb-5 surface p-6 shadow-sm">
              <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((s: string, i: number) => (
                  <span
                    key={i}
                    className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-400"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="surface p-6 shadow-sm">
            <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Description
            </p>
            {job.description ? (
              <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {job.description}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No description available for this job.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}