import { buildReminderBuzzLines, type ReminderBuzzHabit } from "~/lib/push/timezone";

export function ReminderScheduleList({ habits }: { habits: readonly ReminderBuzzHabit[] }) {
  const lines = buildReminderBuzzLines(habits);
  if (!lines.length) {
    return (
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
        Add a habit to choose when it buzzes.
      </p>
    );
  }

  return (
    <ul className="mt-3 grid gap-1.5">
      {lines.map((line) => (
        <li key={`${line.kind}-${line.hour}`} className="text-sm leading-6 text-white">
          <span className="font-medium tabular-nums">{line.label}</span>
          <span className="text-[var(--color-text-muted)]"> — {line.detail}</span>
        </li>
      ))}
    </ul>
  );
}
