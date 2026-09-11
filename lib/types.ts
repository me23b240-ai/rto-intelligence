// lib/types.ts

// ---------- Reverse Logistics Engine ----------
export type DistanceBand = "near" | "mid" | "far";
export type RoutePath = "backhaul" | "batch" | "liquidation" | "fast_secure" | "standard";

export interface ParcelInput {
  id: string;
  value: number;
  distanceBand: DistanceBand;
  denseLaneToday: boolean;
  backhaulAvailable: boolean;
}

export interface RouteResult {
  path: RoutePath;
  cost: number;
  savings: number;
  reasoning: string;
}

export type Parcel = ParcelInput & RouteResult;

// ---------- Rider Verification & Payout Engine ----------
export type AddressDifficulty = "easy" | "hard";
export type VerificationStatus = "verified" | "flagged_review" | "fallback_photo";

export interface AttemptInput {
  id: string;
  riderId: string;
  inGeofence: boolean;
  deviceClean: boolean;
  distanceKm: number;
  addressDifficulty: AddressDifficulty;
  farStopsThisShift: number;
}

export interface PayoutBreakdown {
  base: number;
  distanceAddOn: number;
  difficultyWeight: number;
  returnBonus: number;
}

export interface VerificationResult {
  status: VerificationStatus;
  payout: number;
  breakdown: PayoutBreakdown;
  fairAllocationNote: string | null;
}

export type Attempt = AttemptInput & VerificationResult;

export interface Rider {
  id: string;
  name: string;
  attemptsToday: number;
  verifiedRate: number;
  flaggedCount: number;
  earningsToday: number;
}

// ---------- Shared Settings ----------
export type EvidenceTag = "evidence-backed" | "benchmark-based" | "assumption";

export const DEFAULT_SETTINGS: Settings = {
  standardReverseCost: 120,
  forwardCost: 50,
  backhaulCost: 35,
  batchCost: 55,
  liquidationCost: 20,
  fastSecureCost: 90,
  lowValueThreshold: 300,
  highValueThreshold: 1500,

  basePay: 15,
  baseKmCovered: 4,
  perKmRate: 3,
  hardAddressBonus: 5,
  farStopThreshold: 8,
  farStopBonus: 5,      // was 8, now matches spec
  farStopCap: 3,         // was 6, now matches spec
};

export const SETTINGS_TAGS: Record<keyof Settings, EvidenceTag> = {
  standardReverseCost: "evidence-backed",  // 🟢 case fact
  forwardCost: "evidence-backed",           // 🟢 case fact
  backhaulCost: "assumption",               // 🟠 assumption
  batchCost: "assumption",
  liquidationCost: "assumption",
  fastSecureCost: "assumption",
  lowValueThreshold: "assumption",
  highValueThreshold: "assumption",
  basePay: "assumption",
  baseKmCovered: "assumption",
  perKmRate: "assumption",
  hardAddressBonus: "assumption",
  farStopThreshold: "assumption",
  farStopBonus: "assumption",
  farStopCap: "assumption",
};
