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
  BarChart3,
  Briefcase,
  Building2,
  ClipboardList,
  MapPin,
  Target,
  Trash2,
  SearchX,
  TrendingUp,
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

interface AppStats {
  total: number;
  counts: Record<string, number>;
  conversions: {
    saved_to_applied: number;
    applied_to_interview: number;
    interview_to_offer: number;
    applied_to_offer: number;
  };
  this_week: number;
  this_month: number;
  top_companies: { company: string; count: number }[];
  activity: { date: string; count: number }[];
}

export default function ApplicationsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<AppStats | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [appsRes, statsRes] = await Promise.all([
        api.get("/applications"),
        api.get("/applications/stats").catch(() => ({ data: null })),
      ]);
      setApplications(appsRes.data.applications || []);
      setCounts(appsRes.data.counts || {});
      setStats(statsRes.data || null);
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

      {!loading && stats && stats.total > 0 && (
        <div className="mb-8 space-y-6 rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 animate-fade-up">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Overview</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {([
              { label: "Total", value: stats.total, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40", icon: BarChart3 },
              { label: "Applied", value: stats.counts?.applied || 0, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40", icon: Target },
              { label: "Interviews", value: stats.counts?.interview || 0, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40", icon: TrendingUp },
              { label: "Offers", value: stats.counts?.offer || 0, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40", icon: Target },
            ] as const).map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
                  <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Funnel</h3>
              <div className="space-y-2">
                {(["saved", "applied", "interview", "offer", "rejected"] as const).map((s) => {
                  const n = stats.counts?.[s] || 0;
                  const pct = stats.total ? (n / stats.total) * 100 : 0;
                  const barColor: Record<string, string> = {
                    saved: "bg-blue-400", applied: "bg-amber-400", interview: "bg-purple-400", offer: "bg-emerald-400", rejected: "bg-red-400",
                  };
                  return (
                    <div key={s} className="flex items-center gap-3 text-sm">
                      <span className="w-20 text-slate-500 dark:text-slate-400 capitalize">{s}</span>
                      <div className="flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-2.5 rounded-full transition-all ${barColor[s]}`}
                          style={{ width: `${Math.max(pct, n > 0 ? 3 : 0)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-medium tabular-nums text-slate-700 dark:text-slate-200">{n}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Saved→Applied <span className="text-slate-700 dark:text-slate-200">{stats.conversions.saved_to_applied}%</span></span>
                <span>Applied→Interview <span className="text-slate-700 dark:text-slate-200">{stats.conversions.applied_to_interview}%</span></span>
                <span>Interview→Offer <span className="text-slate-700 dark:text-slate-200">{stats.conversions.interview_to_offer}%</span></span>
                <span>Applied→Offer <span className="text-slate-700 dark:text-slate-200">{stats.conversions.applied_to_offer}%</span></span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Top Companies</h3>
                {stats.top_companies.length > 0 ? (
                  <div className="space-y-1.5">
                    {stats.top_companies.map(({ company, count }) => (
                      <div key={company} className="flex items-center justify-between rounded-lg bg-slate-50/60 px-3 py-2 text-sm dark:bg-slate-800/40">
                        <span className="flex items-center gap-2 truncate text-slate-900 dark:text-white">
                          <Building2 className="size-3.5 shrink-0 text-slate-400" />
                          {company}
                        </span>
                        <span className="ml-2 shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No data yet</p>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Last 14 days</h3>
                <div className="flex items-end gap-1 h-16">
                  {stats.activity.map(({ date, count }) => {
                    const maxC = Math.max(...stats.activity.map((a) => a.count), 1);
                    const h = (count / maxC) * 100;
                    return (
                      <div key={date} className="group relative flex-1">
                        <div className="flex h-16 items-end justify-center">
                          <div
                            className={`w-full rounded-t-sm transition-all ${count > 0 ? "bg-blue-400" : "bg-slate-200 dark:bg-slate-700"}`}
                            style={{ height: `${Math.max(count > 0 ? h : 4, 4)}%` }}
                          />
                        </div>
                        <span className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-900">
                          {date.slice(5)}: {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-1 text-center text-[11px] text-slate-400">
                  This week {stats.this_week} &middot; This month {stats.this_month}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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