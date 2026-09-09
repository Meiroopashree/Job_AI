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
} from "lucide-react";

interface JobDetail {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string[];
  apply_url: string;
  created_at: string;
}

export default function JobDetailPage() {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, user, isLoading]);

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
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {!loading && !error && job && (
        <div className="animate-fade-up overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          <div className="border-b border-slate-200/70 p-6 dark:border-slate-800">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md dark:from-slate-600 dark:to-slate-800">
                <Building2 className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {job.title || "Untitled Position"}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="size-4 shrink-0" />
                    {job.company || "Unknown Company"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4 shrink-0" />
                    {job.location || "Location not specified"}
                  </span>
                </div>
              </div>
            </div>

            {job.apply_url && (
              <a
                href={job.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                Apply Now
                <ArrowUpRight className="size-4" />
              </a>
            )}
          </div>

          {job.skills?.length > 0 && (
            <div className="border-b border-slate-200/70 p-6 dark:border-slate-800">
              <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((s: string, i: number) => (
                  <span
                    key={i}
                    className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="p-6">
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