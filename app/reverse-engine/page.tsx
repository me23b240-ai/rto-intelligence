// app/reverse-engine/page.tsx
"use client";
import { useMemo, useState } from "react";
import { Nav } from "@/components/nav";
import { MetricCard } from "@/components/metric-card";
import { useSettings } from "@/lib/settings-context";
import { generateParcels } from "@/lib/synthetic-parcels";
import { routeParcel } from "@/lib/reverse-engine";
import { DistanceBand, RoutePath } from "@/lib/types";

export const dynamic = "force-dynamic";

const PATH_LABEL: Record<RoutePath, string> = {
  backhaul: "Backhaul", batch: "Batch consolidation", liquidation: "Local liquidation",
  fast_secure: "Fast & secure return", standard: "Standard reverse",
};
const PATH_COLOR: Record<RoutePath, string> = {
  backhaul: "text-green-700 bg-green-50 border-green-200",
  batch: "text-blue-700 bg-blue-50 border-blue-200",
  liquidation: "text-amber-700 bg-amber-50 border-amber-200",
  fast_secure: "text-purple-700 bg-purple-50 border-purple-200",
  standard: "text-slate-600 bg-slate-100 border-slate-200",
};

function ReverseEngineContent() {
  const { settings } = useSettings();
  const parcels = useMemo(() => generateParcels(settings), [settings]);

  const totalSaved = parcels.reduce((s, p) => s + p.savings, 0);
  const avgCost = parcels.reduce((s, p) => s + p.cost, 0) / parcels.length;
  const batchBackhaulPct = (parcels.filter((p) => p.path === "batch" || p.path === "backhaul").length / parcels.length) * 100;

  // Live simulator state
  const [value, setValue] = useState(220);
  const [distanceBand, setDistanceBand] = useState<DistanceBand>("far");
  const [dense, setDense] = useState(false);
  const [backhaul, setBackhaul] = useState(false);
  const simResult = routeParcel({ id: "sim", value, distanceBand, denseLaneToday: dense, backhaulAvailable: backhaul }, settings);

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reverse Logistics Engine</h1>
          <p className="text-sm text-slate-400">Route each failed parcel to its cheapest responsible recovery path.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Parcels processed" value={parcels.length.toString()} accent="purple" />
          <MetricCard label="₹ saved vs. standard reverse" value={`₹${Math.round(totalSaved).toLocaleString("en-IN")}`} accent="mango" />
          <MetricCard label="Avg. cost per RTO" value={`₹${avgCost.toFixed(0)}`} accent="pink" />
          <MetricCard label="Batch/backhaul utilization" value={`${batchBackhaulPct.toFixed(0)}%`} accent="purple" />
        </div>

        {/* Simulator + rule ladder */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Live simulator</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 flex justify-between"><span>Order value</span><span>₹{value}</span></label>
                <input type="range" min={100} max={3000} step={50} value={value} onChange={(e) => setValue(+e.target.value)} className="w-full accent-[var(--meesho-purple)]" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Distance band</label>
                <div className="flex gap-2 mt-1">
                  {(["near", "mid", "far"] as DistanceBand[]).map((b) => (
                    <button key={b} onClick={() => setDistanceBand(b)}
                      className={`text-xs px-3 py-1.5 rounded-lg border ${distanceBand === b ? "border-[var(--meesho-purple)] bg-[var(--meesho-purple-light)]" : "border-slate-200"}`}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input type="checkbox" checked={dense} onChange={(e) => setDense(e.target.checked)} /> Dense lane today
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input type="checkbox" checked={backhaul} onChange={(e) => setBackhaul(e.target.checked)} /> Backhaul vehicle available
              </label>
            </div>

            <div className={`mt-5 rounded-lg border p-4 ${PATH_COLOR[simResult.path]}`}>
              <div className="text-sm font-bold">{PATH_LABEL[simResult.path]}</div>
              <div className="text-xs mt-1">{simResult.reasoning}</div>
              <div className="flex gap-4 mt-3 text-sm">
                <div>Cost: <strong>₹{simResult.cost}</strong></div>
                <div>Savings: <strong>₹{simResult.savings}</strong></div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Decision ladder</h2>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-2"><span className="font-bold text-slate-400">1</span> Backhaul available? → route via backhaul (₹{settings.backhaulCost})</li>
              <li className="flex gap-2"><span className="font-bold text-slate-400">2</span> Dense lane today? → batch consolidation (₹{settings.batchCost})</li>
              <li className="flex gap-2"><span className="font-bold text-slate-400">3</span> Value under ₹{settings.lowValueThreshold} and far distance? → local liquidation (₹{settings.liquidationCost})</li>
              <li className="flex gap-2"><span className="font-bold text-slate-400">4</span> Value over ₹{settings.highValueThreshold}? → fast & secure return (₹{settings.fastSecureCost})</li>
              <li className="flex gap-2"><span className="font-bold text-slate-400">5</span> Otherwise → standard reverse (₹{settings.standardReverseCost})</li>
            </ol>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-900">Recent parcels (demo data)</h2></div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="px-5 py-2">Parcel</th><th className="px-5 py-2">Value</th><th className="px-5 py-2">Distance</th>
                  <th className="px-5 py-2">Path</th><th className="px-5 py-2">Cost</th><th className="px-5 py-2">Savings</th>
                </tr>
              </thead>
              <tbody>
                {parcels.slice(0, 50).map((p) => (
                  <tr key={p.id} className="border-b border-slate-50">
                    <td className="px-5 py-2 font-medium text-slate-700">{p.id}</td>
                    <td className="px-5 py-2">₹{p.value}</td>
                    <td className="px-5 py-2 text-slate-500">{p.distanceBand}</td>
                    <td className="px-5 py-2"><span className={`text-xs px-2 py-0.5 rounded-full border ${PATH_COLOR[p.path]}`}>{PATH_LABEL[p.path]}</span></td>
                    <td className="px-5 py-2">₹{p.cost}</td>
                    <td className="px-5 py-2 text-green-700 font-medium">₹{p.savings}</td>
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

export default function ReverseEnginePage() {
  return <ReverseEngineContent />;
}