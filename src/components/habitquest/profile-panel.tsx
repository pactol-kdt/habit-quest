import Link from "next/link";
import { AvatarWithFrame } from "~/components/habitquest/cosmetic-art";
import { GlassCard } from "~/components/habitquest/glass-card";
import { formatNumber, getProfileDisplay } from "~/lib/habitquest/utils";
import type { HabitQuestData } from "~/types/habitquest";

interface ProfilePanelProps {
  data: HabitQuestData;
}

export function ProfilePanel({ data }: ProfilePanelProps) {
  const profile = getProfileDisplay(data.shopItems, data.equippedItems);
  const ownedCount = data.shopItems.filter((item) => item.owned).length;

  return (
    <GlassCard className="h-full">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          Profile
        </p>
        <h2 className="section-title mt-2 text-2xl text-white">Identity loadout</h2>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/4 p-5">
        <div className="flex items-center gap-4">
          <AvatarWithFrame
            avatar={profile.avatar}
            frame={profile.frame}
            className="h-20 w-20 border border-white/10 shadow-[0_0_30px_rgba(77,216,255,0.12)]"
          />
          <div>
            <p className="text-lg font-semibold text-white">
              {profile.title?.name ?? "Unranked Adventurer"}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {profile.frame?.name ?? "No frame equipped"} • {profile.avatar?.name ?? "Default avatar"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Coin wallet</p>
          <p className="mt-1 text-2xl font-semibold text-amber-100">
            {formatNumber(data.wallet.totalCoins)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Owned cosmetics</p>
          <p className="mt-1 text-2xl font-semibold text-white">{ownedCount}</p>
        </div>
      </div>

      <Link
        href="/shop"
        className="mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
      >
        Open shop
      </Link>
    </GlassCard>
  );
}
