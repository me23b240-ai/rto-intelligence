// app/business-impact/page.tsx
"use client";
import { useMemo, useState } from "react";
import { Nav } from "@/components/nav";
import { MetricCard } from "@/components/metric-card";
import { EvidenceTagBadge } from "@/components/evidence-tag";
import { useSettings } from "@/lib/settings-context";
import { computePer100Baseline, computeAnnualScale, computeScenario, ScenarioName } from "@/lib/impact-engine";

export const dynamic = "force-dynamic";

const SCENARIO_LABEL: Record<ScenarioName, string> = {
  conservative: "Conservative",
  base: "Base",
  aggressive: "Aggressive",
};
const SCENARIO_DESC: Record<ScenarioName, string> = {
  conservative: "Only clear cases where the customer was unavailable but still wants the order. Recovery stays manual and partial.",
  base: "Main failure reasons identified, matched to a different recovery action each. Customers can pick a new delivery window.",
  aggressive: "Fully automated: failure identification, next action, rider assignment, and learning from outcomes.",
};

export default function BusinessImpactPage() {
  const { settings } = useSettings();
  const [scenario, setScenario] = useState<ScenarioName>("base");

  const baseline = useMemo(() => computePer100Baseline(settings), [settings]);
  const annual = useMemo(() => computeAnnualScale(settings, baseline), [settings, baseline]);
  const scenarioResult = useMemo(() => computeScenario(scenario, settings, baseline), [scenario, settings, baseline]);

  const fmtCr = (n: number) => `₹${n.toLocaleString("en-IN")} Cr`;

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Business Impact</h1>
          <p className="text-sm text-slate-400">Every number below is computed live from your Settings - change an assumption there and this page recalculates.</p>
          <span className="inline-block text-[11px] text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5 mt-2">
            Phase 1 - transparent arithmetic, not a forecast
          </span>
        </div>

        {/* Per-100 baseline */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">
            The baseline, per 100 orders <EvidenceTagBadge tag="fact" />
          </h2>
          <p className="text-xs text-slate-400 mb-4">Built directly from the case cohort split - nothing here is an assumption.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">COD orders</div>
              <div className="text-lg font-bold text-slate-900">{baseline.codOrders} <span className="text-xs font-normal text-slate-400">→ {baseline.codRtos} RTO</span></div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">Prepaid orders</div>
              <div className="text-lg font-bold text-slate-900">{baseline.prepaidOrders} <span className="text-xs font-normal text-slate-400">→ {baseline.prepaidRtos} RTO</span></div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">Blended RTO rate</div>
              <div className="text-lg font-bold text-slate-900">{baseline.blendedRtoRatePct}%</div>
            </div>
            <div className="rounded-lg bg-[var(--meesho-purple-light)] p-3">
              <div className="text-xs text-slate-500">Total exposure per RTO <EvidenceTagBadge tag="calculated" /></div>
              <div className="text-lg font-bold text-[var(--meesho-purple)]">₹{baseline.totalExposurePerRto} <span className="text-xs font-normal">({baseline.exposureMultiplier}x)</span></div>
            </div>
          </div>
        </div>

        {/* Annual scale-up */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">
            Scaled to Meesho's annual volume <EvidenceTagBadge tag="calculated" />
          </h2>
          <p className="text-xs text-slate-400 mb-4">Same arithmetic above, multiplied by placed order volume. Only this multiplication changes if the volume assumption changes.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Placed orders" value={(annual.placedOrders / 1e9).toFixed(2) + "B"} accent="purple" />
            <MetricCard label="Failed deliveries / year" value={(annual.failedDeliveries / 1e6).toFixed(0) + "M"} accent="red" />
            <MetricCard label="Incremental reverse cost" value={fmtCr(Math.round(annual.incrementalReverseCostCr))} accent="mango" />
            <MetricCard label="Total logistics exposure" value={fmtCr(Math.round(annual.totalLogisticsExposureCr))} accent="pink" />
          </div>
          <p className="text-xs text-slate-400 mt-3">Each 1 percentage point of RTO is worth {fmtCr(Math.round(annual.valuePerPointRtoCr))} a year at this cost basis.</p>
        </div>

        {/* Recovery scenarios */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">
            How much is recoverable? <EvidenceTagBadge tag="hypothesis" />
          </h2>
          <p className="text-xs text-slate-400 mb-4">Addressable share and recovery rate are our estimates, not Meesho figures - shown as a range across three scenarios, not a single number.</p>

          <div className="flex gap-2 mb-4">
            {(["conservative", "base", "aggressive"] as ScenarioName[]).map((s) => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`text-sm font-medium px-4 py-2 rounded-lg border transition ${
                  scenario === s ? "border-[var(--meesho-purple)] bg-[var(--meesho-purple-light)] text-[var(--meesho-purple)]" : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {SCENARIO_LABEL[s]}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-500 mb-4">{SCENARIO_DESC[scenario]}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">Addressable share</div>
              <div className="text-lg font-bold text-slate-900">{scenarioResult.addressableSharePct}%</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">Recovery rate</div>
              <div className="text-lg font-bold text-slate-900">{scenarioResult.recoveryRatePct}%</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">RTOs avoided / 100</div>
              <div className="text-lg font-bold text-slate-900">{scenarioResult.rtosAvoidedPer100}</div>
            </div>
            <div className="rounded-lg bg-[var(--meesho-purple-light)] p-3">
              <div className="text-xs text-slate-500">Exposure avoided / 100</div>
              <div className="text-lg font-bold text-[var(--meesho-purple)]">₹{scenarioResult.exposureAvoidedPer100}</div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border-2 border-[var(--meesho-orange)]/30 bg-orange-50 p-4 flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-slate-700">At {SCENARIO_LABEL[scenario].toLowerCase()} assumptions, this scales to</span>
            <span className="text-2xl font-bold" style={{ color: "var(--meesho-orange-dark)" }}>
              {fmtCr(scenarioResult.annualExposureAvoidedCr)} <span className="text-sm font-normal text-slate-500">a year</span>
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Every number above traces back to Settings - change an assumption there and this entire page recalculates, live.
        </p>
      </main>
    </div>
  );
}