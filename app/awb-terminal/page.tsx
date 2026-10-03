// app/awb-terminal/page.tsx
"use client";
import { useRef, useState } from "react";
import { Nav } from "@/components/nav";
import { EvidenceTagBadge } from "@/components/evidence-tag";
import { AwbProvider, useAwb, type AwbDecisionRecord, type AwbOutcome } from "@/lib/awb-context";
import { lookupAwb, AWB_DEMO_CASES, AWB_MOVEMENTS, AWB_DEMO_NOW_MIN, AWB_DC_NAME, type AwbParcel } from "@/lib/awb-mock-db";
import { evaluate, fmtTime, REASON_LABEL, AWB_DEFAULT_SETTINGS, AWB_DEFAULT_CTX, type AwbEvalCtx, type AwbEvaluation, type AwbDecision } from "@/lib/awb-engine";

export const dynamic = "force-dynamic";

const BADGE: Record<AwbDecision, string> = {
  REATTEMPT: "bg-green-50 text-green-700 border-green-200",
  RETURN: "bg-red-50 text-red-700 border-red-200",
  HOLD: "bg-amber-50 text-amber-700 border-amber-200",
  REDIRECT: "bg-blue-50 text-blue-700 border-blue-200",
  MANUAL_REVIEW: "bg-purple-50 text-purple-700 border-purple-200",
};
const STYLE: Record<AwbDecision, { box: string; chip: string; emoji: string; word: string; confirm: string }> = {
  REATTEMPT: { box: "border-green-300 bg-green-50", chip: "bg-green-600", emoji: "🟢", word: "REATTEMPT", confirm: "Confirm - parcel batched for reattempt" },
  RETURN: { box: "border-red-300 bg-red-50", chip: "bg-red-600", emoji: "🔴", word: "RETURN", confirm: "Confirm - parcel loaded for return" },
  HOLD: { box: "border-amber-300 bg-amber-50", chip: "bg-amber-500", emoji: "🟡", word: "HOLD", confirm: "Confirm - parcel shelved on hold" },
  REDIRECT: { box: "border-blue-300 bg-blue-50", chip: "bg-blue-600", emoji: "🔵", word: "REDIRECT", confirm: "Confirm - parcel loaded for transfer" },
  MANUAL_REVIEW: { box: "border-purple-300 bg-purple-50", chip: "bg-[var(--meesho-purple)]", emoji: "⚠️", word: "MANUAL REVIEW", confirm: "Confirm - sent to supervisor review" },
};
const OUTCOME_TEXT: Record<AwbOutcome, string> = {
  pending: "In progress", delivered: "Delivered", failed_again: "Failed again",
  returned: "Returned to seller", redirected: "Redirected", reviewed: "Reviewed", re_evaluated: "Re-evaluated",
};
const rs = (n: number) => `${n < 0 ? "−" : ""}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;

function makeRecord(parcel: AwbParcel, ev: AwbEvaluation, nowMin: number, ctx: AwbEvalCtx): AwbDecisionRecord {
  return {
    id: `${parcel.awb}-${Date.now()}`, awb: parcel.awb, createdAt: Date.now(), nowMin, ctx, parcel,
    evaluation: ev, confirmed: false, operator: "", stage: -1, outcome: "pending",
    timeline: [{ at: Date.now(), label: `Decision issued: ${ev.decision.replace("_", " ")}` }],
  };
}

function AwbTerminalContent() {
  const { records, fills, addRecord, removeRecord, confirmRecord, advanceRecord, clearRecords } = useAwb();
  const [input, setInput] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const settings = AWB_DEFAULT_SETTINGS;

  const active = records.find((r) => r.id === activeId) ?? null;

  function checkParcel(raw: string) {
    const awb = raw.trim().toUpperCase();
    setError(null);
    const parcel = lookupAwb(awb);
    if (!parcel) { setError("AWB not found. Enter a valid AWB / Tracking ID (6–20 letters or digits)."); setActiveId(null); return; }

    const latest = records.find((r) => r.awb === awb);
    let source: AwbParcel = parcel;
    let ctx: AwbEvalCtx = AWB_DEFAULT_CTX;
    let nowMin = AWB_DEMO_NOW_MIN;

    if (latest) {
      if (!latest.confirmed) { removeRecord(latest.id); source = latest.parcel; ctx = latest.ctx; nowMin = latest.nowMin; }
      else if (latest.outcome === "failed_again") {
        source = { ...latest.parcel, attemptsLogged: latest.parcel.attemptsLogged + 1, attemptsVerified: latest.parcel.attemptsVerified + 1, status: "RTO / Delivery failed (reattempt failed)" };
      } else { setActiveId(latest.id); return; }
    }

    const ev = evaluate(source, AWB_MOVEMENTS, fills, settings, nowMin, ctx);
    const rec = makeRecord(source, ev, nowMin, ctx);
    addRecord(rec);
    setActiveId(rec.id);
  }

  function confirm() { if (!active) return; confirmRecord(active.id, "DC Operator"); setInput(""); inputRef.current?.focus(); }

  function advance(rec: AwbDecisionRecord, outcome?: "delivered" | "failed_again") {
    const willFinish = rec.stage + 1 === rec.evaluation.lifecycle.length - 1;
    advanceRecord(rec.id, outcome);
    if (rec.evaluation.decision === "HOLD" && willFinish) {
      const ctx: AwbEvalCtx = { holdsServed: rec.ctx.holdsServed + 1, addressConfirmed: rec.ctx.addressConfirmed || rec.evaluation.holdKind === "address" };
      const nowMin = rec.evaluation.holdUntilMin ?? rec.nowMin;
      const ev = evaluate(rec.parcel, AWB_MOVEMENTS, fills, settings, nowMin, ctx);
      const next = makeRecord(rec.parcel, ev, nowMin, ctx);
      addRecord(next);
      setActiveId(next.id);
    }
  }

  const executed = records.filter((r) => r.confirmed);
  const savingsTotal = executed.reduce((sum, r) => sum + (r.evaluation.savings ?? 0), 0);
  const reattemptsClosed = records.filter((r) => r.evaluation.decision === "REATTEMPT" && (r.outcome === "delivered" || r.outcome === "failed_again"));
  const reattemptsDelivered = reattemptsClosed.filter((r) => r.outcome === "delivered").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">AWB Decision Terminal</h1>
          <p className="text-sm text-slate-500">Enter AWB. Get the decision. Execute.</p>
          <div className="flex gap-2 flex-wrap mt-2">
            <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">Phase 1 - transparent rules, not ML</span>
            <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">Simulated parcel lookup</span>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); checkParcel(input); }} className="rounded-xl border border-slate-200 bg-white p-4">
          <label htmlFor="awb" className="text-xs font-medium text-slate-600">AWB / Tracking ID</label>
          <div className="mt-1 flex gap-2">
            <input id="awb" ref={inputRef} autoFocus value={input} onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="Scan or type an AWB, e.g. VL0084429601"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-mono text-base outline-none focus:border-[var(--meesho-purple)] focus:ring-1 focus:ring-[var(--meesho-purple)]" />
            <button type="submit" className="rounded-lg px-6 py-3 text-sm font-semibold text-white" style={{ backgroundColor: "var(--meesho-purple)" }}>Check parcel</button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">Demo AWBs (any other valid AWB also works)</div>
            <div className="flex flex-wrap gap-1.5">
              {AWB_DEMO_CASES.map((d, i) => (
                <button key={d.parcel.awb} type="button" onClick={() => { setInput(d.parcel.awb); checkParcel(d.parcel.awb); }}
                  className="text-[11px] rounded-lg border border-slate-200 px-2 py-1 text-slate-600 hover:border-[var(--meesho-purple)] hover:bg-[var(--meesho-purple-light)]">
                  {i + 1} · {d.label}
                </button>
              ))}
            </div>
          </div>
        </form>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Decisions executed</div>
            <div className="text-xl font-bold text-slate-900">{executed.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Est. savings vs. default RTO handling</div>
            <div className="text-xl font-bold text-slate-900">₹{Math.round(savingsTotal).toLocaleString("en-IN")}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Reattempts delivered</div>
            <div className="text-xl font-bold text-slate-900">{reattemptsClosed.length ? `${reattemptsDelivered}/${reattemptsClosed.length}` : "-"}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            {active ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div><span className="text-xs text-slate-400 mr-2">AWB</span><span className="font-mono text-base font-bold text-slate-900">{active.parcel.awb}</span></div>
                    <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">Simulated lookup - auto-populated</span>
                  </div>
                  <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                    {[
                      ["Current status", active.parcel.status],
                      ["Attempts", `${active.parcel.attemptsLogged} logged · ${active.parcel.attemptsVerified} verified`],
                      ["Failure reason", active.parcel.failureReason ? REASON_LABEL[active.parcel.failureReason] : "Missing"],
                      ["Order value", `₹${active.parcel.orderValue}`],
                      ["Payment", active.parcel.payment],
                      ["Customer history", active.parcel.prevOrders ? `${active.parcel.prevDelivered}/${active.parcel.prevOrders} delivered` : "New customer"],
                      ["Address confidence", active.parcel.addressConfidence ? active.parcel.addressConfidence.charAt(0).toUpperCase() + active.parcel.addressConfidence.slice(1) : "Unavailable"],
                      ["Parcel age", `${active.parcel.parcelAgeHours} h`],
                      ["Current DC", active.parcel.currentDc],
                      ["Return destination", active.parcel.returnDestination ?? "Unavailable"],
                      ["Seller · SLA", `${active.parcel.seller} · ${active.parcel.slaHoursLeft} h left`],
                    ].map(([k, v]) => (
                      <div key={k}><dt className="text-[10px] uppercase tracking-wide text-slate-400">{k}</dt><dd className="text-sm text-slate-800">{v}</dd></div>
                    ))}
                  </dl>
                </div>

                <div className={`rounded-xl border-2 p-5 ${STYLE[active.evaluation.decision].box}`}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-white text-sm font-bold rounded-lg px-3 py-1.5 ${STYLE[active.evaluation.decision].chip}`}>{STYLE[active.evaluation.decision].emoji} {STYLE[active.evaluation.decision].word}</span>
                      <span className="text-xs text-slate-600">Decision confidence: <strong>{active.evaluation.confidence.toUpperCase()}</strong> · Recovery likelihood: <strong>{active.evaluation.recoveryLikelihood}</strong></span>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">Execute by</div>
                      <div className="text-base font-bold text-slate-900">{active.evaluation.executeByMin === null ? "Do now" : fmtTime(active.evaluation.executeByMin)}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-[10px] uppercase tracking-wide text-slate-500">Do this</div>
                  <div className="text-lg font-bold text-slate-900">{active.evaluation.headline}</div>
                  <dl className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                    {active.evaluation.details.map((d) => (
                      <div key={d.label} className="flex gap-2 text-sm"><dt className="text-slate-500 shrink-0">{d.label}:</dt><dd className="text-slate-900 font-medium">{d.value}</dd></div>
                    ))}
                  </dl>
                  {active.evaluation.doNot && <p className="mt-3 text-sm font-semibold text-red-700">{active.evaluation.doNot}</p>}
                  {active.evaluation.savings !== null && (
                    <div className="mt-4 pt-3 border-t border-black/10">
                      <div className="text-sm text-slate-800">Estimated savings vs. default RTO handling: <strong>{rs(active.evaluation.savings)}</strong></div>
                      <div className="text-[11px] text-slate-500">Based on current prototype assumptions.</div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Why</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">{active.evaluation.why.map((w) => <li key={w}>{w}</li>)}</ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">What happens next</h3>
                  <ol>
                    {active.evaluation.flow.map((f, i) => (
                      <li key={f.title}>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="text-[10px] uppercase tracking-wide text-slate-400">{f.title}</div>
                          <div className="text-sm text-slate-800">{f.sub}</div>
                        </div>
                        {i < active.evaluation.flow.length - 1 && <div className="text-center text-slate-300 leading-none py-0.5">↓</div>}
                      </li>
                    ))}
                  </ol>
                </div>

                {!active.confirmed ? (
                  <button onClick={confirm} className="w-full text-sm font-semibold text-white py-3 rounded-xl" style={{ backgroundColor: "var(--meesho-orange)" }}>
                    {STYLE[active.evaluation.decision].confirm}
                  </button>
                ) : (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="text-sm font-semibold text-green-800">✓ Action confirmed - AWB state updated</div>
                    <ol className="mt-3 space-y-1.5">
                      {active.timeline.map((e, i) => (
                        <li key={i} className="flex gap-2 text-xs text-slate-700">
                          <span className="text-slate-400 shrink-0">{new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          <span>{e.label}</span>
                        </li>
                      ))}
                    </ol>
                    {active.stage < active.evaluation.lifecycle.length - 1 && !(active.evaluation.decision === "REATTEMPT" && active.stage === active.evaluation.lifecycle.length - 2) && (
                      <button onClick={() => advance(active)} className="mt-3 text-xs font-medium text-white px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--meesho-purple)" }}>
                        Simulate next event → {active.evaluation.lifecycle[active.stage + 1]}
                      </button>
                    )}
                    {active.evaluation.decision === "REATTEMPT" && active.stage === active.evaluation.lifecycle.length - 2 && (
                      <div className="mt-3 flex gap-2 flex-wrap">
                        <button onClick={() => advance(active, "delivered")} className="text-xs font-medium text-white px-3 py-2 rounded-lg bg-green-600">Record: Delivered ✓</button>
                        <button onClick={() => advance(active, "failed_again")} className="text-xs font-medium text-white px-3 py-2 rounded-lg bg-red-600">Record: Failed again ✗</button>
                      </div>
                    )}
                    {active.stage >= active.evaluation.lifecycle.length - 1 && (
                      <div className="mt-3 text-xs text-slate-600">Outcome recorded: <strong>{OUTCOME_TEXT[active.outcome]}</strong> - stored for later recalibration.</div>
                    )}
                  </div>
                )}

                <details className="rounded-xl border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-900">Why did the system choose this?</summary>
                  <div className="mt-3 grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Key factors</div>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">{active.evaluation.factors.map((f) => <li key={f}>{f}</li>)}</ul>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Options compared</div>
                      {active.evaluation.options.length === 0 ? <p className="text-sm text-slate-500">No automatic option was valid.</p> : (
                        <ul className="space-y-1">
                          {active.evaluation.options.map((o) => (
                            <li key={o.label} className={`flex justify-between text-sm rounded px-2 py-1 ${o.chosen ? "bg-slate-100 font-semibold" : ""}`}>
                              <span>{o.label}{o.chosen ? " ✓" : ""}</span><span>{rs(o.cost)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="text-xs text-slate-500 mt-3">Likelihood and cost inputs are prototype assumptions <EvidenceTagBadge tag="hypothesis" /></p>
                    </div>
                  </div>
                </details>
                <details className="rounded-xl border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-900">View underlying data</summary>
                  <div className="mt-3 grid md:grid-cols-2 gap-6 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Raw parcel record (simulated lookup)</div>
                      <pre className="bg-slate-50 rounded-lg p-3 overflow-x-auto text-[10.5px] leading-relaxed text-slate-700"> 
                      {JSON.stringify(active.parcel, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Movements considered today</div>
                      <div className="space-y-1 max-h-72 overflow-y-auto">
                        {AWB_MOVEMENTS.map((m) => {
                          const used = m.baseFill + (fills[m.id] ?? 0);
                          return (
                            <div key={m.id} className="flex justify-between border-b border-slate-50 pb-1">
                              <span className="font-mono text-slate-700">{m.id}</span>
                              <span className="text-slate-500">{m.destination} · {fmtTime(m.departureMin)} · {used}/{m.capacity}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-400 mt-3 mb-1">Settings used for this decision</div>
                      <div className="space-y-0.5">
                        {Object.entries(settings).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-slate-600"><span>{k}</span><span className="font-medium">{String(v)}</span></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
                Enter an AWB above. The system looks up the parcel, decides, and tells you exactly what to do.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Today&apos;s movements</h2>
              <button onClick={clearRecords} className="text-xs text-slate-400 hover:text-slate-600">Reset demo</button>
            </div>
            <p className="text-xs text-slate-400 mb-3">{AWB_DC_NAME} · demo clock {fmtTime(AWB_DEMO_NOW_MIN)} (simulated)</p>
            <div className="space-y-4">
              {(["delivery", "return", "transfer"] as const).map((kind) => (
                <div key={kind}>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">{kind === "delivery" ? "Delivery batches" : kind === "return" ? "Return movements" : "Transfers"}</div>
                  <div className="space-y-2">
                    {AWB_MOVEMENTS.filter((m) => m.kind === kind).sort((a, b) => a.departureMin - b.departureMin).map((m) => {
                      const used = m.baseFill + (fills[m.id] ?? 0);
                      const pct = Math.min(100, (used / m.capacity) * 100);
                      const full = used >= m.capacity;
                      const isActive = active?.evaluation.target?.movementId === m.id;
                      return (
                        <div key={m.id} className={`rounded-lg border p-2 ${isActive ? "border-[var(--meesho-purple)] bg-[var(--meesho-purple-light)]" : "border-slate-100"}`}>
                          <div className="flex justify-between text-xs"><span className="font-semibold text-slate-800">{m.id}{m.priority ? " · priority" : ""}</span><span className="text-slate-500">{fmtTime(m.departureMin)}</span></div>
                          <div className="text-[11px] text-slate-500">{kind === "delivery" ? m.label : `→ ${m.destination}`}{m.publishedAtMin > AWB_DEMO_NOW_MIN && ` · opens ${fmtTime(m.publishedAtMin)}`}</div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: full ? "#cd1701" : "var(--meesho-purple)" }} /></div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{used}/{m.capacity}{full ? " · FULL" : ""}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-900">Recent decisions</h2></div>
          {records.length === 0 ? <div className="p-6 text-sm text-slate-400">No decisions yet.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100"><th className="px-5 py-2">AWB</th><th className="px-5 py-2">Decision</th><th className="px-5 py-2">Execution</th><th className="px-5 py-2">Status</th></tr></thead>
                <tbody>
                  {records.slice(0, 15).map((r) => (
                    <tr key={r.id} onClick={() => setActiveId(r.id)} className={`border-b border-slate-50 cursor-pointer hover:bg-slate-50 ${r.id === activeId ? "bg-[var(--meesho-purple-light)]" : ""}`}>
                      <td className="px-5 py-2 font-mono text-slate-700">{r.awb}</td>
                      <td className="px-5 py-2"><span className={`text-xs px-2 py-0.5 rounded-full border ${BADGE[r.evaluation.decision]}`}>{r.evaluation.decision.replace("_", " ")}</span></td>
                      <td className="px-5 py-2 text-slate-600">{r.evaluation.execution}</td>
                      <td className="px-5 py-2 text-slate-500">{!r.confirmed ? "Awaiting execution" : r.outcome !== "pending" ? OUTCOME_TEXT[r.outcome] : r.evaluation.lifecycle[r.stage]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AwbTerminalPage() {
  return <AwbProvider><AwbTerminalContent /></AwbProvider>;
}