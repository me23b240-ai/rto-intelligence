// app/business-impact/page.tsx
"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";
import { Nav } from "@/components/nav";
import { FinanceTag } from "@/components/finance-tag";
import {
  VOLUME, SCENARIOS, SCENARIO_LABEL, BANDS, BASE_PAY, REVERSE_COST,
  BLENDED_NET_PER_RTO_AVOIDED, EXTRA_PER_DELIVERED, BREAK_EVEN_PP, ONE_TIME_BUILD, ANNUAL_RUN,
  RECOVERY_PER_REMAINING_RTO, CAUSE_TREE, CAUSE_TARGETED_SHARE, LIQUIDATION_THRESHOLDS, EXCLUDED_DRIVERS,
  DECISION_EXAMPLE, SAMPLE_QUEUE, ASSUMPTIONS, SCENARIO_PP,
  modelAt, pilotSummary, toCr, fmtCr, fmtRupee, fmtPct, fmtPp,
} from "@/lib/finance-model";

export const dynamic = "force-dynamic";

const sign = (n: number) => (n < 0 ? "text-red-600" : "text-green-700");

function SectionCard({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {note ? <p className="text-xs text-slate-500 mt-0.5 mb-3">{note}</p> : <div className="mb-3" />}
      {children}
    </div>
  );
}

