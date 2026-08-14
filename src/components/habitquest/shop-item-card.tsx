"use client";

import { motion } from "framer-motion";
import { CosmeticPreview } from "~/components/habitquest/cosmetic-art";
import { GlassCard } from "~/components/habitquest/glass-card";
import { RARITY_STYLES } from "~/lib/habitquest/constants";
import { cn } from "~/lib/ui/cn";
import type { ShopCategory, ShopItem } from "~/types/habitquest";

interface ShopItemCardProps {
  item: ShopItem;
  locked: boolean;
  lockReason: string | null;
  equipped: boolean;
  pending?: boolean;
  onPurchase: (item: ShopItem) => void;
  onEquip: (itemId: string) => void;
  onUnequip?: (category: ShopCategory) => void;
}

export function ShopItemCard({
  item,
  locked,
  lockReason,
  equipped,
  pending = false,
  onPurchase,
  onEquip,
  onUnequip,
}: ShopItemCardProps) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard className={cn("h-full", locked && "opacity-70")}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em]",
                  RARITY_STYLES[item.rarity],
                )}
              >
                {item.rarity}
              </span>
              {item.exclusive ? (
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-amber-200">
                  Exclusive
                </span>
              ) : null}
            </div>
            <h3 className="mt-3 text-xl font-semibold text-white">{item.name}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
              {item.description}
            </p>
          </div>
          <CosmeticPreview
            item={item}
            className="h-16 w-16 rounded-3xl border border-white/10 bg-white/5"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          <span className="rounded-full bg-white/5 px-3 py-1">{item.category}</span>
          <span className="rounded-full bg-white/5 px-3 py-1">Lv {item.requiredLevel}</span>
          <span className="rounded-full bg-white/5 px-3 py-1">{item.price} coins</span>
        </div>

        <div className="mt-5">
          {item.owned ? (
            equipped ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => onUnequip?.(item.category)}
                className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Unequipping…" : "Unequip"}
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => onEquip(item.id)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Equipping…" : "Equip"}
              </button>
            )
          ) : locked ? (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-amber-100">
              {lockReason}
            </div>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => onPurchase(item)}
              className="rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Purchasing…" : "Purchase"}
            </button>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
