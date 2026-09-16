"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { apiDetail } from "@/lib/apiError";
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  Building2,
  Check,
  ClipboardCheck,
  Copy,
  DollarSign,
  Globe,
  GraduationCap,
  Link2,
  LoaderCircle,
  MapPin,
  RotateCcw,
  SearchX,
  Sparkles,
  Trash2,
  User,
  Wand2,
} from "lucide-react";
import {
  ApplyProfile,
  ProfileLite,
  buildApplyProfile,
  formatAllAnswers,
} from "@/lib/applyFields";
import GenerateModal from "@/components/GenerateModal";

interface JobDetail {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  apply_url: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_interval?: string | null;
  salary_currency?: string | null;
  date_posted?: string | null;
  source?: string | null;
}

function formatSalary(min?: number | null, max?: number | null, interval?: string | null, currency?: string | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));
  const cur = currency || "$";
  const suffix = interval === "hourly" ? "/hr" : interval === "monthly" ? "/mo" : interval === "yearly" ? "/yr" : "";
  if (min && max) return `${cur}${fmt(min)} - ${cur}${fmt(max)}${suffix}`;
  if (min) return `${cur}${fmt(min)}+${suffix}`;
  return `Up to ${cur}${fmt(max!)}${suffix}`;
}

const GROUP_ICONS: Record<string, typeof User> = {
  contact: User,
  links: Link2,
  career: Briefcase,
  background: GraduationCap,
};

const STEPS = [
  { n: "1", label: "Filled from resume" },
  { n: "2", label: "Review & edit" },
  { n: "3", label: "Copy into the form" },
];

const AUTOFILL_BOOKMARKLET = `javascript:(function(){try{window.__JOBAI_AUTOFILL_LOADED__=false;}catch(e){}var d=document,s=d.createElement('script');s.src='https://job-ai-frontend-beryl.vercel.app/autofill.js';d.body.appendChild(s);})();`;

