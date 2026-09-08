// lib/synthetic-data.ts
import { OrderInput } from "./types";

// Seeded PRNG (mulberry32) — deterministic so server-render and client-render
// produce IDENTICAL data. This fixes hydration mismatches and keeps the
// dashboard and order-detail pages consistent with each other.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 42; // fixed seed = same "random" dataset every time, everywhere

function rand(rng: () => number, min: number, max: number) {
  return rng() * (max - min) + min;
}
function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

const CATEGORIES = ["Fashion", "Beauty", "Home", "Electronics", "Kitchen"];
const CATEGORY_BASE_RTO: Record<string, number> = {
  Fashion: 22, Beauty: 14, Home: 12, Electronics: 9, Kitchen: 11,
};

let cachedOrders: OrderInput[] | null = null;

export function generateSyntheticOrders(count = 1000): OrderInput[] {
  if (cachedOrders && cachedOrders.length === count) return cachedOrders;

  const rng = mulberry32(SEED);
  const orders: OrderInput[] = [];

  for (let i = 0; i < count; i++) {
    const paymentType = rng() < 0.8 ? "COD" : "Prepaid";
    const isNewCustomer = rng() < 0.55;
    const distanceKm = Math.round(rand(rng, 1, 22) * 10) / 10;
    const category = pick(rng, CATEGORIES);
    const addressQualityScore = Math.round(rand(rng, 0.2, 1) * 100) / 100;
    const landmarkPresent = rng() < 0.6;
    const customerPriorRtoRate = isNewCustomer ? null : Math.round(rand(rng, 0, 0.35) * 100) / 100;
    const orderValue = Math.round(rand(rng, 199, 2499));

    let p = paymentType === "COD" ? 0.20 : 0.05;
    p += isNewCustomer ? 0.04 : -0.03;
    p += (1 - addressQualityScore) * 0.08;
    p += landmarkPresent ? -0.02 : 0.03;
    p += ((distanceKm - 5) / 20) * 0.05;
    p += (customerPriorRtoRate ?? 0.1) * 0.15;
    p += (CATEGORY_BASE_RTO[category] - 14) / 100;
    p += rand(rng, -0.06, 0.06);
    p = Math.max(0.03, Math.min(0.55, p));

    const rto = rng() < p;

    orders.push({
      id: `ME${1000 + i}`,
      orderValue,
      paymentType,
      pincode: `${600000 + Math.floor(rand(rng, 0, 99999))}`,
      distanceKm,
      isNewCustomer,
      category,
      addressQualityScore,
      landmarkPresent,
      customerPriorRtoRate,
      finalStatus: rto ? "RTO" : "Delivered",
    });
  }

  cachedOrders = orders;
  return orders;
}