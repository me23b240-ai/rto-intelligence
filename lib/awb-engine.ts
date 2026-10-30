// lib/awb-engine.ts
import type { AwbParcel, AwbMovement, AwbFailureReason } from "./awb-mock-db";

export type AwbLevel = "High" | "Medium" | "Low";
export type AwbDecision = "REATTEMPT" | "HOLD" | "REDIRECT" | "RETURN" | "MANUAL_REVIEW";
export type AwbReturnMethod = "consolidate" | "priority" | "standard";

export interface AwbEvalCtx { holdsServed: number; addressConfirmed: boolean }
export const AWB_DEFAULT_CTX: AwbEvalCtx = { holdsServed: 0, addressConfirmed: false };

export interface AwbTarget { movementId: string; label: string; departureMin: number; destination: string; used?: number; capacity?: number }
export interface AwbFlowStep { title: string; sub: string }
export interface AwbOptionCost { label: string; cost: number; chosen: boolean }

export interface AwbEvaluation {
  decision: AwbDecision;
  method?: AwbReturnMethod;
  headline: string;
  execution: string;
  details: { label: string; value: string }[];
  doNot?: string;
  executeByMin: number | null;
  holdUntilMin?: number;
  holdKind?: "address" | "movement";
  reevaluationTrigger?: string;
  target?: AwbTarget;
  why: string[];
  factors: string[];
  recoveryLikelihood: AwbLevel;
  confidence: AwbLevel;
  manualReviewReason?: string;
  flow: AwbFlowStep[];
  lifecycle: string[];
  options: AwbOptionCost[];
  logisticsCost: number | null;
  savings: number | null;
  recoveredValue: number | null;
  successProbability: number;
}

export interface AwbSettings {
  forwardCost: number; standardReverseCost: number; reattemptCost: number;
  consolidatedReturnCost: number; priorityReturnCost: number; redirectCost: number;
  recoverableValueFlat: number; recoverableValuePct: number;
  pHigh: number; pMedium: number; pLow: number; pAfterAddressFix: number;
  holdCostPerHour: number; holdMinSaving: number; addressConfirmCost: number;
  addressHoldHours: number; maxHoldHours: number;
  cutoffBufferMin: number; priorityValueThreshold: number; slaTightHours: number;
  highConfidenceMargin: number; manualReviewMargin: number;
  lowValueThreshold: number; handlingQcCost: number; storagePerDay: number; baseDwellDays: number;
  consolidatedCostFactor: number; consolidationExtraDwellDays: number; liquidationExtraDwellDays: number;
  liquidationRecoveryRate: number; liquidationMovementCost: number; liquidationLeadHours: number;
}

export const AWB_DEFAULT_SETTINGS: AwbSettings = {
  forwardCost: 50, standardReverseCost: 120, reattemptCost: 21,
  consolidatedReturnCost: 40, priorityReturnCost: 90, redirectCost: 25,
  recoverableValueFlat: 60, recoverableValuePct: 8,
  pHigh: 70, pMedium: 40, pLow: 12, pAfterAddressFix: 55,
  holdCostPerHour: 1.5, holdMinSaving: 10, addressConfirmCost: 3,
  addressHoldHours: 2, maxHoldHours: 12,
  cutoffBufferMin: 60, priorityValueThreshold: 1500, slaTightHours: 6,
  highConfidenceMargin: 25, manualReviewMargin: 6,
  lowValueThreshold: 300, handlingQcCost: 8, storagePerDay: 1.5, baseDwellDays: 3,
  consolidatedCostFactor: 0.6, consolidationExtraDwellDays: 2, liquidationExtraDwellDays: 4,
  liquidationRecoveryRate: 0.35, liquidationMovementCost: 25, liquidationLeadHours: 24,
};

type ReturnPick = { method: AwbReturnMethod; cost: number; target: AwbTarget };

