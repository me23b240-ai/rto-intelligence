// lib/synthetic-riders.ts
import { AttemptInput, Attempt, Rider, Settings, AddressDifficulty } from "./types";
import { verifyAndPay } from "./rider-engine";

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cachedAttempts: Attempt[] | null = null;
let cachedRiders: Rider[] | null = null;

export function generateRiderData(settings: Settings, riderCount = 15, attemptCount = 300) {
  if (cachedAttempts && cachedRiders) return { attempts: cachedAttempts, riders: cachedRiders };

  const rng = mulberry32(202);
  const riderIds = Array.from({ length: riderCount }, (_, i) => `RDR-${100 + i}`);
  const shiftCounters: Record<string, number> = Object.fromEntries(riderIds.map((id) => [id, 0]));
  const attempts: Attempt[] = [];

  for (let i = 0; i < attemptCount; i++) {
    const riderId = riderIds[Math.floor(rng() * riderIds.length)];
    const distanceKm = Math.round((rng() * 12 + 1) * 10) / 10;
    if (distanceKm > 8) shiftCounters[riderId]++;

    const input: AttemptInput = {
      id: `ATT-${5000 + i}`,
      riderId,
      inGeofence: rng() < 0.85,
      deviceClean: rng() < 0.92,
      distanceKm,
      addressDifficulty: (rng() < 0.35 ? "hard" : "easy") as AddressDifficulty,
      farStopsThisShift: shiftCounters[riderId],
    };
    const result = verifyAndPay(input, settings);
    attempts.push({ ...input, ...result });
  }

  const riders: Rider[] = riderIds.map((id, idx) => {
    const mine = attempts.filter((a) => a.riderId === id);
    const verified = mine.filter((a) => a.status === "verified").length;
    const flagged = mine.filter((a) => a.status === "flagged_review").length;
    const earnings = mine.reduce((sum, a) => sum + a.payout, 0);
    return {
      id,
      name: `Rider ${idx + 1}`,
      attemptsToday: mine.length,
      verifiedRate: mine.length ? verified / mine.length : 0,
      flaggedCount: flagged,
      earningsToday: Math.round(earnings * 100) / 100,
    };
  });

  cachedAttempts = attempts;
  cachedRiders = riders;
  return { attempts, riders };
}

export function resetRiderCache() { cachedAttempts = null; cachedRiders = null; }