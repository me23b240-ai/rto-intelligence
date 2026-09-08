// app/orders/[id]/page.tsx
"use client";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { generateSyntheticOrders } from "@/lib/synthetic-data";
import { scoreOrder, recommendIntervention, DEFAULT_ECONOMICS, rtoCost } from "@/lib/engine";
import { RiskBadge } from "@/components/risk-badge";
import { useTranslation } from "@/lib/i18n";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const orders = useMemo(() => generateSyntheticOrders(1000), []);
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Order not found. <Link href="/" className="text-[var(--meesho-purple)] underline">Back to dashboard</Link></p>
      </div>
    );
  }

  const prediction = scoreOrder(order);
  const intervention = recommendIntervention(prediction);
  const cost170 = rtoCost(DEFAULT_ECONOMICS);
  const expectedCostWithout = Math.round(prediction.probability * cost170);
  const expectedCostWith = intervention
    ? Math.round(expectedCostWithout - intervention.estimatedGrossSavings)
    : expectedCostWithout;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/" className="text-sm text-[var(--meesho-purple)] hover:underline">← Back to dashboard</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Order #{order.id}</h1>
          <RiskBadge tier={prediction.tier} />
        </div>

        {/* Score card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-end gap-6 flex-wrap">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">RTO Risk score</div>
              <div className="text-4xl font-bold text-slate-900">{prediction.score}<span className="text-lg text-slate-300">/100</span></div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Estimated probability</div>
              <div className="text-4xl font-bold text-[var(--meesho-purple)]">{(prediction.probability * 100).toFixed(0)}%</div>
              <div className="text-xs text-slate-400">{prediction.probabilitySource === "benchmark" ? "benchmark-based" : "based on your order history"}</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Confidence: {prediction.confidence}</span>
            <span className="text-sm text-slate-400">— {t(prediction.confidenceReason)}</span>
          </div>
        </div>

        {/* Why risky */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">{t("order.whyRisky")}</h2>
          <ol className="space-y-2">
            {prediction.drivers.map((d, i) => (
              <li key={d.factor} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-[var(--meesho-purple-light)] text-[var(--meesho-purple-dark)] text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <span className="text-sm text-slate-700">{t(d.label)}</span>
                  <span className="text-xs text-slate-400 ml-2">({d.tag})</span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Recommended action */}
        <div className="rounded-xl border-2 border-[var(--meesho-purple)]/30 bg-[var(--meesho-purple-light)]/40 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">{t("order.recommendedAction")}</h2>
          {intervention ? (
            <>
              <p className="text-lg font-bold text-[var(--meesho-purple-dark)] mt-1">{t(`intervention.${intervention.type}`)}</p>
              <p className="text-sm text-slate-600 mt-1">{t(intervention.reasonKey)}</p>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[var(--meesho-purple)]/20">
                <div>
                  <div className="text-xs text-slate-500">{t("order.expectedCostWithout")}</div>
                  <div className="text-lg font-bold text-slate-800">₹{expectedCostWithout}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{t("order.expectedCostWith")}</div>
                  <div className="text-lg font-bold text-slate-800">₹{expectedCostWith}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{t("order.netSavings")}</div>
                  <div className="text-lg font-bold text-green-700">₹{intervention.estimatedNetSavings}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-400">Friction to customer: {intervention.friction}</div>
            </>
          ) : (
            <p className="text-sm text-slate-600 mt-1">{t("order.noActionNeeded")}</p>
          )}
        </div>
      </main>
    </div>
  );
}