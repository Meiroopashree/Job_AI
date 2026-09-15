"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Briefcase, MapPin, ArrowUpRight, Building2, Bookmark, Sparkles, DollarSign, Calendar, Globe, Wand2 } from "lucide-react";
import { api } from "@/lib/api";
import GenerateModal from "@/components/GenerateModal";

interface JobCardProps {
  item: {
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
  };
  profileId?: number;
}

const STATUS_OPTIONS = ["saved", "applied", "interview", "offer", "rejected"] as const;

const STATUS_COLORS: Record<string, string> = {
  saved: "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800",
  applied: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  interview: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800",
  offer: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  rejected: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
};

function stripHtml(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function matchTone(pct: number) {
  if (pct >= 80) {
    return {
      ring: "from-emerald-500 to-green-500",
      chip: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
      bar: "bg-gradient-to-r from-emerald-500 to-green-500",
      label: "High match",
    };
  }
  if (pct >= 60) {
    return {
      ring: "from-amber-500 to-orange-500",
      chip: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
      bar: "bg-gradient-to-r from-amber-500 to-orange-500",
      label: "Good match",
    };
  }
  return {
    ring: "from-red-500 to-rose-500",
    chip: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    bar: "bg-gradient-to-r from-red-500 to-rose-500",
    label: "Weak match",
  };
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

export default function JobCard({ item, profileId }: JobCardProps) {
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);

  const { job, match_percentage, explanation } = item;
  const pct = Math.round(Number(match_percentage) || 0);
  const tone = matchTone(pct);

  const safeTitle = job.title || "Untitled Position";
  const safeCompany = job.company || "Unknown Company";
  const safeLocation = job.location || "Location not specified";
  const description = stripHtml(job.description);
  const salaryStr = formatSalary(job.salary_min, job.salary_max, job.salary_interval, job.salary_currency);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    api.get(`/applications/job/${job.id}`).then((res) => {
      if (!cancelled) setCurrentStatus(res.data?.status || "saved");
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [job.id, profileId]);

  const handleSave = async (status: string = "saved") => {
    if (!profileId) return;
    setSaving(true);
    try {
      const res = await api.post("/applications", {
        job_id: job.id,
        profile_id: profileId,
        status,
      });
      setCurrentStatus(res.data?.application?.status || status);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="group relative overflow-hidden surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5">
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone.ring} transition-opacity opacity-70 group-hover:opacity-100`} aria-hidden />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md dark:from-slate-600 dark:to-slate-800">
                <Building2 className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">{safeTitle}</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <Briefcase className="size-3.5 shrink-0" />
                  <span className="truncate">{safeCompany}</span>
                  <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{safeLocation}</span>
                </p>
              </div>
            </div>

            <div className={`shrink-0 rounded-xl border px-3 py-1.5 text-center ${tone.chip}`}>
              <p className="text-lg font-bold leading-tight">{pct}%</p>
              <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">{tone.label}</p>
            </div>
          </div>

          {(salaryStr || job.date_posted || job.source) && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              {salaryStr && (
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                  <DollarSign className="size-3" />
                  {salaryStr}
                </span>
              )}
              {job.date_posted && (
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                  <Calendar className="size-3" />
                  {job.date_posted}
                </span>
              )}
              {job.source && (
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                  <Globe className="size-3" />
                  {job.source}
                </span>
              )}
            </div>
          )}

          {description && (
            <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {description}
            </p>
          )}

          <div className="mt-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            {explanation?.matched_skills && explanation.matched_skills.length > 0 && (
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Matched Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {explanation.matched_skills.map((s: string, i: number) => (
                    <span
                      key={i}
                      className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {explanation?.missing_skills && explanation.missing_skills.length > 0 && (
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Missing Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {explanation.missing_skills.map((s: string, i: number) => (
                    <span
                      key={i}
                      className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {explanation?.summary && (
            <p className="mt-3 text-xs italic text-slate-500 dark:text-slate-400">{explanation.summary}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-800">
            <Link
              href={`/jobs/job/${job.id}/apply`}
              className="group/apply inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              <Wand2 className="size-4" />
              Auto-Fill Apply
            </Link>

            {job.apply_url && (
              <a
                href={job.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/open inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Open the original job listing"
              >
                Open listing
                <ArrowUpRight className="size-4 transition-transform group-hover/open:translate-x-0.5 group-hover/open:-translate-y-0.5" />
              </a>
            )}

            {profileId && (
              <>
                {currentStatus ? (
                  <select
                    value={currentStatus}
                    onChange={(e) => handleSave(e.target.value)}
                    disabled={saving}
                    className={`h-9 rounded-lg border px-3 text-xs font-medium outline-none transition-colors ${STATUS_COLORS[currentStatus] || STATUS_COLORS.saved} cursor-pointer dark:bg-transparent`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => handleSave("saved")}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <Bookmark className="size-3.5" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                )}

                <button
                  onClick={() => setShowGenerate(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <Sparkles className="size-3.5 text-purple-500" />
                  AI Tools
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showGenerate && profileId && (
        <GenerateModal
          jobId={job.id}
          profileId={profileId}
          jobTitle={safeTitle}
          company={safeCompany}
          onClose={() => setShowGenerate(false)}
        />
      )}
    </>
  );
}