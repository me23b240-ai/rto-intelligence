// lib/finance-model.ts
// Inputs come from Meesho_RTO_Integrated_Model.xlsx. Everything else is DERIVED here
// with the same arithmetic the workbook uses, so the page can never disagree with itself.
import type { FinanceTagType } from "@/components/finance-tag";

export type Scenario = "conservative" | "base" | "aggressiveMid" | "aggressive";
export const SCENARIOS: Scenario[] = ["conservative", "base", "aggressiveMid", "aggressive"];
export const SCENARIO_LABEL: Record<Scenario, string> = {
  conservative: "Conservative", base: "Base", aggressiveMid: "Aggressive-mid", aggressive: "Aggressive",
};
// percentage-point reduction in the RTO rate (MODEL ASSUMPTION in the workbook)
export const SCENARIO_PP: Record<Scenario, number> = {
  conservative: 0.0074, base: 0.0147, aggressiveMid: 0.0368, aggressive: 0.0735,
};
// Liquidation beats normal reverse when resale rate < recovery% + (normal-reverse overhead − liquidation overhead) / value
//   normal reverse overhead = 120 + 8 + 1.5×3 = 132.5     liquidation overhead = 25 + 8 + 1.5×7 = 43.5
const liqWinsBelow = (v: number) => 0.35 + (132.5 - 43.5) / v;
const liqWins = (v: number) => (liqWinsBelow(v) >= 1 ? "Always" : `< ${Math.round(Math.round(liqWinsBelow(v) * 1000) / 10)}%`);
export const LIQUIDATION_THRESHOLDS = [
  { band: "≤ ₹100", wins: liqWins(100), action: "Liquidate / Consolidate", condition: "B2B bulk lot formation" },
  { band: "₹150", wins: liqWins(150), action: "Liquidate", condition: "Seller consent required" },
  { band: "₹200", wins: liqWins(200), action: "Liquidate", condition: "Minimum recovery floor met" },
  { band: "₹250", wins: liqWins(250), action: "Hybrid / Normal reverse", condition: "Category status check" },
  { band: "≥ ₹300", wins: liqWins(300), action: "Normal reverse", condition: "Resale realisation preferable" },
];
export const VOLUME = { pilot: 8_000_000, fy25Shipped: 1_588_000_000, fy26Placed: 2_670_000_000 };
export const RTO_RATE = 0.17;
export const FORWARD_COST = 50;
export const REVERSE_COST = 120;
export const BASE_PAY = 15;
const PERF_INCENTIVE = 2;     // HYPOTHESIS, paid if on-time rate >= 90%
const ROUTE_PER_KM = 0.5;     // HYPOTHESIS

export const BANDS = [
  { name: "Near", volShare: 0.40, rtoRate: 0.15, avgKm: 2, qualifyRate: 0.70 },
  { name: "Mid", volShare: 0.35, rtoRate: 0.17, avgKm: 5, qualifyRate: 0.60 },
  { name: "Far", volShare: 0.25, rtoRate: 0.22, avgKm: 12, qualifyRate: 0.45 },
].map((b) => {
  const perfIncentive = b.qualifyRate * PERF_INCENTIVE;
  const routeIncentive = b.avgKm * ROUTE_PER_KM;
  const totalPay = BASE_PAY + perfIncentive + routeIncentive;
  return { ...b, perfIncentive, routeIncentive, totalPay, netBenefit: REVERSE_COST - totalPay, rtoWeight: b.volShare * b.rtoRate };
});

const RTO_WEIGHT_SUM = BANDS.reduce((s, b) => s + b.rtoWeight, 0);
// Net benefit per RTO avoided when incentives are TARGETED (paid only on converted deliveries)
export const BLENDED_NET_PER_RTO_AVOIDED = BANDS.reduce((s, b) => s + b.netBenefit * b.rtoWeight, 0) / RTO_WEIGHT_SUM;
// Extra pay over the flat ₹15, per delivered order, if incentives are paid NETWORK-WIDE
export const EXTRA_PER_DELIVERED = BANDS.reduce((s, b) => s + b.volShare * (b.perfIncentive + b.routeIncentive), 0);

export const ONE_TIME_BUILD = 3_250_000;   // both layers
export const ANNUAL_RUN = 5_400_000;       // both layers
const RECOVERY_PILOT_BASE = 12_719_070;    // workbook: recovery layer at base case, 8M orders
// Recovery is earned on the RTOs that REMAIN after prevention, so it shrinks as prevention improves
export const RECOVERY_PER_REMAINING_RTO = RECOVERY_PILOT_BASE / (VOLUME.pilot * (RTO_RATE - SCENARIO_PP.base));

