// lib/rider-mock-data.ts
export type Zone = "Zone A" | "Zone B" | "Zone C" | "Zone D";
export type DistanceBand = "~2 km" | "~5 km" | "10 km+";
export type AddressConfidence = "high" | "medium" | "low";

export interface Point { x: number; y: number }

export interface RouteStop {
  awb: string;
  label: string;
  location: Point;
  zone: Zone;
  slaRemainingMin: number;
}

export interface Rider {
  id: string;
  name: string;
  currentLocation: Point;
  currentStopLabel: string;
  route: RouteStop[];       // pending stops, not yet delivered
  capacity: number;         // max pending stops this shift
  zoneHistory: Record<Zone, number>;          // success rate 0..1, per zone
  distanceBandHistory: Record<DistanceBand, number>; // success rate 0..1
  codSuccessRate: number;
  onTimeRate: number;
  overallSuccessRate: number;
  completedToday: number;
  successfulToday: number;
  todayRouteDistanceKm: number;
}

export interface ParcelCandidate {
  awb: string;
  location: Point;
  zone: Zone;
  orderValue: number;
  payment: "COD" | "Prepaid";
  addressConfidence: AddressConfidence;
  slaRemainingMin: number;
  priority: boolean;
}

export const DC_LOCATION: Point = { x: 0, y: 0 };
const ROAD_FACTOR = 1.35; // straight-line-to-road-network approximation, SIMULATED
export const SIM_SPEED_KMH = 20; // simulated average delivery-route speed

export function roadDistance(a: Point, b: Point): number {
  const straight = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  return Math.round(straight * ROAD_FACTOR * 100) / 100;
}

export function distanceBand(km: number): DistanceBand {
  if (km <= 2.5) return "~2 km";
  if (km <= 6) return "~5 km";
  return "10 km+";
}

export const RTO_BENCHMARK: Record<DistanceBand, number> = {
  "~2 km": 15,
  "~5 km": 17,
  "10 km+": 22,
};

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ZONES: Zone[] = ["Zone A", "Zone B", "Zone C", "Zone D"];
const BANDS: DistanceBand[] = ["~2 km", "~5 km", "10 km+"];

function seededZoneMap(rng: () => number, min: number, max: number): Record<Zone, number> {
  const m = {} as Record<Zone, number>;
  ZONES.forEach((z) => (m[z] = Math.round((min + rng() * (max - min)) * 100) / 100));
  return m;
}
function seededBandMap(rng: () => number, min: number, max: number): Record<DistanceBand, number> {
  const m = {} as Record<DistanceBand, number>;
  BANDS.forEach((b) => (m[b] = Math.round((min + rng() * (max - min)) * 100) / 100));
  return m;
}

// ---------- Hand-authored demo riders (for the two brief scenarios) ----------
export function buildInitialRiders(): Rider[] {
  return [
    {
      id: "R07",
      name: "Rider R07",
      currentLocation: { x: 3, y: 4 },       // "at Customer A"
      currentStopLabel: "Customer A (just delivered)",
      route: [],
      capacity: 5,
      zoneHistory: { "Zone A": 0.9, "Zone B": 0.94, "Zone C": 0.85, "Zone D": 0.8 },
      distanceBandHistory: { "~2 km": 0.95, "~5 km": 0.93, "10 km+": 0.78 },
      codSuccessRate: 0.88,
      onTimeRate: 0.92,
      overallSuccessRate: 0.91,
      completedToday: 8,
      successfulToday: 8,
      todayRouteDistanceKm: 22.4,
    },
    {
      id: "R12",
      name: "Rider R12",
      currentLocation: { x: -0.6, y: -0.5 },       // "at DC"
      currentStopLabel: "At DC",
      route: [],
      capacity: 5,
      zoneHistory: { "Zone A": 0.82, "Zone B": 0.7, "Zone C": 0.88, "Zone D": 0.86 },
      distanceBandHistory: { "~2 km": 0.9, "~5 km": 0.8, "10 km+": 0.7 },
      codSuccessRate: 0.79,
      onTimeRate: 0.83,
      overallSuccessRate: 0.83,
      completedToday: 6,
      successfulToday: 5,
      todayRouteDistanceKm: 18.1,
    },
    {
      id: "R09",
      name: "Rider R09",
      currentLocation: { x: 0.6, y: -0.5 },
      currentStopLabel: "At DC",
      route: [
        { awb: "AWB201", label: "Stop 1", location: { x: 4, y: -0.5 }, zone: "Zone B", slaRemainingMin: 150 },
        { awb: "AWB205", label: "Stop 2", location: { x: 4, y: 2.2 }, zone: "Zone B", slaRemainingMin: 190 },
      ],
      capacity: 6,
      zoneHistory: { "Zone A": 0.87, "Zone B": 0.9, "Zone C": 0.75, "Zone D": 0.7 },
      distanceBandHistory: { "~2 km": 0.92, "~5 km": 0.85, "10 km+": 0.65 },
      codSuccessRate: 0.81,
      onTimeRate: 0.88,
      overallSuccessRate: 0.85,
      completedToday: 5,
      successfulToday: 5,
      todayRouteDistanceKm: 16.7,
    },
    {
      id: "R15",
      name: "Rider R15",
      currentLocation: { x: -3, y: 2 },
      currentStopLabel: "Customer D",
      route: [
        { awb: "AWB240", label: "Stop 1", location: { x: -5, y: 3 }, zone: "Zone D", slaRemainingMin: 210 },
      ],
      capacity: 5,
      zoneHistory: { "Zone A": 0.7, "Zone B": 0.75, "Zone C": 0.68, "Zone D": 0.93 },
      distanceBandHistory: { "~2 km": 0.9, "~5 km": 0.82, "10 km+": 0.6 },
      codSuccessRate: 0.72,
      onTimeRate: 0.79,
      overallSuccessRate: 0.77,
      completedToday: 7,
      successfulToday: 5,
      todayRouteDistanceKm: 19.9,
    },
  ];
}

