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
  CheckCircle2,
  ClipboardList,
  MapPin,
  Target,
  Trash2,
  SearchX,
  Wand2,
  BarChart3,
} from "lucide-react";

const STATUSES = ["saved", "applied", "interview", "offer", "rejected"] as const;

const STATUS_STYLES: Record<
  string,
  { chip: string; dot: string; label: string; bar: string }
> = {
  saved: {
    chip: "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800",
    dot: "bg-indigo-500",
    label: "Saved",
    bar: "bg-indigo-400",
  },
  applied: {
    chip: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
    dot: "bg-amber-500",
    label: "Applied",
    bar: "bg-amber-400",
  },
  interview: {
    chip: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800",
    dot: "bg-purple-500",
    label: "Interview",
    bar: "bg-purple-400",
  },
  offer: {
    chip: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
    dot: "bg-emerald-500",
    label: "Offer",
    bar: "bg-emerald-400",
  },
  rejected: {
    chip: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    dot: "bg-red-500",
    label: "Rejected",
    bar: "bg-red-400",
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

const STAT_CARDS: { key: string; label: string; icon: typeof Target; tint: string }[] = [
  { key: "total", label: "Total tracked", icon: ClipboardList, tint: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400" },
  { key: "applied", label: "Applied", icon: Briefcase, tint: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" },
  { key: "interview", label: "Interviews", icon: Target, tint: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400" },
  { key: "offer", label: "Offers", icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" },
];

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

  const progressToOffer = stats?.total
    ? Math.round(((stats.counts?.offer || 0) / stats.total) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 animate-in">
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Dashboard
      </button>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-terra-700 via-rust-600 to-terra-800 p-7 text-white btn-glow sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 right-24 size-48 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} aria-hidden />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white backdrop-blur">
              <ClipboardList className="size-3.5" />
              JOB TRACKER
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl font-heading">
              {applications.length > 0
                ? `${applications.length} job${applications.length === 1 ? "" : "s"} in motion`
                : "Your job applications"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/85">
              Save, apply, and follow every opportunity in one place — then watch your
              interview and offer rates climb.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/jobs"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.99]"
              >
                <Wand2 className="size-4" />
                Auto-Fill apply
              </Link>
              <Link
                href="/jobs"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-transform hover:scale-[1.02] active:scale-[0.99]"
              >
                <Briefcase className="size-4" />
                Browse jobs
              </Link>
            </div>
          </div>

          {stats && stats.total > 0 && (
            <div className="relative w-full max-w-xs rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-5xl font-bold tabular-nums tracking-tight">{stats.total}</p>
                  <p className="mt-1 text-xs font-medium text-white/70">applications tracked</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold tabular-nums text-honey-200">{progressToOffer}%</p>
                  <p className="text-xs font-medium text-white/70">offers won</p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-honey-300 to-terra-300 transition-all"
                  style={{ width: `${progressToOffer}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-white/70">
                This week {stats.this_week} &middot; This month {stats.this_month}
              </p>
            </div>
          )}
        </div>
      </div>

      {!loading && stats && stats.total > 0 && (
        <div className="mt-8 space-y-6 surface p-6 shadow-sm animate-fade-up">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <BarChart3 className="size-5 text-indigo-500" />
              Overview
            </h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Updated live
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {STAT_CARDS.map(({ key, label, icon: Icon, tint }) => {
              const value = key === "total" ? stats.total : stats.counts?.[key] || 0;
              return (
                <div key={key} className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tint}`}>
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Funnel</h3>
              <div className="space-y-2">
                {STATUSES.map((s) => {
                  const n = stats.counts?.[s] || 0;
                  const pct = stats.total ? (n / stats.total) * 100 : 0;
                  return (
                    <div key={s} className="flex items-center gap-3 text-sm">
                      <span className="flex w-24 items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <span className={`size-2 rounded-full ${STATUS_STYLES[s].dot}`} />
                        <span className="capitalize">{s}</span>
                      </span>
                      <div className="flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-2.5 rounded-full transition-all ${STATUS_STYLES[s].bar}`}
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
                        <span className="ml-2 shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
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
                            className={`w-full rounded-t-sm transition-all ${count > 0 ? "bg-indigo-400" : "bg-slate-200 dark:bg-slate-700"}`}
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

      <div className="mb-6 mt-8 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const count = tab.key === "all"
            ? applications.length
            : counts[tab.key] || 0;
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                active
                  ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25"
                  : "border border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
              <span className={`text-xs ${active ? "text-white/80" : "text-slate-400"}`}>
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
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
            <SearchX className="size-8" />
          </span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
            {filter === "all" ? "No applications yet" : "Nothing in this status"}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Save jobs from your matches page to start tracking — or skip ahead and
            auto-fill an application from your resume.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Wand2 className="size-4" />
              Auto-Fill apply
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Browse jobs
            </Link>
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((app) => {
            const style = STATUS_STYLES[app.status] || STATUS_STYLES.saved;
            return (
              <div
                key={app.id}
                className="group flex flex-col gap-3 surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md lg:flex-row lg:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 size-2 shrink-0 rounded-full ${style.dot}`} />
                    <div className="min-w-0">
                      <Link
                        href={`/jobs/job/${app.job_id}`}
                        className="truncate text-base font-semibold text-slate-900 transition-colors hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
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

                <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                  <Link
                    href={`/jobs/job/${app.job_id}/apply`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                    title="Auto-fill another application from your resume"
                  >
                    <Wand2 className="size-3.5" />
                    Auto-Fill
                  </Link>

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
                      className="inline-flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-indigo-600 hover:text-white dark:bg-slate-800 dark:text-slate-400"
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