// Everything in rupees. The page converts to crore.
export function modelAt(volume: number, s: Scenario) {
  const pp = SCENARIO_PP[s];
  const delivered = volume * (1 - RTO_RATE);
  const rtosAvoided = volume * pp;
  const grossAvoided = rtosAvoided * REVERSE_COST;
  const convertedPay = rtosAvoided * BASE_PAY;
  const networkWideIncentive = delivered * EXTRA_PER_DELIVERED;
  const riderCostNetworkWide = convertedPay + networkWideIncentive;
  const preventionNetNetworkWide = grossAvoided - riderCostNetworkWide;
  const preventionNetTargeted = rtosAvoided * BLENDED_NET_PER_RTO_AVOIDED;
  const riderCostTargeted = grossAvoided - preventionNetTargeted;
  const recovery = RECOVERY_PER_REMAINING_RTO * volume * (RTO_RATE - pp);
  const buildRun = ONE_TIME_BUILD + ANNUAL_RUN;
  return {
    pp, volume, delivered, rtosAvoided, impliedPctStopped: pp / RTO_RATE,
    reverseCeiling: volume * RTO_RATE * REVERSE_COST,
    grossAvoided, convertedPay, networkWideIncentive,
    riderCostNetworkWide, preventionNetNetworkWide,
    riderCostTargeted, preventionNetTargeted,
    recovery, buildRun,
    netY1NetworkWide: preventionNetNetworkWide + recovery - buildRun,
    netY1Targeted: preventionNetTargeted + recovery - buildRun,
  };
}

export function pilotSummary() {
  const m = modelAt(VOLUME.pilot, "base");
  const benefit = m.preventionNetTargeted + m.recovery;
  return {
    benefit, netY1: benefit - m.buildRun, netY2: benefit - ANNUAL_RUN,
    paybackMonths: ONE_TIME_BUILD / ((benefit - ANNUAL_RUN) / 12),
  };
}

// Network-wide incentives break even when avoided RTOs save more than they cost to pay for
export const BREAK_EVEN_PP = (EXTRA_PER_DELIVERED * (1 - RTO_RATE)) / (REVERSE_COST - BASE_PAY);

// ---- Appendix-5 slide content (team-provided) ----
const CAUSES = [
  { cause: "Customer unavailable", riderShare: 0.50, addressable: 0.56, fixSuccess: 0.40 },
  { cause: "Address difficulty", riderShare: 0.25, addressable: 0.40, fixSuccess: 0.35 },
  { cause: "Wrong dispatch", riderShare: 0.08, addressable: 0.30, fixSuccess: 0.25 },
];
const CAUSE_TOTAL = CAUSES.reduce((s, c) => s + c.riderShare * c.addressable * c.fixSuccess, 0);
export const CAUSE_TREE = CAUSES.map((c) => ({ ...c, benefitShare: (c.riderShare * c.addressable * c.fixSuccess) / CAUSE_TOTAL }));
export const CAUSE_TARGETED_SHARE = CAUSES.reduce((s, c) => s + c.riderShare, 0);

export const LIQUIDATION_THRESHOLDS = [
  { band: "≤ ₹100", wins: "Always", action: "Liquidate / Consolidate", condition: "B2B bulk lot formation" },
  { band: "₹150", wins: "< 94%", action: "Liquidate", condition: "Seller consent required" },
  { band: "₹200", wins: "< 82%", action: "Liquidate", condition: "Minimum recovery floor met" },
  { band: "₹250", wins: "< 71%", action: "Hybrid / Normal reverse", condition: "Category status check" },
  { band: "≥ ₹300", wins: "< 65%", action: "Normal reverse", condition: "Resale realisation preferable" },
];

export const EXCLUDED_DRIVERS = [
  { driver: "Contribution margin on converted orders", effect: "Positive upside", context: "Gross profit retained on saved sales" },
  { driver: "Kirana forward-cost savings", effect: "Positive upside", context: "Reduced drop-off distance efficiencies" },
  { driver: "Trusted-COD effects", effect: "Positive upside", context: "Behavioural shift reducing future RTO rates" },
  { driver: "ePOD dispute reduction", effect: "Positive upside", context: "Fewer false claims and customer friction" },
  { driver: "National-scale run cost", effect: "Negative cost", context: "Costs increase beyond pilot hubs" },
  { driver: "Orders lost to COD gating", effect: "Negative cost", context: "Some COD buyers will not prepay" },
];

