// lib/rider-route-engine.ts
import { Rider, ParcelCandidate, RouteStop, Point, roadDistance, distanceBand, RTO_BENCHMARK, SIM_SPEED_KMH, DC_LOCATION } from "./rider-mock-data";
// lib/rider-route-engine.ts — add this import at top
import { DailyRecord, computeWeightedPerformance } from "./rider-history";

export interface RouteOption {
  insertAt: number;                 // index in the new route array
  newRoute: RouteStop[];
  totalDistanceKm: number;
  incrementalDistanceKm: number;
  routeTimeMin: number;
  cumulativeTimeAtStopMin: number;  // time to reach the inserted parcel specifically
  feasible: boolean;
}

function routeTotalDistance(from: Point, stops: { location: Point }[]): number {
  let total = 0;
  let cur = from;
  for (const s of stops) { total += roadDistance(cur, s.location); cur = s.location; }
  return Math.round(total * 100) / 100;
}

function cumulativeTimeToIndex(from: Point, stops: { location: Point }[], idx: number): number {
  let dist = 0;
  let cur = from;
  for (let i = 0; i <= idx; i++) { dist += roadDistance(cur, stops[i].location); cur = stops[i].location; }
  return Math.round((dist / SIM_SPEED_KMH) * 60);
}

/** Tries every insertion position in the rider's current route and returns the best feasible option. */
export function bestInsertion(rider: Rider, parcel: ParcelCandidate): RouteOption | null {
  const candidateStop: RouteStop = {
    awb: parcel.awb, label: parcel.awb, location: parcel.location,
    zone: parcel.zone, slaRemainingMin: parcel.slaRemainingMin,
  };
  const baseTotal = routeTotalDistance(rider.currentLocation, rider.route);
  const options: RouteOption[] = [];

  for (let i = 0; i <= rider.route.length; i++) {
    const newRoute = [...rider.route.slice(0, i), candidateStop, ...rider.route.slice(i)];
    const totalDistanceKm = routeTotalDistance(rider.currentLocation, newRoute);
    const cumulativeTimeAtStopMin = cumulativeTimeToIndex(rider.currentLocation, newRoute, i);
    const routeTimeMin = Math.round((totalDistanceKm / SIM_SPEED_KMH) * 60);
    const feasible = cumulativeTimeAtStopMin <= parcel.slaRemainingMin && newRoute.length <= rider.capacity;
    options.push({
      insertAt: i, newRoute,
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
      incrementalDistanceKm: Math.round((totalDistanceKm - baseTotal) * 100) / 100,
      routeTimeMin, cumulativeTimeAtStopMin, feasible,
    });
  }

  const feasibleOptions = options.filter((o) => o.feasible);
  if (!feasibleOptions.length) return null;
  feasibleOptions.sort((a, b) => a.incrementalDistanceKm - b.incrementalDistanceKm);
  return feasibleOptions[0];
}

export interface RiderRecommendation {
  rider: Rider;
  option: RouteOption;
  comparablePerformance: number; // 0..1
  score: number;                 // 0..100
  reasons: string[];
  weaknesses: string[];
}

export function evaluateRiderForParcel(rider: Rider, parcel: ParcelCandidate, history?: DailyRecord[]): RiderRecommendation | null {
  const option = bestInsertion(rider, parcel);
  if (!option) return null;

  const weighted = history ? computeWeightedPerformance(history) : null;
  const band = distanceBand(roadDistance(DC_LOCATION, parcel.location));
  const zonePerf = weighted ? weighted.byZone[parcel.zone] : (rider.zoneHistory[parcel.zone] ?? rider.overallSuccessRate);
  const bandPerf = weighted ? weighted.byBand[band] : (rider.distanceBandHistory[band] ?? rider.overallSuccessRate);
  const comparablePerformance = Math.round(((zonePerf + bandPerf) / 2) * 100) / 100;

  const distanceScore = Math.max(0, 100 - option.incrementalDistanceKm * 8);
  const performanceScore = comparablePerformance * 100;
  const workloadScore = Math.max(0, 100 - (option.newRoute.length / rider.capacity) * 100);
  const slaMarginMin = parcel.slaRemainingMin - option.cumulativeTimeAtStopMin;
  const slaScore = Math.min(100, 50 + (slaMarginMin / 60) * 50);

  const score = Math.round(0.4 * distanceScore + 0.3 * performanceScore + 0.15 * workloadScore + 0.15 * slaScore);

  const reasons: string[] = [`${option.incrementalDistanceKm.toFixed(1)} km incremental route distance`];
  if (comparablePerformance >= 0.85) reasons.push(`${Math.round(comparablePerformance * 100)}% success on comparable deliveries`);
  if (option.newRoute.length <= rider.capacity - 1) reasons.push(`Rider has capacity (${option.newRoute.length}/${rider.capacity} stops)`);
  if (slaMarginMin >= 30) reasons.push(`SLA remains feasible with ${slaMarginMin} min to spare`);
  if (zonePerf >= 0.88) reasons.push(`Strong performance in ${parcel.zone}`);
  if (option.insertAt > 0 && option.insertAt < rider.route.length) reasons.push(`Fits between existing stops ${option.insertAt} and ${option.insertAt + 1} on the route`);

  const weaknesses: string[] = [];
  if (option.incrementalDistanceKm > 4) weaknesses.push(`${option.incrementalDistanceKm.toFixed(1)} km additional route distance`);
  if (comparablePerformance < 0.8) weaknesses.push("Below expected for comparable routes");
  if (slaMarginMin < 30) weaknesses.push(`Route would approach the SLA threshold (${slaMarginMin} min margin)`);
  if (option.newRoute.length >= rider.capacity) weaknesses.push("Route is near full workload capacity");

  return { rider, option, comparablePerformance, score, reasons: reasons.slice(0, 5), weaknesses };
}

// lib/rider-route-engine.ts — replace recommendRiders
export function recommendRiders(riders: Rider[], parcel: ParcelCandidate, historyMap?: Record<string, DailyRecord[]>): RiderRecommendation[] {
  return riders
    .map((r) => evaluateRiderForParcel(r, parcel, historyMap?.[r.id]))
    .filter((r): r is RiderRecommendation => r !== null)
    .sort((a, b) => b.score - a.score);
}

export function dcToCustomerDistance(parcel: ParcelCandidate): { km: number; band: ReturnType<typeof distanceBand>; benchmark: number } {
  const km = roadDistance(DC_LOCATION, parcel.location);
  const band = distanceBand(km);
  return { km, band, benchmark: RTO_BENCHMARK[band] };
}

export { roadDistance, distanceBand, RTO_BENCHMARK };

// lib/rider-route-engine.ts — add at the bottom
export interface RouteStepInfo {
  awb: string;
  label: string;
  legDistanceKm: number;
  cumulativeDistanceKm: number;
  cumulativeTimeMin: number;
}

export function routeStepBreakdown(rider: Rider): RouteStepInfo[] {
  let cur = rider.currentLocation;
  let cum = 0;
  return rider.route.map((s) => {
    const leg = roadDistance(cur, s.location);
    cum += leg;
    cur = s.location;
    return {
      awb: s.awb,
      label: s.label,
      legDistanceKm: Math.round(leg * 100) / 100,
      cumulativeDistanceKm: Math.round(cum * 100) / 100,
      cumulativeTimeMin: Math.round((cum / 20) * 60), // SIM_SPEED_KMH = 20
    };
  });
}