export function fmtTime(min: number): string {
  const day = Math.floor(min / 1440);
  const m = ((min % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = String(Math.round(m % 60)).padStart(2, "0");
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 || 12;
  return `${h}:${mm} ${ampm}${day >= 1 ? " tomorrow" : ""}`;
}

export const REASON_TEXT: Record<AwbFailureReason, string> = {
  customer_unavailable: "Customer was unavailable at the attempt",
  address_issue: "Delivery failed because of an address or location problem",
  cod_refused: "Customer refused to pay COD",
  customer_cancelled: "Customer cancelled at the door",
  wrong_hub: "Parcel was routed to the wrong hub",
  unknown: "Failure reason not recorded",
};
export const REASON_LABEL: Record<AwbFailureReason, string> = {
  customer_unavailable: "Customer unavailable", address_issue: "Address issue",
  cod_refused: "COD refused", customer_cancelled: "Customer cancelled",
  wrong_hub: "Wrong hub", unknown: "Unknown",
};

function recoveryScore(p: AwbParcel, addressConfirmed: boolean): number {
  const reasonAdj: Record<AwbFailureReason, number> = {
    customer_unavailable: 20, address_issue: -5, cod_refused: -35,
    customer_cancelled: -45, wrong_hub: 25, unknown: -5,
  };
  let score = 50 + reasonAdj[p.failureReason ?? "unknown"];
  if (p.prevOrders >= 2) score += (p.prevDelivered / p.prevOrders - 0.5) * 40;
  if (p.prevRefused >= 2) score -= 20;
  const addr = addressConfirmed ? "high" : p.addressConfidence ?? "medium";
  score += addr === "high" ? 8 : addr === "low" ? -18 : 0;
  score -= p.attemptsVerified * 8;
  return score;
}
function bucket(score: number): AwbLevel { return score >= 65 ? "High" : score >= 40 ? "Medium" : "Low"; }
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function evaluate(
  parcel: AwbParcel, movements: AwbMovement[], fills: Record<string, number>,
  s: AwbSettings, nowMin: number, ctx: AwbEvalCtx
): AwbEvaluation {
  const fillOf = (m: AwbMovement) => m.baseFill + (fills[m.id] ?? 0);
  const hasRoom = (m: AwbMovement) => fillOf(m) < m.capacity;
  const executeByOf = (m: AwbMovement) => m.departureMin - s.cutoffBufferMin;
  const hoursTo = (min: number) => (min - nowMin) / 60;
  const slaTight = parcel.slaHoursLeft <= s.slaTightHours;
  const priorityAllowed = parcel.orderValue >= s.priorityValueThreshold || slaTight;
  const withinSla = (m: AwbMovement) => hoursTo(m.departureMin) <= parcel.slaHoursLeft;
  const openNow = (m: AwbMovement) => m.publishedAtMin <= nowMin && executeByOf(m) >= nowMin && hasRoom(m);
  const targetOf = (m: AwbMovement): AwbTarget => ({ movementId: m.id, label: m.label, departureMin: m.departureMin, destination: m.destination, used: fillOf(m), capacity: m.capacity });

  const score = recoveryScore(parcel, ctx.addressConfirmed);
  const likelihood = bucket(score);
  const p = { High: s.pHigh, Medium: s.pMedium, Low: s.pLow }[likelihood] / 100;
  const V = s.recoverableValueFlat + (s.recoverableValuePct / 100) * parcel.orderValue;
  const attemptsRemaining = parcel.maxAttempts - parcel.attemptsVerified;
  const currentState = `${parcel.status} at ${parcel.currentDc}`;
  const reasonText = REASON_TEXT[parcel.failureReason ?? "unknown"];
  const unverified = parcel.attemptsLogged - parcel.attemptsVerified;
  const historyLine = parcel.prevOrders >= 1
    ? `${parcel.prevDelivered}/${parcel.prevOrders} previous orders delivered${parcel.prevRefused ? `, ${parcel.prevRefused} refused` : ""}`
    : "New customer, no delivery history";
  const addrText = ctx.addressConfirmed ? "confirmed during the hold" : parcel.addressConfidence ?? "unavailable";
  const attemptsLine = `${parcel.attemptsVerified} of ${parcel.maxAttempts} verified attempts used` +
    (unverified > 0 ? ` (${unverified} logged attempt${unverified > 1 ? "s" : ""} had no GPS/OTP proof and do not count)` : "");

  const baseFactors = [
    reasonText, attemptsLine, historyLine, `Address confidence: ${addrText}`,
    `${parcel.payment} · ₹${parcel.orderValue} · ${parcel.category}`,
    `Seller SLA: ${parcel.slaHoursLeft} h left`,
    `Recovery likelihood: ${likelihood} (prototype rules, assumption)`,
  ];

  const flow = (decision: string, nextEvent: string, nextNode: string, outcome: string): AwbFlowStep[] => [
    { title: "Current state", sub: currentState },
    { title: "System decision", sub: decision },
    { title: "Next event", sub: nextEvent },
    { title: "Next node", sub: nextNode },
    { title: "Expected outcome", sub: outcome },
    { title: "System", sub: "AWB status updated automatically" },
  ];

  const reviewBy = (): number | null => {
    const c = movements.filter((m) => m.kind === "return" && !m.priority && executeByOf(m) >= nowMin).map(executeByOf);
    return c.length ? Math.min(...c) : null;
  };

  const manual = (reason: string, opts: AwbOptionCost[] = [], reviewType = "Needs review"): AwbEvaluation => {
    const rb = reviewBy();
    return {
      decision: "MANUAL_REVIEW",
      headline: `Send AWB ${parcel.awb} to supervisor review. Do not dispatch or return it.`,
      execution: rb !== null ? `Review by ${fmtTime(rb)}` : "Supervisor review",
      details: [
        { label: "Review type", value: reviewType },
        { label: "Reason", value: reason },
        ...(rb !== null ? [{ label: "Review before", value: fmtTime(rb) }] : []),
      ],
      doNot: "Do NOT dispatch, return or hold this parcel until it is reviewed.",
      executeByMin: rb,
      why: [reason, "The engine does not force a decision when data is missing or the options are too close to call"],
      factors: baseFactors, recoveryLikelihood: likelihood, confidence: "Low", manualReviewReason: reason,
      flow: flow("Manual review, no automatic action", rb !== null ? `Supervisor reviews before ${fmtTime(rb)}` : "Supervisor reviews at the next cutoff", "Supervisor decision", "Decision recorded and the parcel released to a normal action"),
      lifecycle: ["Sent for manual review", "Reviewed by supervisor"],
      options: opts, logisticsCost: null, savings: null, recoveredValue: null, successProbability: p,
    };
  };

  const gate: string[] = [];
  if (!parcel.failureReason) gate.push("failure reason is missing");
  if (parcel.attemptsVerified > parcel.attemptsLogged) gate.push("verified attempts exceed logged attempts (conflicting data)");
  if (parcel.slaHoursLeft <= 0) gate.push("seller SLA is already breached");
  if (gate.length) {
    const type = !parcel.failureReason ? "Data gap" : parcel.attemptsVerified > parcel.attemptsLogged ? "Conflicting data" : "SLA breached";
    return manual(cap(gate.join("; ")), [], type);
  }

  const dest = parcel.returnDestination;
  const correctDc = parcel.correctDc;
  const dedicatedDep = 1440 + 540;

  function pickReturn(): ReturnPick | null {
    if (!dest) return null;
    const cands = movements.filter((m) => m.kind === "return" && m.destination === dest && openNow(m) && withinSla(m) && (!m.priority || priorityAllowed));
    if (cands.length) {
      const scored = cands.map((m) => ({ m, cost: m.priority ? s.priorityReturnCost : s.consolidatedReturnCost })).sort((a, b) => a.cost - b.cost || a.m.departureMin - b.m.departureMin);
      const b = scored[0];
      return { method: b.m.priority ? "priority" : "consolidate", cost: b.cost, target: targetOf(b.m) };
    }
    if (hoursTo(dedicatedDep) <= parcel.slaHoursLeft) {
      return { method: "standard", cost: s.standardReverseCost, target: { movementId: "STD-RETURN", label: "Standard return run (dedicated)", departureMin: dedicatedDep, destination: dest } };
    }
    return null;
  }

  const blockedByReason = parcel.failureReason === "customer_cancelled" || (parcel.failureReason === "cod_refused" && parcel.prevRefused >= 2);

  function pickReattempt(): AwbMovement | null {
    if (attemptsRemaining <= 0 || blockedByReason) return null;
    const cands = movements.filter((m) => m.kind === "delivery" && openNow(m) && withinSla(m) && (!m.priority || priorityAllowed));
    const isEve = (m: AwbMovement) => Math.floor((m.departureMin % 1440) / 60) >= 17;
    cands.sort((a, b) => {
      if (parcel.failureReason === "customer_unavailable") { const d = Number(!isEve(a)) - Number(!isEve(b)); if (d) return d; }
      return a.departureMin - b.departureMin;
    });
    return cands[0] ?? null;
  }

  function pickHoldMove(): AwbMovement | null {
    if (ctx.holdsServed > 0 || !parcel.sellerFlexible || !dest) return null;
    const exp = movements.filter((m) => m.kind === "return" && !m.priority && m.destination === dest && m.publishedAtMin > nowMin && hoursTo(m.publishedAtMin) <= s.maxHoldHours && hoursTo(m.departureMin) <= parcel.slaHoursLeft).sort((a, b) => a.publishedAtMin - b.publishedAtMin);
    return exp[0] ?? null;
  }

  const ret = pickReturn();
  const re = pickReattempt();
  const holdMove = pickHoldMove();
  const R = ret ? ret.cost : s.standardReverseCost;

  if (correctDc && correctDc !== parcel.currentDc) {
    const tr = movements.find((m) => m.kind === "transfer" && m.destination === correctDc && openNow(m) && withinSla(m));
    if (!tr) return manual(`No transfer movement to ${correctDc} can leave before the seller SLA`, [], "No movement available");
    const t = targetOf(tr);
    const logistics = s.redirectCost + s.reattemptCost + (1 - p) * (ret ? ret.cost : s.consolidatedReturnCost);
    return {
      decision: "REDIRECT",
      headline: `Place AWB ${parcel.awb} into Transfer Movement ${tr.id} to ${correctDc}`,
      execution: `${tr.id} · ${fmtTime(tr.departureMin)}`,
      details: [{ label: "Movement", value: `${tr.id} · ${tr.label}` }, { label: "Departs", value: fmtTime(tr.departureMin) }, { label: "Destination", value: correctDc }, { label: "Loaded", value: `${t.used}/${t.capacity} (before this parcel)` }],
      doNot: "Do NOT attempt delivery or return from this DC.",
      executeByMin: executeByOf(tr), target: t,
      why: [`The parcel is at ${parcel.currentDc} but belongs to ${correctDc}`, "Delivering or returning from the wrong hub wastes an attempt", `${tr.id} leaves ${fmtTime(tr.departureMin)} with room (${t.used}/${t.capacity})`],
      factors: [...baseFactors, `Transfer cost about ₹${s.redirectCost}`],
      recoveryLikelihood: likelihood, confidence: "High",
      flow: flow(`Redirect to ${correctDc}`, `Transfer leaves ${fmtTime(tr.departureMin)}`, correctDc, "Parcel re-queued for a delivery decision at the correct DC"),
      lifecycle: [`Loaded on ${tr.id}`, `In transit to ${correctDc}`, `Arrived at ${correctDc}`],
      options: [{ label: "Redirect to correct DC", cost: Math.round((logistics - p * V) * 10) / 10, chosen: true }],
      logisticsCost: logistics, savings: Math.round(s.standardReverseCost - logistics), recoveredValue: Math.round(p * V), successProbability: p,
    };
  }

  interface Cand { key: "REATTEMPT" | "RETURN" | "HOLD_ADDR" | "HOLD_MOVE"; label: string; cost: number; logistics: number }
  const cands: Cand[] = [];

  if (re) { const logistics = s.reattemptCost + (1 - p) * R; cands.push({ key: "REATTEMPT", label: "Reattempt delivery", cost: logistics - p * V, logistics }); }
  if (ret) {
    const label = ret.method === "consolidate" ? `Return: consolidate on ${ret.target.movementId}` : ret.method === "priority" ? `Return: priority movement ${ret.target.movementId}` : "Return: standard return run";
    cands.push({ key: "RETURN", label, cost: ret.cost, logistics: ret.cost });
  }
  const pA = s.pAfterAddressFix / 100;
  if (ctx.holdsServed === 0 && parcel.failureReason === "address_issue" && !ctx.addressConfirmed && parcel.addressConfidence !== "high" && re && parcel.slaHoursLeft > s.addressHoldHours + 2) {
    const logistics = s.holdCostPerHour * s.addressHoldHours + s.addressConfirmCost + s.reattemptCost + (1 - pA) * R;
    cands.push({ key: "HOLD_ADDR", label: `Hold ${s.addressHoldHours} h for address confirmation`, cost: logistics - pA * V + s.holdMinSaving, logistics });
  }
  if (holdMove) {
    const logistics = s.holdCostPerHour * hoursTo(holdMove.publishedAtMin) + s.consolidatedReturnCost;
    cands.push({ key: "HOLD_MOVE", label: `Hold until ${fmtTime(holdMove.publishedAtMin)} for ${holdMove.id}`, cost: logistics + s.holdMinSaving, logistics });
  }

  if (!cands.length) {
    const why: string[] = [];
    if (!dest) why.push("return destination unavailable");
    else if (!ret) why.push("no return movement can meet the seller SLA");
    if (blockedByReason) why.push(parcel.failureReason === "customer_cancelled" ? "reattempt ruled out (customer cancelled)" : "reattempt ruled out by repeat COD refusal");
    else if (attemptsRemaining <= 0) why.push("verified attempts exhausted");
    else if (!re) why.push("no delivery batch fits the seller SLA");
    if (slaTight) why.push(`seller SLA is tight (${parcel.slaHoursLeft} h left)`);
    return manual(cap(why.join(", ")), [], "No feasible action");
  }

  cands.sort((a, b) => a.cost - b.cost);
  const best = cands[0];
  const margin = cands.length > 1 ? cands[1].cost - best.cost : Infinity;
  let confidence: AwbLevel = margin >= s.highConfidenceMargin ? "High" : margin >= s.manualReviewMargin ? "Medium" : "Low";
  if (parcel.addressConfidence === null && !ctx.addressConfirmed && confidence === "High") confidence = "Medium";

  const optionsOut: AwbOptionCost[] = cands.map((c) => ({ label: c.label, cost: Math.round(c.cost * 10) / 10, chosen: c.key === best.key }));

  if (confidence === "Low") return manual(`The top two options are within ₹${Math.round(margin)} of each other, so confidence is low`, optionsOut.map((o) => ({ ...o, chosen: false })), "Close call");

  const savings = Math.round(s.standardReverseCost - best.logistics);

  if (best.key === "REATTEMPT" && re) {
    const t = targetOf(re);
    const attemptNo = parcel.attemptsVerified + 1;
    const why = [reasonText, ...(parcel.prevOrders >= 2 ? [historyLine] : []), `Address confidence: ${addrText}`, ...(unverified > 0 ? ["The last attempt had no GPS/OTP proof, so it does not count against the attempt limit"] : []), "Expected recovered value outweighs the cost of another attempt"];
    return {
      decision: "REATTEMPT",
      headline: `Place AWB ${parcel.awb} into ${re.label}`,
      execution: `${re.id} · ${fmtTime(re.departureMin)}`,
      details: [{ label: "Batch", value: `${re.id} · ${re.label}` }, { label: "Departs", value: fmtTime(re.departureMin) }, { label: "Loaded", value: `${t.used}/${t.capacity} (before this parcel)` }, { label: "Attempt", value: `#${attemptNo} of ${parcel.maxAttempts} (verified attempts only)` }],
      doNot: "Do NOT send this parcel to seller return.",
      executeByMin: executeByOf(re), target: t,
      why: why.slice(0, 5),
      factors: [...baseFactors, `Delivery batch ${re.id} has room (${t.used}/${t.capacity} loaded)`],
      recoveryLikelihood: likelihood, confidence,
      flow: flow(`Reattempt: ${re.label}`, `Batch leaves ${fmtTime(re.departureMin)}`, "Customer address", `Attempt #${attemptNo} recorded with GPS + OTP proof`),
      lifecycle: ["Batched for reattempt", "Out for delivery", "Delivery outcome recorded"],
      options: optionsOut, logisticsCost: best.logistics, savings, recoveredValue: Math.round(p * V), successProbability: p,
    };
  }

  // Alternative disposition (liquidation lot or authorised disposal) for LOW-VALUE parcels.
  // It is NEVER executed automatically. Both routes are one-way and need seller approval the
  // engine cannot record, so the proposal always goes to manual review.
  function disposition(r: ReturnPick): AwbEvaluation | null {
    const val = parcel.orderValue;
    if (val >= s.lowValueThreshold) return null;
    if (parcel.slaHoursLeft < s.liquidationLeadHours) return null; // too slow for the seller SLA
    const money = (n: number) => `${n < 0 ? "−" : ""}₹${Math.abs(n).toFixed(2)}`;

    const dwell = s.storagePerDay * s.baseDwellDays;
    const normalOverhead = s.standardReverseCost + s.handlingQcCost + dwell;
    const netNormal = val - normalOverhead;
    const netConsolidated = r.method === "consolidate"
      ? val - s.standardReverseCost * s.consolidatedCostFactor - s.handlingQcCost - dwell - s.storagePerDay * s.consolidationExtraDwellDays
      : null;

    const recovery = val * s.liquidationRecoveryRate;
    const liqExtraStorage = s.storagePerDay * s.liquidationExtraDwellDays;
    const liqCosts = s.liquidationMovementCost + s.handlingQcCost + dwell + liqExtraStorage;
    const blockers: string[] = [];
    if (!parcel.sellerLiquidationConsent) blockers.push("the seller has not opted in to liquidation");
    if (parcel.categoryStatus === "NOT_ELIGIBLE") blockers.push("the category is not eligible for resale (hygiene or safety)");
    if (recovery < parcel.sellerMinRecovery) blockers.push(`expected recovery ${money(recovery)} is below the seller's ${money(parcel.sellerMinRecovery)} minimum`);
    const netLiq = blockers.length === 0 ? recovery - liqCosts : null;

    const disposalCosts = s.handlingQcCost + dwell;
    const netDisposal = parcel.writeOffAuthorised ? -disposalCosts : null;

    const opts = [
      { key: "A", label: "Normal reverse", net: netNormal },
      ...(netConsolidated !== null ? [{ key: "B", label: "Consolidated reverse", net: netConsolidated }] : []),
      ...(netLiq !== null ? [{ key: "C", label: "Liquidation lot", net: netLiq }] : []),
      ...(netDisposal !== null ? [{ key: "D", label: "Authorised disposal", net: netDisposal }] : []),
    ].sort((a, b) => b.net - a.net);

    const win = opts[0];
    if (win.key === "A" || win.key === "B") return null;                 // a return is best, keep it
    const gap = win.net - opts[1].net;
    if (gap < s.manualReviewMargin) return null;                          // never propose a one-way route on a thin margin
    const conf: AwbLevel = gap >= s.highConfidenceMargin ? "High" : "Medium";
    const isLiq = win.key === "C";

    const routeCosts = isLiq ? liqCosts : disposalCosts;
    const proceeds = isLiq ? recovery : 0;
    const incremental = win.net - netNormal;
    const freightAvoided = isLiq ? s.standardReverseCost - s.liquidationMovementCost : s.standardReverseCost;
    const resaleGivenUp = isLiq ? val - recovery : val;
    const extraStorage = isLiq ? liqExtraStorage : 0;
    const breakeven = (proceeds + normalOverhead - routeCosts) / val;

    const routeName = isLiq ? "Liquidation lot" : "Authorised disposal";
    const deadline = r.target.departureMin - s.cutoffBufferMin;
    const fallbackText = r.method === "consolidate" ? `consolidate onto ${r.target.movementId}` : r.method === "priority" ? `the priority movement ${r.target.movementId}` : "the standard return run";
    const approvals = isLiq
      ? [
          "Seller standing opt-in: recorded",
          parcel.categoryStatus === "ELIGIBLE" ? "Category: eligible" : "Category: needs a category check before liquidation (not yet done)",
          "Lot-level seller approval: NOT yet recorded",
        ]
      : [
          "Seller disposal authorisation: recorded",
          "Disposal route and evidence per seller policy: NOT yet confirmed",
        ];
    const componentText = isLiq
      ? `Recovery ${money(recovery)}, less movement ${money(s.liquidationMovementCost)}, handling and QC ${money(s.handlingQcCost)}, storage ${money(dwell + liqExtraStorage)} = net ${money(win.net)}`
      : `Handling and QC ${money(s.handlingQcCost)} plus storage ${money(dwell)} = net ${money(win.net)}`;
    const reconText = `+${money(incremental)} = ${money(freightAvoided)} reverse freight avoided, less ${money(resaleGivenUp)} resale value given up${extraStorage > 0 ? `, less ${money(extraStorage)} extra storage` : ""}`;
    const sensitivityText = breakeven >= 1
      ? "Beats a normal return even if returned parcels resell at full value"
      : `Beats a normal return only if returned parcels resell below ${Math.round(breakeven * 100)}% of value (the model assumes 100%)`;
    const reason = `${routeName} proposed for a low-value parcel, pending seller approval`;
    const optionsOut: AwbOptionCost[] = opts.map((o) => ({ label: `${o.label} (net value)`, cost: Math.round(o.net * 100) / 100, chosen: o.key === win.key }));

    return {
      decision: "MANUAL_REVIEW",
      headline: isLiq
        ? `Hold AWB ${parcel.awb} at the DC for supervisor review: stage for lot formation, pending lot-level seller approval`
        : `Hold AWB ${parcel.awb} at the DC for supervisor review: authorised disposal proposed, pending seller confirmation`,
      execution: `Review by ${fmtTime(deadline)}`,
      details: [
        { label: "Review type", value: "Alternative disposition" },
        { label: "Proposed route", value: isLiq ? "Liquidation lot, sold in bulk to a verified B2B buyer" : "Authorised disposal, route set by seller policy" },
        { label: "Net value", value: `${routeName} ${money(win.net)} vs normal return ${money(netNormal)}` },
        { label: "Cost components", value: componentText },
        { label: "Incremental value vs normal return", value: reconText },
        { label: "Resale sensitivity", value: sensitivityText },
        { label: "Approvals", value: approvals.join(". ") },
        { label: "Seller SLA", value: `${parcel.slaHoursLeft} h left. The parcel must leave the DC or be disposed of within this window. Assumed lead time ${s.liquidationLeadHours} h.` },
        { label: "Fallback", value: `If approval is not recorded by ${fmtTime(deadline)}, release to ${fallbackText}.` },
      ],
      doNot: "Do NOT return, sell or dispose of this parcel until the approval is recorded.",
      executeByMin: deadline,
      why: [
        `Low-value parcel (₹${val}): a normal return nets ${money(netNormal)}, so returning it loses money`,
        `${routeName} nets ${money(win.net)}, which is ${money(incremental)} better than a normal return`,
        netConsolidated === null ? "No cheaper consolidated return is available" : "A consolidated return is available but nets less",
        "Both routes are one-way, so the engine proposes them for review instead of executing them",
      ],
      factors: [
        ...baseFactors,
        `Net value: normal return ${money(netNormal)}, liquidation ${netLiq !== null ? money(netLiq) : "not available"}, authorised disposal ${netDisposal !== null ? money(netDisposal) : "not authorised"}`,
        ...(blockers.length ? [`Liquidation not available: ${blockers.join("; ")}`] : []),
      ],
      recoveryLikelihood: likelihood, confidence: conf, manualReviewReason: reason,
      flow: flow(
        "Manual review: alternative disposition proposed",
        `Supervisor confirms the seller approval before ${fmtTime(deadline)}`,
        isLiq ? "Liquidation lot (verified B2B buyer)" : "Authorised disposal",
        "If approved, the parcel leaves the return flow. If not, it follows the fallback return."
      ),
      lifecycle: ["Sent to supervisor review", isLiq ? "Lot-level seller approval recorded" : "Seller confirmation recorded", "Disposition executed, or fallback return released"],
      options: optionsOut,
      logisticsCost: null, savings: null, recoveredValue: null, successProbability: p,
    };
  }

  if (best.key === "RETURN" && ret) {
    const alt = disposition(ret);
    if (alt) return alt;

    const t = ret.target;
    const isStd = ret.method === "standard";
    const fullMovs = dest ? movements.filter((m) => m.kind === "return" && m.destination === dest && !hasRoom(m) && m.publishedAtMin <= nowMin && executeByOf(m) >= nowMin) : [];
    const headline = ret.method === "consolidate" ? `Place AWB ${parcel.awb} into Return Movement ${t.movementId}` : ret.method === "priority" ? `Place AWB ${parcel.awb} into Priority Return Movement ${t.movementId}` : `Release AWB ${parcel.awb} to the standard return run for ${t.destination}`;

    const why: string[] = [];
    if (attemptsRemaining <= 0) why.push(`${parcel.attemptsVerified} of ${parcel.maxAttempts} verified attempts used`);
    why.push(reasonText);
    if (parcel.prevRefused >= 1) why.push(historyLine);
    if (likelihood !== "High") why.push(`${likelihood} recovery likelihood`);
    if (ret.method === "priority") why.push(slaTight ? `Seller SLA has ${parcel.slaHoursLeft} h left, so standard movements leave too late` : "High-value parcel qualifies for a priority movement");
    if (ret.method === "consolidate") why.push(`${t.movementId} leaves ${fmtTime(t.departureMin)} with room (${t.used}/${t.capacity})`);
    if (isStd) why.push(`No scheduled movement to ${t.destination}, so a dedicated run is needed`);
    if (fullMovs.length) why.push(`${fullMovs.map((m) => m.id).join(", ")} ${fullMovs.length > 1 ? "are" : "is"} full, so the next available movement is used`);

    return {
      decision: "RETURN", method: ret.method, headline,
      execution: `${isStd ? "Standard run" : t.movementId} · ${fmtTime(t.departureMin)}`,
      details: [
        { label: "Method", value: ret.method === "consolidate" ? "Consolidate with an existing movement" : ret.method === "priority" ? "Priority return movement" : "Standard dedicated return run" },
        { label: "Movement", value: isStd ? "Standard return run (dedicated)" : t.movementId },
        { label: "Departs", value: fmtTime(t.departureMin) },
        { label: "Destination", value: t.destination },
        ...(t.capacity !== undefined && t.used !== undefined ? [{ label: "Loaded", value: `${t.used}/${t.capacity} (before this parcel)` }] : []),
      ],
      doNot: "Do NOT attempt another delivery.",
      executeByMin: t.departureMin - s.cutoffBufferMin, target: isStd ? undefined : t,
      why: why.slice(0, 5),
      factors: [...baseFactors, isStd ? "No scheduled movement to this seller hub" : `Movement ${t.movementId} has room`],
      recoveryLikelihood: likelihood, confidence,
      flow: flow(`Return: ${ret.method === "consolidate" ? `consolidate with ${t.movementId}` : ret.method === "priority" ? `priority movement ${t.movementId}` : "standard return run"}`, `Leaves ${parcel.currentDc} at ${fmtTime(t.departureMin)}`, t.destination, "Seller receives the parcel"),
      lifecycle: [isStd ? "Released to standard return run" : `Loaded on ${t.movementId}`, `In transit to ${t.destination}`, `Received at ${t.destination}`, "Returned to seller"],
      options: optionsOut, logisticsCost: best.logistics, savings, recoveredValue: null, successProbability: p,
    };
  }

  if (best.key === "HOLD_ADDR") {
    const until = nowMin + s.addressHoldHours * 60;
    const trigger = `Address (landmark or pin) confirmed, or ${fmtTime(until)}, whichever comes first`;
    return {
      decision: "HOLD",
      headline: `Shelve AWB ${parcel.awb} on the Hold shelf until ${fmtTime(until)}`,
      execution: `Until ${fmtTime(until)}`,
      details: [{ label: "Hold until", value: fmtTime(until) }, { label: "Re-evaluation trigger", value: trigger }, { label: "Then", value: "The engine re-evaluates automatically" }],
      doNot: "Do NOT dispatch or return this parcel before then.",
      executeByMin: null, holdUntilMin: until, holdKind: "address", reevaluationTrigger: trigger,
      why: [`Address confidence is ${parcel.addressConfidence ?? "unavailable"}, so another attempt would likely fail`, `Confirming the address costs about ₹${s.addressConfirmCost} versus ₹${s.reattemptCost} for a wasted attempt`, `${attemptsRemaining} verified attempt${attemptsRemaining > 1 ? "s" : ""} still available`, `Re-evaluated automatically at ${fmtTime(until)}`],
      factors: [...baseFactors, `Hold cost about ₹${(s.holdCostPerHour * s.addressHoldHours).toFixed(1)}`],
      recoveryLikelihood: likelihood, confidence,
      flow: flow("Hold on shelf while the address is confirmed", trigger, `Automatic re-evaluation at ${fmtTime(until)}`, "New decision issued (reattempt or return)"),
      lifecycle: [`On hold shelf until ${fmtTime(until)}`, "Hold ended and parcel re-evaluated"],
      options: optionsOut, logisticsCost: best.logistics, savings, recoveredValue: Math.round(pA * V), successProbability: pA,
    };
  }

  if (best.key === "HOLD_MOVE" && holdMove) {
    const until = holdMove.publishedAtMin;
    const trigger = `${holdMove.id} (${holdMove.destination}, leaves ${fmtTime(holdMove.departureMin)}) gets published`;
    return {
      decision: "HOLD",
      headline: `Shelve AWB ${parcel.awb} on the Hold shelf until ${fmtTime(until)}`,
      execution: `Until ${fmtTime(until)}`,
      details: [{ label: "Hold until", value: fmtTime(until) }, { label: "Re-evaluation trigger", value: trigger }, { label: "Then", value: `The engine re-evaluates and can consolidate onto ${holdMove.id}` }],
      doNot: "Do NOT dispatch or return this parcel before then.",
      executeByMin: null, holdUntilMin: until, holdKind: "movement", reevaluationTrigger: trigger,
      why: [`No scheduled return movement to ${dest} is open right now, so only a dedicated run (₹${s.standardReverseCost}) is available`, `${holdMove.id} publishes at ${fmtTime(until)} and leaves ${fmtTime(holdMove.departureMin)}, at about ₹${s.consolidatedReturnCost}`, "The seller accepts a delayed return pickup", `Re-evaluated automatically at ${fmtTime(until)}`],
      factors: [...baseFactors, `Hold cost about ₹${(s.holdCostPerHour * hoursTo(until)).toFixed(1)}`],
      recoveryLikelihood: likelihood, confidence,
      flow: flow("Hold on shelf until a cheaper movement opens", `${holdMove.id} gets published at ${fmtTime(until)}`, "Automatic re-evaluation at that time", `Parcel consolidated into ${holdMove.id} (leaves ${fmtTime(holdMove.departureMin)})`),
      lifecycle: [`On hold shelf until ${fmtTime(until)}`, "Hold ended and parcel re-evaluated"],
      options: optionsOut, logisticsCost: best.logistics, savings, recoveredValue: null, successProbability: p,
    };
  }

  return manual("The engine could not determine a safe action", [], "Needs review");
}