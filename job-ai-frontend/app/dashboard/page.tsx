"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Link from "next/link";
import { apiDetail } from "@/lib/apiError";
import {
  Briefcase,
  TrendingUp,
  FileText,
  ArrowRight,
  Clock,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Trash2,
  Search,
  Sparkles,
  Building2,
  Mail,
  Send,
} from "lucide-react";
import { useStats } from "@/hooks/useStats";
import { PageHeader, HeroPrimaryButton, HeroSecondaryButton } from "@/components/PageHeader";

interface Platform {
  id: string;
  name: string;
  tagline: string;
  fields: { key: string; label: string; placeholder: string }[];
}

interface AutoStatus {
  enabled: boolean | null;
  interval_hours: number | null;
  running: boolean;
  last_run: string | null;
  last_status: string | null;
  last_counts: Record<string, number>;
  errors: string[];
  alerts: Record<string, unknown> | null;
  alerts_enabled: boolean;
  current_step: string | null;
}

interface RecommendedJob {
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
    salary_min?: number | null;
    salary_max?: number | null;
    salary_interval?: string | null;
    salary_currency?: string | null;
    date_posted?: string | null;
    source?: string | null;
    apply_url?: string;
  };
  match_percentage: number;
}

interface AlertsStatus {
  configured: boolean;
  email: string;
}

const platforms: Platform[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    tagline: "Professional network roles",
    fields: [
      { key: "search_term", label: "Search Term", placeholder: "e.g. software engineer" },
      { key: "location", label: "Location", placeholder: "e.g. Dallas, TX (optional)" },
      { key: "results_wanted", label: "Results", placeholder: "25" },
    ],
  },
  {
    id: "indeed",
    name: "Indeed",
    tagline: "The world's #1 job site",
    fields: [
      { key: "search_term", label: "Search Term", placeholder: "e.g. software engineer" },
      { key: "location", label: "Location", placeholder: "e.g. Dallas, TX (optional)" },
      { key: "country", label: "Country", placeholder: "e.g. USA" },
      { key: "results_wanted", label: "Results", placeholder: "25" },
    ],
  },
];

interface ScrapedJob {
  id: number;
  title: string;
  company: string;
  location: string;
}

interface Profile {
  id: number;
  file_name?: string;
  skills: string[];
  years_of_experience?: number;
  created_at?: string;
}

