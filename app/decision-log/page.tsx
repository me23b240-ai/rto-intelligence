// app/decision-log/page.tsx
"use client";
import { Nav } from "@/components/nav";
import { useOperations } from "@/lib/operations-context";
import { OutcomeStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const OUTCOME_COLOR: Record<OutcomeStatus, string> = {
  pending: "text-slate-500 bg-slate-100 border-slate-200",
  success: "text-green-700 bg-green-50 border-green-200",
  failure: "text-red-700 bg-red-50 border-red-200",
};

export default function DecisionLogPage() {
  const { decisionLog, recordOutcome, clearLog } = useOperations();

  const resolved = decisionLog.filter((d) => d.outcome !== "pending");
  const successRate = resolved.length ? (resolved.filter((d) => d.outcome === "success").length / resolved.length) * 100 : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Decision Log</h1>
            <p className="text-sm text-slate-400">Every decision you process on either engine lands here - record what actually happened to close the loop.</p>
          </div>
          {decisionLog.length > 0 && (
            <button onClick={clearLog} className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5">Clear log</button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-400">Total decisions logged</div>
            <div className="text-2xl font-bold text-slate-900">{decisionLog.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-400">Awaiting outcome</div>
            <div className="text-2xl font-bold text-slate-900">{decisionLog.filter((d) => d.outcome === "pending").length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-400">Success rate (resolved)</div>
            <div className="text-2xl font-bold text-slate-900">{successRate === null ? "-" : `${successRate.toFixed(0)}%`}</div>
          </div>
        </div>

        {decisionLog.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            Nothing here yet - go to the Reverse Logistics or Rider Verification engine, run the simulator, and click "Process" or "Log this attempt".
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {decisionLog.map((d) => (
              <div key={d.id} className="p-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase text-slate-400">{d.engine === "reverse" ? "Reverse Logistics" : "Rider Verification"}</span>
                    <span className="text-[10px] text-slate-300">{new Date(d.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-800 mt-0.5">{d.summary}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{d.detail}</div>
                  <div className="text-xs text-slate-400 mt-1">₹{d.cost}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full border ${OUTCOME_COLOR[d.outcome]}`}>{d.outcome}</span>
                  {d.outcome === "pending" && (
                    <div className="flex gap-1">
                      <button onClick={() => recordOutcome(d.id, "success")} className="text-xs px-2 py-1 rounded-lg border border-green-200 text-green-700 hover:bg-green-50">Mark success</button>
                      <button onClick={() => recordOutcome(d.id, "failure")} className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50">Mark failure</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}