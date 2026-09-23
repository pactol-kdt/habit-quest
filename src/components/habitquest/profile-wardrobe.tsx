"use client";

import { useState } from "react";
import { CosmeticPreview } from "~/components/habitquest/cosmetic-art";
import { GlassCard } from "~/components/habitquest/glass-card";
import { cosmeticObtainLabel } from "~/lib/habitquest/cosmetic-source";
import { cn } from "~/lib/ui/cn";
import type { EquippedItems, ShopCategory, ShopItem } from "~/types/habitquest";

const SECTIONS: Array<{ category: ShopCategory; label: string; equippedKey: keyof EquippedItems }> = [
  { category: "avatar", label: "Avatars", equippedKey: "avatarItemId" },
  { category: "frame", label: "Frames", equippedKey: "frameItemId" },
  { category: "title", label: "Titles", equippedKey: "titleItemId" },
  { category: "theme", label: "Themes", equippedKey: "themeItemId" },
];

export function ProfileWardrobe({
  shopItems,
  equippedItems,
  pendingShopItemIds,
  onEquip,
}: {
  shopItems: ShopItem[];
  equippedItems: EquippedItems;
  pendingShopItemIds: string[];
  onEquip: (itemId: string) => void;
}) {
  const [category, setCategory] = useState<ShopCategory>("avatar");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const section = SECTIONS.find((entry) => entry.category === category) ?? SECTIONS[0]!;
  const equippedId = equippedItems[section.equippedKey];
  const items = shopItems
    .filter((item) => item.category === section.category)
    .slice()
    .sort((left, right) => Number(right.owned) - Number(left.owned));
  const selected =
    items.find((item) => item.id === selectedId) ??
    items.find((item) => item.id === equippedId) ??
    null;
  const pending = selected ? pendingShopItemIds.includes(selected.id) : false;

  return (
    <GlassCard className="rounded-[1.75rem] p-4 md:p-6">
      <div
        role="tablist"
        aria-label="Cosmetic types"
        className="scrollbar-none -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1"
      >
        {SECTIONS.map((entry) => {
          const active = entry.category === section.category;
          return (
            <button
              key={entry.category}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setCategory(entry.category);
                setSelectedId(null);
              }}
              className={cn(
                "min-h-11 shrink-0 snap-start rounded-full px-4 py-2 text-sm transition",
                active
                  ? "bg-white/10 text-white"
                  : "bg-white/5 text-[var(--color-text-muted)] hover:text-white",
              )}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 min-h-16">
        {selected ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-white">{selected.name}</p>
              <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                {cosmeticObtainLabel(selected)}
              </p>
            </div>
            {selected.owned ? (
              selected.id === equippedId ? (
                <span className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-cyan-300/30 bg-cyan-300/15 px-4 py-2 text-sm font-semibold text-cyan-50">
                  Equipped
                </span>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onEquip(selected.id)}
                  className="hq-btn-accent min-h-10 shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Equip"}
                </button>
              )
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">Choose one.</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {items.map((item) => {
          const isSelected = selected?.id === item.id;
          const isEquipped = item.id === equippedId;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.name}
              aria-pressed={isSelected}
              onClick={() => setSelectedId(item.id)}
              className={cn(
                "h-16 w-16 overflow-hidden rounded-2xl border border-white/10 transition",
                !item.owned && "opacity-45 grayscale",
                isEquipped && "ring-2 ring-cyan-300",
                isSelected && "border-white",
              )}
            >
              <CosmeticPreview item={item} className="h-full w-full rounded-none border-0" />
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}
