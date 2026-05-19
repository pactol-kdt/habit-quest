"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import { GlassCard } from "~/components/habitquest/glass-card";
import { formatNumber } from "~/lib/habitquest/utils";

interface AnalyticsPanelProps {
  weeklyActivity: Array<{
    label: string;
    completed: number;
    due: number;
    exp: number;
    completionRate: number;
  }>;
  weeklyCompletionRate: number;
  totalCompletedHabits: number;
  bestStreak: number;
}

export function AnalyticsPanel({
  weeklyActivity,
  weeklyCompletionRate,
  totalCompletedHabits,
  bestStreak,
}: AnalyticsPanelProps) {
  return (
    <GlassCard>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
            Analytics
          </p>
          <h2 className="section-title mt-2 text-2xl text-white">Quest telemetry</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm text-[var(--color-text-muted)]">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p>Weekly rate</p>
            <p className="mt-1 text-lg font-semibold text-white">{weeklyCompletionRate}%</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p>Total clears</p>
            <p className="mt-1 text-lg font-semibold text-white">{formatNumber(totalCompletedHabits)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p>Best streak</p>
            <p className="mt-1 text-lg font-semibold text-white">{bestStreak} days</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">Weekly completion rate</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyActivity}>
                <defs>
                  <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4dd8ff" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#4dd8ff" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(8,15,29,0.96)", borderColor: "rgba(255,255,255,0.08)", borderRadius: 16 }}
                />
                <Area
                  type="monotone"
                  dataKey="completionRate"
                  stroke="#4dd8ff"
                  strokeWidth={3}
                  fill="url(#completionGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">EXP gained over time</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyActivity}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(8,15,29,0.96)", borderColor: "rgba(255,255,255,0.08)", borderRadius: 16 }}
                />
                <Bar dataKey="exp" radius={[14, 14, 0, 0]} fill="#f5c15d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
