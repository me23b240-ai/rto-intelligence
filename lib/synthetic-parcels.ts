// lib/synthetic-parcels.ts
import { ParcelInput, Parcel, Settings, DistanceBand } from "./types";
import { routeParcel } from "./reverse-engine";

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cached: Parcel[] | null = null;

export function generateParcels(settings: Settings, count = 300): Parcel[] {
  if (cached && cached.length === count) return cached;

  const rng = mulberry32(101);
  const bands: DistanceBand[] = ["near", "mid", "far"];
  const parcels: Parcel[] = [];

  for (let i = 0; i < count; i++) {
    const input: ParcelInput = {
      id: `PRC-${2000 + i}`,
      value: Math.round(rng() * 2500 + 150),
      distanceBand: bands[Math.floor(rng() * bands.length)],
      denseLaneToday: rng() < 0.3,
      backhaulAvailable: rng() < 0.2,
    };
    const result = routeParcel(input, settings);
    parcels.push({ ...input, ...result });
  }

  cached = parcels;
  return parcels;
}

export function resetParcelCache() { cached = null; }