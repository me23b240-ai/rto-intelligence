// app/page.tsx
"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { generateSyntheticOrders } from "@/lib/synthetic-data";
import { scoreOrder, recommendIntervention, DEFAULT_ECONOMICS, rtoCost } from "@/lib/engine";
import { RiskBadge } from "@/components/risk-badge";
import { MetricCard } from "@/components/metric-card";
import { LanguageSwitcher } from "@/components/language-switcher";
import { TopActions } from "@/components/top-actions";
import { Logo } from "@/components/logo";
import { AuthGuard } from "@/components/auth-guard";
import { useTranslation } from "@/lib/i18n";
import { RiskTier } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function DashboardContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const [filter, setFilter] = useState<RiskTier | "ALL">("ALL");
  const orders = useMemo(() => generateSyntheticOrders(1000), []);

  const predictions = useMemo(
    () => orders.map((o) => {
      const prediction = scoreOrder(o);
      const intervention = recommendIntervention(prediction);
      return { order: o, prediction, intervention };
    }),
    [orders]
  );

  const counts: Record<RiskTier, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, REVIEW: 0 };
  predictions.forEach((p) => counts[p.prediction.tier]++);

  const highRisk = predictions.filter((p) => p.prediction.tier === "HIGH" || p.prediction.tier === "REVIEW");
  const totalExposure = predictions.reduce((sum, p) => sum + p.prediction.probability * rtoCost(DEFAULT_ECONOMICS), 0);
  const actualRtoRate = orders.filter((o) => o.finalStatus === "RTO").length / orders.length;
  const withIntervention = predictions.filter((p): p is typeof p & { intervention: NonNullable<typeof p.intervention> } => !!p.intervention);

  const visible = filter === "ALL" ? predictions : predictions.filter((p) => p.prediction.tier === filter);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header style={{ backgroundColor: "var(--meesho-purple)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="[&_.font-bold]:text-white">
            <Logo size={36} />
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={handleSignOut}
              className="text-xs font-medium text-white/80 hover:text-white border border-white/20 rounded-lg px-3 py-1.5"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="rounded-lg bg-[var(--meesho-purple-light)] border border-[var(--meesho-purple)]/15 px-4 py-2.5 text-sm flex items-center gap-2">
          <span className="font-semibold" style={{ color: "var(--meesho-purple)" }}>DEMO DATA</span>
          <span className="text-slate-500">— {t("dashboard.demoDataBanner")}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label={t("dashboard.ordersAnalysed")} value={orders.length.toString()} accent="purple" />
          <MetricCard label={t("dashboard.highRiskOrders")} value={highRisk.length.toString()} accent="red" />
          <MetricCard
            label={t("dashboard.exposure")}
            value={`₹${Math.round(totalExposure).toLocaleString("en-IN")}`}
            help={t("dashboard.exposureHelp")}
            accent="mango"
          />
          <MetricCard label={t("dashboard.currentRtoRate")} value={`${(actualRtoRate * 100).toFixed(1)}%`} accent="pink" />
        </div>

        <TopActions interventions={withIntervention} />

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Risk distribution</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <button
              onClick={() => setFilter("ALL")}
              className={`rounded-lg border p-3 text-left transition ${filter === "ALL" ? "border-[var(--meesho-purple)] bg-[var(--meesho-purple-light)]" : "border-slate-200 hover:border-slate-300"}`}
            >
              <div className="text-xs text-slate-500">All orders</div>
              <div className="text-xl font-bold text-slate-900">{predictions.length}</div>
            </button>
            {(["LOW", "MEDIUM", "HIGH", "REVIEW"] as RiskTier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => setFilter(tier)}
                className={`rounded-lg border p-3 text-left transition ${filter === tier ? "border-[var(--meesho-purple)] bg-[var(--meesho-purple-light)]" : "border-slate-200 hover:border-slate-300"}`}
              >
                <RiskBadge tier={tier} />
                <div className="text-xl font-bold text-slate-900 mt-1">{counts[tier]}</div>
                <div className="text-xs text-slate-400">{((counts[tier] / predictions.length) * 100).toFixed(0)}%</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Orders {filter !== "ALL" && <span className="text-slate-400 font-normal">— filtered to {t(`risk.${filter}`)}</span>}
            </h2>
            <span className="text-xs text-slate-400">{visible.length} orders</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                  <th className="px-5 py-2.5 font-medium">Order</th>
                  <th className="px-5 py-2.5 font-medium">Risk</th>
                  <th className="px-5 py-2.5 font-medium">Score</th>
                  <th className="px-5 py-2.5 font-medium">Main driver</th>
                  <th className="px-5 py-2.5 font-medium">Recommended action</th>
                  <th className="px-5 py-2.5 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {visible
                  .sort((a, b) => b.prediction.score - a.prediction.score)
                  .slice(0, 30)
                  .map(({ order, prediction, intervention }) => (
                    <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link href={`/orders/${order.id}`} className="font-medium hover:underline" style={{ color: "var(--meesho-purple)" }}>
                          {order.id}
                        </Link>
                      </td>
                      <td className="px-5 py-3"><RiskBadge tier={prediction.tier} /></td>
                      <td className="px-5 py-3 font-medium text-slate-700">{prediction.score}</td>
                      <td className="px-5 py-3 text-slate-600">{prediction.drivers[0] ? t(prediction.drivers[0].label) : "—"}</td>
                      <td className="px-5 py-3 text-slate-600">
                        {intervention ? t(`intervention.${intervention.type}`) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{prediction.confidence}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}