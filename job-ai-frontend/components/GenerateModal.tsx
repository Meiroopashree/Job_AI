"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { apiDetail } from "@/lib/apiError";
import {
  X,
  Copy,
  CheckCircle2,
  LoaderCircle,
  FileText,
  Sparkles,
} from "lucide-react";
import ResumePreview from "@/components/ResumePreview";

interface GenerateModalProps {
  jobId: number;
  profileId: number;
  jobTitle: string;
  company: string;
  onClose: () => void;
}

type Tab = "cover-letter" | "tailored-resume";

export default function GenerateModal({
  jobId,
  profileId,
  jobTitle,
  company,
  onClose,
}: GenerateModalProps) {
  const [tab, setTab] = useState<Tab>("cover-letter");
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (target: Tab) => {
    setTab(target);
    if (target === "cover-letter" && coverLetter) return;
    if (target === "tailored-resume" && resumeData) return;

    setLoading(true);
    setError("");
    try {
      if (target === "cover-letter") {
        const res = await api.post("/generate/cover-letter", {
          profile_id: profileId,
          job_id: jobId,
        });
        setCoverLetter(res.data.cover_letter || "");
      } else {
        const res = await api.post("/generate/tailored-resume", {
          profile_id: profileId,
          job_id: jobId,
        });
        setResumeData(res.data.ats_resume_data || null);
      }
    } catch (err) {
      setError(apiDetail(err, "Generation failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!coverLetter) return;
    await navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in" onClick={onClose}>
      <div
        className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200/70 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Tools</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {jobTitle} &middot; {company}
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200/70 px-6 dark:border-slate-800">
          {([
            ["cover-letter", "Cover Letter", FileText],
            ["tailored-resume", "Tailored Resume", Sparkles],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => handleGenerate(key)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === key
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(85vh - 130px)" }}>
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <LoaderCircle className="size-8 animate-spin text-blue-500" />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Generating with AI...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && tab === "cover-letter" && coverLetter && (
            <div className="relative">
              <button
                onClick={handleCopy}
                className="absolute right-0 top-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy
                  </>
                )}
              </button>
              <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300 pr-24">
                {coverLetter}
              </div>
            </div>
          )}

          {!loading && !error && tab === "tailored-resume" && resumeData && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <ResumePreview data={resumeData as never} />
            </div>
          )}

          {!loading && !error && !coverLetter && tab === "cover-letter" && (
            <div className="py-16 text-center">
              <FileText className="mx-auto size-12 text-slate-300 dark:text-slate-700" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Click &quot;Cover Letter&quot; tab to generate
              </p>
            </div>
          )}

          {!loading && !error && !resumeData && tab === "tailored-resume" && (
            <div className="py-16 text-center">
              <Sparkles className="mx-auto size-12 text-slate-300 dark:text-slate-700" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Click &quot;Tailored Resume&quot; tab to generate
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}