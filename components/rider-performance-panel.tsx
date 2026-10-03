// components/rider-performance-panel.tsx
"use client";
import { DailyRecord, computeWeightedPerformance } from "@/lib/rider-history";

export function RiderPerformancePanel({ history }: { history: DailyRecord[] }) {
  const perf = computeWeightedPerformance(history);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-700">90-day performance <span className="font-normal text-slate-400">(recency-weighted)</span></div>
        <span className="text-xs font-bold text-slate-900">{Math.round(perf.overall * 100)}% weighted success</span>
      </div>
      <table className="w-full text-[11px] text-slate-600">
        <thead>
          <tr className="text-left text-slate-400">
            <th className="font-medium py-1">Period</th>
            <th className="font-medium py-1">Weight</th>
            <th className="font-medium py-1">Deliveries attempted</th>
            <th className="font-medium py-1">Success rate</th>
          </tr>
        </thead>
        <tbody>
          {perf.periods.map((p) => (
            <tr key={p.label} className="border-t border-slate-50">
              <td className="py-1.5">{p.label} <span className="text-slate-400">({p.days}d)</span></td>
              <td className="py-1.5 font-semibold">{Math.round(p.weight * 100)}%</td>
              <td className="py-1.5">{p.attempted}</td>
              <td className="py-1.5">{Math.round(p.successRate * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
        <div className="rounded bg-slate-50 p-1.5"><div className="text-slate-400">COD success (weighted)</div><div className="font-semibold text-slate-800">{Math.round(perf.codRate * 100)}%</div></div>
        <div className="rounded bg-slate-50 p-1.5"><div className="text-slate-400">Metrics tracked</div><div className="font-semibold text-slate-800">zone, distance band, COD, on-time</div></div>
      </div>
      <p className="text-[10px] text-slate-400 mt-2">SIMULATED 90-DAY LOG - stands in for a real Valmo delivery history</p>
    </div>
  );
}