function PlatformBadge({ id }: { id: string }) {
  const base = "inline-flex size-11 items-center justify-center rounded-xl font-bold text-lg shadow-inner";
  return id === "linkedin" ? (
    <span className={`${base} bg-blue-600 text-white`}>in</span>
  ) : (
    <span className={`${base} bg-gradient-to-br from-orange-500 to-orange-600 text-white`}>in</span>
  );
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { stats, loading: statsLoading } = useStats();
  const [selectedPlatform, setSelectedPlatform] = useState<string>("linkedin");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [scraping, setScraping] = useState(false);
  const [scrapedJobs, setScrapedJobs] = useState<ScrapedJob[]>([]);
  const [scrapeMessage, setScrapeMessage] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [matching, setMatching] = useState(false);
  const [autoStatus, setAutoStatus] = useState<AutoStatus | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoMessage, setAutoMessage] = useState("");
  const [recJobs, setRecJobs] = useState<RecommendedJob[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recProfileFound, setRecProfileFound] = useState(true);
  const [alertsStatus, setAlertsStatus] = useState<AlertsStatus | null>(null);
  const [alertsBusy, setAlertsBusy] = useState<"test" | "send" | null>(null);
  const [alertMsg, setAlertMsg] = useState("");

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  const fetchProfiles = async () => {
    try {
      const res = await api.get("/upload-resume/list");
      setProfiles(res.data || []);
      if (res.data?.length > 0 && !selectedProfileId) {
        setSelectedProfileId(res.data[0].id);
      }
    } catch {
      // no profiles yet
    }
  };

  useEffect(() => {
    if (user) void Promise.resolve().then(fetchProfiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchRecommended = async () => {
    setRecLoading(true);
    try {
      const res = await api.get("/jobs/recommended", { params: { limit: 5, days: 30 } });
      setRecJobs(res.data.results || []);
      setRecProfileFound(res.data.profile_found !== false);
    } catch {
      setRecJobs([]);
    } finally {
      setRecLoading(false);
    }
  };

  useEffect(() => {
    if (user) void Promise.resolve().then(fetchRecommended);
  }, [user]);

  const fetchAlertsStatus = async () => {
    try {
      const res = await api.get("/alerts/status");
      setAlertsStatus(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user) void Promise.resolve().then(fetchAlertsStatus);
  }, [user]);

  const handleTestAlert = async () => {
    setAlertsBusy("test");
    setAlertMsg("");
    try {
      const res = await api.post("/alerts/test");
      setAlertMsg(res.data.message || "Test email sent");
    } catch (err) {
      setAlertMsg(`Error: ${apiDetail(err, "Test failed")}`);
    } finally {
      setAlertsBusy(null);
    }
  };

  const handleSendNow = async () => {
    setAlertsBusy("send");
    setAlertMsg("");
    try {
      const res = await api.post("/alerts/send-now");
      setAlertMsg(`${res.data.message || "Digest sent"}${res.data.matches ? ` (${res.data.matches} job${res.data.matches === 1 ? "" : "s"})` : ""}`);
    } catch (err) {
      setAlertMsg(`Error: ${apiDetail(err, "Send failed")}`);
    } finally {
      setAlertsBusy(null);
    }
  };

  const pollInFlightRef = useRef(false);
  const prevRunningRef = useRef(false);

  const fetchAutoStatus = async () => {
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    try {
      const res = await api.get("/jobs/auto-scrape/status");
      setAutoStatus(res.data);
    } catch {
      // ignore
    } finally {
      pollInFlightRef.current = false;
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (user) {
      api
        .get("/jobs/auto-scrape/status")
        .then((res) => {
          if (!cancelled) setAutoStatus(res.data);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const isRunning = !!autoStatus?.running;
    if (prevRunningRef.current && !isRunning) {
      const added = autoStatus?.last_counts?.added;
      setAutoMessage(
        added != null && added > 0
          ? `Auto-scrape finished — added ${added} new job${added === 1 ? "" : "s"}.`
          : "Auto-scrape finished — no new jobs found this time. This happens when the same listings are already saved."
      );
    }
    prevRunningRef.current = isRunning;
  }, [autoStatus]);

  useEffect(() => {
    if (!autoStatus?.running) return;
    const id = setInterval(() => void fetchAutoStatus(), 3000);
    return () => clearInterval(id);
  }, [autoStatus?.running]);

  const handleAutoScrape = async () => {
    if (autoRunning) return;
    setAutoRunning(true);
    setAutoMessage("");
    try {
      const res = await api.post("/jobs/auto-scrape/run");
      if (res.data.started) {
        setAutoMessage("Auto-scrape started — it may take a few minutes depending on how many skills you have");
      } else {
        setAutoMessage(res.data.reason || "Auto-scrape already running");
      }
      setTimeout(fetchAutoStatus, 2000);
    } catch (err) {
      setAutoMessage(`Error: ${apiDetail(err, "Failed to start auto-scrape")}`);
    } finally {
      setAutoRunning(false);
    }
  };

  const handleScrape = async () => {
    const platform = platforms.find((p) => p.id === selectedPlatform);
    if (!platform) return;

    setScraping(true);
    setScrapeMessage("");
    setScrapedJobs([]);

    try {
      const body: Record<string, string | number> = { platform: selectedPlatform };
      platform.fields.forEach((f) => {
        const v = fieldValues[f.key]?.trim();
        if (v) body[f.key] = f.key === "results_wanted" ? Number(v) : v;
      });
      const res = await api.post("/jobs/scrape", body);
      setScrapedJobs(res.data.jobs || []);
      setScrapeMessage(`Successfully scraped ${res.data.count} jobs from ${platform.name}`);
    } catch (err) {
      setScrapeMessage(`Error: ${apiDetail(err, "Scrape failed")}`);
    } finally {
      setScraping(false);
    }
  };

  const handleMatch = () => {
    if (!selectedProfileId) return;
    setMatching(true);
    router.push(`/jobs/${selectedProfileId}`);
  };

  const handleDelete = async (id: number, name: string | undefined) => {
    if (!confirm(`Delete "${name || `Resume #${id}`}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/upload-resume/${id}`);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      if (selectedProfileId === id) {
        setSelectedProfileId(profiles.find((p) => p.id !== id)?.id || null);
      }
    } catch (err) {
      alert(apiDetail(err, "Failed to delete"));
    }
  };

  if (isLoading || !user) return null;

  const selectedPlatformData = platforms.find((p) => p.id === selectedPlatform);

  const statCards = [
    { label: "Total Jobs", value: stats?.total_jobs, icon: Briefcase, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" },
    { label: "Jobs Today", value: stats?.jobs_today, icon: TrendingUp, color: "text-honey-600 bg-honey-50 dark:bg-honey-400/10" },
    { label: "Resumes", value: profiles.length, icon: FileText, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" },
    { label: "Scraped Now", value: scrapedJobs.length, icon: Search, color: "text-orange-600 bg-orange-50 dark:bg-orange-950/40" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-in">
      <PageHeader
        className="mb-8"
        eyebrow="Overview"
        eyebrowIcon={Sparkles}
        title="Dashboard"
        subtitle="Scrape fresh jobs from LinkedIn and Indeed, then find your best matches."
        actions={
          <>
            <HeroSecondaryButton href="/jobs">
              <Briefcase className="size-4" />
              Browse Jobs
            </HeroSecondaryButton>
            <HeroPrimaryButton href="/upload">
              <FileText className="size-4" />
              Upload Resume
            </HeroPrimaryButton>
          </>
        }
      />

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-4 surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {label}
              </p>
              <p className={`text-2xl font-bold text-slate-900 dark:text-white ${statsLoading ? "animate-pulse opacity-50" : ""}`}>
                {value ?? "—"}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Scraper */}
        <div className="space-y-6 lg:col-span-3">
          <div className="surface p-6 shadow-sm animate-fade-up">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <Building2 className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Scrape Jobs</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Choose a source and search</p>
              </div>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => {
                    setSelectedPlatform(platform.id);
                    setFieldValues({});
                    setScrapeMessage("");
                  }}
                  className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    selectedPlatform === platform.id
                      ? "border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-500/10 dark:bg-indigo-950/30"
                      : "border-slate-200/70 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <PlatformBadge id={platform.id} />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white">{platform.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{platform.tagline}</p>
                  </div>
                </button>
              ))}
            </div>

            {selectedPlatformData && (
              <div className="animate-fade-in space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedPlatformData.fields.map((field) => (
                    <div key={field.key} className={field.key === "results_wanted" ? "sm:col-span-2" : ""}>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={fieldValues[field.key] || ""}
                        onChange={(e) => setFieldValues({ ...fieldValues, [field.key]: e.target.value })}
                        className="input-base h-11 rounded-lg px-3"
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleScrape}
                  disabled={scraping}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-terra-600 to-rust-600 px-5 py-3 text-sm font-semibold text-white btn-glow ring-1 ring-white/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {scraping ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Scraping {selectedPlatformData.name}...
                    </>
                  ) : (
                    <>
                      <Search className="size-4" />
                      Scrape Jobs from {selectedPlatformData.name}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {scrapeMessage && (
            <div
              className={`animate-pop rounded-2xl border p-4 text-sm ${
                scrapeMessage.startsWith("Error")
                  ? "border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                  : "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
              }`}
            >
              {scrapeMessage}
            </div>
          )}

          {scrapedJobs.length > 0 && (
            <div className="surface p-6 shadow-sm animate-fade-up">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Scraped Jobs <span className="text-slate-400">({scrapedJobs.length})</span>
                </h2>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                  {selectedPlatformData?.name}
                </span>
              </div>
              <div className="hide-scrollbar max-h-80 space-y-2 overflow-y-auto pr-1">
                {scrapedJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/job/${job.id}`}
                    className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400">
                      <Briefcase className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{job.title}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {job.company} &middot; {job.location}
                      </p>
                    </div>
                    <ArrowRight className="mt-1.5 size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600" />
                  </Link>
                ))}
              </div>
              <Link
                href="/jobs"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400"
              >
                View all in Browse Jobs
                <ArrowRight className="size-4" />
              </Link>
            </div>
          )}

          {autoStatus && (
            <div className="surface p-5 shadow-sm animate-fade-up [animation-delay:50ms]">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`flex size-8 items-center justify-center rounded-lg ${autoStatus.enabled ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"}`}>
                    <Clock className="size-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Auto-Scrape</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {autoStatus.enabled
                        ? `Every ${autoStatus.interval_hours || 12}h based on your top skills`
                        : "Disabled — set AUTO_SCRAPE_ENABLED=true to enable"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAutoScrape}
                  disabled={autoRunning || autoStatus?.running}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-terra-600 to-rust-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50"
                >
                  {autoRunning || autoStatus?.running ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                  {autoRunning || autoStatus?.running ? "Running..." : "Run now"}
                </button>
              </div>

              {autoMessage && (
                <p className={`mb-3 text-xs ${autoMessage.startsWith("Error") ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {autoMessage}
                </p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
                {autoStatus.last_run && (
                  <span>Last run: {new Date(autoStatus.last_run).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</span>
                )}
                {autoStatus.last_counts?.added != null && (
                  <span>Added: <span className="font-medium text-slate-600 dark:text-slate-300">{autoStatus.last_counts.added}</span></span>
                )}
                {autoStatus.running && (
                  <span className="animate-pulse text-emerald-500">{autoStatus.current_step || "Running now..."}</span>
                )}
                <span>Email alerts: <span className={`font-medium ${autoStatus.alerts_enabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>{autoStatus.alerts_enabled ? "configured" : "not configured"}</span></span>
              </div>
            </div>
          )}

          <div className="surface p-6 shadow-sm animate-fade-up [animation-delay:100ms]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-terra-600 to-rust-600 text-white shadow-sm">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recommended for you</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Best matches from the last 30 days</p>
                </div>
              </div>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400"
              >
                Browse all
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {recLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            )}

            {!recLoading && !recProfileFound && (
              <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center dark:border-slate-700">
                <FileText className="mx-auto size-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Upload or select a resume to unlock recommendations</p>
                <Link
                  href="/upload"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  Upload Resume
                </Link>
              </div>
            )}

            {!recLoading && recProfileFound && recJobs.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No strong matches in the last 30 days. Scrape more jobs and check back.
              </p>
            )}

            {!recLoading && recJobs.length > 0 && (
              <div className="hide-scrollbar max-h-96 space-y-2 overflow-y-auto pr-1">
                {recJobs.map((item) => {
                  const pct = Math.round(Number(item.match_percentage) || 0);
                  return (
                    <Link
                      key={item.job.id}
                      href={`/jobs/job/${item.job.id}/apply`}
                      className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20"
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400">
                        <Briefcase className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.job.title}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {item.job.company} &middot; {item.job.location}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                          pct >= 80
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : pct >= 60
                              ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                              : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                        }`}
                      >
                        {pct}%
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Resumes + Match */}
        <div className="space-y-6 lg:col-span-2">
          <div className="surface p-6 shadow-sm animate-fade-up [animation-delay:100ms]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="size-5 text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your Resumes</h2>
              </div>
              <Link
                href="/upload"
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                + New
              </Link>
            </div>

            {profiles.length > 0 ? (
              <div className="mb-4 space-y-2">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className={`cursor-pointer rounded-xl border p-3 transition-all ${
                      selectedProfileId === p.id
                        ? "border-indigo-500 bg-indigo-50 shadow-sm dark:bg-indigo-950/20"
                        : "border-slate-200/70 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                    }`}
                    onClick={() => setSelectedProfileId(p.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {p.file_name || `Resume #${p.id}`}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {p.skills?.slice(0, 3).join(", ") || "No skills"}
                          {p.years_of_experience ? ` \u00B7 ${p.years_of_experience}y exp` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Link
                          href={`/upload/${p.id}/edit`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/30"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(p.id, p.file_name);
                          }}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-dashed border-slate-300 py-8 text-center dark:border-slate-700">
                <FileText className="mx-auto size-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No resume uploaded yet</p>
                <Link
                  href="/upload"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  Upload Resume
                </Link>
              </div>
            )}

            {profiles.length > 0 && (
              <div className="space-y-3 border-t border-slate-200/70 pt-4 dark:border-slate-800">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Match against
                </label>
                <select
                  value={selectedProfileId || ""}
                  onChange={(e) => setSelectedProfileId(Number(e.target.value))}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.file_name || `Resume #${p.id}`}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleMatch}
                  disabled={matching || !selectedProfileId}
                  className="group inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-terra-600 to-rust-600 px-5 py-3 text-sm font-semibold text-white btn-glow ring-1 ring-white/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  <Sparkles className="size-4" />
                  {matching ? "Matching..." : "Find Matching Jobs"}
                  <ArrowRight className="size-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            )}
          </div>

          <div className="surface p-6 shadow-sm animate-fade-up [animation-delay:150ms]">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <Mail className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Email Job Alerts</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Digest of new matching jobs</p>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Status</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {alertsStatus ? (alertsStatus.configured ? "Configured" : "Not configured") : "Checking…"}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  alertsStatus?.configured
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                <span className={`size-1.5 rounded-full ${alertsStatus?.configured ? "bg-emerald-500" : "bg-slate-400"}`} />
                {alertsStatus?.configured ? "Active" : "Off"}
              </span>
            </div>

            {alertsStatus?.email && (
              <p className="mb-3 truncate text-xs text-slate-500 dark:text-slate-400">
                Digests go to <span className="font-medium text-slate-700 dark:text-slate-300">{alertsStatus.email}</span>
              </p>
            )}

            <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-500">
              Auto-scrape sends a digest when it finds new jobs. Test your inbox or send a digest right now.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={handleTestAlert}
                disabled={!alertsStatus?.configured || alertsBusy !== null}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {alertsBusy === "test" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                Send test
              </button>
              <button
                onClick={handleSendNow}
                disabled={!alertsStatus?.configured || alertsBusy !== null}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {alertsBusy === "send" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Digest now
              </button>
            </div>

            {!alertsStatus?.configured && (
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                Set SMTP variables on the server (SMTP_HOST, SMTP_USER, SMTP_PASS) to enable email alerts.
              </p>
            )}

            {alertMsg && (
              <p className={`mt-3 text-xs ${alertMsg.startsWith("Error") ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {alertMsg}
              </p>
            )}
          </div>

          <div className="surface p-6 shadow-sm animate-fade-up [animation-delay:200ms]">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Quick Tips</h2>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li className="flex gap-2.5">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-indigo-500" />
                Upload a resume first to unlock matching.
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-indigo-500" />
                Scrape with a focused search term for better matches.
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-indigo-500" />
                LinkedIn and Indeed may rate-limit frequent requests.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}