// app/rider-engine/page.tsx
"use client";
import { useMemo, useState } from "react";
import { Nav } from "@/components/nav";
import { RiderMap } from "@/components/rider-map";
import { RiderProvider, useRiderEngine } from "@/lib/rider-context";
import { roadDistance } from "@/lib/rider-mock-data";
import { recommendRiders, dcToCustomerDistance, RiderRecommendation } from "@/lib/rider-route-engine";
import { computePayout, estimateDeliveryPayout, BASE_PAYOUT_PER_DELIVERY } from "@/lib/rider-payout-engine";
import { RiderPerformancePanel } from "@/components/rider-performance-panel";
import { generateRiderHistory } from "@/lib/rider-history";
import { RiderDataTable } from "@/components/rider-data-table";
import { computeWeightedPerformance } from "@/lib/rider-history";

export const dynamic = "force-dynamic";

type ViewMode = "DC_OWNER" | "MAP" | "VALMO_OPS" | "DATA";

function Tag({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "purple" | "amber" }) {
  const styles = {
    slate: "bg-slate-100 text-slate-500 border-slate-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return <span className={`inline-block text-[10px] font-semibold tracking-wide border rounded px-1.5 py-0.5 ${styles[tone]}`}>{children}</span>;
}

function ScoreChip({ score }: { score: number }) {
  const tone = score >= 80 ? { bg: "#dcfce7", text: "#15803d", label: "Strong fit" }
    : score >= 60 ? { bg: "#fef3c7", text: "#b45309", label: "Workable" }
    : { bg: "#fee2e2", text: "#b91c1c", label: "Weak fit" };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: tone.bg, color: tone.text }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tone.text }} />
      {score}/100 · {tone.label}
    </span>
  );
}

