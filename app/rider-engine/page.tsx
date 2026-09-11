// app/rider-engine/page.tsx
"use client";
import { useMemo, useState } from "react";
import { Nav } from "@/components/nav";
import { MetricCard } from "@/components/metric-card";
import { useSettings } from "@/lib/settings-context";
import { generateRiderData } from "@/lib/synthetic-riders";
import { verifyAndPay } from "@/lib/rider-engine";
import { AddressDifficulty, VerificationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<VerificationStatus, string> = {
  verified: "Verified", flagged_review: "Flagged for review", fallback_photo: "Fallback photo required",
};
const STATUS_COLOR: Record<VerificationStatus, string> = {
  verified: "text-green-700 bg-green-50 border-green-200",
  flagged_review: "text-red-700 bg-red-50 border-red-200",
  fallback_photo: "text-amber-700 bg-amber-50 border-amber-200",
};

function RiderEngineContent() {
  const { settings } = useSettings();
  const { attempts, riders } = useMemo(() => generateRiderData(settings), [settings]);

  const verifiedRate = (attempts.filter((a) => a.status === "verified").length / attempts.length) * 100;
  const flaggedCount = attempts.filter((a) => a.status === "flagged_review").length;
  const avgPayout = attempts.reduce((s, a) => s + a.payout, 0) / attempts.length;
  const compliantShifts = riders.filter((r) => true).length; // placeholder — all riders shown are within policy by construction of cap check
  const fairCompliancePct = 100 - (attempts.filter((a) => a.fairAllocationNote).length / attempts.length) * 100;

  const [inGeofence, setInGeofence] = useState(true);
  const [deviceClean, setDeviceClean] = useState(true);
  const [distanceKm, setDistanceKm] = useState(5);
  const [difficulty, setDifficulty] = useState<AddressDifficulty>("easy");
  const [farStops, setFarStops] = useState(2);
  const simResult = verifyAndPay({ id: "sim", riderId: "sim", inGeofence, deviceClean, distanceKm, addressDifficulty: difficulty, farStopsThisShift: farStops }, settings);

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Rider Verification & Payout Engine</h1>
          <p className="text-sm text-slate-400">Fair allocation, attempt verification, and difficulty-weighted pay.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Verified attempt rate" value={`${verifiedRate.toFixed(0)}%`} accent="purple" />
          <MetricCard label="Flagged for review" value={flaggedCount.toString()} accent="red" />
          <MetricCard label="Avg. rider payout" value={`₹${avgPayout.toFixed(0)}`} accent="mango" />
          <MetricCard label="Fair-allocation compliance" value={`${fairCompliancePct.toFixed(0)}%`} accent={fairCompliancePct < 70 ? "red" : "purple"} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Live simulator</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input type="checkbox" checked={inGeofence} onChange={(e) => setInGeofence(e.target.checked)} /> GPS in geofence
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input type="checkbox" checked={deviceClean} onChange={(e) => setDeviceClean(e.target.checked)} /> Device integrity clean
              </label>
              <div>
                <label className="text-xs font-medium text-slate-600 flex justify-between"><span>Distance to stop</span><span>{distanceKm} km</span></label>
                <input type="range" min={0.5} max={15} step={0.5} value={distanceKm} onChange={(e) => setDistanceKm(+e.target.value)} className="w-full accent-[var(--meesho-purple)]" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Address difficulty</label>
                <div className="flex gap-2 mt-1">
                  {(["easy", "hard"] as AddressDifficulty[]).map((d) => (
                    <button key={d} onClick={() => setDifficulty(d)} className={`text-xs px-3 py-1.5 rounded-lg border ${difficulty === d ? "border-[var(--meesho-purple)] bg-[var(--meesho-purple-light)]" : "border-slate-200"}`}>{d}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 flex justify-between"><span>Far stops this shift</span><span>{farStops}</span></label>
                <input type="range" min={0} max={10} step={1} value={farStops} onChange={(e) => setFarStops(+e.target.value)} className="w-full accent-[var(--meesho-purple)]" />
              </div>
            </div>

            <div className={`mt-5 rounded-lg border p-4 ${STATUS_COLOR[simResult.status]}`}>
              <div className="text-sm font-bold">{STATUS_LABEL[simResult.status]}</div>
              {simResult.fairAllocationNote && <div className="text-xs mt-1">{simResult.fairAllocationNote}</div>}
              <div className="text-sm mt-3">Payout: <strong>₹{simResult.payout}</strong></div>
              <div className="text-xs mt-1 text-slate-500">
                base ₹{simResult.breakdown.base} + distance ₹{simResult.breakdown.distanceAddOn} + difficulty ₹{simResult.breakdown.difficultyWeight} + return bonus ₹{simResult.breakdown.returnBonus}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Verification logic</h2>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-2"><span className="font-bold text-slate-400">1</span> Over the far-stop cap this shift? → note, would rotate to next rider</li>
              <li className="flex gap-2"><span className="font-bold text-slate-400">2</span> GPS out of geofence AND device suspicious? → flagged for review</li>
              <li className="flex gap-2"><span className="font-bold text-slate-400">3</span> Only one check fails? → fallback photo evidence required</li>
              <li className="flex gap-2"><span className="font-bold text-slate-400">4</span> Both checks pass? → verified attempt</li>
              <li className="flex gap-2"><span className="font-bold text-slate-400">5</span> Payout = base + per-km beyond {settings.baseKmCovered}km + hard-address bonus + far-stop bonus</li>
            </ol>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-900">Riders today (demo data)</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="px-5 py-2">Rider</th><th className="px-5 py-2">Attempts</th><th className="px-5 py-2">Verified %</th>
                  <th className="px-5 py-2">Flagged</th><th className="px-5 py-2">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {riders.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="px-5 py-2 font-medium text-slate-700">{r.name}</td>
                    <td className="px-5 py-2">{r.attemptsToday}</td>
                    <td className="px-5 py-2">{(r.verifiedRate * 100).toFixed(0)}%</td>
                    <td className="px-5 py-2">{r.flaggedCount}</td>
                    <td className="px-5 py-2">₹{r.earningsToday.toFixed(0)}</td>
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

export default function RiderEnginePage() {
  return <RiderEngineContent />;
}