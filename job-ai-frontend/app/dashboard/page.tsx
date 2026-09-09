"use client";

import { useState, useEffect } from "react";
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
  LoaderCircle,
  Pencil,
  Trash2,
  Search,
  Sparkles,
  Building2,
} from "lucide-react";
import { useStats } from "@/hooks/useStats";

interface Platform {
  id: string;
  name: string;
  tagline: string;
  fields: { key: string; label: string; placeholder: string }[];
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

  const handleScrape = async () => {
    const platform = platforms.find((p) => p.id === selectedPlatform);
    if (!platform) return;

    setScraping(true);
    setScrapeMessage("");
    setScrapedJobs([]);

    try {
      const body: Record<string, string> = { platform: selectedPlatform };
      platform.fields.forEach((f) => {
        body[f.key] = fieldValues[f.key] || "";
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
    { label: "Total Jobs", value: stats?.total_jobs, icon: Briefcase, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
    { label: "Jobs Today", value: stats?.jobs_today, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
    { label: "Resumes", value: profiles.length, icon: FileText, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" },
    { label: "Scraped Now", value: scrapedJobs.length, icon: Search, color: "text-orange-600 bg-orange-50 dark:bg-orange-950/40" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-in">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Scrape fresh jobs and find your best matches
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <FileText className="size-4" />
          Upload Resume
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70"
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
          <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 animate-fade-up">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
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
                      ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10 dark:bg-blue-950/30"
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
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-ring focus:ring-3 focus:ring-ring/50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleScrape}
                  disabled={scraping}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.01] hover:shadow-blue-600/35 active:scale-[0.99] disabled:opacity-50"
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
            <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 animate-fade-up">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Scraped Jobs <span className="text-slate-400">({scrapedJobs.length})</span>
                </h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  {selectedPlatformData?.name}
                </span>
              </div>
              <div className="hide-scrollbar max-h-80 space-y-2 overflow-y-auto pr-1">
                {scrapedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-blue-900 dark:hover:bg-blue-950/20"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400">
                      <Briefcase className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{job.title}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {job.company} &middot; {job.location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Resumes + Match */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 animate-fade-up [animation-delay:100ms]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="size-5 text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your Resumes</h2>
              </div>
              <Link
                href="/upload"
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
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
                        ? "border-blue-500 bg-blue-50 shadow-sm dark:bg-blue-950/20"
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
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30"
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
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
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
                  className="group inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  <Sparkles className="size-4" />
                  {matching ? "Matching..." : "Find Matching Jobs"}
                  <ArrowRight className="size-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 animate-fade-up [animation-delay:200ms]">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Quick Tips</h2>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li className="flex gap-2.5">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-blue-500" />
                Upload a resume first to unlock matching.
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-blue-500" />
                Scrape with a focused search term for better matches.
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-blue-500" />
                LinkedIn and Indeed may rate-limit frequent requests.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}