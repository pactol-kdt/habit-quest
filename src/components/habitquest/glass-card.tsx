import { type ReactNode } from "react";
import { cn } from "~/lib/ui/cn";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <section className={cn("glass-panel rounded-3xl p-5 md:p-6", className)}>
      {children}
    </section>
  );
}
