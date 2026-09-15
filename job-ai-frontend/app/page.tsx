import Link from "next/link";
import {
  Sparkles,
  Upload,
  Search,
  BrainCircuit,
  Wand2,
  Gauge,
  Target,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { BrandMark } from "@/components/BrandMark";

const STEPS = [
  {
    step: "01",
    title: "Upload Resume",
    desc: "Upload your PDF resume. Our AI extracts skills, experience, and education automatically.",
    icon: Upload,
  },
  {
    step: "02",
    title: "Scrape Jobs",
    desc: "Pull live openings from LinkedIn and Indeed with one click.",
    icon: Search,
  },
  {
    step: "03",
    title: "Get Matches",
    desc: "Our AI scores every job against your profile using semantic analysis and skill overlap.",
    icon: BrainCircuit,
  },
];

const FEATURES = [
  {
    title: "AI Resume Parsing",
    desc: "Skills, experience, and education extracted instantly from your PDF or DOCX.",
    icon: Sparkles,
  },
  {
    title: "Live Job Scraping",
    desc: "Fresh roles from LinkedIn and Indeed, routed to one clean feed.",
    icon: Search,
  },
  {
    title: "Smart Matching",
    desc: "Semantic TF-IDF matching ranks jobs by how well they fit your profile.",
    icon: Target,
  },
  {
    title: "ATS Score & Fix",
    desc: "Get a breakdown of your resume's ATS-friendliness and generate an optimized version.",
    icon: Gauge,
  },
  {
    title: "Duplicate Cleanup",
    desc: "The same role posted twice? Deduplicated automatically.",
    icon: CheckCircle2,
  },
  {
    title: "ATS-Ready PDF",
    desc: "Export a clean, keyword-rich PDF version of your optimized resume.",
    icon: Wand2,
  },
];

export default function Home() {
  return (
    <div className="flex flex-col overflow-x-clip">
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-grid bg-grid-fade" aria-hidden />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 size-[480px] rounded-full bg-indigo-500/20 blur-3xl animate-blob" aria-hidden />
        <div className="absolute top-24 -left-24 size-72 rounded-full bg-indigo-500/20 blur-3xl animate-blob [animation-delay:-6s]" aria-hidden />
        <div className="absolute top-40 -right-24 size-72 rounded-full bg-sky-400/20 blur-3xl animate-blob [animation-delay:-11s]" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-20 sm:px-6 sm:pt-32 sm:pb-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50/70 px-3.5 py-1.5 text-xs font-medium text-indigo-600 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-400 animate-fade-up">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-indigo-500 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-indigo-500" />
              </span>
              AI-Powered Job Matching
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl dark:text-white animate-fade-up [animation-delay:100ms]">
              Find your <span className="text-gradient">perfect job match</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-slate-500 sm:text-xl dark:text-slate-400 animate-fade-up [animation-delay:200ms]">
              Upload your resume, scrape jobs from LinkedIn and Indeed, and get
              intelligent match scores powered by semantic AI analysis.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 animate-fade-up [animation-delay:300ms]">
              <Link
                href="/register"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] hover:shadow-indigo-600/40 active:scale-[0.98] sm:w-auto"
              >
                Get started free
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white/60 px-8 py-3.5 text-base font-semibold text-slate-700 backdrop-blur transition-colors hover:bg-slate-50 sm:w-auto dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Sign in
              </Link>
            </div>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 animate-fade-up [animation-delay:400ms]">
              <ShieldCheck className="size-4 text-emerald-500" />
              Free to start &middot; No credit card required &middot; Your data stays private
            </p>
          </div>

          {/* Platform strip */}
          <div className="mt-16 flex flex-col items-center gap-4 animate-fade-up [animation-delay:500ms]">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Sources live jobs from
            </p>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="rounded-xl border border-slate-200/70 bg-white/70 px-5 py-2.5 font-semibold text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                LinkedIn
              </span>
              <span className="rounded-xl border border-slate-200/70 bg-white/70 px-5 py-2.5 font-semibold text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                Indeed
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-200/60 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              From resume to shortlist in three steps
            </h2>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
              Everything you need to turn your resume into targeted applications.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {STEPS.map((item, i) => (
              <Reveal key={item.step} delay={i * 120}>
                <div className="group relative h-full rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-950/40 dark:text-indigo-400 dark:group-hover:bg-indigo-600 dark:group-hover:text-white">
                      <item.icon className="size-5" />
                    </span>
                    <span className="text-4xl font-bold text-slate-200/80 dark:text-slate-700">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid bg-grid-fade" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Features</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              A smarter job search, end to end
            </h2>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
              Built around one goal: matching your real skills to roles that need them.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={(i % 3) * 100}>
                <div className="group h-full rounded-2xl border border-slate-200/60 bg-white/80 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-indigo-900">
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25">
                    <feature.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{feature.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200/60 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-500 px-6 py-14 text-center shadow-2xl shadow-indigo-600/30">
              <div className="absolute inset-0 bg-grid bg-grid-fade opacity-30" aria-hidden />
              <div className="absolute -top-20 -right-20 size-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
              <div className="absolute -bottom-24 -left-20 size-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
              <div className="relative">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Ready to find your next role?
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-lg text-indigo-100">
                  Create your profile, upload a resume, and get personalized matches in minutes.
                </p>
                <Link
                  href="/register"
                  className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-indigo-700 shadow-lg transition-all hover:scale-[1.03] active:scale-[0.98]"
                >
                  Create free account
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <BrandMark />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} JobAI &mdash; Smart Job Matching Platform
          </p>
        </div>
      </footer>
    </div>
  );
}