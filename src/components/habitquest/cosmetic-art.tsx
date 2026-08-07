import { cn } from "~/lib/ui/cn";
import type { ShopItem } from "~/types/habitquest";

interface CosmeticPreviewProps {
  item: ShopItem | null;
  className?: string;
  avatarClassName?: string;
  frameClassName?: string;
}

export function CosmeticPreview({
  item,
  className,
  avatarClassName,
  frameClassName,
}: CosmeticPreviewProps) {
  if (!item) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950",
          className,
        )}
      >
        <DefaultAvatar className={avatarClassName} />
      </div>
    );
  }

  if (item.category === "avatar") {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950",
          className,
        )}
      >
        <AvatarArt itemId={item.id} className={avatarClassName} />
      </div>
    );
  }

  if (item.category === "frame") {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
          className,
        )}
      >
        <DefaultAvatar className={cn("opacity-75", avatarClassName)} />
        <FrameArt itemId={item.id} className={frameClassName} />
      </div>
    );
  }

  if (item.category === "theme") {
    const accent = item.themeVars?.["--color-cyan"] ?? "#4dd8ff";
    const gold = item.themeVars?.["--color-gold"] ?? "#f5c15d";
    const bg = item.themeVars?.["--color-bg"] ?? "#07111f";

    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-3xl border border-white/10",
          className,
        )}
        style={{
          background: `linear-gradient(135deg, ${bg}, ${accent}55 55%, ${gold}44)`,
        }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90">
          {item.preview}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
        className,
      )}
    >
      <TitleSigil itemId={item.id} />
    </div>
  );
}

export function AvatarWithFrame({
  avatar,
  frame,
  className,
}: {
  avatar: ShopItem | null;
  frame: ShopItem | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
        className,
      )}
    >
      {avatar ? <AvatarArt itemId={avatar.id} /> : <DefaultAvatar />}
      {frame ? <FrameArt itemId={frame.id} /> : null}
    </div>
  );
}

function TitleSigil({ itemId }: { itemId: string }) {
  const palette = getTitlePalette(itemId);

  return (
    <svg viewBox="0 0 80 80" className="h-12 w-12">
      <defs>
        <linearGradient id={`title-${itemId}`} x1="0%" x2="100%">
          <stop offset="0%" stopColor={palette[0]} />
          <stop offset="100%" stopColor={palette[1]} />
        </linearGradient>
      </defs>
      <path
        d="M40 8 58 18v18c0 14-8.5 25-18 30-9.5-5-18-16-18-30V18Z"
        fill={`url(#title-${itemId})`}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="2"
      />
      <path
        d="M40 19 49 24v10c0 8-3.5 14.5-9 18-5.5-3.5-9-10-9-18V24Z"
        fill="rgba(7,17,31,0.8)"
        stroke="rgba(255,255,255,0.22)"
      />
      <circle cx="40" cy="32" r="5" fill={palette[1]} />
      <path d="M40 36v10M35 41h10" stroke="white" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}

function AvatarArt({ itemId, className }: { itemId: string; className?: string }) {
  if (itemId === "avatar_knight") {
    return <KnightAvatar className={className} />;
  }

  if (itemId === "avatar_wizard") {
    return <WizardAvatar className={className} />;
  }

  if (itemId === "avatar_samurai") {
    return <SamuraiAvatar className={className} />;
  }

  if (itemId === "avatar_cyber_ninja") {
    return <CyberNinjaAvatar className={className} />;
  }

  return <DefaultAvatar className={className} />;
}

function FrameArt({ itemId, className }: { itemId: string; className?: string }) {
  if (itemId === "frame_bronze") {
    return <BronzeFrame className={className} />;
  }

  if (itemId === "frame_neon") {
    return <NeonFrame className={className} />;
  }

  if (itemId === "frame_galaxy") {
    return <GalaxyFrame className={className} />;
  }

  return null;
}

function DefaultAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("h-full w-full", className)}>
      <defs>
        <linearGradient id="default-avatar-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="28" fill="url(#default-avatar-bg)" />
      <circle cx="50" cy="38" r="18" fill="#dbeafe" />
      <path d="M20 88c4-17 15-26 30-26s26 9 30 26" fill="#dbeafe" />
      <path d="M34 34c4-7 10-10 16-10 8 0 13 3 17 10" fill="none" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function KnightAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("h-full w-full", className)}>
      <defs>
        <linearGradient id="knight-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#172554" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="knight-helm" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="28" fill="url(#knight-bg)" />
      <circle cx="50" cy="44" r="22" fill="url(#knight-helm)" />
      <path d="M34 45c2-7 7-14 16-14s14 7 16 14v11c-4 8-10 13-16 13s-12-5-16-13Z" fill="#0f172a" />
      <path d="M40 49h8M52 49h8" stroke="#67e8f9" strokeLinecap="round" strokeWidth="3" />
      <path d="M50 20 62 28l-4 6H42l-4-6Z" fill="#f8fafc" opacity="0.9" />
      <path d="M28 88c5-16 13-24 22-24 9 0 17 8 22 24" fill="#94a3b8" />
      <path d="M34 77h32" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function WizardAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("h-full w-full", className)}>
      <defs>
        <linearGradient id="wizard-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#312e81" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="wizard-hat" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="28" fill="url(#wizard-bg)" />
      <path d="M24 42 50 14l26 28-10 4H34Z" fill="url(#wizard-hat)" />
      <path d="M26 46c3-7 11-11 24-11s21 4 24 11v6H26Z" fill="#4338ca" />
      <circle cx="50" cy="50" r="16" fill="#f8fafc" />
      <path d="M39 50h6M55 50h6" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
      <path d="M34 86c4-11 10-18 16-20 9 2 15 9 16 20" fill="#c4b5fd" />
      <circle cx="68" cy="24" r="3.5" fill="#fde68a" />
      <circle cx="75" cy="31" r="2" fill="#67e8f9" />
      <circle cx="61" cy="30" r="1.8" fill="#f9a8d4" />
    </svg>
  );
}

function SamuraiAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("h-full w-full", className)}>
      <defs>
        <linearGradient id="samurai-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7f1d1d" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="28" fill="url(#samurai-bg)" />
      <path d="M26 40c3-12 13-19 24-19s21 7 24 19l-7 7H33Z" fill="#111827" />
      <path d="M36 42c0-10 6-17 14-17s14 7 14 17v15c-4 7-9 12-14 12s-10-5-14-12Z" fill="#f8fafc" />
      <path d="M35 38h30" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
      <path d="M42 49h5M53 49h5" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
      <path d="M28 86c6-13 14-20 22-20s16 7 22 20" fill="#991b1b" />
      <path d="M22 34h56" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

function CyberNinjaAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("h-full w-full", className)}>
      <defs>
        <linearGradient id="cyber-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#020617" />
          <stop offset="50%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#3b0764" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="28" fill="url(#cyber-bg)" />
      <path d="M22 46c5-13 15-20 28-20s23 7 28 20l-10 11H32Z" fill="#111827" />
      <path d="M34 46c2-9 8-14 16-14s14 5 16 14v12c-4 6-9 10-16 10s-12-4-16-10Z" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
      <path d="M41 50h7M52 50h7" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 85c5-11 12-17 20-17s15 6 20 17" fill="#111827" stroke="#e879f9" strokeWidth="2" />
      <path d="M24 68h52" stroke="#22d3ee" strokeWidth="1.5" opacity="0.55" />
      <path d="M30 28h40" stroke="#e879f9" strokeWidth="2" strokeDasharray="4 4" opacity="0.8" />
    </svg>
  );
}

function BronzeFrame({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}>
      <defs>
        <linearGradient id="bronze-frame" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="url(#bronze-frame)" strokeWidth="6" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <path d="M50 7 56 15 50 23 44 15Z" fill="#fde68a" opacity="0.85" />
      <path d="M50 77 56 85 50 93 44 85Z" fill="#fde68a" opacity="0.85" />
    </svg>
  );
}

function NeonFrame({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}>
      <circle cx="50" cy="50" r="46" fill="none" stroke="#22d3ee" strokeWidth="4" opacity="0.95" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="#67e8f9" strokeWidth="1.5" opacity="0.6" />
      <path d="M18 50h14M68 50h14M50 18v14M50 68v14" stroke="#a5f3fc" strokeWidth="3" strokeLinecap="round" />
      <circle cx="18" cy="50" r="3" fill="#67e8f9" />
      <circle cx="82" cy="50" r="3" fill="#67e8f9" />
      <circle cx="50" cy="18" r="3" fill="#67e8f9" />
      <circle cx="50" cy="82" r="3" fill="#67e8f9" />
    </svg>
  );
}

function GalaxyFrame({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}>
      <defs>
        <linearGradient id="galaxy-frame" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="url(#galaxy-frame)" strokeWidth="5" />
      <circle cx="50" cy="50" r="40.5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
      <circle cx="22" cy="26" r="2.5" fill="#e879f9" />
      <circle cx="78" cy="32" r="2" fill="#67e8f9" />
      <circle cx="70" cy="74" r="2.5" fill="#fde68a" />
      <circle cx="31" cy="79" r="1.8" fill="#ffffff" />
      <path d="M18 35c13-12 30-15 48-10" stroke="#22d3ee" strokeWidth="1.5" opacity="0.55" />
      <path d="M29 84c17 3 32-1 46-13" stroke="#a855f7" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

function getTitlePalette(itemId: string) {
  if (itemId.includes("archon")) {
    return ["#a855f7", "#f59e0b"];
  }

  if (itemId.includes("weekly")) {
    return ["#22d3ee", "#a855f7"];
  }

  if (itemId.includes("master") || itemId.includes("night")) {
    return ["#f472b6", "#8b5cf6"];
  }

  if (itemId.includes("hunter")) {
    return ["#38bdf8", "#10b981"];
  }

  return ["#94a3b8", "#e2e8f0"];
}