// ---------- Hand-authored demo parcels (for the two brief scenarios + variety) ----------
export function buildInitialParcels(): ParcelCandidate[] {
  return [
    // Scenario 1: A→B ≈1.8km, DC→B ≈7.2km - R07 should win over R12
    { awb: "AWB391", location: { x: 7.2, y: 3.6 }, zone: "Zone B", orderValue: 650, payment: "COD", addressConfidence: "high", slaRemainingMin: 300, priority: false },

    // Scenario for mid-route insertion beating append-at-end for R09 (near the P–Q corridor)
    { awb: "AWB215", location: { x: 6.5, y: 0.4 }, zone: "Zone B", orderValue: 420, payment: "COD", addressConfidence: "medium", slaRemainingMin: 240, priority: false },

    // 10km+ band, tests case RTO benchmark display
    { awb: "AWB472", location: { x: 7, y: 6 }, zone: "Zone C", orderValue: 1400, payment: "COD", addressConfidence: "medium", slaRemainingMin: 120, priority: true },

    // ~2km band near R15
    { awb: "AWB182", location: { x: -4, y: 2.5 }, zone: "Zone D", orderValue: 299, payment: "Prepaid", addressConfidence: "high", slaRemainingMin: 200, priority: false },

    // Tight SLA - should force allocation away from the "best" but slower rider
    { awb: "AWB560", location: { x: 1, y: 0.5 }, zone: "Zone A", orderValue: 899, payment: "COD", addressConfidence: "low", slaRemainingMin: 25, priority: true },
  ];
}

// lib/rider-mock-data.ts - replace seededExtraParcels() entirely
export function seededExtraParcels(count: number, seed = 77, avoidPoints: Point[] = []): ParcelCandidate[] {
  const rng = mulberry32(seed);
  const out: ParcelCandidate[] = [];
  const placed: Point[] = [...avoidPoints];
  const MIN_SEP = 1.4;

  for (let i = 0; i < count; i++) {
    let loc: Point = { x: 0, y: 0 };
    let tries = 0;
    do {
      const angle = rng() * Math.PI * 2;
      const dist = 2 + rng() * 6;
      loc = { x: Math.round(Math.cos(angle) * dist * 10) / 10, y: Math.round(Math.sin(angle) * dist * 10) / 10 };
      tries++;
    } while (placed.some((p) => Math.hypot(p.x - loc.x, p.y - loc.y) < MIN_SEP) && tries < 30);
    placed.push(loc);

    out.push({
      awb: `AWB${900 + i}`,
      location: loc,
      zone: ZONES[Math.floor(rng() * ZONES.length)],
      orderValue: Math.round(199 + rng() * 1800),
      payment: rng() < 0.75 ? "COD" : "Prepaid",
      addressConfidence: rng() < 0.5 ? "high" : rng() < 0.8 ? "medium" : "low",
      slaRemainingMin: Math.round(30 + rng() * 270),
      priority: rng() < 0.15,
    });
  }
  return out;
}

// lib/rider-mock-data.ts - add this block
export const AREA_NAMES = ["Koramangala", "Indiranagar", "HSR Layout", "Whitefield", "Jayanagar", "BTM Layout", "Marathahalli", "Electronic City"];

export function nameForLocation(p: Point): string {
  // Deterministic name per rounded coordinate, just for display flavor - not a real geocoded address.
  const key = Math.round(p.x * 3) + Math.round(p.y * 7) * 13;
  const idx = ((key % AREA_NAMES.length) + AREA_NAMES.length) % AREA_NAMES.length;
  return AREA_NAMES[idx];
}