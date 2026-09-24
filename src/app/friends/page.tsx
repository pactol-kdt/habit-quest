import { FriendsPanel } from "~/components/habitquest/friends-panel";

export default function FriendsRoute() {
  return (
    <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Friends</p>
        <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl">Your circle</h1>
      </div>
      <FriendsPanel />
    </div>
  );
}
