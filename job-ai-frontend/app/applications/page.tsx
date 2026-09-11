"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { apiDetail } from "@/lib/apiError";
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  Building2,
  ClipboardList,
  MapPin,
  Trash2,
  SearchX,
} from "lucide-react";

const STATUSES = ["saved", "applied", "interview", "offer", "rejected"] as const;

const STATUS_STYLES: Record<string, { chip: string; select: string; label: string }> = {
  saved: {
    chip: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
    select: "",
    label: "Saved",
  },
  applied: {
    chip: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
    select: "",
    label: "Applied",
  },
  interview: {
    chip: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800",
    select: "",
    label: "Interview",
  },
  offer: {
    chip: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
    select: "",
    label: "Offer",
  },
  rejected: {
    chip: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    select: "",
    label: "Rejected",
  },
};

interface Application {
  id: number;
  job_id: number;
  profile_id: number | null;
  status: string;
  notes: string;
  applied_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
    apply_url: string;
  } | null;
}

export default function ApplicationsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/applications");
      setApplications(res.data.applications || []);
      setCounts(res.data.counts || {});
    } catch (err) {
      setError(apiDetail(err, "Failed to load applications"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/login"); return; }
    if (user) void Promise.resolve().then(fetchApps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, fetchApps]);

  const handleStatusChange = async (app: Application, status: string) => {
    try {
      await api.patch(`/applications/${app.id}`, { status });
      fetchApps();
    } catch (err) {
      alert(apiDetail(err, "Failed to update status"));
    }
  };

  const handleDelete = async (app: Application) => {
    if (!confirm(`Remove "${app.job?.title || `Job #${app.job_id}`}" from your applications?`)) return;
    try {
      await api.delete(`/applications/${app.id}`);
      fetchApps();
    } catch (err) {
      alert(apiDetail(err, "Failed to remove"));
    }
  };

  if (isLoading || !user) return null;

  const filtered = filter === "all"
    ? applications
    : applications.filter((a) => a.status === filter);

  const tabs = [
    { key: "all", label: "All" },
    ...STATUSES.map((s) => ({ key: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
  ];

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Applications
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <ClipboardList className="size-4" />
              {applications.length > 0
                ? `${applications.length} job${applications.length === 1 ? "" : "s"} tracked`
                : "Track jobs you have saved or applied to"}
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 dark:border-blue-900 dark:bg-slate-900/70 dark:text-blue-400 dark:hover:bg-blue-950/30"
          >
            <Briefcase className="size-4" />
            Browse Jobs
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const count = tab.key === "all"
            ? applications.length
            : counts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                filter === tab.key
                  ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25"
                  : "border border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
              <span className={`text-xs ${filter === tab.key ? "text-white/80" : "text-slate-400"}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="animate-pop rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200/60 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-2 h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="animate-fade-up rounded-2xl border border-slate-200/60 bg-white/80 py-16 text-center dark:border-slate-800 dark:bg-slate-900/70">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <SearchX className="size-8" />
          </span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
            {filter === "all" ? "No applications yet" : "Nothing in this status"}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Save jobs from your matches page to start tracking
          </p>
          <button
            onClick={() => router.push("/jobs")}
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Browse Jobs
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((app) => {
            const style = STATUS_STYLES[app.status] || STATUS_STYLES.saved;
            return (
              <div
                key={app.id}
                className="group flex flex-col gap-3 rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/jobs/job/${app.job_id}`}
                        className="truncate text-base font-semibold text-slate-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                      >
                        {app.job?.title || `Job #${app.job_id}`}
                      </Link>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3.5" />
                          {app.job?.company || "Unknown Company"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5" />
                          {app.job?.location || "Location not specified"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {(app.notes || app.applied_at) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {app.notes && <span>{app.notes}</span>}
                      {app.applied_at && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                          Applied {app.applied_at.slice(0, 10)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <select
                    value={app.status}
                    onChange={(e) => handleStatusChange(app, e.target.value)}
                    className={`h-9 cursor-pointer rounded-lg border px-3 text-xs font-medium outline-none transition-colors ${style.chip} dark:bg-transparent`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>

                  {app.job?.apply_url && (
                    <a
                      href={app.job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700"
                      title="Open job posting"
                    >
                      <ArrowUpRight className="size-4" />
                    </a>
                  )}

                  <button
                    onClick={() => handleDelete(app)}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:hover:border-red-900 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    title="Remove"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}