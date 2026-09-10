import { CoinIcon } from "~/components/habitquest/icons/coin-icon";
import { ExpIcon } from "~/components/habitquest/icons/exp-icon";
import { cn } from "~/lib/ui/cn";

type CurrencyKind = "coins" | "exp";

interface CurrencyAmountProps {
  kind: CurrencyKind;
  value: number | string;
  /** Prefix like "+" before the value. */
  prefix?: string;
  size?: number;
  className?: string;
  iconClassName?: string;
}

const LABELS: Record<CurrencyKind, string> = {
  coins: "coins",
  exp: "EXP",
};

export function CurrencyAmount({
  kind,
  value,
  prefix = "",
  size = 14,
  className,
  iconClassName,
}: CurrencyAmountProps) {
  const Icon = kind === "coins" ? CoinIcon : ExpIcon;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 tabular-nums", className)}
      title={`${prefix}${value} ${LABELS[kind]}`}
    >
      <Icon size={size} className={iconClassName} title={LABELS[kind]} />
      <span>
        {prefix}
        {value}
      </span>
    </span>
  );
}
