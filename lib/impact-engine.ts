// lib/impact-engine.ts
import { Settings } from "./types";

export type ScenarioName = "conservative" | "base" | "aggressive";

export interface Per100Breakdown {
  codOrders: number;
  codRtos: number;
  prepaidOrders: number;
  prepaidRtos: number;
  totalRtos: number;
  blendedRtoRatePct: number;
  totalExposurePerRto: number;
  exposureMultiplier: number; // e.g. 3.4x
}

export interface ScenarioResult {
  addressableSharePct: number;
  recoveryRatePct: number;
  rtosAvoidedPer100: number;
  exposureAvoidedPer100: number;
  annualExposureAvoidedCr: number;
}

export interface AnnualScale {
  placedOrders: number;
  blendedRtoRatePct: number;
  failedDeliveries: number;
  incrementalReverseCostCr: number;
  totalLogisticsExposureCr: number;
  valuePerPointRtoCr: number;
}

// ---------- Per-100-orders baseline (from case data) ----------
export function computePer100Baseline(settings: Settings): Per100Breakdown {
  const codOrders = settings.codSharePct;
  const prepaidOrders = 100 - settings.codSharePct;
  const codRtos = Math.round((codOrders * settings.codRtoRatePct) / 100 * 10) / 10;
  const prepaidRtos = Math.round((prepaidOrders * settings.prepaidRtoRatePct) / 100 * 10) / 10;
  const totalRtos = Math.round((codRtos + prepaidRtos) * 10) / 10;
  const blendedRtoRatePct = totalRtos; // per 100 orders, RTOs == rate %
  const totalExposurePerRto = settings.forwardCost + settings.standardReverseCost;
  const exposureMultiplier = Math.round((totalExposurePerRto / settings.forwardCost) * 10) / 10;

  return { codOrders, codRtos, prepaidOrders, prepaidRtos, totalRtos, blendedRtoRatePct, totalExposurePerRto, exposureMultiplier };
}

// ---------- Annual scale-up ----------
export function computeAnnualScale(settings: Settings, baseline: Per100Breakdown): AnnualScale {
  const placedOrders = settings.annualOrderVolume;
  const blendedRtoRatePct = baseline.blendedRtoRatePct;
  const failedDeliveries = placedOrders * (blendedRtoRatePct / 100);
  const incrementalReverseCostCr = (failedDeliveries * settings.standardReverseCost) / 1e7; // ₹ to Cr
  const totalLogisticsExposureCr = (failedDeliveries * baseline.totalExposurePerRto) / 1e7;
  const valuePerPointRtoCr = (placedOrders * 0.01 * settings.standardReverseCost) / 1e7;

  return { placedOrders, blendedRtoRatePct, failedDeliveries, incrementalReverseCostCr, totalLogisticsExposureCr, valuePerPointRtoCr };
}

// ---------- Recovery scenario ----------
export function computeScenario(
  scenario: ScenarioName,
  settings: Settings,
  baseline: Per100Breakdown
): ScenarioResult {
  const map: Record<ScenarioName, { addressable: number; recovery: number }> = {
    conservative: { addressable: settings.conservativeAddressableSharePct, recovery: settings.conservativeRecoveryRatePct },
    base: { addressable: settings.baseAddressableSharePct, recovery: settings.baseRecoveryRatePct },
    aggressive: { addressable: settings.aggressiveAddressableSharePct, recovery: settings.aggressiveRecoveryRatePct },
  };
  const { addressable, recovery } = map[scenario];

  const rtosAvoidedPer100 = Math.round(baseline.totalRtos * (addressable / 100) * (recovery / 100) * 10) / 10;
  const exposureAvoidedPer100 = Math.round(rtosAvoidedPer100 * baseline.totalExposurePerRto);
  const annualExposureAvoidedCr = Math.round(
    ((rtosAvoidedPer100 / 100) * settings.annualOrderVolume * baseline.totalExposurePerRto) / 1e7
  );

  return { addressableSharePct: addressable, recoveryRatePct: recovery, rtosAvoidedPer100, exposureAvoidedPer100, annualExposureAvoidedCr };
}