function Tile({ label, value, sub, tone = "slate" }: { label: React.ReactNode; value: string; sub?: string; tone?: "slate" | "purple" | "red" | "green" }) {
  const bg = { slate: "bg-slate-50", purple: "bg-[var(--meesho-purple-light)]", red: "bg-red-50", green: "bg-green-50" }[tone];
  const fg = { slate: "text-slate-900", purple: "text-[var(--meesho-purple)]", red: "text-red-600", green: "text-green-700" }[tone];
  return (
    <div className={`rounded-lg p-3 ${bg}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${fg}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function BusinessImpactPage() {
  const fy26 = modelAt(VOLUME.fy26Placed, "base");
  const pilot = pilotSummary();
  const blendedRiderPay = REVERSE_COST - BLENDED_NET_PER_RTO_AVOIDED;
  const postRto = Object.values(SAMPLE_QUEUE.actions).reduce((a, b) => a + b, 0);

  const bridge = [
    { label: "RTO prevention: gross reverse cost avoided", basis: `${(fy26.rtosAvoided / 1e6).toFixed(1)}M RTOs avoided × ₹${REVERSE_COST}`, nw: fy26.grossAvoided, tg: fy26.grossAvoided },
    { label: "Rider payout + incentives", basis: `Network-wide: ₹${BASE_PAY} on each converted delivery + ₹${EXTRA_PER_DELIVERED.toFixed(2)} on every delivered order. Targeted: converted deliveries only (≈₹${blendedRiderPay.toFixed(2)} each)`, nw: -fy26.riderCostNetworkWide, tg: -fy26.riderCostTargeted },
    { label: "Prevention net impact", basis: "Gross avoidance − rider and incentive cost", nw: fy26.preventionNetNetworkWide, tg: fy26.preventionNetTargeted, highlight: true },
    { label: "Post-RTO consolidation + liquidation", basis: `Recovery on the RTOs that remain after prevention (≈₹${RECOVERY_PER_REMAINING_RTO.toFixed(2)} per remaining RTO)`, nw: fy26.recovery, tg: fy26.recovery },
    { label: "Build & run cost", basis: `${fmtRupee(ONE_TIME_BUILD)} one-time + ${fmtRupee(ANNUAL_RUN)} per year (held at pilot level)`, nw: -fy26.buildRun, tg: -fy26.buildRun },
  ];

  const matrix = SCENARIOS.map((s) => ({ s, m: modelAt(VOLUME.fy26Placed, s) }));
  const chartData = matrix.map(({ s, m }) => ({
    name: SCENARIO_LABEL[s], "Network-wide incentives": toCr(m.netY1NetworkWide), "Targeted incentives": toCr(m.netY1Targeted),
  }));

  const scale = [
    { label: "Pilot-scale (team file)", v: VOLUME.pilot },
    { label: "FY25 shipped (public)", v: VOLUME.fy25Shipped },
    { label: "FY26 placed (team slide)", v: VOLUME.fy26Placed },
  ].map((r) => ({ ...r, m: modelAt(r.v, "base") }));

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Business Impact</h1>
          <p className="text-sm text-slate-500 mt-1">
            Stress-testing the case: post-RTO recovery carries the base case, while prevention pays only when rider incentives stay targeted.
          </p>
        </div>

        <div className="rounded-xl border-2 border-[var(--meesho-purple)]/30 bg-[var(--meesho-purple-light)] p-4">
          <h2 className="text-sm font-bold text-[var(--meesho-purple-dark)]">Two different mechanisms, never merged into one "RTO reduction" number</h2>
          <div className="grid sm:grid-cols-2 gap-3 mt-2 text-xs text-slate-700">
            <div className="rounded-lg bg-white p-3">
              <div className="font-semibold text-slate-900">1. RTO prevention [PREVENTIVE] <span className="text-slate-400 font-normal">· Rider Engine</span></div>
              <p className="mt-1">Lowers the RTO rate itself, before a failure. Better allocation turns would-be failures into deliveries, but converted deliveries now cost rider pay.</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <div className="font-semibold text-slate-900">2. Post-RTO value recovery [REACTIVE] <span className="text-slate-400 font-normal">· AWB Terminal</span></div>
              <p className="mt-1">Does not change the RTO rate. It cuts what each remaining RTO costs through consolidation, liquidation or a smarter reattempt.</p>
            </div>
          </div>
        </div>

        {/* 1. Financial bridge */}
        <SectionCard
          title="Financial bridge · FY26 base case (2.67B placed orders)"
          note="Read left to right: the same year, with rider incentives paid on every delivery versus only on deliveries the engine converts."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3">Line item</th>
                  <th className="py-2 pr-3">How it is calculated</th>
                  <th className="py-2 pr-3 text-right whitespace-nowrap">Network-wide incentives</th>
                  <th className="py-2 text-right whitespace-nowrap">Targeted incentives</th>
                </tr>
              </thead>
              <tbody>
                {bridge.map((r) => (
                  <tr key={r.label} className={`border-b border-slate-50 ${r.highlight ? "bg-amber-50" : ""}`}>
                    <td className="py-2.5 pr-3 font-semibold text-slate-800">{r.label}</td>
                    <td className="py-2.5 pr-3 text-slate-500 max-w-xs">{r.basis}</td>
                    <td className={`py-2.5 pr-3 text-right font-bold whitespace-nowrap ${sign(r.nw)}`}>{fmtCr(toCr(r.nw), true)}</td>
                    <td className={`py-2.5 text-right font-bold whitespace-nowrap ${sign(r.tg)}`}>{fmtCr(toCr(r.tg), true)}</td>
                  </tr>
                ))}
                <tr className="bg-green-50">
                  <td className="py-3 pr-3 font-bold text-slate-900">Net Year 1 impact</td>
                  <td className="py-3 pr-3 text-slate-500">Combined net impact</td>
                  <td className={`py-3 pr-3 text-right font-bold text-base whitespace-nowrap ${sign(fy26.netY1NetworkWide)}`}>{fmtCr(toCr(fy26.netY1NetworkWide), true)}</td>
                  <td className={`py-3 text-right font-bold text-base whitespace-nowrap ${sign(fy26.netY1Targeted)}`}>{fmtCr(toCr(fy26.netY1Targeted), true)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Shown to one decimal so each column adds up exactly (the deck rounds to whole crore). Build & run is held at pilot level, so costs are likely understated at national scale.</p>
        </SectionCard>

        {/* 2. Why */}
        <SectionCard title="Why prevention goes negative when incentives are network-wide">
          <ul className="space-y-2 text-sm text-slate-700 list-disc pl-5">
            <li>
              A ₹{EXTRA_PER_DELIVERED.toFixed(2)} extra incentive on every one of the <strong>{(fy26.delivered / 1e9).toFixed(2)}B</strong> delivered orders costs{" "}
              <strong>{fmtCr(toCr(fy26.networkWideIncentive))}</strong>.
            </li>
            <li>
              Only <strong>{(fy26.rtosAvoided / 1e6).toFixed(1)}M</strong> of those deliveries were actually converted from RTOs, worth{" "}
              <strong>{fmtCr(toCr(fy26.grossAvoided))}</strong> in avoided reverse cost.
            </li>
            <li>
              Paying incentives only on the converted deliveries costs about <strong>{fmtCr(toCr(fy26.riderCostTargeted))}</strong> instead, and prevention turns positive at{" "}
              <strong>{fmtCr(toCr(fy26.preventionNetTargeted), true)}</strong>.
            </li>
          </ul>
          <div className="mt-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
            <strong>Break-even:</strong> network-wide incentives pay for themselves only if the RTO rate falls by about <strong>{fmtPp(BREAK_EVEN_PP, 1)}</strong>.
            The base case assumes <strong>{fmtPp(SCENARIO_PP.base)}</strong>, so it does not cover them. Keep incentives targeted.
          </div>
        </SectionCard>

        {/* 3. Scenario matrix */}
        <SectionCard title="Scenario matrix and break-even · FY26 net Year 1 impact" note="How the result moves with the size of the RTO-rate improvement.">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3">Scenario</th>
                  <th className="py-2 pr-3">RTO reduction</th>
                  <th className="py-2 pr-3">% of RTOs stopped</th>
                  <th className="py-2 pr-3 text-right">Net Y1, network-wide incentives</th>
                  <th className="py-2 text-right">Net Y1, targeted incentives</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map(({ s, m }) => (
                  <tr key={s} className={`border-b border-slate-50 ${s === "base" ? "bg-green-50" : ""}`}>
                    <td className="py-2 pr-3 font-semibold text-slate-800">{SCENARIO_LABEL[s]}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtPp(m.pp)}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtPct(m.impliedPctStopped, 2)}</td>
                    <td className={`py-2 pr-3 text-right font-bold ${sign(m.netY1NetworkWide)}`}>{fmtCr(toCr(m.netY1NetworkWide), true)}</td>
                    <td className={`py-2 text-right font-bold ${sign(m.netY1Targeted)}`}>{fmtCr(toCr(m.netY1Targeted), true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Recovery shrinks as prevention improves (fewer RTOs remain to recover), which is why the Aggressive scenario's recovery line is the smallest.
          </p>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}Cr`} />
                <Tooltip formatter={(v) => fmtCr(Number(v ?? 0), true)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Bar dataKey="Network-wide incentives" fill="#dc2626" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Targeted incentives" fill="var(--meesho-purple)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* 4. Cause tree */}
        <SectionCard title="Prevention cause tree" note="Where the prevention benefit comes from: rider-research share × addressable share × fix success rate.">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3">Root cause</th>
                  <th className="py-2 pr-3">Rider research share <FinanceTag type="team" /></th>
                  <th className="py-2 pr-3">Addressable <FinanceTag type="model" /></th>
                  <th className="py-2 pr-3">Fix success <FinanceTag type="model" /></th>
                  <th className="py-2">Share of total benefit <FinanceTag type="calculated" /></th>
                </tr>
              </thead>
              <tbody>
                {CAUSE_TREE.map((c) => (
                  <tr key={c.cause} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-semibold text-slate-800">{c.cause}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtPct(c.riderShare, 0)}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtPct(c.addressable, 0)}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtPct(c.fixSuccess, 0)}</td>
                    <td className="py-2 font-bold text-slate-900">{fmtPct(c.benefitShare, 0)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-2 pr-3 text-slate-900">Total / blended</td>
                  <td className="py-2 pr-3 text-slate-700">{fmtPct(CAUSE_TARGETED_SHARE, 0)} targeted</td>
                  <td className="py-2 pr-3 text-slate-400">—</td>
                  <td className="py-2 pr-3 text-slate-400">—</td>
                  <td className="py-2 text-slate-900">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* 5. Rider payout */}
        <SectionCard title="Rider payout economics by distance band" note="What a converted delivery costs in rider pay, and what is left of the ₹120 reverse cost it avoids.">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3">Band</th><th className="py-2 pr-3">Volume</th><th className="py-2 pr-3">RTO rate</th>
                  <th className="py-2 pr-3">Qualifying</th><th className="py-2 pr-3">Pay / delivery</th>
                  <th className="py-2 pr-3">Reverse avoided</th><th className="py-2">Net per RTO avoided</th>
                </tr>
              </thead>
              <tbody>
                {BANDS.map((b) => (
                  <tr key={b.name} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-semibold text-slate-800">{b.name} <span className="text-slate-400 font-normal">({b.avgKm} km)</span></td>
                    <td className="py-2 pr-3 text-slate-600">{fmtPct(b.volShare, 0)}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtPct(b.rtoRate, 0)}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtPct(b.qualifyRate, 0)}</td>
                    <td className="py-2 pr-3 text-slate-600">₹{b.totalPay.toFixed(1)}</td>
                    <td className="py-2 pr-3 text-slate-600">₹{REVERSE_COST}</td>
                    <td className="py-2 font-semibold text-slate-900">₹{b.netBenefit.toFixed(1)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-2 pr-3 text-slate-900" colSpan={6}>Blended, weighted by each band's share of RTOs</td>
                  <td className="py-2 text-[var(--meesho-purple)]">₹{BLENDED_NET_PER_RTO_AVOIDED.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* 6. Post-RTO recovery */}
        <SectionCard
          title="Post-RTO value recovery · the AWB Terminal's lever"
          note={`Worth ${fmtCr(toCr(fy26.recovery), true)} a year in the FY26 base case. This is the line that carries the result, and it rests on recovery assumptions that have not been validated.`}
        >
          <div className="text-xs font-semibold text-slate-700 mb-2">Example queue: what the engine decided for {postRto} failed parcels <FinanceTag type="simulated" /></div>
          <div className="flex h-3 rounded-full overflow-hidden mb-2">
            <div style={{ width: `${(SAMPLE_QUEUE.actions.normalReverse / postRto) * 100}%`, backgroundColor: "#94a3b8" }} />
            <div style={{ width: `${(SAMPLE_QUEUE.actions.consolidate / postRto) * 100}%`, backgroundColor: "var(--meesho-purple)" }} />
            <div style={{ width: `${(SAMPLE_QUEUE.actions.liquidate / postRto) * 100}%`, backgroundColor: "var(--meesho-orange)" }} />
            <div style={{ width: `${(SAMPLE_QUEUE.actions.writeOff / postRto) * 100}%`, backgroundColor: "#dc2626" }} />
          </div>
          <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 mb-1">
            <span><span className="inline-block h-2 w-2 rounded-full bg-slate-400 mr-1" />Normal reverse {SAMPLE_QUEUE.actions.normalReverse}</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-[var(--meesho-purple)] mr-1" />Consolidate {SAMPLE_QUEUE.actions.consolidate}</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-[var(--meesho-orange)] mr-1" />Liquidate {SAMPLE_QUEUE.actions.liquidate}</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-red-600 mr-1" />Write-off {SAMPLE_QUEUE.actions.writeOff}</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-4">{SAMPLE_QUEUE.routedToReattempt} of {SAMPLE_QUEUE.total} parcels were routed to a reattempt instead, so they are not in this mix.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <Tile label="Reverse cost avoided" value={fmtRupee(SAMPLE_QUEUE.reverseCostAvoided)} sub="Normal reverse − chosen movement" />
            <Tile label="Net value preserved per parcel (core KPI)" value={fmtRupee(SAMPLE_QUEUE.netValuePreservedPerParcel)} tone="purple" />
            <Tile label="Uplift vs all-normal-reverse" value={fmtRupee(SAMPLE_QUEUE.upliftVsBaseline)} sub="Same decisions, shown against the default" />
          </div>

          <div className="text-xs font-semibold text-slate-700 mb-1">Liquidation thresholds: when selling the parcel locally beats sending it back</div>
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3">Parcel value</th><th className="py-2 pr-3">Liquidation wins if resale rate is</th>
                  <th className="py-2 pr-3">Recommended action</th><th className="py-2">Operational condition</th>
                </tr>
              </thead>
              <tbody>
                {LIQUIDATION_THRESHOLDS.map((t) => (
                  <tr key={t.band} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-semibold text-slate-800">{t.band}</td>
                    <td className="py-2 pr-3 text-slate-600">{t.wins}</td>
                    <td className="py-2 pr-3 text-slate-600">{t.action}</td>
                    <td className="py-2 text-slate-500">{t.condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs font-semibold text-slate-700 mb-1">Recover or return? Worked example</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Tile label="Product value" value={`₹${DECISION_EXAMPLE.productValue}`} />
            <Tile label="P(reattempt succeeds)" value={fmtPct(DECISION_EXAMPLE.pSuccess, 0)} />
            <Tile label="Best alternative net value" value={`₹${DECISION_EXAMPLE.bestAlternativeNetValue}`} />
            <Tile label="Reattempt cost" value={`₹${DECISION_EXAMPLE.reattemptCost}`} />
          </div>
          <div className="mt-3 rounded-lg border-2 border-green-300 bg-green-50 p-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-slate-700">
              Expected gain = P(success) × (value − best alternative) − reattempt cost = <strong>₹{DECISION_EXAMPLE.expectedGain.toFixed(1)}</strong>
            </span>
            <span className="text-sm font-bold text-green-700">Decision: {DECISION_EXAMPLE.decision}</span>
          </div>
        </SectionCard>

        {/* 7. Excluded */}
        <SectionCard title="Value left out of the numbers" note="Real effects the model does not count, in both directions.">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3">Excluded value driver</th><th className="py-2 pr-3">Expected impact</th><th className="py-2">Strategic context</th>
                </tr>
              </thead>
              <tbody>
                {EXCLUDED_DRIVERS.map((d) => (
                  <tr key={d.driver} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-semibold text-slate-800">{d.driver}</td>
                    <td className={`py-2 pr-3 font-semibold ${d.effect.startsWith("Positive") ? "text-green-700" : "text-red-600"}`}>{d.effect}</td>
                    <td className="py-2 text-slate-500">{d.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* 8. Takeaways */}
        <div className="rounded-xl bg-[var(--meesho-purple)] p-5">
          <h2 className="text-sm font-bold text-white mb-3">Executive takeaways · FY26 base case</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { v: fmtCr(toCr(fy26.netY1NetworkWide), true), l: "per year, base case with network-wide incentives" },
              { v: fmtCr(toCr(fy26.netY1Targeted), true), l: "with targeted incentives" },
              { v: fmtCr(toCr(fy26.preventionNetNetworkWide), true), l: "prevention alone (network-wide)" },
              { v: fmtCr(toCr(fy26.recovery), true), l: "recovery layer" },
            ].map((t) => (
              <div key={t.l} className="rounded-lg bg-white/10 p-3 text-center">
                <div className="text-lg font-bold text-white">{t.v}</div>
                <div className="text-[11px] text-white/70 mt-0.5">{t.l}</div>
              </div>
            ))}
          </div>
          <ul className="mt-4 space-y-1.5 text-xs text-white/85 list-disc pl-5">
            <li>The {fmtCr(toCr(fy26.recovery))} recovery uplift depends on consolidation and liquidation assumptions that are not yet validated.</li>
            <li>Keep incentives targeted: network-wide incentives break even only at about a {fmtPp(BREAK_EVEN_PP, 1)} fall, and the base case is {fmtPp(SCENARIO_PP.base)}.</li>
          </ul>
        </div>

        {/* 9. Pilot + scale */}
        <SectionCard title="Pilot economics and scale" note="Payback only makes sense at pilot scale, where the build and run costs are real. Same per-order economics are then scaled up (Base scenario).">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Tile label="Pilot combined annual benefit (targeted)" value={fmtRupee(pilot.benefit)} tone="purple" />
            <Tile label="Pilot net Year 1" value={fmtRupee(pilot.netY1)} />
            <Tile label="Pilot net Year 2+" value={fmtRupee(pilot.netY2)} />
            <Tile label="Payback" value={`${pilot.paybackMonths.toFixed(1)} months`} sub="8M orders per year" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3">Volume basis</th><th className="py-2 pr-3">Orders</th>
                  <th className="py-2 pr-3">Reverse exposure ceiling</th><th className="py-2 pr-3">Prevention (targeted)</th>
                  <th className="py-2 pr-3">Recovery</th><th className="py-2 pr-3 text-right">Net Y1 targeted</th><th className="py-2 text-right">Net Y1 network-wide</th>
                </tr>
              </thead>
              <tbody>
                {scale.map((r) => (
                  <tr key={r.label} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-medium text-slate-800">{r.label}</td>
                    <td className="py-2 pr-3 text-slate-600">{r.v >= 1e9 ? `${(r.v / 1e9).toFixed(2)}B` : `${(r.v / 1e6).toFixed(0)}M`}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtCr(toCr(r.m.reverseCeiling))}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtCr(toCr(r.m.preventionNetTargeted))}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtCr(toCr(r.m.recovery))}</td>
                    <td className={`py-2 pr-3 text-right font-bold ${sign(r.m.netY1Targeted)}`}>{fmtCr(toCr(r.m.netY1Targeted), true)}</td>
                    <td className={`py-2 text-right font-bold ${sign(r.m.netY1NetworkWide)}`}>{fmtCr(toCr(r.m.netY1NetworkWide), true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            The reverse exposure ceiling is the most RTOs could cost at ₹120 each, not a saving. Scenario arithmetic, not a revenue forecast or company guidance.
          </p>
        </SectionCard>

        {/* 10. Assumptions */}
        <details className="rounded-xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">Every assumption behind these numbers</summary>
          <div className="mt-4 space-y-5">
            {ASSUMPTIONS.map((g) => (
              <div key={g.group}>
                <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">{g.group}</div>
                <div className="divide-y divide-slate-50">
                  {g.rows.map(([label, value, tag]) => (
                    <div key={label} className="flex items-start justify-between gap-3 py-1.5 text-xs">
                      <span className="text-slate-600">{label}</span>
                      <span className="text-slate-900 font-medium text-right">{value}<FinanceTag type={tag} /></span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400 border-t border-slate-100 pt-3">
          <span className="font-medium">Evidence key:</span>
          <span className="flex items-center">Stated in the case data <FinanceTag type="case" /></span>
          <span className="flex items-center">Case figure used as an assumption <FinanceTag type="caseAssumption" /></span>
          <span className="flex items-center">Arithmetic from case data <FinanceTag type="calculated" /></span>
          <span className="flex items-center">Invented to make the prototype run <FinanceTag type="model" /></span>
          <span className="flex items-center">Unverified design assumption <FinanceTag type="hypothesis" /></span>
          <span className="flex items-center">Build-cost placeholder <FinanceTag type="assumption" /></span>
          <span className="flex items-center">Scenario lever, not Meesho data <FinanceTag type="illustrative" /></span>
          <span className="flex items-center">Publicly reported, verify source <FinanceTag type="public" /></span>
          <span className="flex items-center">From team research <FinanceTag type="team" /></span>
          <span className="flex items-center">Demo data <FinanceTag type="simulated" /></span>
        </div>
      </main>
    </div>
  );
}