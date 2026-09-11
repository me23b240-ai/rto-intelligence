// lib/reverse-engine.ts
import { ParcelInput, RouteResult, Settings } from "./types";

export function routeParcel(input: ParcelInput, settings: Settings): RouteResult {
  if (input.backhaulAvailable) {
    return {
      path: "backhaul",
      cost: settings.backhaulCost,
      savings: settings.standardReverseCost - settings.backhaulCost,
      reasoning: "A vehicle already travels this route empty - the parcel rides back for near-zero marginal cost.",
    };
  }

  if (input.denseLaneToday) {
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

  if (input.value > settings.highValueThreshold) {
    return {
      path: "fast_secure",
      cost: settings.fastSecureCost,
      savings: settings.standardReverseCost - settings.fastSecureCost,
      reasoning: "High-value item - a faster, more secure return path is worth the extra cost to protect the asset.",
    };
  }

  return {
    path: "standard",
    cost: settings.standardReverseCost,
    savings: 0,
    reasoning: "No cheaper recovery path applies - standard reverse logistics is used.",
  };
}