function DcOwnerView() {
  const { riders, parcels, incentives, riderHistory, assignParcel } = useRiderEngine();
  const [activeAwb, setActiveAwb] = useState<string | null>(null);

  const recsByParcel = useMemo(() => {
    const m = new Map<string, RiderRecommendation[]>();
    parcels.forEach((p) => m.set(p.awb, recommendRiders(riders, p, riderHistory)));
    return m;
  }, [riders, parcels, riderHistory]);

  const activeParcel = parcels.find((p) => p.awb === activeAwb) ?? null;
  const activeRecs = activeParcel ? recsByParcel.get(activeParcel.awb) ?? [] : [];
  const top = activeRecs[0];
  const runnerUp = activeRecs[1];
  const payoutEstimate = top ? estimateDeliveryPayout(top.rider, top.option.incrementalDistanceKm, incentives) : null;

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-6">
        {/* Riders */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Available riders</h2>
            <Tag>SIMULATED LOCATION</Tag>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {riders.map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.currentStopLabel}</div>
                  </div>
                  <div className="text-right text-xs text-slate-400">{r.route.length}/{r.capacity} stops</div>
                </div>
                {r.route.length > 0 && (
                  <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                    <div>Current route: DC → {r.route.map((s) => s.label).join(" → ")}</div>
                    <div>Total planned route: {(() => {
                      let d = 0, cur = r.currentLocation;
                      for (const s of r.route) { d += roadDistance(cur, s.location); cur = s.location; }
                      return Math.round(d * 10) / 10;
                    })()} km</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Parcels */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-900">Available parcels</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="px-4 py-2.5">AWB</th>
                  <th className="px-4 py-2.5">DC → customer</th>
                  <th className="px-4 py-2.5">Case RTO band</th>
                  <th className="px-4 py-2.5">SLA left</th>
                  <th className="px-4 py-2.5">Recommended rider</th>
                  <th className="px-4 py-2.5">Incremental route</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {parcels.map((p) => {
                  const dc = dcToCustomerDistance(p);
                  const best = (recsByParcel.get(p.awb) ?? [])[0];
                  return (
                    <tr key={p.awb} className={`border-b border-slate-50 ${activeAwb === p.awb ? "bg-[var(--meesho-purple-light)]" : "hover:bg-slate-50"}`}>
                      <td className="px-4 py-2.5 font-mono text-slate-700">{p.awb}</td>
                      <td className="px-4 py-2.5 text-slate-600">{dc.km} km</td>
                      <td className="px-4 py-2.5 text-slate-600">{dc.band} · {dc.benchmark}%</td>
                      <td className={`px-4 py-2.5 ${p.slaRemainingMin < 40 ? "text-red-600 font-medium" : "text-slate-600"}`}>{p.slaRemainingMin} min</td>
                      <td className="px-4 py-2.5 text-slate-700">{best ? `${best.rider.name} · score ${best.score}` : <span className="text-red-500">No feasible rider</span>}</td>
                      <td className="px-4 py-2.5 text-slate-600">{best ? `+${best.option.incrementalDistanceKm.toFixed(1)} km` : "—"}</td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => setActiveAwb(p.awb)} className="text-xs font-semibold text-[var(--meesho-purple)] hover:underline">View</button>
                      </td>
                    </tr>
                  );
                })}
                {parcels.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">All parcels assigned.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right side panel — recommendation + assign */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 lg:sticky lg:top-6">
        {!activeParcel ? (
          <p className="text-sm text-slate-400">Click "View" on a parcel to see the route-aware recommendation.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-slate-400">AWB</div>
              <div className="font-mono text-base font-bold text-slate-900">{activeParcel.awb}</div>
              <div className="text-xs text-slate-500 mt-1.5 space-y-0.5">
                <div>DC → customer: <strong>{dcToCustomerDistance(activeParcel).km} km</strong></div>
                <div>Case band: <strong>{dcToCustomerDistance(activeParcel).band}</strong> · Case RTO benchmark: <strong>{dcToCustomerDistance(activeParcel).benchmark}%</strong></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">CASE RTO-RISK BENCHMARK — not a rider-level prediction</p>
            </div>

            {!top ? (
              <p className="text-sm text-red-600">No rider can take this parcel within SLA and route capacity.</p>
            ) : (
              <>
                <div className="rounded-lg border-2 border-green-300 bg-green-50 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-green-700 font-semibold uppercase">Recommended</div>
                    <ScoreChip score={top.score} />
                  </div>
                  <div className="text-sm font-bold text-slate-900">{top.rider.name}</div>
                  <div className="text-xs text-slate-600 mt-1.5 space-y-0.5">
                    <div>Incremental route distance: <strong>{top.option.incrementalDistanceKm.toFixed(1)} km</strong></div>
                    <div>Total planned route: <strong>{top.option.totalDistanceKm.toFixed(1)} km</strong></div>
                    <div>Route time: <strong>{top.option.routeTimeMin} min</strong></div>
                  </div>
                  <ul className="list-disc pl-5 text-xs text-slate-700 mt-2 space-y-0.5">
                    {top.reasons.map((r) => <li key={r}>{r}</li>)}
                  </ul>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-[11px] font-medium text-slate-500">View {top.rider.name}'s 90-day performance data</summary>
                    <div className="mt-2">
                      <RiderPerformancePanel history={riderHistory[top.rider.id] ?? []} />
                    </div>
                  </details>

                  {payoutEstimate && (
                    <div className="mt-3 pt-2 border-t border-green-200 text-xs text-slate-700">
                      <div className="font-semibold text-slate-800 mb-0.5">Estimated payout for this delivery</div>
                      <div>Base ₹{payoutEstimate.base} + performance ₹{payoutEstimate.performance} + route ₹{payoutEstimate.route}</div>
                      <div className="font-bold text-slate-900 mt-0.5">Total ≈ ₹{payoutEstimate.total}</div>
                    </div>
                  )}

                  <button
                    onClick={() => { assignParcel(activeParcel, top.rider.id, top.option); setActiveAwb(null); }}
                    className="mt-3 w-full text-sm font-semibold text-white py-2 rounded-lg"
                    style={{ backgroundColor: "var(--meesho-orange)" }}
                  >
                    Assign to {top.rider.name}
                  </button>
                </div>

                {runnerUp && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-slate-500 font-semibold uppercase">Why not {runnerUp.rider.name}?</div>
                      <ScoreChip score={runnerUp.score} />
                    </div>
                    <ul className="list-disc pl-5 text-xs text-slate-600 mt-1 space-y-0.5">
                      {(runnerUp.weaknesses.length ? runnerUp.weaknesses : ["Lower overall score than the recommended rider"]).map((w) => <li key={w}>{w}</li>)}
                    </ul>
                    <button
                      onClick={() => { assignParcel(activeParcel, runnerUp.rider.id, runnerUp.option); setActiveAwb(null); }}
                      className="mt-2 text-xs font-medium text-slate-500 hover:text-slate-700 underline"
                    >
                      Assign to {runnerUp.rider.name} instead
                    </button>
                  </div>
                )}

                <details className="rounded-lg border border-slate-200 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-700">Route simulator — insertion options</summary>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    {top.rider.route.length === 0 ? (
                      <p>Rider has no pending stops — parcel is simply added as the next stop.</p>
                    ) : (
                      <>
                        <p>Route: DC → {top.rider.route.map((s) => s.label).join(" → ")} → <strong>{activeParcel.awb}</strong></p>
                        <p className="font-medium text-slate-800">The engine tried every insertion position and chose position {top.option.insertAt + 1} of {top.option.newRoute.length} — lowest incremental distance.</p>
                      </>
                    )}
                  </div>
                </details>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// in MapView(), pass riderHistory through:
function MapView() {
  const { riders, parcels, incentives, riderHistory } = useRiderEngine();
  return <RiderMap riders={riders} parcels={parcels} incentives={incentives} riderHistory={riderHistory} />;
}
function ValmoOpsView() {
  const { riders, incentives, updateIncentives, riderHistory } = useRiderEngine();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Payout assumptions</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Base payout / successful delivery</label>
            <div className="text-lg font-bold text-slate-900">₹{BASE_PAYOUT_PER_DELIVERY}</div>
            <Tag tone="purple">CASE ASSUMPTION</Tag>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Performance incentive / delivery</label>
            <input type="number" value={incentives.performanceIncentivePerDelivery} onChange={(e) => updateIncentives({ performanceIncentivePerDelivery: Number(e.target.value) })} className="w-24 border border-slate-200 rounded px-2 py-1 text-sm" />
            <div className="mt-1"><Tag tone="amber">HYPOTHESIS</Tag></div>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Route incentive / km today</label>
            <input type="number" step="0.1" value={incentives.routeIncentivePerKm} onChange={(e) => updateIncentives({ routeIncentivePerKm: Number(e.target.value) })} className="w-24 border border-slate-200 rounded px-2 py-1 text-sm" />
            <div className="mt-1"><Tag tone="amber">HYPOTHESIS</Tag></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Rider economics</h2>
          <p className="text-xs text-slate-400 mt-0.5">Score is the 90-day recency-weighted success rate (see Rider Data tab for the full breakdown).</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                <th className="px-4 py-2.5">Rider</th>
                <th className="px-4 py-2.5">Score</th>
                <th className="px-4 py-2.5">Deliveries</th>
                <th className="px-4 py-2.5">Base payout</th>
                <th className="px-4 py-2.5">Performance</th>
                <th className="px-4 py-2.5">Route</th>
                <th className="px-4 py-2.5">Total modeled</th>
                <th className="px-4 py-2.5">₹ / delivery</th>
              </tr>
            </thead>
            <tbody>
              {riders.map((r) => {
                const p = computePayout(r, incentives);
                const perf = computeWeightedPerformance(riderHistory[r.id] ?? []);
                const score = Math.round(perf.overall * 100);
                return (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
                    <td className="px-4 py-2.5"><ScoreChip score={score} /></td>
                    <td className="px-4 py-2.5 text-slate-600">{r.successfulToday}/{r.completedToday}</td>
                    <td className="px-4 py-2.5 text-slate-600">₹{p.basePayout}</td>
                    <td className="px-4 py-2.5 text-slate-600">₹{p.performanceIncentive}</td>
                    <td className="px-4 py-2.5 text-slate-600">₹{p.routeIncentive}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">₹{p.totalModeledPayout}</td>
                    <td className="px-4 py-2.5 text-slate-500">₹{p.payoutPerCompletedDelivery}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-sm font-semibold text-slate-900">Case RTO-risk benchmarks by distance</h2>
          <Tag tone="purple">CASE DATA</Tag>
        </div>
        <p className="text-xs text-slate-400 mb-3">Reference only — not a payout or incentive band</p>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-500 text-xs">~2 km</div><div className="font-bold text-lg text-slate-900">15%</div></div>
          <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-500 text-xs">~5 km</div><div className="font-bold text-lg text-slate-900">17%</div></div>
          <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-500 text-xs">10 km+</div><div className="font-bold text-lg text-slate-900">22%</div></div>
        </div>
      </div>
    </div>
  );
}
function DataView() {
  const { riders, riderHistory } = useRiderEngine();
  return <RiderDataTable riders={riders} riderHistory={riderHistory} />;
}

function RiderEngineContent() {
  const [view, setView] = useState<ViewMode>("DC_OWNER");
  const { resetDemo, resetToken } = useRiderEngine();

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Rider Engine</h1>
            <p className="text-sm text-slate-500">Route-aware parcel allocation and rider economics for last-mile operations.</p>
            <span className="inline-block text-[11px] text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5 mt-2">Phase 1 — transparent rules, not ML</span>
          </div>
          <button onClick={resetDemo} className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 bg-white">Reset demo</button>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {(["DC_OWNER", "MAP", "VALMO_OPS", "DATA"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs font-medium px-4 py-1.5 rounded-md transition ${view === v ? "text-white" : "text-slate-500"}`}
              style={view === v ? { backgroundColor: "var(--meesho-purple)" } : {}}
            >
              {v === "DC_OWNER" ? "DC Owner" : v === "MAP" ? "Route Map" : v === "VALMO_OPS" ? "Valmo Ops" : "Rider Data"}
            </button>
          ))}
        </div>

        <div key={resetToken}>
          {view === "DC_OWNER" && <DcOwnerView />}
          {view === "MAP" && <MapView />}
          {view === "VALMO_OPS" && <ValmoOpsView />}
          {view === "DATA" && <DataView />}
        </div>
      </main>
    </div>
  );
}

export default function RiderEnginePage() {
  return <RiderProvider><RiderEngineContent /></RiderProvider>;
}