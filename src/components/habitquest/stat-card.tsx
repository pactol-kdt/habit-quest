import { type ReactNode } from "react";
import { GlassCard } from "~/components/habitquest/glass-card";
import { cn } from "~/lib/ui/cn";

interface StatCardProps {
  label: string;
  value: string;
  accent: string;
  icon: ReactNode;
  helper?: string;
}

export function StatCard({ label, value, accent, icon, helper }: StatCardProps) {
  return (
    <GlassCard className="panel-highlight h-full">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
            {label}
          </p>
          <p className={cn("text-3xl font-semibold md:text-4xl", accent)}>{value}</p>
          {helper ? (
            <p className="text-sm text-[var(--color-text-muted)]">{helper}</p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-lg text-white">
          {icon}
        </div>
      </div>
    </GlassCard>
  );
}
