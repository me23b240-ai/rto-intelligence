// lib/awb-mock-db.ts
export type AwbPaymentType = "COD" | "Prepaid";
export type AwbFailureReason =
  | "customer_unavailable" | "address_issue" | "cod_refused"
  | "customer_cancelled" | "wrong_hub" | "unknown";
export type AwbAddressConfidence = "high" | "medium" | "low";

export interface AwbParcel {
  awb: string;
  seller: string;
  category: string;
  orderValue: number;
  payment: AwbPaymentType;
  status: string;
  failureReason: AwbFailureReason | null;
  attemptsLogged: number;
  attemptsVerified: number;
  maxAttempts: number;
  prevOrders: number;
  prevDelivered: number;
  prevRefused: number;
  addressConfidence: AwbAddressConfidence | null;
  parcelAgeHours: number;
  slaHoursLeft: number;
  currentDc: string;
  correctDc: string | null;
  returnDestination: string | null;
  sellerFlexible: boolean;
}

export type AwbMovementKind = "delivery" | "return" | "transfer";
export interface AwbMovement {
  id: string;
  label: string;
  kind: AwbMovementKind;
  destination: string;
  departureMin: number;
  publishedAtMin: number;
  capacity: number;
  baseFill: number;
  priority: boolean;
}

export const AWB_DC_NAME = "Chennai North Airhub";
export const AWB_DEMO_NOW_MIN = 15 * 60;

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const AWB_MOVEMENTS: AwbMovement[] = [
  { id: "DB-1", label: "Today 6–8 PM delivery batch (priority)", kind: "delivery", destination: "Customer", departureMin: 1080, publishedAtMin: 0, capacity: 30, baseFill: 26, priority: true },
  { id: "DB-2", label: "Tomorrow 10 AM–12 PM delivery batch", kind: "delivery", destination: "Customer", departureMin: 2040, publishedAtMin: 0, capacity: 80, baseFill: 40, priority: false },
  { id: "DB-3", label: "Tomorrow 6–8 PM delivery batch", kind: "delivery", destination: "Customer", departureMin: 2520, publishedAtMin: 0, capacity: 80, baseFill: 51, priority: false },
  { id: "MOV-092", label: "Priority return", kind: "return", destination: "Seller Hub X", departureMin: 975, publishedAtMin: 0, capacity: 10, baseFill: 4, priority: true },
  { id: "MOV-184", label: "Return movement", kind: "return", destination: "Seller Hub X", departureMin: 1110, publishedAtMin: 0, capacity: 40, baseFill: 22, priority: false },
  { id: "MOV-305", label: "Return movement", kind: "return", destination: "Seller Hub X", departureMin: 1980, publishedAtMin: 0, capacity: 60, baseFill: 10, priority: false },
  { id: "MOV-201", label: "Return movement", kind: "return", destination: "Seller Hub Y", departureMin: 1140, publishedAtMin: 0, capacity: 30, baseFill: 30, priority: false },
  { id: "MOV-202", label: "Return movement", kind: "return", destination: "Seller Hub Y", departureMin: 1290, publishedAtMin: 0, capacity: 40, baseFill: 12, priority: false },
  { id: "MOV-501", label: "Return movement", kind: "return", destination: "Seller Hub W", departureMin: 1860, publishedAtMin: 960, capacity: 50, baseFill: 0, priority: false },
  { id: "MOV-TR-77", label: "Transfer to Chennai South Airhub", kind: "transfer", destination: "Chennai South Airhub", departureMin: 1200, publishedAtMin: 0, capacity: 20, baseFill: 8, priority: false },
];

function mk(p: Partial<AwbParcel> & { awb: string }): AwbParcel {
  return {
    seller: "Sunrise Textiles", category: "Fashion", orderValue: 599, payment: "COD",
    status: "RTO / Delivery failed", failureReason: "customer_unavailable",
    attemptsLogged: 1, attemptsVerified: 1, maxAttempts: 3,
    prevOrders: 0, prevDelivered: 0, prevRefused: 0,
    addressConfidence: "high", parcelAgeHours: 18, slaHoursLeft: 48,
    currentDc: AWB_DC_NAME, correctDc: null, returnDestination: "Seller Hub X", sellerFlexible: false,
    ...p,
  };
}

