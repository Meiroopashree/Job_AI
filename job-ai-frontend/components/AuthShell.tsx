import type { ReactNode } from "react";
import Link from "next/link";
import { Sparkles, ShieldCheck, BrainCircuit, ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="absolute inset-0 bg-aurora" aria-hidden />
      <div className="absolute inset-0 bg-grid bg-grid-fade" aria-hidden />
      <div className="absolute -top-32 -left-24 size-96 rounded-full bg-fuchsia-500/20 blur-3xl animate-blob" aria-hidden />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col items-center justify-center gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:gap-20 lg:px-8">
        {/* Brand / value panel */}
        <div className="hidden max-w-md flex-1 lg:block animate-fade-up">
          <BrandMark />
          <h2 className="mt-8 text-4xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
            Your next job is one <span className="text-gradient">smart match</span> away
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-500 dark:text-slate-400">
            Scrape live roles from LinkedIn and Indeed, then let AI rank them against your real skills.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: BrainCircuit, text: "Semantic scoring against your resume" },
              { icon: Sparkles, text: "One-click ATS checks and resume fixes" },
              { icon: ShieldCheck, text: "Your data stays private and secure" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-fuchsia-600/20">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <Link
            href="/"
            className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
          >
            Back to homepage
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Form card */}
        <div className="w-full max-w-md animate-fade-up [animation-delay:150ms]">
          <div className="surface p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}