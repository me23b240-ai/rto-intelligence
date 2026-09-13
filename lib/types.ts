// lib/types.ts

// ---------- Reverse Logistics Engine ----------
export type DistanceBand = "near" | "mid" | "far";
export type RoutePath = "backhaul" | "batch" | "liquidation" | "fast_secure" | "standard";
export type ParcelCategory = "Fashion" | "Electronics" | "Fragile" | "Other";

export interface ParcelInput {
  id: string;
  value: number;
  distanceBand: DistanceBand;
  denseLaneToday: boolean;
  backhaulAvailable: boolean;
  category: ParcelCategory;
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
  attemptNumber: number;          // NEW — 1st, 2nd, 3rd attempt
  priorFailureReason?: string;     // NEW — optional, feeds next attempt's context
}

export interface PayoutBreakdown {
  base: number;
  distanceAddOn: number;
  difficultyWeight: number;
  returnBonus: number;
  reattemptBonus: number;  
}

export interface VerificationResult {
  status: VerificationStatus;
  payout: number;
  confidence: number; 
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
// ---------- NEW: Shared capacity pools ----------
export interface CapacityPools {
  backhaulUsedToday: number;
  batchUsedToday: number;
}

export const DEFAULT_CAPACITY: CapacityPools = {
  backhaulUsedToday: 0,
  batchUsedToday: 0,
};

// ---------- NEW: Rider roster (shared allocation across multiple riders) ----------
export interface RiderSlot {
  id: string;
  name: string;
  farStopsToday: number;
}

// ---------- NEW: Decision log (Predict → Explain → Intervene → Measure) ----------
export type EngineType = "reverse" | "rider";
export type OutcomeStatus = "pending" | "success" | "failure";

export interface DecisionLogEntry {
  id: string;
  engine: EngineType;
  timestamp: number;
  summary: string;
  detail: string;
  cost: number;
  outcome: OutcomeStatus;
}
// ---------- Shared Settings ----------
export type EvidenceTag = "fact" | "primary" | "calculated" | "hypothesis";

export interface Settings {
  dailyBackhaulCapacity: number;
  dailyBatchCapacity: number;
  maxAttemptsBeforeRTO: number;
  fragileValueBufferPct: number;
  reattemptBonus: number;
  // Reverse engine costs
  standardReverseCost: number;
  forwardCost: number;
  backhaulCost: number;
  batchCost: number;
  liquidationCost: number;
  fastSecureCost: number;
  lowValueThreshold: number;
  highValueThreshold: number;

  // Rider engine payout
  basePay: number;
  baseKmCovered: number;
  perKmRate: number;
  hardAddressBonus: number;
  farStopThreshold: number;
  farStopBonus: number;
  farStopCap: number;

  // Business Impact — case baseline
  annualOrderVolume: number;       // 2.67B, FY26
  codSharePct: number;              // 80%
  codRtoRatePct: number;             // 20%
  prepaidRtoRatePct: number;         // 5%

  // Business Impact — recovery scenarios
  conservativeAddressableSharePct: number; // 25%
  conservativeRecoveryRatePct: number;      // 30%
  baseAddressableSharePct: number;          // 40%
  baseRecoveryRatePct: number;               // 45%
  aggressiveAddressableSharePct: number;    // 55%
  aggressiveRecoveryRatePct: number;         // 65%
}

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
  farStopBonus: 5,
  farStopCap: 3,

  annualOrderVolume: 2670000000,
  codSharePct: 80,
  codRtoRatePct: 20,
  prepaidRtoRatePct: 5,

  conservativeAddressableSharePct: 25,
  conservativeRecoveryRatePct: 30,
  baseAddressableSharePct: 40,
  baseRecoveryRatePct: 45,
  aggressiveAddressableSharePct: 55,
  aggressiveRecoveryRatePct: 65,

  dailyBackhaulCapacity: 40,
  dailyBatchCapacity: 60,
  maxAttemptsBeforeRTO: 3,
  fragileValueBufferPct: 20,
  reattemptBonus: 4,
};

export const SETTINGS_TAGS: Record<keyof Settings, EvidenceTag> = {
  dailyBackhaulCapacity: "hypothesis",
  dailyBatchCapacity: "hypothesis",
  maxAttemptsBeforeRTO: "hypothesis",
  fragileValueBufferPct: "hypothesis",
  reattemptBonus: "hypothesis",
  standardReverseCost: "fact",
  forwardCost: "fact",
  backhaulCost: "hypothesis",
  batchCost: "hypothesis",
  liquidationCost: "hypothesis",
  fastSecureCost: "hypothesis",
  lowValueThreshold: "hypothesis",
  highValueThreshold: "hypothesis",
  basePay: "hypothesis",
  baseKmCovered: "hypothesis",
  perKmRate: "hypothesis",
  hardAddressBonus: "hypothesis",
  farStopThreshold: "hypothesis",
  farStopBonus: "hypothesis",
  farStopCap: "hypothesis",

  annualOrderVolume: "fact",
  codSharePct: "fact",
  codRtoRatePct: "fact",
  prepaidRtoRatePct: "fact",

  conservativeAddressableSharePct: "hypothesis",
  conservativeRecoveryRatePct: "hypothesis",
  baseAddressableSharePct: "hypothesis",
  baseRecoveryRatePct: "hypothesis",
  aggressiveAddressableSharePct: "hypothesis",
  aggressiveRecoveryRatePct: "hypothesis",
};