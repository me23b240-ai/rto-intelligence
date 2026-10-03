// app/business-impact/page.tsx
"use client";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Nav } from "@/components/nav";
import { MetricCard } from "@/components/metric-card";
import { FinanceTag } from "@/components/finance-tag";
import { FINANCE, SCENARIO_LABEL, Scenario, fmtRupee, fmtCr, fmtPct } from "@/lib/finance-model";

export const dynamic = "force-dynamic";

function SectionCard({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {note && <p className="text-xs text-slate-400 mt-0.5 mb-3">{note}</p>}
      {!note && <div className="mb-3" />}
      {children}
    </div>
  );
}

export default function BusinessImpactPage() {
  const [scenario, setScenario] = useState<Scenario>("base");
  const prevention = FINANCE.preventionImpact[scenario];
  const scenarioCombined = FINANCE.scenarioRange[scenario];
  const u = FINANCE.unitEconomics100;
  const d = FINANCE.dashboardSnapshot;
  const q = FINANCE.sampleQueue;
  const ns = FINANCE.networkWideStress;

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Business Impact</h1>
          <p className="text-sm text-slate-400">Pulled directly from the team's finance model - figures are displayed, not recomputed live on this page.</p>
          <span className="inline-block text-[11px] text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5 mt-2">Phase 1 - transparent arithmetic, not a forecast</span>
        </div>

        {/* The core framing the whole model insists on */}
        <div className="rounded-xl border-2 border-[var(--meesho-purple)]/30 bg-[var(--meesho-purple-light)] p-4">
          <h2 className="text-sm font-bold text-[var(--meesho-purple-dark)] mb-1">Two different mechanisms - never merged into one "RTO reduction" number</h2>
          <div className="grid sm:grid-cols-2 gap-3 mt-2 text-xs text-slate-700">
            <div className="rounded-lg bg-white p-3">
              <div className="font-semibold text-slate-900">1. RTO Prevention <span className="text-slate-400 font-normal">- Rider Engine</span></div>
              <p className="mt-1">Reduces the RTO rate itself, before failure. Route-aware allocation converts would-be failures into successful deliveries.</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <div className="font-semibold text-slate-900">2. Post-RTO Value Recovery <span className="text-slate-400 font-normal">- AWB Terminal</span></div>
              <p className="mt-1">Reduces the cost/loss on RTOs that still happen. Does not change the RTO rate - only what it costs once failure has occurred.</p>
            </div>
          </div>
        </div>

        {/* Headline - base case, pilot scale */}
        <div className="rounded-xl bg-[var(--meesho-purple)] p-6">
          <div className="text-xs text-white/70 uppercase tracking-wide mb-2">Base case · pilot-scale (8M orders/year)</div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{fmtRupee(FINANCE.combinedSummaryBase.totalBenefit)}</div>
              <div className="text-xs text-white/70">Combined annual benefit</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{fmtRupee(FINANCE.combinedSummaryBase.netYear1)}</div>
              <div className="text-xs text-white/70">Net Year 1 impact</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{FINANCE.combinedSummaryBase.paybackMonths} months</div>
              <div className="text-xs text-white/70">Payback period</div>
            </div>
          </div>
        </div>

        {/* Per-100-order funnel */}
        <SectionCard title="The baseline, per 100 orders" note="Built directly from case data - nothing here is an assumption.">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">COD orders <FinanceTag type="case" /></div>
              <div className="text-lg font-bold text-slate-900">{u.codOrders} <span className="text-xs font-normal text-slate-400">→ {u.codRtos} RTO</span></div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">Prepaid orders <FinanceTag type="case" /></div>
              <div className="text-lg font-bold text-slate-900">{u.prepaidOrders} <span className="text-xs font-normal text-slate-400">→ {u.prepaidRtos} RTO</span></div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">Blended RTO rate</div>
              <div className="text-lg font-bold text-slate-900">{fmtPct(u.blendedRtoRate, 0)}</div>
            </div>
            <div className="rounded-lg bg-[var(--meesho-purple-light)] p-3">
              <div className="text-xs text-slate-500">Reverse exposure (addressable) <FinanceTag type="calculated" /></div>
              <div className="text-lg font-bold text-[var(--meesho-purple)]">{fmtRupee(u.reverseExposureAddressable)}</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Forward exposure on these RTOs ({fmtRupee(u.forwardExposureSunk)}) is already spent - excluded from savings. Only the {fmtRupee(u.reverseExposureAddressable)} reverse leg is addressable post-failure.</p>
        </SectionCard>

        {/* RTO Prevention Impact */}
        <SectionCard title="RTO Prevention Impact - the Rider Engine's lever">
          <p className="text-xs text-slate-400 mb-3">Net of rider payout - converting an RTO into a delivery now costs the rider's pay (₹0 on a failed attempt), so the headline number already accounts for that.</p>
          <div className="flex gap-2 mb-4 flex-wrap">
            {(["conservative", "base", "aggressiveMid", "aggressive"] as Scenario[]).map((s) => (
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">pp reduction <FinanceTag type="model" /></div>
              <div className="text-lg font-bold text-slate-900">{fmtPct(prevention.ppReduction, 2)}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">RTOs avoided / year</div>
              <div className="text-lg font-bold text-slate-900">{prevention.rtosAvoided.toLocaleString("en-IN")}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">Implied % of RTOs prevented</div>
              <div className="text-lg font-bold text-slate-900">{fmtPct(prevention.impliedPctPrevented, 1)}</div>
            </div>
            <div className="rounded-lg bg-[var(--meesho-purple-light)] p-3">
              <div className="text-xs text-slate-500">Net of rider payout <span className="font-semibold">(recommended)</span></div>
              <div className="text-lg font-bold text-[var(--meesho-purple)]">{fmtRupee(prevention.netOfPayout)}</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Gross basis (₹170/RTO, overstates - includes sunk forward cost): {fmtRupee(prevention.gross170)}. Reverse-cost basis only (₹120/RTO): {fmtRupee(prevention.reverse120)}.</p>
        </SectionCard>

        {/* Rider payout by band */}
        <SectionCard title="Rider payout economics by distance band" note="Every figure here is driven by the Rider Engine's own payout assumptions.">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3">Band</th>
                  <th className="py-2 pr-3">Vol. share</th>
                  <th className="py-2 pr-3">RTO rate</th>
                  <th className="py-2 pr-3">Qualifying rate</th>
                  <th className="py-2 pr-3">Total pay/delivery</th>
                  <th className="py-2 pr-3">Reverse avoided</th>
                  <th className="py-2">Net benefit/RTO avoided</th>
                </tr>
              </thead>
              <tbody>
                {FINANCE.bands.map((b) => (
                  <tr key={b.name} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-semibold text-slate-800">{b.name} <span className="text-slate-400 font-normal">({b.avgKm}km)</span></td>
                    <td className="py-2 pr-3 text-slate-600">{fmtPct(b.volShare, 0)}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtPct(b.rtoRate, 0)}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtPct(b.qualifyRate, 0)}</td>
                    <td className="py-2 pr-3 text-slate-600">₹{b.totalPay.toFixed(1)}</td>
                    <td className="py-2 pr-3 text-slate-600">₹{b.reverseAvoided}</td>
                    <td className="py-2 font-semibold text-slate-900">₹{b.netBenefit.toFixed(1)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-2 pr-3 text-slate-900" colSpan={6}>Blended (RTO-weighted)</td>
                  <td className="py-2 text-[var(--meesho-purple)]">₹{FINANCE.blendedNetBenefitPerRtoAvoided.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Network-wide stress warning */}
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <h3 className="text-sm font-bold text-amber-800 mb-1">⚠ Stress test: incentives paid network-wide, not just on converted deliveries</h3>
          <p className="text-xs text-amber-700">
            If performance and route incentives were paid on <strong>every</strong> delivery rather than only ones the engine actually converts from RTO, the annual extra cost would be {fmtRupee(ns.annualExtraPayNetworkWide)} - requiring a {fmtPct(ns.breakEvenPpReduction, 2)} pp reduction just to break even. The Base scenario only delivers {fmtPct(ns.baseScenarioPp, 2)} pp, so <strong>the Base case does not cover a network-wide incentive</strong> - targeted-only incentives (paid on converted deliveries) are what the headline numbers above assume.
          </p>
        </div>

        {/* Post-RTO Value Recovery */}
        <SectionCard title="Post-RTO Value Recovery - the AWB Terminal's lever" note="Kept as a separate KPI family - does not reduce the RTO rate, only the loss once a failure has already occurred.">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">RTOs awaiting decision <FinanceTag type="simulated" /></div>
              <div className="text-lg font-bold text-slate-900">{d.rtoAwaiting.toLocaleString("en-IN")}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">Low-value candidates</div>
              <div className="text-lg font-bold text-slate-900">{d.lowValueCandidates} <span className="text-xs font-normal text-slate-400">({fmtPct(d.lowValueShare, 1)})</span></div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">Consolidation candidates</div>
              <div className="text-lg font-bold text-slate-900">{d.consolidationCandidates}</div>
            </div>
            <div className="rounded-lg bg-[var(--meesho-purple-light)] p-3">
              <div className="text-xs text-slate-500">Reverse exposure awaiting</div>
              <div className="text-lg font-bold text-[var(--meesho-purple)]">{fmtRupee(d.reverseExposureAwaiting)}</div>
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-700 mb-2">Sample queue - action mix ({q.total} parcels)</div>
          <div className="flex gap-1.5 h-3 rounded-full overflow-hidden mb-2">
            <div style={{ width: `${(q.actions.normalReverse / q.total) * 100}%`, backgroundColor: "#94a3b8" }} title="Normal reverse" />
            <div style={{ width: `${(q.actions.consolidate / q.total) * 100}%`, backgroundColor: "var(--meesho-purple)" }} title="Consolidate" />
            <div style={{ width: `${(q.actions.liquidate / q.total) * 100}%`, backgroundColor: "var(--meesho-orange)" }} title="Liquidate" />
            <div style={{ width: `${(q.actions.writeOff / q.total) * 100}%`, backgroundColor: "#dc2626" }} title="Write-off" />
          </div>
          <div className="flex gap-4 text-[11px] text-slate-500 mb-4">
            <span><span className="inline-block h-2 w-2 rounded-full bg-slate-400 mr-1" />Normal reverse {q.actions.normalReverse}</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-[var(--meesho-purple)] mr-1" />Consolidate {q.actions.consolidate}</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-[var(--meesho-orange)] mr-1" />Liquidate {q.actions.liquidate}</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-red-600 mr-1" />Write-off {q.actions.writeOff}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">Reverse cost avoided</div>
              <div className="text-lg font-bold text-slate-900">{fmtRupee(q.reverseCostAvoided)}</div>
            </div>
            <div className="rounded-lg bg-[var(--meesho-purple-light)] p-3">
              <div className="text-xs text-slate-500">Net value preserved / parcel <span className="font-semibold">(core KPI)</span></div>
              <div className="text-lg font-bold text-[var(--meesho-purple)]">{fmtRupee(q.netValuePreservedPerParcel)}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400">Uplift vs. all-normal-reverse baseline</div>
              <div className="text-lg font-bold text-slate-900">{fmtRupee(q.upliftVsBaseline)}</div>
            </div>
          </div>
        </SectionCard>

        {/* Combined Summary + Scenario chart */}
        <SectionCard title="Combined Summary - this scenario">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <MetricCard label="Prevention benefit" value={fmtRupee(scenario === "base" ? FINANCE.combinedSummaryBase.prevention : prevention.netOfPayout)} accent="purple" />
            <MetricCard label="Recovery benefit" value={fmtRupee(FINANCE.combinedSummaryBase.recovery)} accent="mango" />
            <MetricCard label="Combined annual benefit" value={fmtRupee(scenarioCombined.combined)} accent="pink" />
            <MetricCard label="Net Year 1 impact" value={fmtRupee(scenarioCombined.netY1)} accent="purple" />
          </div>
          <p className="text-xs text-slate-400">
            Build cost {fmtRupee(FINANCE.combinedSummaryBase.oneTimeCost)} (both layers) + annual run cost {fmtRupee(FINANCE.combinedSummaryBase.annualRunCost)}.
            Even the <strong>Conservative</strong> prevention scenario, combined with base-case recovery, clears the one-time build cost within Year 1 - true only if incentives are targeted at converted deliveries (see stress test above).
          </p>

          <div className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(["conservative", "base", "aggressiveMid", "aggressive"] as Scenario[]).map((s) => ({ name: SCENARIO_LABEL[s], value: FINANCE.scenarioRange[s].netY1 / 100000 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}L`} />
                <Tooltip formatter={(v: number) => [`₹${(v * 100000).toLocaleString("en-IN")}`, "Net Year 1 impact"]} />
                <Bar dataKey="value" fill="var(--meesho-purple)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Scale view */}
        <SectionCard title="Scaled to Meesho's volume" note="Same per-order economics at three volumes. Build/run cost held at pilot level - likely understated at national scale.">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3">Volume basis</th>
                  <th className="py-2 pr-3">Orders</th>
                  <th className="py-2 pr-3">Reverse exposure ceiling</th>
                  <th className="py-2 pr-3">Prevention (targeted)</th>
                  <th className="py-2 pr-3">Recovery layer</th>
                  <th className="py-2">Combined (targeted)</th>
                </tr>
              </thead>
              <tbody>
                {FINANCE.scaleView.map((row) => (
                  <tr key={row.label} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-medium text-slate-800">{row.label}</td>
                    <td className="py-2 pr-3 text-slate-600">{(row.orders / 1e6).toFixed(row.orders > 1e9 ? 0 : 1)}{row.orders > 1e9 ? "B" : "M"}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtCr(row.reverseCeilingCr)}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtCr(row.preventionTargetedCr)}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtCr(row.recoveryCr)}</td>
                    <td className="py-2 font-semibold text-slate-900">{fmtCr(row.combinedTargetedCr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Scenario arithmetic, not a revenue forecast or company guidance. Combined (targeted) is consistently ~15% of the reverse exposure ceiling across all three volumes.</p>
        </SectionCard>

        {/* Worked example */}
        <SectionCard title="Recover or return? Decision boundary - worked example">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-400">Product value</div><div className="font-bold text-slate-900">₹{FINANCE.decisionBoundaryExample.productValue}</div></div>
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-400">P(reattempt succeeds)</div><div className="font-bold text-slate-900">{fmtPct(FINANCE.decisionBoundaryExample.pSuccess, 0)}</div></div>
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-400">Best alternative net value</div><div className="font-bold text-slate-900">₹{FINANCE.decisionBoundaryExample.bestAlternativeNetValue}</div></div>
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-400">Reattempt cost</div><div className="font-bold text-slate-900">₹{FINANCE.decisionBoundaryExample.reattemptCost}</div></div>
          </div>
          <div className="mt-3 rounded-lg border-2 border-green-300 bg-green-50 p-3 flex items-center justify-between">
            <span className="text-sm text-slate-700">Expected gain = P(success) × (value − best alternative) − reattempt cost = <strong>₹{FINANCE.decisionBoundaryExample.expectedGain}</strong></span>
            <span className="text-sm font-bold text-green-700">Decision: {FINANCE.decisionBoundaryExample.decision}</span>
          </div>
        </SectionCard>

        {/* Evidence legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400 border-t border-slate-100 pt-3">
          <span className="font-medium">Evidence key:</span>
          <span className="flex items-center">Stated in case data <FinanceTag type="case" /></span>
          <span className="flex items-center">Pure arithmetic from case data <FinanceTag type="calculated" /></span>
          <span className="flex items-center">Invented to make the prototype runnable <FinanceTag type="model" /></span>
          <span className="flex items-center">Unverified design assumption <FinanceTag type="hypothesis" /></span>
          <span className="flex items-center">Planning/build-cost placeholder <FinanceTag type="assumption" /></span>
          <span className="flex items-center">Scenario lever, not Meesho data <FinanceTag type="illustrative" /></span>
          <span className="flex items-center">Publicly reported, verify source <FinanceTag type="public" /></span>
          <span className="flex items-center">From team research <FinanceTag type="team" /></span>
          <span className="flex items-center">Demo data for this prototype <FinanceTag type="simulated" /></span>
        </div>
      </main>
    </div>
  );
}