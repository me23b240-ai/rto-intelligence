// lib/rider-history.ts
import { Zone, DistanceBand } from "./rider-mock-data";

export interface DailyRecord {
  dayOffset: number; // 0 = today, 89 = 90 days ago
  zone: Zone;
  band: DistanceBand;
  attempted: number;
  delivered: number;
  onTime: number;
  codAttempted: number;
  codDelivered: number;
}

export interface PeriodStats {
  label: string;
  days: string;
  weight: number;
  attempted: number;
  delivered: number;
  successRate: number;
}

export interface WeightedPerformance {
  overall: number;
  byZone: Record<Zone, number>;
  byBand: Record<DistanceBand, number>;
  codRate: number;
  periods: PeriodStats[];
}

const ZONES: Zone[] = ["Zone A", "Zone B", "Zone C", "Zone D"];
const BANDS: DistanceBand[] = ["~2 km", "~5 km", "10 km+"];

const PERIOD_WEIGHTS = [
  { label: "Last 30 days", days: "0–29", weight: 0.5, min: 0, max: 29 },
  { label: "31–60 days ago", days: "30–59", weight: 0.3, min: 30, max: 59 },
  { label: "61–90 days ago", days: "60–89", weight: 0.2, min: 60, max: 89 },
];

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** SIMULATED - stands in for a real 90-day Valmo delivery log, per rider. */
export function generateRiderHistory(riderId: string, baseSuccessRate: number): DailyRecord[] {
  const rng = mulberry32(hashStr(riderId));
  const records: DailyRecord[] = [];
  for (let day = 0; day < 90; day++) {
    const deliveriesToday = 3 + Math.floor(rng() * 6);
    for (let i = 0; i < deliveriesToday; i++) {
      const recencyTrend = (1 - day / 90) * 0.06; // slight recent improvement/decline per rider seed
      const p = Math.max(0.5, Math.min(0.98, baseSuccessRate + recencyTrend + (rng() - 0.5) * 0.15));
      const delivered = rng() < p ? 1 : 0;
      const onTime = delivered && rng() < 0.9 ? 1 : 0;
      const isCod = rng() < 0.78;
      records.push({
        dayOffset: day,
        zone: ZONES[Math.floor(rng() * ZONES.length)],
        band: BANDS[Math.floor(rng() * BANDS.length)],
        attempted: 1, delivered, onTime,
        codAttempted: isCod ? 1 : 0,
        codDelivered: isCod ? delivered : 0,
      });
    }
  }
  return records;
}

function rate(delivered: number, attempted: number) {
  return attempted > 0 ? Math.round((delivered / attempted) * 100) / 100 : 0.75;
}

export function computeWeightedPerformance(history: DailyRecord[]): WeightedPerformance {
  const periods: PeriodStats[] = PERIOD_WEIGHTS.map((pw) => {
    const recs = history.filter((r) => r.dayOffset >= pw.min && r.dayOffset <= pw.max);
    const attempted = recs.reduce((s, r) => s + r.attempted, 0);
    const delivered = recs.reduce((s, r) => s + r.delivered, 0);
    return { label: pw.label, days: pw.days, weight: pw.weight, attempted, delivered, successRate: rate(delivered, attempted) };
  });

  const overall = Math.round(periods.reduce((sum, p) => sum + p.successRate * p.weight, 0) * 100) / 100;

  function weightedFor(filterFn: (r: DailyRecord) => boolean): number {
    const vals = PERIOD_WEIGHTS.map((pw) => {
      const recs = history.filter((r) => r.dayOffset >= pw.min && r.dayOffset <= pw.max && filterFn(r));
      const attempted = recs.reduce((s, r) => s + r.attempted, 0);
      const delivered = recs.reduce((s, r) => s + r.delivered, 0);
      return { rate: rate(delivered, attempted), weight: pw.weight, hasData: attempted > 0 };
    });
    const withData = vals.filter((v) => v.hasData);
    if (!withData.length) return overall;
    const totalW = withData.reduce((s, v) => s + v.weight, 0);
    return Math.round((withData.reduce((s, v) => s + v.rate * v.weight, 0) / totalW) * 100) / 100;
  }

  const byZone = {} as Record<Zone, number>;
  ZONES.forEach((z) => (byZone[z] = weightedFor((r) => r.zone === z)));
  const byBand = {} as Record<DistanceBand, number>;
  BANDS.forEach((b) => (byBand[b] = weightedFor((r) => r.band === b)));

  const codAttempted = history.reduce((s, r) => s + r.codAttempted, 0);
  const codDelivered = history.reduce((s, r) => s + r.codDelivered, 0);

  return { overall, byZone, byBand, codRate: rate(codDelivered, codAttempted), periods };
}