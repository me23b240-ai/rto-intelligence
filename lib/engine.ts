// lib/engine.ts
import {
    OrderInput,
    RiskDriver,
    RiskPrediction,
    InterventionRecommendation,
    EconomicsAssumptions,
    RiskTier,
    Confidence,
  } from "./types";
  
  // ---------- 1. ECONOMICS DEFAULTS (from case data, configurable) ----------
  export const DEFAULT_ECONOMICS: EconomicsAssumptions = {
    forwardCost: 50,
    reverseCost: 120,
  };
  
  export function rtoCost(assumptions: EconomicsAssumptions) {
    return assumptions.forwardCost + assumptions.reverseCost; // ₹170
  }
  
  // ---------- 2. DISTANCE → RISK CURVE (evidence-backed, case-given) ----------
  // 2km -> 15%, 5km -> 17%, 10km+ -> 22%. Linear interpolation between anchors.
  function distanceRtoRate(km: number | null): number | null {
    if (km === null) return null;
    const anchors: [number, number][] = [
      [0, 13], [2, 15], [5, 17], [10, 22], [20, 24],
    ];
    if (km >= 20) return 24;
    for (let i = 0; i < anchors.length - 1; i++) {
      const [x1, y1] = anchors[i];
      const [x2, y2] = anchors[i + 1];
      if (km >= x1 && km <= x2) {
        const t = (km - x1) / (x2 - x1);
        return y1 + t * (y2 - y1);
      }
    }
    return 20;
  }
  
  // ---------- 3. WEIGHTS (Phase 1 rules engine) ----------
  const WEIGHTS = {
    cod: 20,
    newCustomer: 15,
    distance: 12,       // scaled by distanceRtoRate curve
    addressQuality: 15,
    landmarkAbsent: 8,
    priorRtoHistory: 20,
    categoryBenchmark: 10,
  };
  
  const CATEGORY_BENCHMARK_RTO: Record<string, number> = {
    Fashion: 22, Beauty: 14, Home: 12, Electronics: 9, Kitchen: 11, Other: 15,
  };
  
  // ---------- 4. RISK SCORING ----------
  export function scoreOrder(order: OrderInput): RiskPrediction {
    const drivers: RiskDriver[] = [];
    let score = 0;
    let signalsAvailable = 0;
    const signalsTotal = 7;
  
    // COD
    signalsAvailable++;
    if (order.paymentType === "COD") {
      score += WEIGHTS.cod;
      drivers.push({ factor: "cod", label: "driver.cod", points: WEIGHTS.cod, tag: "evidence-backed", direction: "increases" });
    }
  
    // New customer
    if (order.isNewCustomer !== null) {
      signalsAvailable++;
      if (order.isNewCustomer) {
        score += WEIGHTS.newCustomer;
        drivers.push({ factor: "newCustomer", label: "driver.newCustomer", points: WEIGHTS.newCustomer, tag: "evidence-backed", direction: "increases" });
      }
    }
  
    // Distance
    const distRate = distanceRtoRate(order.distanceKm);
    if (distRate !== null) {
      signalsAvailable++;
      const normalized = (distRate - 13) / (24 - 13); // 0..1 across curve range
      const pts = Math.round(normalized * WEIGHTS.distance);
      if (pts > 0) {
        score += pts;
        drivers.push({ factor: "distance", label: "driver.distance", points: pts, tag: "evidence-backed", direction: "increases" });
      }
    }
  
    // Address quality
    if (order.addressQualityScore !== null) {
      signalsAvailable++;
      const pts = Math.round((1 - order.addressQualityScore) * WEIGHTS.addressQuality);
      if (pts > 3) {
        score += pts;
        drivers.push({ factor: "addressQuality", label: "driver.addressQuality", points: pts, tag: "assumption", direction: "increases" });
      }
    }
  
    // Landmark
    if (order.landmarkPresent !== null) {
      signalsAvailable++;
      if (!order.landmarkPresent) {
        score += WEIGHTS.landmarkAbsent;
        drivers.push({ factor: "landmark", label: "driver.noLandmark", points: WEIGHTS.landmarkAbsent, tag: "assumption", direction: "increases" });
      }
    }
  
    // Prior RTO history
    if (order.customerPriorRtoRate !== null) {
      signalsAvailable++;
      const pts = Math.round(order.customerPriorRtoRate * WEIGHTS.priorRtoHistory);
      if (pts > 3) {
        score += pts;
        drivers.push({ factor: "priorRto", label: "driver.priorRto", points: pts, tag: "evidence-backed", direction: "increases" });
      }
    } else {
      // repeat customer with no bad history slightly lowers risk if known non-new
      if (order.isNewCustomer === false) {
        score -= 5;
        drivers.push({ factor: "repeatCustomer", label: "driver.repeatCustomerSafe", points: -5, tag: "benchmark-based", direction: "decreases" });
      }
    }
  
    // Category
    signalsAvailable++;
    const catRate = CATEGORY_BENCHMARK_RTO[order.category] ?? CATEGORY_BENCHMARK_RTO.Other;
    const catPts = Math.round(((catRate - 9) / (22 - 9)) * WEIGHTS.categoryBenchmark);
    if (catPts > 2) {
      score += catPts;
      drivers.push({ factor: "category", label: "driver.category", points: catPts, tag: "benchmark-based", direction: "increases" });
    }
  
    score = Math.max(0, Math.min(100, score));
  
    // Probability: blend case anchors (COD 20% / Prepaid 5%) with drivers, capped sane range
    const base = order.paymentType === "COD" ? 20 : 5;
    const modifier = (score - (order.paymentType === "COD" ? 20 : 5)) * 0.3;
    const probability = Math.max(0.03, Math.min(0.45, (base + modifier) / 100));
  
    const confidenceRatio = signalsAvailable / signalsTotal;
    let confidence: Confidence = "Low";
    let confidenceReason = "confidence.low";
    if (confidenceRatio >= 0.85) { confidence = "High"; confidenceReason = "confidence.high"; }
    else if (confidenceRatio >= 0.55) { confidence = "Medium"; confidenceReason = "confidence.medium"; }
  
    let tier: RiskTier = "LOW";
    if (score >= 80 || confidence === "Low") tier = "REVIEW";
    else if (score >= 60) tier = "HIGH";
    else if (score >= 35) tier = "MEDIUM";
  
    return {
      orderId: order.id,
      score,
      probability,
      probabilitySource: "benchmark",
      tier,
      confidence,
      confidenceReason,
      drivers: drivers.sort((a, b) => b.points - a.points),
      signalsAvailable,
      signalsTotal,
    };
  }
  
  // ---------- 5. INTERVENTION ENGINE ----------
  interface InterventionRule {
    triggerFactor: string;
    type: string;
    reasonKey: string;
    cost: number;
    successProbReduction: number; // fraction points reduction e.g. 0.08
    friction: "low" | "medium" | "high";
  }
  
  const INTERVENTION_RULES: InterventionRule[] = [
    { triggerFactor: "addressQuality", type: "confirmAddress", reasonKey: "reason.confirmAddress", cost: 2, successProbReduction: 0.09, friction: "low" },
    { triggerFactor: "landmark", type: "confirmAddress", reasonKey: "reason.confirmAddress", cost: 2, successProbReduction: 0.06, friction: "low" },
    { triggerFactor: "newCustomer", type: "sendReminder", reasonKey: "reason.newCustomerReminder", cost: 1, successProbReduction: 0.05, friction: "low" },
    { triggerFactor: "cod", type: "sendReminder", reasonKey: "reason.codReminder", cost: 1, successProbReduction: 0.04, friction: "low" },
    { triggerFactor: "distance", type: "prioritizeContact", reasonKey: "reason.distance", cost: 3, successProbReduction: 0.03, friction: "medium" },
    { triggerFactor: "priorRto", type: "humanReview", reasonKey: "reason.priorRto", cost: 0, successProbReduction: 0.12, friction: "high" },
  ];
  
  export function recommendIntervention(
    prediction: RiskPrediction,
    economics: EconomicsAssumptions = DEFAULT_ECONOMICS
  ): InterventionRecommendation | null {
    if (prediction.drivers.length === 0) return null;
  
    const cost170 = rtoCost(economics);
    const candidates = prediction.drivers
      .map((d) => INTERVENTION_RULES.find((r) => r.triggerFactor === d.factor))
      .filter((r): r is InterventionRule => !!r);
  
    if (candidates.length === 0) return null;
  
    const scored = candidates.map((rule) => {
      const currentExpectedCost = prediction.probability * cost170;
      const newProbability = Math.max(0.01, prediction.probability - rule.successProbReduction);
      const newExpectedCost = newProbability * cost170;
      const grossSavings = currentExpectedCost - newExpectedCost;
      const netSavings = grossSavings - rule.cost;
      const expectedValue = netSavings; // EV = net savings (friction handled separately as a display flag)
      return { rule, grossSavings, netSavings, expectedValue };
    });
  
    scored.sort((a, b) => b.expectedValue - a.expectedValue);
    const best = scored[0];
    if (best.expectedValue <= 0) return null; // don't recommend value-negative actions
  
    return {
      type: best.rule.type,
      reasonKey: best.rule.reasonKey,
      estimatedCost: best.rule.cost,
      estimatedGrossSavings: Math.round(best.grossSavings * 100) / 100,
      estimatedNetSavings: Math.round(best.netSavings * 100) / 100,
      friction: best.rule.friction,
      expectedValue: Math.round(best.expectedValue * 100) / 100,
    };
  }