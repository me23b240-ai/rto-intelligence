// lib/finance-model.ts
// Every number here comes directly from Meesho_RTO_Integrated_Model.xlsx.
// This page displays that model; it does not recompute it live - the
// spreadsheet's formulas are the source of truth, this is a read-only view.

export type Scenario = "conservative" | "base" | "aggressiveMid" | "aggressive";

export const SCENARIO_LABEL: Record<Scenario, string> = {
  conservative: "Conservative", base: "Base", aggressiveMid: "Aggressive-mid", aggressive: "Aggressive",
};

export const FINANCE = {
  volume: { pilot: 8_000_000, fy25Shipped: 1_588_000_000, fy26Placed: 2_670_000_000 },

  baseline: {
    rtoRate: 0.17, codShare: 0.8, codRtoRate: 0.20, prepaidRtoRate: 0.05,
    forwardCost: 50, reverseCost: 120, totalExposureRef: 170,
  },

  bands: [
    { name: "Near", volShare: 0.40, rtoRate: 0.15, avgKm: 2, qualifyRate: 0.70, basePayout: 15, perfIncentive: 1.4, routeIncentive: 1.0, totalPay: 17.4, reverseAvoided: 120, netBenefit: 102.6, weight: 0.0600 },
    { name: "Mid", volShare: 0.35, rtoRate: 0.17, avgKm: 5, qualifyRate: 0.60, basePayout: 15, perfIncentive: 1.2, routeIncentive: 2.5, totalPay: 18.7, reverseAvoided: 120, netBenefit: 101.3, weight: 0.0595 },
    { name: "Far", volShare: 0.25, rtoRate: 0.22, avgKm: 12, qualifyRate: 0.45, basePayout: 15, perfIncentive: 0.9, routeIncentive: 6.0, totalPay: 21.9, reverseAvoided: 120, netBenefit: 98.1, weight: 0.0550 },
  ],
  blendedNetBenefitPerRtoAvoided: 100.74,

  preventionImpact: {
    conservative: { ppReduction: 0.0074, rtosAvoided: 59200, gross170: 10064000, reverse120: 7104000, netOfPayout: 5963713, impliedPctPrevented: 0.0435 },
    base: { ppReduction: 0.0147, rtosAvoided: 117600, gross170: 19992000, reverse120: 14112000, netOfPayout: 11846835, impliedPctPrevented: 0.0865 },
    aggressiveMid: { ppReduction: 0.0368, rtosAvoided: 294400, gross170: 50048000, reverse120: 35328000, netOfPayout: 29657384, impliedPctPrevented: 0.2165 },
    aggressive: { ppReduction: 0.0735, rtosAvoided: 588000, gross170: 99960000, reverse120: 70560000, netOfPayout: 59234177, impliedPctPrevented: 0.4324 },
  } as Record<Scenario, { ppReduction: number; rtosAvoided: number; gross170: number; reverse120: number; netOfPayout: number; impliedPctPrevented: number }>,

  postRtoRecoveryEconomics: {
    handlingQc: 8, storagePerDay: 1.5, avgDwellDays: 3,
    consolidatedReverseCostPct: 0.60, liquidationMovementCost: 25, liquidationRecoveryRate: 0.35,
    lowValueThreshold: 300, avgLowValueProduct: 220,
    shareLowValue: 0.35, shareConsolidationEligible: 0.65, shareLiquidationOptIn: 0.45,
  },

  buildRunCost: {
    assignmentEngineOneTime: 2250000, assignmentEngineMonthly: 300000,
    recoveryLayerOneTime: 1000000, recoveryLayerMonthly: 150000,
  },

  combinedSummaryBase: {
    prevention: 11846835, recovery: 12719070, totalBenefit: 24565905,
    oneTimeCost: 3250000, annualRunCost: 5400000,
    netYear1: 15915905, netYear2Plus: 19165905, paybackMonths: 2.03,
  },

  scenarioRange: {
    conservative: { combined: 19280653, netY1: 10630653 },
    base: { combined: 24565905, netY1: 15915905 },
    aggressiveMid: { combined: 40566464, netY1: 31916464 },
    aggressive: { combined: 67137527, netY1: 58487527 },
  } as Record<Scenario, { combined: number; netY1: number }>,

  scaleView: [
    { label: "Pilot-scale (team file)", orders: 8_000_000, reverseCeilingCr: 16.32, preventionTargetedCr: 1.18, preventionNetworkWideCr: -1.41, recoveryCr: 1.27, combinedTargetedCr: 2.46, combinedNetworkWideCr: -0.14 },
    { label: "FY25 shipped (public)", orders: 1_588_000_000, reverseCeilingCr: 3239.52, preventionTargetedCr: 235.16, preventionNetworkWideCr: -279.47, recoveryCr: 252.47, combinedTargetedCr: 487.63, combinedNetworkWideCr: -27.00 },
    { label: "FY26 placed (team slide)", orders: 2_670_000_000, reverseCeilingCr: 5446.80, preventionTargetedCr: 395.39, preventionNetworkWideCr: -469.89, recoveryCr: 424.50, combinedTargetedCr: 819.89, combinedNetworkWideCr: -45.39 },
  ],

  networkWideStress: {
    extraPayPerDelivered: 3.98, deliveredOrdersPerYear: 6640000,
    annualExtraPayNetworkWide: 26427200, breakEvenRtosAvoided: 251688,
    breakEvenPpReduction: 0.0315, baseScenarioPp: 0.0147, coversNetworkWide: false,
  },

  unitEconomics100: {
    orders: 100, codOrders: 80, prepaidOrders: 20, codRtos: 16, prepaidRtos: 1, totalRtos: 17,
    blendedRtoRate: 0.17, forwardExposureSunk: 850, reverseExposureAddressable: 2040, totalExposure: 2890,
  },

  decisionBoundaryExample: {
    productValue: 499, pSuccess: 0.4, bestAlternativeNetValue: 100, reattemptCost: 35,
    expectedGain: 124.6, decision: "RECOVER",
  },

  dashboardSnapshot: {
    rtoAwaiting: 1284, lowValueCandidates: 426, consolidationCandidates: 183,
    liquidationEligible: 147, sellerApprovalPending: 92,
    reverseExposureAwaiting: 154080, productValueLowValue: 93720, lowValueShare: 0.3318,
  },

  sampleQueue: {
    total: 16, routedToRecovery: 2, shareRoutedToRecovery: 0.125, expectedRecoveredDeliveries: 1.05,
    actions: { normalReverse: 5, consolidate: 5, liquidate: 1, writeOff: 3 },
    reverseCostAvoided: 695, netValuePreserved: 2060.65, netValuePreservedPerParcel: 147.19, upliftVsBaseline: 299.65,
  },
};

export function fmtRupee(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
export function fmtCr(n: number): string {
  return `₹${n.toFixed(2)} Cr`;
}
export function fmtPct(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`;
}