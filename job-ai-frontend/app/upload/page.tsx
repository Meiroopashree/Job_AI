"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { apiDetail } from "@/lib/apiError";
import {
  FileUp,
  UploadCloud,
  X,
  LoaderCircle,
  Sparkles,
  Briefcase,
  GraduationCap,
  ArrowRight,
  Pencil,
  CheckCircle2,
  FileText,
} from "lucide-react";

const ACCEPTED = ".pdf,.docx";

interface ExtractedExperience {
  title?: string;
  company?: string;
  start_date?: string;
  end_date?: string;
}

interface ExtractResult {
  profile_id: number;
  data?: {
    skills?: string[];
    experience?: ExtractedExperience[];
    education?: { degree?: string; institution?: string }[];
  };
}

export default function UploadPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  const pickFile = useCallback((f: File | undefined) => {
    if (!f) return;
    if (!/\.(pdf|docx)$/i.test(f.name)) {
      setError("Only PDF or DOCX files are supported.");
      return;
    }
    setError("");
    setResult(null);
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      pickFile(e.dataTransfer.files?.[0]);
    },
    [pickFile]
  );

  const uploadResume = async () => {
    if (!file) return;
    setError("");
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/upload-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
    } catch (err) {
      setError(apiDetail(err, "Upload failed"));
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !user) return null;

  const extracted = result?.data;
  const skills = extracted?.skills ?? [];
  const experience = extracted?.experience ?? [];
  const education = extracted?.education ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 animate-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Upload Resume</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Upload your PDF or DOCX resume and let AI extract your skills and experience
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8 dark:border-slate-800 dark:bg-slate-900/70">
        {/* Steps */}
        <div className="mb-6 flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
          {["Upload", "AI Analysis", "Review"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-6 bg-slate-200 dark:bg-slate-700" />}
              <span
                className={
                  (result ? i <= 2 : loading ? i <= 1 : i === 0)
                    ? "text-blue-600 dark:text-blue-400"
                    : ""
                }
              >
                {step}
              </span>
            </div>
          ))}
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed p-10 text-center transition-all ${
            dragging
              ? "scale-[1.01] border-blue-500 bg-blue-50 dark:bg-blue-950/30"
              : file
                ? "border-blue-400 bg-blue-50/60 dark:bg-blue-950/20"
                : "border-slate-300 hover:border-blue-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
          }`}
        >
          {file ? (
            <div className="animate-pop">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <FileText className="size-7" />
              </span>
              <p className="mt-3 truncate text-base font-semibold text-slate-900 dark:text-white">
                {file.name}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {(file.size / 1024).toFixed(1)} KB &middot; ready to analyze
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setResult(null);
                }}
                className="mt-3 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
              >
                <X className="size-3.5" />
                Remove file
              </button>
            </div>
          ) : (
            <div>
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
                <UploadCloud className="size-7" />
              </span>
              <p className="mt-4 text-base font-medium text-slate-700 dark:text-slate-300">
                Drag and drop your resume here
              </p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                or click to browse &middot; PDF or DOCX
              </p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            onChange={(e) => pickFile(e.target.files?.[0])}
            className="hidden"
          />
        </div>

        {error && (
          <div className="mt-4 animate-pop rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        {file && (
          <button
            onClick={uploadResume}
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <FileUp className="size-4" />
                Upload & Analyze
              </>
            )}
          </button>
        )}

        {result && (
          <div className="mt-8 space-y-6 animate-fade-up">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
              <div>
                <p className="font-medium text-emerald-700 dark:text-emerald-300">
                  Resume uploaded successfully!
                </p>
                <p className="mt-0.5 text-sm text-emerald-600/80 dark:text-emerald-400/80">
                  Profile #{result.profile_id} &middot; skills, experience and education extracted
                </p>
              </div>
            </div>

            {skills.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Sparkles className="size-4 text-blue-500" />
                  Extracted Skills
                  <span className="text-xs font-normal text-slate-400">({skills.length})</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s: string, i: number) => (
                    <span
                      key={i}
                      className="animate-pop rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {experience.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Briefcase className="size-4 text-blue-500" />
                  Experience
                </h3>
                <div className="space-y-2">
                  {experience.map((exp, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 transition-colors hover:border-blue-200 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <p className="font-medium text-slate-900 dark:text-white text-sm">{exp.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {exp.company} &middot; {exp.start_date} - {exp.end_date || "Present"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {education.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <GraduationCap className="size-4 text-blue-500" />
                  Education
                </h3>
                <div className="space-y-1">
                  {education.map((edu, i) => (
                    <p key={i} className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-900 dark:text-white">{edu.degree}</span>
                      {edu.institution && <span> at {edu.institution}</span>}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200/70 pt-5 sm:flex-row dark:border-slate-800">
              <button
                onClick={() => router.push(`/jobs/${result.profile_id}`)}
                className="group inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                View Job Matches
                <ArrowRight className="size-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={() => router.push(`/upload/${result.profile_id}/edit`)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Pencil className="size-4" />
                Edit Profile
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}