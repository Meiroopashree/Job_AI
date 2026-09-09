import { Briefcase, MapPin, ArrowUpRight, Building2 } from "lucide-react";

interface JobCardProps {
  item: {
    job: {
      id: number;
      title: string;
      company: string;
      location: string;
      description?: string;
      apply_url?: string;
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
}

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
      ring: "from-emerald-500 to-teal-500",
      chip: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
      bar: "bg-gradient-to-r from-emerald-500 to-teal-500",
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

export default function JobCard({ item }: JobCardProps) {
  if (!item?.job) return null;

  const { job, match_percentage, explanation } = item;
  const pct = Math.round(Number(match_percentage) || 0);
  const tone = matchTone(pct);

  const safeTitle = job.title || "Untitled Position";
  const safeCompany = job.company || "Unknown Company";
  const safeLocation = job.location || "Location not specified";
  const description = stripHtml(job.description);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5 dark:border-slate-800 dark:bg-slate-900/70">
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

        {job.apply_url && (
          <div className="mt-4 border-t border-slate-200/70 pt-4 dark:border-slate-800">
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/btn inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Apply Now
              <ArrowUpRight className="size-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}