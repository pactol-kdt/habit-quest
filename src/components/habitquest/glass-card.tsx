import { type ReactNode } from "react";
import { cn } from "~/lib/ui/cn";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <section className={cn("glass-panel rounded-[1.5rem] p-4 sm:rounded-3xl sm:p-5 md:p-6", className)}>
      {children}
    </section>
  );
}
