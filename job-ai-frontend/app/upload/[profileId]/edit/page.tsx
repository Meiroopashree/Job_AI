"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { apiDetail } from "@/lib/apiError";
import {
  ArrowLeft,
  LoaderCircle,
  CheckCircle2,
  Trash2,
  Save,
  Sparkles,
  Briefcase,
  GraduationCap,
  User,
  Pencil,
} from "lucide-react";

interface ExperienceItem {
  title?: string;
  company?: string;
  start_date?: string;
  end_date?: string;
}

interface EducationItem {
  degree?: string;
  institution?: string;
  year?: number | string;
}

interface ProfileData {
  id: number;
  file_name?: string;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  languages: string[];
  certifications: string[];
  personal_info?: Record<string, unknown>;
  profile_summary?: unknown;
}

export default function EditResumePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const profileId = params.profileId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [data, setData] = useState<ProfileData | null>(null);
  const [skillsInput, setSkillsInput] = useState("");

  useEffect(() => {
    if (!isLoading && !user) { router.push("/login"); return; }
    if (!profileId) return;

    const fetch = async () => {
      try {
        const res = await api.get(`/upload-resume/${profileId}`);
        setData(res.data);
        setSkillsInput((res.data.skills || []).join(", "));
      } catch (err) {
        setError(apiDetail(err, "Failed to load profile"));
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [profileId, user, router, isLoading]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setError("");
    setSuccess("");

    const skills = skillsInput.split(",").map((s: string) => s.trim()).filter(Boolean);

    try {
      await api.put(`/upload-resume/${profileId}`, { skills });
      setSuccess("Profile updated successfully");
      const res = await api.get(`/upload-resume/${profileId}`);
      setData(res.data);
    } catch (err) {
      setError(apiDetail(err, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this resume profile?")) return;
    try {
      await api.delete(`/upload-resume/${profileId}`);
      router.push("/dashboard");
    } catch (err) {
      setError(apiDetail(err, "Failed to delete profile"));
    }
  };

  if (isLoading || !user) return null;

  const skillPreview = skillsInput.split(",").map((s) => s.trim()).filter(Boolean);
  const personalInfo = data?.personal_info;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 animate-in">
      <div className="mb-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </button>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {data?.file_name || `Profile #${profileId}`}
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Edit your extracted profile</p>
          </div>
          <button
            onClick={handleDelete}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70"
          >
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 animate-pop rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 flex animate-pop items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
          <CheckCircle2 className="size-4" />
          {success}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="surface p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <Sparkles className="size-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Skills</h2>
            </div>
            <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">
              Comma-separated list of skills
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              className="input-base h-11 rounded-lg px-3"
              placeholder="React, Python, TypeScript, ..."
            />
            {skillPreview.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {skillPreview.map((s, i) => (
                  <span
                    key={`${s}-${i}`}
                    className="animate-pop rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {personalInfo && (
            <div className="surface p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2.5">
                <User className="size-5 text-indigo-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Personal Info</h2>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                {Object.entries(personalInfo).map(([key, value]) => {
                  if (value == null || value === "") return null;
                  return (
                    <div key={key} className="rounded-lg border border-slate-200/70 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
                      <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        {String(key).replace(/_/g, " ")}
                      </p>
                      <p className="mt-0.5 truncate text-slate-800 dark:text-slate-200">
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.experience && data.experience.length > 0 && (
            <div className="surface p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2.5">
                <Briefcase className="size-5 text-indigo-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Experience</h2>
              </div>
              <div className="space-y-3">
                {data.experience.map((exp, i) => (
                  <div key={i} className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 transition-colors hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-800/40">
                    <p className="font-medium text-slate-900 dark:text-white">{exp.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {exp.company} &middot; {exp.start_date} - {exp.end_date || "Present"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.education && data.education.length > 0 && (
            <div className="surface p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2.5">
                <GraduationCap className="size-5 text-indigo-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Education</h2>
              </div>
              <div className="space-y-2">
                {data.education.map((edu, i) => (
                  <div key={i} className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-900 dark:text-white">{edu.degree}</span>
                    {edu.institution && <span> at {edu.institution}</span>}
                    {edu.year && <span className="text-slate-400"> &middot; {edu.year}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Changes
                </>
              )}
            </button>
            <button
              onClick={() => router.push(`/jobs/${profileId}`)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Pencil className="size-4" />
              Find Matches
            </button>
          </div>
        </div>
      )}
    </div>
  );
}