export default function ApplyAutoFillPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [appProfile, setAppProfile] = useState<ApplyProfile | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [applied, setApplied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fillCopied, setFillCopied] = useState(false);
  const [showGen, setShowGen] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }
    if (!user || !jobId) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [jobRes, profRes] = await Promise.all([
          api.get(`/jobs/${jobId}`),
          api.get("/upload-resume/list").catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setJob(jobRes.data);
        const list: ProfileLite[] = profRes.data || [];
        setProfiles(list);
        if (list.length === 1) setSelectedId(list[0].id);
      } catch (err) {
        if (!cancelled) setError(apiDetail(err, "Failed to load job"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [jobId, user, isLoading, router]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void Promise.resolve()
      .then(() => {
        if (cancelled) return;
        setProfileLoading(true);
        return api.get(`/upload-resume/${selectedId}`);
      })
      .then((res) => {
        if (cancelled || !res?.data) return;
        const full = res.data as ProfileLite;
        const built = buildApplyProfile(full, user?.email || "");
        setAppProfile(built);
        setFields({ ...built.originals });
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this resume's details");
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, user?.email]);

  const updateField = (id: string, value: string) => setFields((f) => ({ ...f, [id]: value }));

  const isEdited = (id: string) => (appProfile?.originals[id] || "") !== (fields[id] || "");

  const clearField = (id: string) => updateField(id, "");

  const resetAll = () => {
    if (!appProfile) return;
    setFields({ ...appProfile.originals });
    showToast("Answers restored from your resume");
  };

  const copyField = async (id: string) => {
    const value = fields[id] || "";
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // clipboard unavailable
    }
    setCopiedKey(id);
    window.setTimeout(() => setCopiedKey((k) => (k === id ? null : k)), 1300);
  };

  const copyAll = async () => {
    if (!appProfile) return;
    const text = formatAllAnswers(fields, appProfile.groups);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable
    }
    showToast("All answers copied — paste them into the job site form");
  };

  const markApplied = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await api.post("/applications", {
        job_id: Number(jobId),
        profile_id: selectedId,
        status: "applied",
      });
      setApplied(true);
      showToast("Saved to Applications as Applied");
    } catch (err) {
      showToast(`Error: ${apiDetail(err, "Failed to save")}`);
    } finally {
      setSaving(false);
    }
  };

  const prepareAutofill = async () => {
    if (!job || !appProfile) return;
    const payload = {
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        apply_url: job.apply_url,
        source: job.source || "",
      },
      profile: {
        id: selectedId,
        file_name: selectedProfile?.file_name || "",
        fields: { ...fields },
      },
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload));
    } catch {
      // clipboard unavailable in this environment
    }
    setFillCopied(true);
    window.setTimeout(() => setFillCopied(false), 2000);
    showToast("Auto-fill data ready — open the job form and run the bookmarklet");
  };

  if (isLoading || !user) return null;

  const salary = job ? formatSalary(job.salary_min, job.salary_max, job.salary_interval, job.salary_currency) : null;
  const selectedProfile = profiles.find((p) => p.id === selectedId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 animate-in">
      <button
        onClick={() => router.push(`/jobs/job/${jobId}`)}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Back to job
      </button>

      {loading && (
        <div className="animate-pulse space-y-4">
          <div className="h-40 w-full rounded-3xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-32 w-full rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      )}

      {error && (
        <div className="animate-pop rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && job && (
        <>
          <div className="relative overflow-hidden rounded-3xl border border-indigo-200/50 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-7 text-white shadow-xl shadow-indigo-600/20 dark:border-indigo-900 dark:shadow-none sm:p-9">
            <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-24 right-24 size-48 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} aria-hidden />

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-lg">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white backdrop-blur">
                  <Wand2 className="size-3.5" />
                  AUTO-FILL APPLY
                </span>
                <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Application Auto-Fill
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-white/85">
                  Everything is pre-filled from your resume. Review, edit or delete any field, then
                  copy the answers straight into the job site&apos;s application form.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {STEPS.map((step) => (
                    <span key={step.n} className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
                      <span className="flex size-5 items-center justify-center rounded-full bg-white text-indigo-600 text-[11px] font-bold">
                        {step.n}
                      </span>
                      {step.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                    <Building2 className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{job.title || "Untitled Position"}</h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/80">
                      <span className="flex items-center gap-1"><Briefcase className="size-3" />{job.company || "Unknown"}</span>
                      <span className="flex items-center gap-1"><MapPin className="size-3" />{job.location || "Remote / N/A"}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  {salary && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/12 px-2 py-0.5 font-medium">
                      <DollarSign className="size-3" />{salary}
                    </span>
                  )}
                  {job.date_posted && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/12 px-2 py-0.5">
                      Posted {job.date_posted}
                    </span>
                  )}
                  {job.source && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/12 px-2 py-0.5 uppercase tracking-wide">
                      <Globe className="size-3" />{job.source}
                    </span>
                  )}
                </div>
                {job.apply_url && (
                  <a
                    href={job.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.99]"
                  >
                    Open job posting
                    <ArrowUpRight className="size-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {profiles.length === 0 && (
            <div className="animate-fade-up mt-8 rounded-2xl border border-slate-200/60 bg-white/80 p-12 text-center dark:border-slate-800 dark:bg-slate-900/70">
              <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <SearchX className="size-8" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No resume to auto-fill from</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Upload your resume first and we&apos;ll pre-fill every application for you.
              </p>
              <button
                onClick={() => router.push("/upload")}
                className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Upload Resume
              </button>
            </div>
          )}

          {profiles.length > 1 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Auto-fill from:</span>
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedId === p.id
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-700"
                      : "border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                  }`}
                >
                  <Sparkles className="size-3.5" />
                  {p.file_name || `Resume #${p.id}`}
                </button>
              ))}
            </div>
          )}

          {profiles.length > 0 && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
              <div className="space-y-5">
                {profileLoading && (
                  <div className="surface p-6">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <LoaderCircle className="size-4 animate-spin" />
                      Pre-filling from {selectedProfile?.file_name || "your resume"}…
                    </div>
                  </div>
                )}

                {!profileLoading && appProfile && (
                  <>
                    {appProfile.groups.map((group) => {
                      const Icon = GROUP_ICONS[group.id] || User;
                      return (
                        <div key={group.id} className="overflow-hidden surface shadow-sm animate-fade-up">
                          <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                              <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                <Icon className="size-4" />
                              </span>
                              <div>
                                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{group.title}</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{group.hint}</p>
                              </div>
                            </div>
                            <button
                              onClick={resetAll}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                              title="Restore all answers from resume"
                            >
                              <RotateCcw className="size-3.5" />
                              Reset
                            </button>
                          </div>

                          <div className="grid gap-4 p-5 sm:grid-cols-2">
                            {group.fields.map((field) => {
                              const edited = isEdited(field.id);
                              const copied = copiedKey === field.id;
                              const isArea = field.type === "textarea";
                              return (
                                <div key={field.id} className={isArea ? "sm:col-span-2" : ""}>
                                  <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                                      {field.label}
                                      {field.optional && (
                                        <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                          optional
                                        </span>
                                      )}
                                      {edited && (
                                        <span className="flex items-center gap-1 rounded bg-indigo-50 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-400">
                                          <Sparkles className="size-2.5" /> edited
                                        </span>
                                      )}
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => copyField(field.id)}
                                        className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold transition-colors ${
                                          copied
                                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                                            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                                        }`}
                                        title="Copy this answer"
                                      >
                                        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                                        {copied ? "Copied" : "Copy"}
                                      </button>
                                      <button
                                        onClick={() => clearField(field.id)}
                                        className="rounded-md p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                        title="Delete this answer"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  {isArea ? (
                                    <textarea
                                      value={fields[field.id] || ""}
                                      onChange={(e) => updateField(field.id, e.target.value)}
                                      rows={3}
                                      placeholder={field.placeholder}
                                      className="input-base w-full resize-none rounded-lg px-3 py-2 text-sm"
                                    />
                                  ) : (
                                    <input
                                      type={field.type === "url" ? "url" : "text"}
                                      value={fields[field.id] || ""}
                                      onChange={(e) => updateField(field.id, e.target.value)}
                                      placeholder={field.placeholder}
                                      className="input-base h-10 rounded-lg px-3 text-sm"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
                {selectedProfile && (
                  <div className="surface p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Auto-filling from
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {selectedProfile.file_name || `Resume #${selectedProfile.id}`}
                    </p>
                  </div>
                )}

                <div className="surface p-5 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <ClipboardCheck className="size-4 text-indigo-500" />
                    Ready to apply?
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    Copy your answers, open the job posting, and paste each field into the form.
                  </p>
                  <button
                    onClick={copyAll}
                    disabled={!appProfile}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    <Copy className="size-4" />
                    Copy all answers
                  </button>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <a
                      href={job.apply_url || "#"}
                      target={job.apply_url ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <ArrowUpRight className="size-3.5" />
                      Open form
                    </a>
                    <button
                      onClick={markApplied}
                      disabled={!selectedId || saving || applied}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        applied
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                      }`}
                    >
                      {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : applied ? <Check className="size-3.5" /> : <Check className="size-3.5" />}
                      {applied ? "Applied" : saving ? "Saving…" : "Mark applied"}
                    </button>
                  </div>
                  <button
                    onClick={() => setShowGen(true)}
                    disabled={!selectedId}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-100 disabled:opacity-50 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400 dark:hover:bg-purple-950/50"
                  >
                    <Sparkles className="size-4" />
                    Generate cover letter
                  </button>
                </div>

                <div className="surface p-5 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Wand2 className="size-4 text-indigo-500" />
                    Auto-fill on the job site
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    Copy your answers, then run the JobAI auto-fill bookmarklet on the
                    job&apos;s form (LinkedIn, Indeed and most other ATS sites). It only
                    fills fields — it never submits.
                  </p>
                  <button
                    onClick={prepareAutofill}
                    disabled={!appProfile}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-950/60"
                  >
                    {fillCopied ? <Check className="size-4" /> : <Wand2 className="size-4" />}
                    {fillCopied ? "Fill data copied" : "Copy auto-fill data"}
                  </button>
                  <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Drag this into your bookmarks bar
                  </p>
                  <a
                    href={AUTOFILL_BOOKMARKLET}
                    className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-indigo-600 dark:hover:text-indigo-400"
                  >
                    <Wand2 className="size-3.5" />
                    JobAI Autofill
                  </a>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                    Open the job posting, click your bookmarklet, then review
                    everything before submitting. Prefer no bookmark? Use the JobAI
                    browser extension instead.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-pop rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-2xl dark:bg-white dark:text-slate-900">
          {toast}
        </div>
      )}

      {showGen && selectedId && job && (
        <GenerateModal
          jobId={job.id}
          profileId={selectedId}
          jobTitle={job.title}
          company={job.company}
          onClose={() => setShowGen(false)}
        />
      )}
    </div>
  );
}