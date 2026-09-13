// lib/reverse-engine.ts
import { ParcelInput, RouteResult, Settings } from "./types";

export interface CapacityAvailability {
  backhaulOpen: boolean;
  batchOpen: boolean;
}

export function routeParcel(input: ParcelInput, settings: Settings, capacity: CapacityAvailability): RouteResult {
  const fragileBuffer = input.category === "Fragile" ? settings.fragileValueBufferPct : 0;
  const effectiveHighValueThreshold = settings.highValueThreshold * (1 - fragileBuffer / 100);

  if (input.backhaulAvailable && capacity.backhaulOpen) {
    return {
      path: "backhaul",
      cost: settings.backhaulCost,
      savings: settings.standardReverseCost - settings.backhaulCost,
      reasoning: "A vehicle already travels this route empty - the parcel rides back for near-zero marginal cost.",
    };
  }

  if (input.denseLaneToday && capacity.batchOpen) {
    return {
      path: "batch",
      cost: settings.batchCost,
      savings: settings.standardReverseCost - settings.batchCost,
      reasoning: "Enough returns on this lane today to batch them into one consolidated pickup run.",
    };
  }

  if (input.value < settings.lowValueThreshold && input.distanceBand === "far") {
    return {
      path: "liquidation",
      cost: settings.liquidationCost,
      savings: settings.standardReverseCost - settings.liquidationCost,
      reasoning: "Low order value plus long return distance - cheaper to liquidate locally than ship it all the way back.",
    };
  }

  if (input.value > effectiveHighValueThreshold) {
    const reasoning = input.category === "Fragile"
      ? "Fragile, high-value item - routed to fast & secure return earlier than the standard threshold to reduce damage risk."
      : "High-value item - a faster, more secure return path is worth the extra cost to protect the asset.";
    return { path: "fast_secure", cost: settings.fastSecureCost, savings: settings.standardReverseCost - settings.fastSecureCost, reasoning };
  }

  // Capacity-exhaustion fallbacks - explains *why* a parcel that looked
  // eligible on paper still ended up on the standard path.
  if (input.backhaulAvailable && !capacity.backhaulOpen) {
    return { path: "standard", cost: settings.standardReverseCost, savings: 0, reasoning: "Backhaul was available for this lane, but today's backhaul capacity is already used up - falls back to standard reverse." };
  }
  if (input.denseLaneToday && !capacity.batchOpen) {
    return { path: "standard", cost: settings.standardReverseCost, savings: 0, reasoning: "This lane qualified for batching, but today's batch capacity is full - falls back to standard reverse." };
  }

  return { path: "standard", cost: settings.standardReverseCost, savings: 0, reasoning: "No cheaper recovery path applies - standard reverse logistics is used." };
}