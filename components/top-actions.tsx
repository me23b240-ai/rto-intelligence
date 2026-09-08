// components/top-actions.tsx
import { InterventionRecommendation } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

interface Group {
  type: string;
  count: number;
  totalSavings: number;
}

export function TopActions({ interventions }: { interventions: { intervention: InterventionRecommendation }[] }) {
  const { t } = useTranslation();

  const groups: Record<string, Group> = {};
  for (const { intervention } of interventions) {
    if (!groups[intervention.type]) groups[intervention.type] = { type: intervention.type, count: 0, totalSavings: 0 };
    groups[intervention.type].count++;
    groups[intervention.type].totalSavings += intervention.estimatedNetSavings;
  }
  const sorted = Object.values(groups).sort((a, b) => b.totalSavings - a.totalSavings).slice(0, 3);

  if (sorted.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900 mb-1">What should you do today?</h2>
      <p className="text-xs text-slate-400 mb-4">Ranked by how much they could save you</p>
      <div className="grid sm:grid-cols-3 gap-3">
        {sorted.map((g) => (
          <div key={g.type} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="text-sm font-medium text-slate-900">{t(`intervention.${g.type}`)}</div>
            <div className="text-xs text-slate-500 mt-1">{g.count} orders affected</div>
            <div className="text-lg font-bold text-[var(--meesho-purple)] mt-2">
              ₹{Math.round(g.totalSavings).toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-slate-400">estimated avoidable cost</div>
          </div>
        ))}
      </div>
    </div>
  );
}