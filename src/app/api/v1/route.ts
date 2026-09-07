import { jsonOk } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESOURCES = {
  me: "GET /api/v1/me",
  updateMe: "PATCH /api/v1/me",
  signUp: "POST /api/v1/auth/sign-up",
  signIn: "POST /api/v1/auth/sign-in",
  signOut: "POST /api/v1/auth/sign-out",
  habits: "GET /api/v1/habits",
  createHabit: "POST /api/v1/habits",
  updateHabit: "PATCH /api/v1/habits/:habitId",
  deleteHabit: "DELETE /api/v1/habits/:habitId",
  completeHabit: "POST /api/v1/habits/:habitId/complete",
  uncompleteHabit: "POST /api/v1/habits/:habitId/uncomplete",
  purchase: "POST /api/v1/shop/purchases",
  equip: "POST /api/v1/shop/equip",
  unequip: "POST /api/v1/shop/unequip",
  settings: "PATCH /api/v1/settings",
  onboarding: "POST /api/v1/onboarding",
  claims: "POST /api/v1/claims/{challenges|quests|season|boss|streak-freeze}",
  leaderboard: "GET /api/v1/leaderboard",
  boot: "POST /api/v1/session/boot",
  saves: "GET|POST /api/v1/saves",
  sync: "POST /api/v1/saves/sync",
  push: "GET /api/v1/push/config · POST|DELETE /api/v1/push/subscriptions · POST /api/v1/push/test",
  admin: "GET|PATCH /api/v1/admin/...",
} as const;

export async function GET() {
  return jsonOk({
    version: "v1",
    auth: "Cookie session (habitquest_session). Send credentials: include.",
    resources: RESOURCES,
  });
}
