import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  side?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  eyebrowIcon: Icon,
  title,
  subtitle,
  meta,
  actions,
  side,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-600 p-7 text-white btn-glow animate-fade-up sm:p-9",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 right-24 size-48 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white backdrop-blur">
              {Icon && <Icon className="size-3.5" />}
              {eyebrow}
            </span>
          )}
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && (
            <p className="mt-3 text-sm leading-relaxed text-white/85">{subtitle}</p>
          )}
          {meta && <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">{meta}</div>}
          {actions && <div className="mt-5 flex flex-wrap gap-2.5">{actions}</div>}
        </div>
        {side && <div className="relative w-full max-w-xs lg:shrink-0">{side}</div>}
      </div>
    </section>
  );
}

export function HeroPrimaryButton({ className, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.99]",
        className
      )}
    />
  );
}

export function HeroSecondaryButton({ className, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-transform hover:scale-[1.02] active:scale-[0.99]",
        className
      )}
    />
  );
}