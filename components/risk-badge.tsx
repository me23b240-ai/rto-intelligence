// components/risk-badge.tsx
import { RiskTier } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

const STYLES: Record<RiskTier, string> = {
  LOW: "bg-green-50 text-green-700 border-green-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-300",
  REVIEW: "bg-red-50 text-red-700 border-red-300",
};

const DOT: Record<RiskTier, string> = {
  LOW: "bg-green-500",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-orange-500",
  REVIEW: "bg-red-500",
};

export function RiskBadge({ tier }: { tier: RiskTier }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${STYLES[tier]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[tier]}`} />
      {t(`risk.${tier}`)}
    </span>
  );
}