export const DECISION_EXAMPLE = (() => {
  const d = { productValue: 499, pSuccess: 0.4, bestAlternativeNetValue: 100, reattemptCost: 35 };
  const expectedGain = d.pSuccess * (d.productValue - d.bestAlternativeNetValue) - d.reattemptCost;
  return { ...d, expectedGain, decision: expectedGain > 0 ? "RECOVER" : "RETURN" };
})();

export const SAMPLE_QUEUE = {
  total: 16, routedToReattempt: 2,
  actions: { normalReverse: 5, consolidate: 5, liquidate: 1, writeOff: 3 },
  reverseCostAvoided: 695, netValuePreservedPerParcel: 147.19, upliftVsBaseline: 299.65,
};

export const ASSUMPTIONS: { group: string; rows: [string, string, FinanceTagType][] }[] = [
  { group: "Volume and baseline RTO", rows: [
    ["Pilot-scale annual orders", "8,000,000", "illustrative"],
    ["FY25 shipped orders", "1.588B", "public"],
    ["FY26 placed orders", "2.67B", "team"],
    ["Baseline RTO rate", "17%", "case"],
    ["COD share of orders", "80%", "case"],
    ["COD / prepaid RTO rate", "20% / 5%", "case"],
    ["Forward logistics cost", "₹50 per order (sunk once an RTO happens)", "case"],
    ["Normal reverse logistics cost", "₹120 per RTO (the only avoidable cost after failure)", "case"],
    ["Total exposure per RTO (reference only)", "₹170", "calculated"],
  ]},
  { group: "Distance bands (near / mid / far)", rows: [
    ["RTO rate", "15% / 17% / 22%", "case"],
    ["Volume share", "40% / 35% / 25%", "model"],
    ["Average km", "2 / 5 / 12 km (12 is illustrative for '10km+')", "model"],
  ]},
  { group: "Rider payout", rows: [
    ["Base payout per successful delivery", "₹15 (₹0 on a failed attempt)", "caseAssumption"],
    ["Performance incentive", "₹2 per delivery if on-time rate ≥ 90%", "hypothesis"],
    ["Route incentive", "₹0.5 per km", "hypothesis"],
    ["Riders qualifying for the performance incentive", "70% / 60% / 45% (near / mid / far)", "model"],
  ]},
  { group: "Post-RTO recovery", rows: [
    ["Handling / QC", "₹8 per parcel", "model"],
    ["Storage", "₹1.5 per day, 3 days average dwell", "model"],
    ["Consolidated reverse cost", "60% of normal (₹72)", "model"],
    ["Liquidation movement cost", "₹25", "model"],
    ["Liquidation recovery rate", "35% of product value", "model"],
    ["Low-value parcel threshold", "₹300 (average ₹220)", "model"],
    ["Share of RTOs that are low-value", "35% (65% consolidation-eligible, 45% seller opt-in for liquidation)", "model"],
    ["Resale realisation after normal reverse", "100% of product value (key stress lever)", "model"],
    ["Reattempt / recovery action cost", "₹35 per parcel", "model"],
  ]},
  { group: "Build and run", rows: [
    ["Assignment engine", "₹22.5L one-time + ₹3L per month", "assumption"],
    ["Post-RTO recovery layer", "₹10L one-time + ₹1.5L per month", "assumption"],
  ]},
  { group: "Scenarios and scale levers", rows: [
    ["RTO-rate reduction (Conservative / Base / Aggressive-mid / Aggressive)", "0.74 / 1.47 / 3.68 / 7.35 pp", "model"],
    ["Eligible RTO share, reverse-cost reduction", "20% of RTOs, 30% of ₹120", "illustrative"],
    ["Extra dwell days (consolidation / liquidation)", "2 / 4 days", "model"],
  ]},
];

// ---- formatting ----
export const toCr = (rupees: number) => rupees / 1e7;
export function fmtCr(cr: number, signed = false): string {
  const abs = Math.abs(cr).toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const sign = cr < 0 ? "−" : signed ? "+" : "";
  return `${sign}₹${abs} Cr`;
}
export function fmtRupee(n: number): string {
  return `${n < 0 ? "−" : ""}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
}
export function fmtPct(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`;
}
// percentage POINTS, never "%" - the model insists the two are not interchangeable
export function fmtPp(n: number, decimals = 2): string {
  return `${(n * 100).toFixed(decimals)} pp`;
}