// lib/types.ts
export type PaymentType = "COD" | "Prepaid";
export type RiskTier = "LOW" | "MEDIUM" | "HIGH" | "REVIEW";
export type Confidence = "Low" | "Medium" | "High";
export type EvidenceTag = "evidence-backed" | "benchmark-based" | "assumption";
export type ProbabilitySource = "benchmark" | "seller_history";
export type Friction = "low" | "medium" | "high";

export interface OrderInput {
  id: string;
  orderValue: number;
  paymentType: PaymentType;
  pincode: string;
  distanceKm: number | null;
  isNewCustomer: boolean | null;
  category: string;
  addressQualityScore: number | null; // 0..1
  landmarkPresent: boolean | null;
  customerPriorRtoRate: number | null; // 0..1, null if unknown
  finalStatus?: "Delivered" | "RTO" | "Pending";
}

export interface RiskDriver {
  factor: string;              // machine key, e.g. "cod"
  label: string;                // i18n key for display
  points: number;
  tag: EvidenceTag;
  direction: "increases" | "decreases";
}

export interface RiskPrediction {
  orderId: string;
  score: number;                 // 0-100
  probability: number;           // 0-1
  probabilitySource: ProbabilitySource;
  tier: RiskTier;
  confidence: Confidence;
  confidenceReason: string;      // i18n key
  drivers: RiskDriver[];
  signalsAvailable: number;
  signalsTotal: number;
}

export interface InterventionRecommendation {
  type: string;                  // i18n key, e.g. "confirmAddress"
  reasonKey: string;
  estimatedCost: number;
  estimatedGrossSavings: number;
  estimatedNetSavings: number;
  friction: Friction;
  expectedValue: number;
}

export interface EconomicsAssumptions {
  forwardCost: number;   // ₹50 default
  reverseCost: number;   // ₹120 default
}