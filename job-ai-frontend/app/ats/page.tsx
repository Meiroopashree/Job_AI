"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { apiDetail } from "@/lib/apiError";
import { Progress } from "@/components/ui/progress";
import ResumePreview from "@/components/ResumePreview";
import {
  ArrowLeft,
  FileText,
  LoaderCircle,
  Download,
  Sparkles,
  CheckCircle2,
  XCircle,
  CircleAlert,
  FileSearch,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";


interface Profile {
  id: number;
  file_name?: string;
  skills: string[];
  years_of_experience?: number;
  created_at?: string;
}

interface ATSBreakdown {
  keyword_optimization: number;
  formatting_and_structure: number;
  quantifiable_achievements: number;
  contact_information: number;
  skills_section: number;
  experience_quality: number;
  education_and_certifications: number;
  resume_length_and_density: number;
}

interface ATSExplanation {
  overall: string;
  strengths: string[];
  weaknesses: string[];
  details: Record<string, string>;
}

interface ATSResult {
  ats_id: number;
  profile_id: number;
  overall_score: number;
  breakdown: ATSBreakdown;
  explanation: ATSExplanation;
  suggestions: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ats_resume_data?: any;
  ats_resume_score?: number;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBarClass(score: number) {
  if (score >= 80) return "[&>[data-slot=progress-indicator]]:bg-emerald-500";
  if (score >= 60) return "[&>[data-slot=progress-indicator]]:bg-amber-500";
  return "[&>[data-slot=progress-indicator]]:bg-red-500";
}

const BREAKDOWN_LABELS: Record<string, string> = {
  keyword_optimization: "Keyword Optimization",
  formatting_and_structure: "Formatting & Structure",
  quantifiable_achievements: "Quantifiable Achievements",
  contact_information: "Contact Information",
  skills_section: "Skills Section",
  experience_quality: "Experience Quality",
  education_and_certifications: "Education & Certifications",
  resume_length_and_density: "Resume Length & Density",
};

export default function ATSPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const resumeRef = useRef<HTMLDivElement>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ATSResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setPdfError("");
    try {
      const data = result?.ats_resume_data;
      if (!data) throw new Error("No resume data available");

      const mod = await import("jspdf");
      const doc = new mod.default("p", "mm", "a4");
      const pw = 170;
      const lm = 20;
      let y = 28;

      const b = () => doc.setFont("helvetica", "bold");
      const n = () => doc.setFont("helvetica", "normal");
      const gc = () => doc.setTextColor(100, 116, 139);
      const bc = () => doc.setTextColor(0, 0, 0);
      const blue = () => doc.setTextColor(37, 99, 235);

      const section = (title: string) => {
        if (y > 255) { doc.addPage(); y = 22; }
        b(); doc.setFontSize(10);
        doc.text(title.toUpperCase(), lm, y);
        y += 2.5;
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(lm, y, lm + pw, y);
        y += 5;
      };

      const wrap = (text: string, indent = 0, size = 9) => {
        n(); doc.setFontSize(size);
        for (const l of doc.splitTextToSize(text, pw - indent)) {
          if (y > 278) { doc.addPage(); y = 22; }
          doc.text(l, lm + indent, y);
          y += 4;
        }
      };

      const bulletItems = (items: string[], cols = 2) => {
        n(); doc.setFontSize(9);
        if (cols <= 1) {
          for (const item of items) {
            if (y > 278) { doc.addPage(); y = 22; }
            doc.text("\u2022  " + item, lm, y);
            y += 4.5;
          }
        } else {
          const colW = (pw - (cols - 1) * 6) / cols;
          const perCol = Math.ceil(items.length / cols);
          const rowH = 4.5;
          for (let r = 0; r < perCol; r++) {
            if (y > 278) { doc.addPage(); y = 22; }
            for (let c = 0; c < cols; c++) {
              const idx = r + c * perCol;
              if (idx < items.length) {
                doc.text("\u2022  " + items[idx], lm + c * (colW + 6), y);
              }
            }
            y += rowH;
          }
        }
      };

      const pi = data.personal_info || {};
      const links = data.links || {};

      b(); doc.setFontSize(18);
      doc.text((pi.name || "Resume").toUpperCase(), lm + pw / 2, y, { align: "center" });
      y += 7;

      const contact: string[] = [];
      if (pi.email) contact.push(pi.email);
      if (pi.phone) contact.push(pi.phone);
      if (pi.location) contact.push(pi.location);
      if (contact.length) {
        n(); doc.setFontSize(9); gc();
        doc.text(contact.join("  |  "), lm + pw / 2, y, { align: "center" });
        bc(); y += 5;
      }

      const linkItems: string[] = [];
      if (links.linkedin) linkItems.push(links.linkedin);
      if (links.github) linkItems.push(links.github);
      if (links.portfolio) linkItems.push(links.portfolio);
      if (Array.isArray(links.other)) linkItems.push(...links.other.filter((o: unknown) => typeof o === "string"));
      if (linkItems.length) {
        n(); doc.setFontSize(9); blue();
        doc.text(linkItems.join("  |  "), lm + pw / 2, y, { align: "center" });
        bc(); y += 5;
      }

      bc();
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.5);
      doc.line(lm, y, lm + pw, y);
      y += 10;

      if (data.profile_summary) {
        section("Professional Summary");
        wrap(String(data.profile_summary));
        y += 3;
      }

      if (Array.isArray(data.skills) && data.skills.length > 0) {
        section("Skills");
        const skillItems: string[] = [];
        for (const s of data.skills) {
          if (typeof s === "string") skillItems.push(s);
          else if (s && typeof s.name === "string") skillItems.push(s.name);
        }
        if (skillItems.length) bulletItems(skillItems, 3);
        y += 3;
      }

      if (Array.isArray(data.experience) && data.experience.length > 0) {
        section("Experience");
        for (const exp of data.experience) {
          if (!exp) continue;
          const title = exp.title || exp.role || exp.position || "";
          if (y > 272) { doc.addPage(); y = 22; }

          const dates = `${exp.start_date || ""} - ${exp.end_date || "Present"}`;
          const dateW = doc.getTextWidth(dates);
          b(); doc.setFontSize(9.5);
          doc.text(title, lm, y);
          n(); doc.setFontSize(8); gc();
          doc.text(dates, lm + pw - dateW, y);
          bc();
          y += 4.5;

          if (exp.company) {
            n(); doc.setFontSize(8.5); gc();
            doc.text(exp.company, lm, y);
            bc(); y += 4;
          }

          if (exp.description) {
            n(); doc.setFontSize(8.5);
            for (const l of doc.splitTextToSize(exp.description, pw)) {
              if (y > 278) { doc.addPage(); y = 22; }
              doc.text(l, lm, y);
              y += 3.8;
            }
          }
          y += 3;
        }
      }

      if (Array.isArray(data.education) && data.education.length > 0) {
        section("Education");
        for (const edu of data.education) {
          if (!edu) continue;
          const degree = edu.degree || edu.course || edu.field || "";
          if (y > 272) { doc.addPage(); y = 22; }

          b(); doc.setFontSize(9.5);
          doc.text(degree, lm, y);
          if (edu.year) {
            const yr = String(edu.year);
            n(); doc.setFontSize(8); gc();
            const yrW = doc.getTextWidth(yr);
            doc.text(yr, lm + pw - yrW, y); bc();
          }
          y += 4.5;

          if (edu.institution) {
            n(); doc.setFontSize(8.5); gc();
            doc.text(edu.institution, lm, y);
            bc(); y += 4;
          }
          y += 2;
        }
      }

      for (const [label, arr] of [["Courses", data.courses], ["Certifications", data.certifications]] as const) {
        if (Array.isArray(arr) && arr.length > 0) {
          section(label);
          const flat = arr.filter((c) => typeof c === "string");
          if (flat.length) bulletItems(flat, 2);
          y += 2;
        }
      }

      if (Array.isArray(data.achievements) && data.achievements.length > 0) {
        section("Achievements");
        const flat = data.achievements.filter((a: unknown) => typeof a === "string");
        bulletItems(flat, 1);
        y += 2;
      }

      if (Array.isArray(data.languages) && data.languages.length > 0) {
        section("Languages");
        const flat = data.languages.filter((l: unknown) => typeof l === "string");
        if (flat.length) bulletItems(flat, 3);
      }

      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ats-optimized-resume.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setPdfError(`PDF downloaded (${blob.size} bytes)`);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await api.get("/upload-resume/list");
      setProfiles(res.data || []);
      setSelectedProfileId((prev) => prev ?? res.data?.[0]?.id ?? null);
    } catch {
      // no profiles yet
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/login"); return; }
    if (user) void Promise.resolve().then(fetchProfiles);
  }, [user, isLoading, router, fetchProfiles]);

  const handleCheck = async () => {
    if (!selectedProfileId) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await api.post(`/ats/check/${selectedProfileId}`);
      setResult(res.data);
    } catch (err) {
      setError(apiDetail(err, "Failed to check ATS score"));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedProfileId) return;
    setGenerating(true);
    setError("");

    try {
      const res = await api.post(`/ats/generate/${selectedProfileId}`);
      if (!res.data) throw new Error("Empty response from server");
      setResult((prev) => ({
        ...(prev || res.data),
        ats_resume_data: res.data.ats_resume_data,
        ats_resume_score: res.data.ats_resume_score,
        overall_score: prev?.overall_score ?? res.data.original_score,
      }));
    } catch (err) {
      setError(apiDetail(err, "Failed to generate ATS resume"));
    } finally {
      setGenerating(false);
    }
  };

  const handleViewStored = async () => {
    if (!selectedProfileId) return;
    setLoading(true);
    setError("");

    try {
      const res = await api.get(`/ats/score/${selectedProfileId}`);
      setResult(res.data);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setError("No ATS check found. Run a check first.");
      } else {
        setError(apiDetail(err, "Failed to load ATS result"));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const overallScore = result?.overall_score ?? 0;
  const atsResumeScore = result?.ats_resume_score;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 animate-in">
      <div className="mb-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </button>
        <PageHeader
          eyebrow="ATS Resume Checker"
          eyebrowIcon={FileSearch}
          title="How ATS-friendly is your resume?"
          subtitle="Get a detailed score, find what recruiters' systems miss, and generate an optimized version."
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="surface p-6 shadow-sm animate-fade-up">
            <div className="mb-4 flex items-center gap-2.5">
              <FileSearch className="size-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Select Resume</h2>
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
                    onClick={() => { setSelectedProfileId(p.id); setResult(null); setError(""); }}
                  >
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {p.file_name || `Resume #${p.id}`}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {p.skills?.slice(0, 2).join(", ") || "No skills"}
                      {p.years_of_experience ? ` \u00B7 ${p.years_of_experience}y exp` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-dashed border-slate-300 py-8 text-center dark:border-slate-700">
                <FileText className="mx-auto size-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No resume uploaded yet</p>
                <button
                  onClick={() => router.push("/upload")}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  <Plus className="size-4" />
                  Upload Resume
                </button>
              </div>
            )}

            {profiles.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={handleCheck}
                  disabled={loading || !selectedProfileId}
                  className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <FileSearch className="size-4" />
                      Check ATS Score
                    </>
                  )}
                </button>
                <button
                  onClick={handleViewStored}
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  View Last Result
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="flex animate-pop items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {error}
            </div>
          )}

          {loading && (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="surface p-6">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                </div>
              ))}
            </div>
          )}

          {!loading && !error && !result && (
            <div className="animate-fade-up rounded-2xl border border-slate-200/60 bg-white/80 p-12 text-center dark:border-slate-800 dark:bg-slate-900/70">
              <FileSearch className="mx-auto size-16 text-slate-300 dark:text-slate-700" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No ATS Result Yet</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Select a resume and click &quot;Check ATS Score&quot; to analyze it
              </p>
            </div>
          )}

          {result && (
            <>
              <div className="surface p-6 shadow-sm animate-fade-up">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Overall ATS Score</h2>
                  {atsResumeScore != null && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Original &rarr; Optimized</p>
                      <p className="text-sm font-semibold">
                        <span className={getScoreColor(overallScore)}>{overallScore.toFixed(1)}%</span>
                        <span className="text-slate-400 mx-1">&rarr;</span>
                        <span className={getScoreColor(atsResumeScore)}>{atsResumeScore.toFixed(1)}%</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="relative shrink-0">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-slate-700" />
                      <circle
                        cx="18" cy="18" r="15.5" fill="none" strokeWidth="3"
                        stroke="currentColor"
                        strokeDasharray={`${overallScore * 0.31} 100`}
                        className={overallScore >= 80 ? "text-emerald-500" : overallScore >= 60 ? "text-amber-500" : "text-red-500"}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                        {overallScore.toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {result.explanation?.overall || "No overall explanation available."}
                    </p>
                  </div>
                </div>

                {result.explanation?.strengths && result.explanation.strengths.length > 0 && (
                  <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-4" />
                      Strengths
                    </p>
                    <ul className="space-y-1">
                      {result.explanation.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <span className="mt-0.5 shrink-0 text-emerald-500">+</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.explanation?.weaknesses && result.explanation.weaknesses.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-800 dark:bg-red-950/20">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
                      <XCircle className="size-4" />
                      Weaknesses
                    </p>
                    <ul className="space-y-1">
                      {result.explanation.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <span className="mt-0.5 shrink-0 text-red-500">-</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="surface p-6 shadow-sm animate-fade-up [animation-delay:100ms]">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Score Breakdown</h2>
                <div className="space-y-4">
                  {result.breakdown && Object.entries(result.breakdown).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {BREAKDOWN_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                        <span className={`text-sm font-semibold ${getScoreColor(value)}`}>
                          {value.toFixed(0)}%
                        </span>
                      </div>
                      <Progress
                        value={value}
                        className={`h-2 ${getScoreBarClass(value)}`}
                      />
                      {result.explanation?.details?.[key] && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {result.explanation.details[key]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {result.suggestions && result.suggestions.length > 0 && (
                <div className="surface p-6 shadow-sm animate-fade-up [animation-delay:200ms]">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Suggestions to Improve</h2>
                  <ul className="space-y-2">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 text-xs font-bold">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Generating ATS-Friendly Resume...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Generate ATS-Friendly Resume
                    </>
                  )}
                </button>
              </div>

              {result.ats_resume_data && typeof result.ats_resume_data === "object" && !Array.isArray(result.ats_resume_data) && (
                <>
                  <div className="overflow-hidden surface shadow-sm animate-fade-up">
                    <div className="flex items-center justify-between border-b border-slate-200/70 p-4 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                          ATS-Optimized Resume
                        </h2>
                        {atsResumeScore != null && (
                          <div className={`px-2.5 py-1 rounded-lg border text-center ${
                            atsResumeScore >= 80 ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" :
                            atsResumeScore >= 60 ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" :
                            "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                          }`}>
                            <p className={`text-sm font-bold ${getScoreColor(atsResumeScore)}`}>
                              {atsResumeScore.toFixed(0)}%
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={handleDownloadPdf}
                          disabled={downloading}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50"
                        >
                          <Download className="size-4" />
                          {downloading ? "Downloading..." : "Download PDF"}
                        </button>
                        {pdfError && (
                          <p className="text-xs text-red-500">{pdfError}</p>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <div ref={resumeRef}>
                        {result.ats_resume_data && typeof result.ats_resume_data === "object" && (
                          <ResumePreview data={result.ats_resume_data} />
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
