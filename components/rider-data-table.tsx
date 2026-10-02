// components/rider-data-table.tsx
"use client";
import { useState } from "react";
import { Rider } from "@/lib/rider-mock-data";
import { DailyRecord, computeWeightedPerformance } from "@/lib/rider-history";

interface Props {
  riders: Rider[];
  riderHistory: Record<string, DailyRecord[]>;
}

export function RiderDataTable({ riders, riderHistory }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Full rider dataset — 90-day recency-weighted summary</h2>
          <p className="text-xs text-slate-400 mt-0.5">SIMULATED — stands in for a real Valmo 90-day delivery log. Weighting: last 30 days 50%, days 31–60 at 30%, days 61–90 at 20%.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 uppercase border-b border-slate-100">
                <th className="px-4 py-2.5">Rider</th>
                <th className="px-4 py-2.5">Weighted success</th>
                <th className="px-4 py-2.5">COD success</th>
                <th className="px-4 py-2.5">Zone A</th>
                <th className="px-4 py-2.5">Zone B</th>
                <th className="px-4 py-2.5">Zone C</th>
                <th className="px-4 py-2.5">Zone D</th>
                <th className="px-4 py-2.5">~2 km band</th>
                <th className="px-4 py-2.5">~5 km band</th>
                <th className="px-4 py-2.5">10 km+ band</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {riders.map((r) => {
                const perf = computeWeightedPerformance(riderHistory[r.id] ?? []);
                return (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{r.name}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">{Math.round(perf.overall * 100)}%</td>
                    <td className="px-4 py-2.5 text-slate-600">{Math.round(perf.codRate * 100)}%</td>
                    <td className="px-4 py-2.5 text-slate-600">{Math.round(perf.byZone["Zone A"] * 100)}%</td>
                    <td className="px-4 py-2.5 text-slate-600">{Math.round(perf.byZone["Zone B"] * 100)}%</td>
                    <td className="px-4 py-2.5 text-slate-600">{Math.round(perf.byZone["Zone C"] * 100)}%</td>
                    <td className="px-4 py-2.5 text-slate-600">{Math.round(perf.byZone["Zone D"] * 100)}%</td>
                    <td className="px-4 py-2.5 text-slate-600">{Math.round(perf.byBand["~2 km"] * 100)}%</td>
                    <td className="px-4 py-2.5 text-slate-600">{Math.round(perf.byBand["~5 km"] * 100)}%</td>
                    <td className="px-4 py-2.5 text-slate-600">{Math.round(perf.byBand["10 km+"] * 100)}%</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="text-[var(--meesho-purple)] font-semibold hover:underline">
                        {expandedId === r.id ? "Hide log" : "View raw log"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {expandedId && (
        <RawLogView riderName={riders.find((r) => r.id === expandedId)?.name ?? expandedId} history={riderHistory[expandedId] ?? []} />
      )}
    </div>
  );
}

function RawLogView({ riderName, history }: { riderName: string; history: DailyRecord[] }) {
  const perf = computeWeightedPerformance(history);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{riderName} — period breakdown</h3>
      <p className="text-xs text-slate-400 mb-3">Each row is a 30-day bucket, used to compute the recency-weighted score above.</p>
      <table className="w-full text-xs mb-4">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-100">
            <th className="py-1.5">Period</th>
            <th className="py-1.5">Weight applied</th>
            <th className="py-1.5">Deliveries attempted</th>
            <th className="py-1.5">Delivered</th>
            <th className="py-1.5">Success rate</th>
          </tr>
        </thead>
        <tbody>
          {perf.periods.map((p) => (
            <tr key={p.label} className="border-b border-slate-50">
              <td className="py-1.5 font-medium text-slate-700">{p.label} <span className="text-slate-400">({p.days}d ago)</span></td>
              <td className="py-1.5 font-semibold text-slate-800">{Math.round(p.weight * 100)}%</td>
              <td className="py-1.5 text-slate-600">{p.attempted}</td>
              <td className="py-1.5 text-slate-600">{p.delivered}</td>
              <td className="py-1.5 font-semibold text-slate-800">{Math.round(p.successRate * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className="text-xs font-semibold text-slate-700 mb-2">Sample of individual delivery records (most recent 20 of {history.length} total)</h4>
      <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-lg">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="text-left text-slate-400">
              <th className="px-3 py-1.5">Days ago</th>
              <th className="px-3 py-1.5">Zone</th>
              <th className="px-3 py-1.5">Distance band</th>
              <th className="px-3 py-1.5">Payment</th>
              <th className="px-3 py-1.5">Delivered</th>
              <th className="px-3 py-1.5">On time</th>
            </tr>
          </thead>
          <tbody>
            {history
              .slice()
              .sort((a, b) => a.dayOffset - b.dayOffset)
              .slice(0, 20)
              .map((d, i) => (
                <tr key={i} className="border-t border-slate-50">
                  <td className="px-3 py-1">{d.dayOffset}</td>
                  <td className="px-3 py-1">{d.zone}</td>
                  <td className="px-3 py-1">{d.band}</td>
                  <td className="px-3 py-1">{d.codAttempted ? "COD" : "Prepaid"}</td>
                  <td className={`px-3 py-1 font-semibold ${d.delivered ? "text-green-600" : "text-red-600"}`}>{d.delivered ? "Yes" : "No"}</td>
                  <td className="px-3 py-1">{d.delivered ? (d.onTime ? "Yes" : "No") : "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-400 mt-2">SIMULATED 90-DAY LOG — {history.length} total delivery records for this rider</p>
    </div>
  );
}