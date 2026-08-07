"use client";

import { useEffect, useState, useTransition } from "react";
import {
  listAdminUsersAction,
  listCatalogAchievementsAction,
  listCatalogShopItemsAction,
  resetCatalogFromBuiltinAction,
  saveCatalogAchievementAction,
  saveCatalogShopItemAction,
  setUserRoleAction,
} from "~/app/actions/admin";
import { GlassCard } from "~/components/habitquest/glass-card";
import type { UserRole } from "~/lib/auth/session-types";
import { useHabitQuestStore } from "~/store/habitquest-store";
import type { Achievement, ShopCategory, ShopRarity } from "~/types/habitquest";

type Tab = "users" | "shop" | "achievements";

export function AdminPage() {
  const authUser = useHabitQuestStore((state) => state.authUser);
  const [tab, setTab] = useState<Tab>("users");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [users, setUsers] = useState<
    Array<{ id: string; email: string; displayName: string; role: UserRole; createdAt: string }>
  >([]);
  const [shopItems, setShopItems] = useState<
    Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      rarity: string;
      price: number;
      requiredLevel: number;
      requiredFeature: string | null;
      preview: string;
      exclusive: boolean;
      active: boolean;
    }>
  >([]);
  const [achievements, setAchievements] = useState<
    Array<{
      key: string;
      title: string;
      description: string;
      category: string;
      icon: string;
      rewardCoins: number;
      rewardExp: number;
      active: boolean;
    }>
  >([]);

  const [shopForm, setShopForm] = useState({
    id: "",
    name: "",
    description: "",
    category: "title" as ShopCategory,
    rarity: "common" as ShopRarity,
    price: 10,
    requiredLevel: 1,
    preview: "",
    exclusive: false,
    active: true,
  });

  const [achievementForm, setAchievementForm] = useState({
    key: "",
    title: "",
    description: "",
    category: "beginner" as Achievement["category"],
    icon: "Star",
    rewardCoins: 5,
    rewardExp: 20,
    active: true,
  });

  function refresh() {
    startTransition(async () => {
      setError(null);
      const [usersResult, shopResult, achievementResult] = await Promise.all([
        listAdminUsersAction(),
        listCatalogShopItemsAction(),
        listCatalogAchievementsAction(),
      ]);

      if (!usersResult.ok) {
        setError(usersResult.error);
        return;
      }

      setUsers(usersResult.users);
      if (shopResult.ok) {
        setShopItems(
          shopResult.items.map((item) => ({
            ...item,
            requiredFeature: item.requiredFeature,
          })),
        );
      }
      if (achievementResult.ok) {
        setAchievements(achievementResult.achievements);
      }
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  if (!authUser) {
    return null;
  }

  if (authUser.role !== "admin") {
    return (
      <GlassCard className="mt-6">
        <h1 className="section-title text-3xl text-white">Admin</h1>
        <p className="mt-3 text-sm text-rose-200">You need an admin account to open this page.</p>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
      <GlassCard className="rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Admin</p>
        <h1 className="section-title mt-2 text-3xl text-white sm:text-4xl">Catalog & roles</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--color-text-muted)]">
          Manage global shop/achievement catalogs in MySQL and promote users to admin.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {(["users", "shop", "achievements"] as Tab[]).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setTab(entry)}
              className={`rounded-full px-4 py-2 text-sm capitalize ${
                tab === entry ? "bg-white/10 text-white" : "text-[var(--color-text-muted)]"
              }`}
            >
              {entry}
            </button>
          ))}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await resetCatalogFromBuiltinAction();
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setMessage(
                  `Reset catalog from builtin (${result.counts.shopItems} shop, ${result.counts.achievements} achievements).`,
                );
                refresh();
              });
            }}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-white"
          >
            Reset catalog from code
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-cyan-100">{message}</p> : null}
      </GlassCard>

      {tab === "users" ? (
        <GlassCard>
          <h2 className="section-title text-2xl text-white">Users</h2>
          <div className="mt-4 space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm text-white">{user.email}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {user.displayName || "No display name"} · {user.role}
                  </p>
                </div>
                <select
                  value={user.role}
                  disabled={pending}
                  onChange={(event) => {
                    const role = event.target.value as UserRole;
                    startTransition(async () => {
                      const result = await setUserRoleAction(user.id, role);
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setMessage(`Updated ${user.email} to ${role}.`);
                      refresh();
                    });
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}

      {tab === "shop" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <GlassCard>
            <h2 className="section-title text-2xl text-white">Save shop item</h2>
            <div className="mt-4 grid gap-3">
              {(
                [
                  ["id", "id"],
                  ["name", "name"],
                  ["description", "description"],
                  ["preview", "preview"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="grid gap-1 text-sm">
                  <span className="text-[var(--color-text-muted)]">{label}</span>
                  <input
                    value={shopForm[key]}
                    onChange={(event) => setShopForm((prev) => ({ ...prev, [key]: event.target.value }))}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  />
                </label>
              ))}
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--color-text-muted)]">category</span>
                <select
                  value={shopForm.category}
                  onChange={(event) =>
                    setShopForm((prev) => ({
                      ...prev,
                      category: event.target.value as ShopCategory,
                    }))
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  {["title", "frame", "avatar", "theme"].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--color-text-muted)]">rarity</span>
                <select
                  value={shopForm.rarity}
                  onChange={(event) =>
                    setShopForm((prev) => ({
                      ...prev,
                      rarity: event.target.value as ShopRarity,
                    }))
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  {["common", "rare", "epic", "legendary"].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-[var(--color-text-muted)]">price</span>
                  <input
                    type="number"
                    value={shopForm.price}
                    onChange={(event) =>
                      setShopForm((prev) => ({ ...prev, price: Number(event.target.value) }))
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-[var(--color-text-muted)]">required level</span>
                  <input
                    type="number"
                    value={shopForm.requiredLevel}
                    onChange={(event) =>
                      setShopForm((prev) => ({
                        ...prev,
                        requiredLevel: Number(event.target.value),
                      }))
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <input
                  type="checkbox"
                  checked={shopForm.exclusive}
                  onChange={(event) =>
                    setShopForm((prev) => ({ ...prev, exclusive: event.target.checked }))
                  }
                />
                Exclusive
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <input
                  type="checkbox"
                  checked={shopForm.active}
                  onChange={(event) =>
                    setShopForm((prev) => ({ ...prev, active: event.target.checked }))
                  }
                />
                Active
              </label>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await saveCatalogShopItemAction({
                      ...shopForm,
                      requiredFeature: null,
                    });
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setMessage(`Saved shop item ${shopForm.id}.`);
                    refresh();
                  });
                }}
                className="rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Save shop item
              </button>
            </div>
          </GlassCard>
          <GlassCard>
            <h2 className="section-title text-2xl text-white">Shop catalog</h2>
            <div className="mt-4 max-h-[36rem] space-y-2 overflow-auto">
              {shopItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setShopForm({
                      id: item.id,
                      name: item.name,
                      description: item.description,
                      category: item.category as ShopCategory,
                      rarity: item.rarity as ShopRarity,
                      price: item.price,
                      requiredLevel: item.requiredLevel,
                      preview: item.preview,
                      exclusive: item.exclusive,
                      active: item.active,
                    })
                  }
                  className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:border-white/20"
                >
                  <p className="text-sm text-white">{item.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {item.id} · {item.category} · {item.price}c · {item.active ? "active" : "off"}
                  </p>
                </button>
              ))}
            </div>
          </GlassCard>
        </div>
      ) : null}

      {tab === "achievements" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <GlassCard>
            <h2 className="section-title text-2xl text-white">Save achievement</h2>
            <div className="mt-4 grid gap-3">
              {(
                [
                  ["key", "key"],
                  ["title", "title"],
                  ["description", "description"],
                  ["icon", "icon"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="grid gap-1 text-sm">
                  <span className="text-[var(--color-text-muted)]">{label}</span>
                  <input
                    value={achievementForm[key]}
                    onChange={(event) =>
                      setAchievementForm((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  />
                </label>
              ))}
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--color-text-muted)]">category</span>
                <select
                  value={achievementForm.category}
                  onChange={(event) =>
                    setAchievementForm((prev) => ({
                      ...prev,
                      category: event.target.value as Achievement["category"],
                    }))
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  {["beginner", "streak", "completion", "level", "shop", "challenge"].map(
                    (value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-[var(--color-text-muted)]">coins</span>
                  <input
                    type="number"
                    value={achievementForm.rewardCoins}
                    onChange={(event) =>
                      setAchievementForm((prev) => ({
                        ...prev,
                        rewardCoins: Number(event.target.value),
                      }))
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-[var(--color-text-muted)]">exp</span>
                  <input
                    type="number"
                    value={achievementForm.rewardExp}
                    onChange={(event) =>
                      setAchievementForm((prev) => ({
                        ...prev,
                        rewardExp: Number(event.target.value),
                      }))
                    }
                    className="rounded-xl border border-white/5 px-3 py-2"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <input
                  type="checkbox"
                  checked={achievementForm.active}
                  onChange={(event) =>
                    setAchievementForm((prev) => ({ ...prev, active: event.target.checked }))
                  }
                />
                Active
              </label>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await saveCatalogAchievementAction(achievementForm);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setMessage(`Saved achievement ${achievementForm.key}.`);
                    refresh();
                  });
                }}
                className="rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Save achievement
              </button>
            </div>
          </GlassCard>
          <GlassCard>
            <h2 className="section-title text-2xl text-white">Achievements catalog</h2>
            <div className="mt-4 max-h-[36rem] space-y-2 overflow-auto">
              {achievements.map((achievement) => (
                <button
                  key={achievement.key}
                  type="button"
                  onClick={() =>
                    setAchievementForm({
                      key: achievement.key,
                      title: achievement.title,
                      description: achievement.description,
                      category: achievement.category as Achievement["category"],
                      icon: achievement.icon,
                      rewardCoins: achievement.rewardCoins,
                      rewardExp: achievement.rewardExp,
                      active: achievement.active,
                    })
                  }
                  className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:border-white/20"
                >
                  <p className="text-sm text-white">{achievement.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {achievement.key} · {achievement.category} · {achievement.active ? "active" : "off"}
                  </p>
                </button>
              ))}
            </div>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}
