// lib/rider-payout-engine.ts
import { Rider } from "./rider-mock-data";

export const BASE_PAYOUT_PER_DELIVERY = 15; // CASE ASSUMPTION

export interface PayoutIncentiveConfig {
  performanceIncentivePerDelivery: number; // HYPOTHESIS
  performanceIncentiveThreshold: number;    // onTimeRate threshold to qualify, HYPOTHESIS
  routeIncentivePerKm: number;              // HYPOTHESIS
}

export const DEFAULT_INCENTIVES: PayoutIncentiveConfig = {
  performanceIncentivePerDelivery: 2,
  performanceIncentiveThreshold: 0.9,
  routeIncentivePerKm: 0.5,
};

export interface PayoutBreakdown {
  basePayout: number;
  performanceIncentive: number;
  routeIncentive: number;
  totalModeledPayout: number;
  payoutPerCompletedDelivery: number;
}

export function computePayout(rider: Rider, cfg: PayoutIncentiveConfig): PayoutBreakdown {
  const basePayout = rider.successfulToday * BASE_PAYOUT_PER_DELIVERY;
  const performanceIncentive = rider.onTimeRate >= cfg.performanceIncentiveThreshold
    ? Math.round(rider.successfulToday * cfg.performanceIncentivePerDelivery)
    : 0;
  const routeIncentive = Math.round(rider.todayRouteDistanceKm * cfg.routeIncentivePerKm);
  const totalModeledPayout = basePayout + performanceIncentive + routeIncentive;
  const payoutPerCompletedDelivery = rider.completedToday > 0
    ? Math.round((totalModeledPayout / rider.completedToday) * 100) / 100
    : 0;
  return { basePayout, performanceIncentive, routeIncentive, totalModeledPayout, payoutPerCompletedDelivery };
}
// lib/rider-payout-engine.ts - add this at the bottom
export function estimateDeliveryPayout(
  rider: Rider,
  incrementalKm: number,
  cfg: PayoutIncentiveConfig
): { base: number; performance: number; route: number; total: number } {
  const base = BASE_PAYOUT_PER_DELIVERY;
  const performance = rider.onTimeRate >= cfg.performanceIncentiveThreshold ? cfg.performanceIncentivePerDelivery : 0;
  const route = Math.round(incrementalKm * cfg.routeIncentivePerKm * 100) / 100;
  const total = Math.round((base + performance + route) * 100) / 100;
  return { base, performance, route, total };
}

// lib/rider-payout-engine.ts - add at the bottom
import { RouteStepInfo } from "./rider-route-engine";

export interface RoutePayoutSummary {
  steps: { awb: string; legKm: number; payout: number }[];
  totalPayout: number;
}

export function computeRoutePayout(rider: Rider, steps: RouteStepInfo[], cfg: PayoutIncentiveConfig): RoutePayoutSummary {
  const stepPayouts = steps.map((s) => {
    const { total } = estimateDeliveryPayout(rider, s.legDistanceKm, cfg);
    return { awb: s.awb, legKm: s.legDistanceKm, payout: total };
  });
  const totalPayout = Math.round(stepPayouts.reduce((sum, s) => sum + s.payout, 0) * 100) / 100;
  return { steps: stepPayouts, totalPayout };
}