export const AWB_DEMO_CASES: { label: string; parcel: AwbParcel }[] = [
  { label: "Unavailable · strong history", parcel: mk({ awb: "VL0084429601", orderValue: 799, failureReason: "customer_unavailable", attemptsLogged: 1, attemptsVerified: 1, prevOrders: 5, prevDelivered: 4, addressConfidence: "high", slaHoursLeft: 48 }) },
  { label: "Address issue · low confidence", parcel: mk({ awb: "VL0084429602", orderValue: 599, failureReason: "address_issue", attemptsLogged: 1, attemptsVerified: 1, prevOrders: 4, prevDelivered: 3, addressConfidence: "low", slaHoursLeft: 48 }) },
  { label: "COD refused · repeat refusals", parcel: mk({ awb: "VL0084429603", orderValue: 349, failureReason: "cod_refused", attemptsLogged: 3, attemptsVerified: 3, prevOrders: 5, prevDelivered: 2, prevRefused: 3, addressConfidence: "high", slaHoursLeft: 30 }) },
  { label: "Low value · 3 attempts used", parcel: mk({ awb: "VL0084429604", orderValue: 249, failureReason: "customer_unavailable", attemptsLogged: 3, attemptsVerified: 3, prevOrders: 2, prevDelivered: 1, addressConfidence: "medium", slaHoursLeft: 36 }) },
  { label: "₹2,400 · recoverable failure", parcel: mk({ awb: "VL0084429605", category: "Electronics", orderValue: 2400, failureReason: "customer_unavailable", attemptsLogged: 1, attemptsVerified: 1, prevOrders: 7, prevDelivered: 6, addressConfidence: "high", slaHoursLeft: 40 }) },
  { label: "Best movement is full", parcel: mk({ awb: "VL0084429606", orderValue: 429, failureReason: "cod_refused", attemptsLogged: 3, attemptsVerified: 3, prevOrders: 4, prevDelivered: 1, prevRefused: 2, addressConfidence: "high", returnDestination: "Seller Hub Y", slaHoursLeft: 30 }) },
  { label: "Seller SLA nearly breached", parcel: mk({ awb: "VL0084429607", orderValue: 1150, failureReason: "customer_unavailable", attemptsLogged: 2, attemptsVerified: 2, prevOrders: 3, prevDelivered: 2, addressConfidence: "medium", slaHoursLeft: 1.5 }) },
  { label: "Missing destination · SLA conflict", parcel: mk({ awb: "VL0084429608", orderValue: 520, failureReason: "cod_refused", attemptsLogged: 2, attemptsVerified: 2, prevOrders: 3, prevDelivered: 1, prevRefused: 2, addressConfidence: "medium", returnDestination: null, slaHoursLeft: 2.5 }) },
  { label: "Last attempt unverified", parcel: mk({ awb: "VL0084429609", orderValue: 899, failureReason: "customer_unavailable", attemptsLogged: 3, attemptsVerified: 2, prevOrders: 4, prevDelivered: 3, addressConfidence: "high", slaHoursLeft: 48 }) },
  { label: "Flexible seller · no movement yet", parcel: mk({ awb: "VL0084429610", orderValue: 279, failureReason: "cod_refused", attemptsLogged: 3, attemptsVerified: 3, prevOrders: 2, prevDelivered: 1, prevRefused: 1, addressConfidence: "high", returnDestination: "Seller Hub W", sellerFlexible: true, slaHoursLeft: 40 }) },
  { label: "Sitting at the wrong hub", parcel: mk({ awb: "VL0084429611", orderValue: 699, failureReason: "wrong_hub", attemptsLogged: 1, attemptsVerified: 1, prevOrders: 3, prevDelivered: 3, addressConfidence: "high", correctDc: "Chennai South Airhub", slaHoursLeft: 30 }) },
  { label: "No movement to seller hub", parcel: mk({ awb: "VL0084429612", orderValue: 329, failureReason: "customer_cancelled", attemptsLogged: 1, attemptsVerified: 1, prevOrders: 1, prevDelivered: 1, addressConfidence: "medium", returnDestination: "Seller Hub Z", slaHoursLeft: 40 }) },
];

export function lookupAwb(raw: string): AwbParcel | null {
  const awb = raw.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,20}$/.test(awb)) return null;
  const demo = AWB_DEMO_CASES.find((d) => d.parcel.awb === awb);
  if (demo) return demo.parcel;
  return generateParcel(awb);
}

function generateParcel(awb: string): AwbParcel {
  const rng = mulberry32(hashStr(awb));
  function pick<T>(arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }

  const payment: AwbPaymentType = rng() < 0.8 ? "COD" : "Prepaid";
  const reasons: AwbFailureReason[] = ["customer_unavailable", "customer_unavailable", "customer_unavailable", "address_issue", "address_issue", "cod_refused", "cod_refused", "customer_cancelled", "wrong_hub"];
  let failureReason = pick(reasons);
  if (payment === "Prepaid" && failureReason === "cod_refused") failureReason = "customer_cancelled";

  const attemptsLogged = 1 + Math.floor(rng() * 3);
  const attemptsVerified = rng() < 0.15 ? Math.max(0, attemptsLogged - 1) : attemptsLogged;
  const prevOrders = Math.floor(rng() * 9);
  const prevDelivered = Math.floor(rng() * (prevOrders + 1));
  const prevRefused = Math.floor(rng() * (prevOrders - prevDelivered + 1));

  const addrRoll = rng();
  const addressConfidence: AwbAddressConfidence | null = addrRoll < 0.05 ? null : addrRoll < 0.5 ? "high" : addrRoll < 0.8 ? "medium" : "low";
  const destRoll = rng();
  const returnDestination = destRoll < 0.04 ? null : destRoll < 0.5 ? "Seller Hub X" : destRoll < 0.75 ? "Seller Hub Y" : destRoll < 0.9 ? "Seller Hub W" : "Seller Hub Z";
  const slaRoll = rng();
  const slaHoursLeft = slaRoll < 0.08 ? Math.round((1 + rng() * 4) * 10) / 10 : Math.round(12 + rng() * 48);

  return {
    awb, seller: pick(["Sunrise Textiles", "Kaveri Home", "Glow Beauty Co", "Metro Gadgets", "Annapoorna Kitchenware"]),
    category: pick(["Fashion", "Home", "Beauty", "Electronics", "Kitchen"]),
    orderValue: Math.round(199 + rng() * 2600), payment,
    status: "RTO / Delivery failed", failureReason,
    attemptsLogged, attemptsVerified, maxAttempts: 3,
    prevOrders, prevDelivered, prevRefused, addressConfidence,
    parcelAgeHours: Math.round(6 + rng() * 66), slaHoursLeft,
    currentDc: AWB_DC_NAME, correctDc: failureReason === "wrong_hub" ? "Chennai South Airhub" : null,
    returnDestination, sellerFlexible: rng() < 0.3,
  };
}