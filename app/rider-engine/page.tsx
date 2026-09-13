// app/rider-engine/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/nav";
import { MetricCard } from "@/components/metric-card";
import { useSettings } from "@/lib/settings-context";
import { useOperations } from "@/lib/operations-context";
import { useSharedAttempt } from "@/lib/shared-attempt-context";
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

function ConfidenceMeter({ value }: { value: number }) {
  const pct = value * 100;
  const color = pct >= 75 ? "#026127" : pct >= 40 ? "#e28600" : "#cd1701";
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Confidence</span><span>{pct.toFixed(0)}%</span></div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} /></div>
    </div>
  );
}

function RiderEngineContent() {
  const { settings } = useSettings();
  const { roster, allocateFarStop, resetRoster, addDecision } = useOperations();
  const { setLastFlaggedAttempt } = useSharedAttempt();
  const { attempts, riders } = useMemo(() => generateRiderData(settings), [settings]);

  const verifiedRate = (attempts.filter((a) => a.status === "verified").length / attempts.length) * 100;
  const flaggedCount = attempts.filter((a) => a.status === "flagged_review").length;
  const avgPayout = attempts.reduce((s, a) => s + a.payout, 0) / attempts.length;
  const fairCompliancePct = 100 - (attempts.filter((a) => a.fairAllocationNote).length / attempts.length) * 100;

  const [inGeofence, setInGeofence] = useState(true);
  const [deviceClean, setDeviceClean] = useState(true);
  const [distanceKm, setDistanceKm] = useState(5);
  const [difficulty, setDifficulty] = useState<AddressDifficulty>("easy");
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [farStops, setFarStops] = useState(2);
  const [lastAllocation, setLastAllocation] = useState<{ riderId: string; rotated: boolean } | null>(null);
  const [justLogged, setJustLogged] = useState(false);

  const simResult = verifyAndPay(
    { id: "sim", riderId: lastAllocation?.riderId ?? "sim", inGeofence, deviceClean, distanceKm, addressDifficulty: difficulty, farStopsThisShift: farStops, attemptNumber },
    settings
  );

  useEffect(() => {
    if (simResult.status !== "verified") {
      setLastFlaggedAttempt({
        id: "sim-live", riderId: lastAllocation?.riderId ?? "sim", inGeofence, deviceClean, distanceKm,
        addressDifficulty: difficulty, farStopsThisShift: farStops, attemptNumber, ...simResult,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simResult.status, distanceKm, difficulty, farStops, inGeofence, deviceClean, attemptNumber]);

  function autoAllocate() {
    const result = allocateFarStop(settings.farStopCap);
    setLastAllocation(result);
    setFarStops(roster.find((r) => r.id === result.riderId)?.farStopsToday ?? farStops);
  }

  function processAttempt() {
    addDecision({
      engine: "rider",
      summary: `${STATUS_LABEL[simResult.status]} — ${distanceKm}km, ${difficulty} address, attempt #${attemptNumber}`,
      detail: `Confidence ${(simResult.confidence * 100).toFixed(0)}%. Payout ₹${simResult.payout}.`,
      cost: simResult.payout,
    });
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Rider Verification & Payout Engine</h1>
          <p className="text-sm text-slate-400">Fair allocation, attempt verification, and difficulty-weighted pay.</p>
          <span className="inline-block text-[11px] text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5 mt-2">Phase 1 — transparent rules, not ML</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Verified attempt rate" value={`${verifiedRate.toFixed(0)}%`} accent="purple" />
          <MetricCard label="Flagged for review" value={flaggedCount.toString()} accent="red" />
          <MetricCard label="Avg. rider payout" value={`₹${avgPayout.toFixed(0)}`} accent="mango" />
          <MetricCard label="Fair-allocation compliance" value={`${fairCompliancePct.toFixed(0)}%`} accent={fairCompliancePct < 70 ? "red" : "purple"} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Today's rider roster (shared allocation)</h2>
            <button onClick={resetRoster} className="text-xs text-slate-400 hover:text-slate-600">Reset day</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {roster.map((r) => (
              <div key={r.id} className={`rounded-lg border p-3 ${lastAllocation?.riderId === r.id ? "border-[var(--meesho-purple)] bg-[var(--meesho-purple-light)]" : "border-slate-100 bg-slate-50"}`}>
                <div className="text-xs font-medium text-slate-700">{r.name}</div>
                <div className="text-lg font-bold text-slate-900">{r.farStopsToday}</div>
                <div className="text-[10px] text-slate-400">far stops / cap {settings.farStopCap}</div>
              </div>
            ))}
          </div>
          {lastAllocation?.rotated && (
            <p className="text-xs text-red-600 mt-3">⚠ Every rider was at or over the cap — this stop was force-assigned anyway.</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Live simulator</h2>
            <div className="space-y-4">
              <button onClick={autoAllocate} className="text-xs font-medium text-white px-3 py-1.5 rounded-lg" style={{ backgroundColor: "var(--meesho-purple)" }}>
                Auto-assign next stop from roster
              </button>
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
                <label className="text-xs font-medium text-slate-600">Attempt number</label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3].map((n) => (
                    <button key={n} onClick={() => setAttemptNumber(n)} className={`text-xs px-3 py-1.5 rounded-lg border ${attemptNumber === n ? "border-[var(--meesho-purple)] bg-[var(--meesho-purple-light)]" : "border-slate-200"}`}>#{n}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className={`mt-5 rounded-lg border p-4 ${STATUS_COLOR[simResult.status]}`}>
              <div className="text-sm font-bold">{STATUS_LABEL[simResult.status]}</div>
              {simResult.fairAllocationNote && <div className="text-xs mt-1">{simResult.fairAllocationNote}</div>}
              <div className="mt-2"><ConfidenceMeter value={simResult.confidence} /></div>
              <div className="text-sm mt-3">Payout: <strong>₹{simResult.payout}</strong></div>
              <div className="text-xs mt-1 text-slate-500">
                base ₹{simResult.breakdown.base} + distance ₹{simResult.breakdown.distanceAddOn} + difficulty ₹{simResult.breakdown.difficultyWeight} + return ₹{simResult.breakdown.returnBonus} + reattempt ₹{simResult.breakdown.reattemptBonus}
              </div>
            </div>

            <button
              onClick={processAttempt}
              className="w-full mt-3 text-sm font-semibold text-white py-2.5 rounded-lg transition"
              style={{ backgroundColor: justLogged ? "#026127" : "var(--meesho-orange)" }}
            >
              {justLogged ? "✓ Logged to Decision Log" : "Log this attempt"}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Verification logic</h2>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-2"><span className="font-bold text-slate-400">1</span> Confidence = 0.5 base ± geofence ± device signal</li>
              <li className="flex gap-2"><span className="font-bold text-slate-400">2</span> Confidence ≥ 75%? → verified</li>
              <li className="flex gap-2"><span className="font-bold text-slate-400">3</span> 40–75%? → fallback photo required</li>
              <li className="flex gap-2"><span className="font-bold text-slate-400">4</span> Below 40%? → flagged for review</li>
              <li className="flex gap-2"><span className="font-bold text-slate-400">5</span> Payout = base + per-km + hard-address + far-stop + reattempt (₹{settings.reattemptBonus} from attempt #2 onward)</li>
            </ol>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-900">Riders today (demo data)</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="px-5 py-2">Rider</th><th className="px-5 py-2">Attempts</th><th className="px-5 py-2">Verified %</th><th className="px-5 py-2">Flagged</th><th className="px-5 py-2">Earnings</th>
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