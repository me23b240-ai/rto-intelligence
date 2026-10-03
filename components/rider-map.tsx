// components/rider-map.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Rider, ParcelCandidate, DC_LOCATION, Point, nameForLocation, roadDistance, SIM_SPEED_KMH } from "@/lib/rider-mock-data";
import { routeStepBreakdown } from "@/lib/rider-route-engine";
import { computeRoutePayout, PayoutIncentiveConfig } from "@/lib/rider-payout-engine";
import { computeWeightedPerformance, DailyRecord } from "@/lib/rider-history";

const RIDER_COLORS = ["#2563eb", "#059669", "#ea580c", "#7c3aed", "#dc2626", "#0891b2"];
const PADDING = 60;
const MAX_DIM = 620;

interface Props {
  riders: Rider[];
  parcels: ParcelCandidate[];
  incentives: PayoutIncentiveConfig;
  riderHistory: Record<string, DailyRecord[]>;
}

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

/** Bends a straight segment into a few deterministic waypoints so routes read as roads, not grid lines. */
function jitterSegment(a: { x: number; y: number }, b: { x: number; y: number }, seedKey: string) {
  const rng = mulberry32(hashStr(seedKey));
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 24) return [a, b];
  const nx = -dy / len, ny = dx / len;
  const o1 = (rng() - 0.5) * len * 0.22;
  const o2 = (rng() - 0.5) * len * 0.22;
  const m1 = { x: a.x + dx * 0.33 + nx * o1, y: a.y + dy * 0.33 + ny * o1 };
  const m2 = { x: a.x + dx * 0.66 + nx * o2, y: a.y + dy * 0.66 + ny * o2 };
  return [a, m1, m2, b];
}

/** Smooths a polyline into rounded road-like curves via quadratic-through-midpoint technique. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const cur = points[i], next = points[i + 1];
    const mid = { x: (cur.x + next.x) / 2, y: (cur.y + next.y) / 2 };
    d += ` Q ${cur.x} ${cur.y} ${mid.x} ${mid.y}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function ScoreGauge({ score }: { score: number }) {
  const r = 34, c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  const color = score >= 85 ? "#059669" : score >= 65 ? "#d97706" : "#dc2626";
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 44 44)" />
      <text x="44" y="41" textAnchor="middle" fontSize="20" fontWeight="800" fill="#1e293b">{score}</text>
      <text x="44" y="56" textAnchor="middle" fontSize="9" fill="#94a3b8">/100</text>
    </svg>
  );
}

export function RiderMap({ riders, parcels, incentives, riderHistory }: Props) {
  const [focusRiderId, setFocusRiderId] = useState<string | null>(riders[0]?.id ?? null);
  const [zoom, setZoom] = useState(1);
  const [showAllStops, setShowAllStops] = useState(false);
  const [showPerfDetails, setShowPerfDetails] = useState(false);

  useEffect(() => { setShowAllStops(false); setShowPerfDetails(false); }, [focusRiderId]);

  const { scale, minX, minY, width, height } = useMemo(() => {
    const pts: Point[] = [DC_LOCATION];
    riders.forEach((r) => { pts.push(r.currentLocation); r.route.forEach((s) => pts.push(s.location)); });
    parcels.forEach((p) => pts.push(p.location));
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const minX = Math.min(...xs) - 1.5, maxX = Math.max(...xs) + 1.5;
    const minY = Math.min(...ys) - 1.5, maxY = Math.max(...ys) + 1.5;
    const spanX = Math.max(maxX - minX, 4), spanY = Math.max(maxY - minY, 4);
    const usable = MAX_DIM - PADDING * 2;
    const s = Math.min(usable / spanX, usable / spanY);
    return { scale: s, minX, minY, width: spanX * s + PADDING * 2, height: spanY * s + PADDING * 2 };
  }, [riders, parcels]);

  function toScreen(p: Point) {
    return { x: (p.x - minX) * scale + PADDING, y: height - ((p.y - minY) * scale + PADDING) };
  }

  const dcPt = toScreen(DC_LOCATION);

  // enriched per-rider stats
  const riderStats = useMemo(() => {
    return riders.map((r, i) => {
      const steps = routeStepBreakdown(r);
      const payout = steps.length ? computeRoutePayout(r, steps, incentives) : null;
      const perf = computeWeightedPerformance(riderHistory[r.id] ?? []);
      const etaMin = steps.length ? steps[steps.length - 1].cumulativeTimeMin : 0;
      const distFromDc = Math.round(roadDistance(DC_LOCATION, r.currentLocation) * 10) / 10;
      const avgDeliveryHrs = steps.length ? Math.round((etaMin / steps.length / 60) * 10) / 10 : 0;
      return { rider: r, color: RIDER_COLORS[i % RIDER_COLORS.length], steps, payout, perf, etaMin, distFromDc, avgDeliveryHrs };
    }).sort((a, b) => a.etaMin - b.etaMin);
  }, [riders, incentives, riderHistory]);

  const scoresSorted = [...riderStats].sort((a, b) => b.perf.overall - a.perf.overall);

  const focus = focusRiderId ? riderStats.find((rs) => rs.rider.id === focusRiderId) : null;
  const focusPercentile = focus ? Math.round(((scoresSorted.findIndex((s) => s.rider.id === focus.rider.id)) / Math.max(scoresSorted.length - 1, 1)) * 100) : 0;

  const vbW = width / zoom, vbH = height / zoom;
  const vbX = (width - vbW) / 2, vbY = (height - vbH) / 2;

  const mapLabels = useMemo(() => {
    const names = ["Hebbal", "Indiranagar", "Koramangala", "HSR Layout"];
    const fracs = [{ x: 0.55, y: 0.1 }, { x: 0.85, y: 0.4 }, { x: 0.45, y: 0.75 }, { x: 0.8, y: 0.85 }];
    return names.map((n, i) => ({ name: n, x: fracs[i].x * width, y: fracs[i].y * height }));
  }, [width, height]);

  const blobs = useMemo(() => {
    const seeds = [
      { cx: 0.15, cy: 0.2, r: 0.14, color: "#e3edf7" }, { cx: 0.6, cy: 0.1, r: 0.1, color: "#dcefe0" },
      { cx: 0.85, cy: 0.3, r: 0.13, color: "#e3edf7" }, { cx: 0.1, cy: 0.65, r: 0.12, color: "#f3ecd9" },
      { cx: 0.5, cy: 0.55, r: 0.16, color: "#dcefe0" }, { cx: 0.8, cy: 0.75, r: 0.14, color: "#e3edf7" },
      { cx: 0.35, cy: 0.9, r: 0.1, color: "#f3ecd9" },
    ];
    return seeds.map((s) => ({ x: s.cx * width, y: s.cy * height, r: s.r * Math.max(width, height), color: s.color }));
  }, [width, height]);

  return (
    <div className="grid lg:grid-cols-[260px_1fr_320px] gap-4 items-start">
      {/* LEFT - rider list + unassigned parcels */}
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-sm font-bold text-slate-900">Riders</h3>
            <span className="text-xs text-green-600 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> {riders.length} online</span>
          </div>
          <div className="space-y-1">
            {riderStats.map(({ rider, color, etaMin }) => {
              const active = focusRiderId === rider.id;
              return (
                <button
                  key={rider.id}
                  onClick={() => setFocusRiderId(rider.id)}
                  className={`w-full text-left rounded-lg p-2.5 border transition ${active ? "bg-slate-50 border-slate-300" : "border-transparent hover:bg-slate-50"}`}
                  style={active ? { borderLeftColor: color, borderLeftWidth: 3 } : {}}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs font-bold text-slate-400">{rider.id}</span>
                    <span className="text-sm font-semibold text-slate-800 truncate">{rider.name.replace("Rider ", "")}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 pl-4">ETA {etaMin} min · {rider.route.length} parcel{rider.route.length !== 1 ? "s" : ""}</div>
                </button>
              );
            })}
          </div>
        </div>

        {parcels.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-bold text-slate-900">Unassigned Parcels</h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{parcels.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {parcels.map((p) => (
                <div key={p.awb} className="flex items-center gap-1 text-[11px] text-slate-600 px-1 py-1">
                  <span>🏠</span><span className="font-mono">{p.awb}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CENTER - map */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 relative">
        <div className="absolute top-5 left-5 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-500">
          ℹ️ For visual reference only
        </div>
        <div className="absolute top-5 right-5 z-10 flex flex-col gap-1.5">
          <button onClick={() => setZoom((z) => Math.min(2.2, z + 0.2))} className="h-8 w-8 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50">+</button>
          <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))} className="h-8 w-8 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50">−</button>
          <button onClick={() => setZoom(1)} className="h-8 w-8 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50">⟲</button>
        </div>

        <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} className="w-full h-auto block rounded-lg" style={{ background: "#f6f8fa" }}>
          {blobs.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={b.color} opacity="0.75" />)}
          <defs>
            <pattern id="roadlines" width={scale} height={scale} patternUnits="userSpaceOnUse">
              <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#ffffff" strokeWidth="2" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={width} height={height} fill="url(#roadlines)" opacity="0.45" />

          {mapLabels.map((l) => (
            <text key={l.name} x={l.x} y={l.y} fontSize="12" fontWeight="600" fill="#94a3b8" opacity="0.8">{l.name}</text>
          ))}

          {/* curved routes */}
          {riderStats.map(({ rider, color }) => {
            const rawPoints = [DC_LOCATION, rider.currentLocation, ...rider.route.map((s) => s.location)].map(toScreen);
            let expanded: { x: number; y: number }[] = [rawPoints[0]];
            for (let i = 0; i < rawPoints.length - 1; i++) {
              const seg = jitterSegment(rawPoints[i], rawPoints[i + 1], `${rider.id}-${i}`);
              expanded = expanded.concat(seg.slice(1));
            }
            const dim = focusRiderId && focusRiderId !== rider.id;
            return (
              <g key={rider.id} opacity={dim ? 0.2 : 1}>
                <path d={smoothPath(expanded)} fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
                <path d={smoothPath(expanded)} fill="none" stroke={color} strokeWidth={focusRiderId === rider.id ? 3.5 : 2.2}
                  strokeLinecap="round" strokeDasharray={focusRiderId === rider.id ? "0" : "1,7"} />
              </g>
            );
          })}

          {/* stop markers */}
          {riderStats.map(({ rider, color }) => {
            const dim = focusRiderId && focusRiderId !== rider.id;
            return (
              <g key={`stops-${rider.id}`} opacity={dim ? 0.2 : 1}>
                {rider.route.map((s, si) => {
                  const sp = toScreen(s.location);
                  return (
                    <g key={s.awb}>
                      <circle cx={sp.x} cy={sp.y} r="10" fill={color} stroke="#fff" strokeWidth="2.5" />
                      <text x={sp.x} y={sp.y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{si + 1}</text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* DC */}
          <g>
            <rect x={dcPt.x - 17} y={dcPt.y - 12} width="34" height="22" fill="#1e293b" stroke="#fff" strokeWidth="2.5" rx="3" />
            <polygon points={`${dcPt.x - 20},${dcPt.y - 12} ${dcPt.x},${dcPt.y - 22} ${dcPt.x + 20},${dcPt.y - 12}`} fill="#0f172a" />
            <text x={dcPt.x} y={dcPt.y + 38} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#475569">DC</text>
          </g>

          {/* rider current-position markers (triangle "heading" look) */}
          {riderStats.map(({ rider, color }) => {
            const p = toScreen(rider.currentLocation);
            const isFocused = focusRiderId === rider.id;
            const dim = focusRiderId && !isFocused;
            return (
              <g key={`m-${rider.id}`} opacity={dim ? 0.25 : 1} style={{ cursor: "pointer" }} onClick={() => setFocusRiderId(rider.id)}>
                {isFocused && <circle cx={p.x} cy={p.y} r="16" fill="none" stroke={color} strokeWidth="2" opacity="0.35" />}
                <circle cx={p.x} cy={p.y} r={isFocused ? 11 : 8} fill={color} stroke="#fff" strokeWidth="2.5" />
                <polygon points={`${p.x},${p.y - 4} ${p.x - 3},${p.y + 3} ${p.x + 3},${p.y + 3}`} fill="#fff" />
              </g>
            );
          })}

          {/* unassigned parcels */}
          {parcels.map((p) => {
            const sp = toScreen(p.location);
            return (
              <g key={p.awb}>
                <circle cx={sp.x} cy={sp.y} r="11" fill="#fff" stroke="#94a3b8" strokeWidth="1.5" />
                <text x={sp.x} y={sp.y + 4} textAnchor="middle" fontSize="11">🏠</text>
              </g>
            );
          })}
        </svg>

        {/* legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">🏢 DC (Warehouse)</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-700 inline-block" /> Rider (current position)</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-slate-400 inline-block" /> Route stop</span>
          <span className="flex items-center gap-1.5">🏠 Unassigned parcel</span>
          <span className="mx-2 w-px h-4 bg-slate-200" />
          {riderStats.map(({ rider, color }) => (
            <span key={rider.id} className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded inline-block" style={{ backgroundColor: color }} /> {rider.id}
            </span>
          ))}
        </div>
      </div>

      {/* RIGHT - detail panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {!focus ? (
          <p className="text-sm text-slate-400">Click a rider to see their route and performance.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: focus.color }}>
                  {focus.rider.id}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{focus.rider.name}</span>
                    <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                      {focus.rider.route.length > 0 ? "On route" : "At DC"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    ETA {focus.etaMin} min · {focus.rider.route.length} parcels · ₹{focus.payout?.totalPayout ?? 0} payout
                  </div>
                </div>
              </div>
              <button onClick={() => setFocusRiderId(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* route breakdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700">Route Breakdown</h4>
                {focus.steps.length > 5 && (
                  <button onClick={() => setShowAllStops((v) => !v)} className="text-[11px] font-medium text-[var(--meesho-purple)] hover:underline">
                    {showAllStops ? "Show less" : "View full route"}
                  </button>
                )}
              </div>
              {focus.steps.length === 0 ? (
                <p className="text-xs text-slate-400">No stops assigned yet.</p>
              ) : (
                <div className="relative pl-1">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-100" />
                  <div className="space-y-2.5">
                    {(showAllStops ? focus.steps : focus.steps.slice(0, 5)).map((s, i) => {
                      const payoutStep = focus.payout?.steps.find((x) => x.awb === s.awb);
                      return (
                        <div key={s.awb} className="flex items-center gap-2.5 relative">
                          <span className="h-5.5 w-5.5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 z-10" style={{ backgroundColor: focus.color, height: 22, width: 22 }}>
                            {i + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 w-20 shrink-0">{s.awb}</span>
                          <span className="text-[11px] text-slate-400 flex-1">{s.legDistanceKm} km · {s.cumulativeTimeMin < 60 ? `${s.cumulativeTimeMin} min` : `${(s.cumulativeTimeMin / 60).toFixed(1)}h`}</span>
                          <span className="text-xs font-semibold text-slate-700">₹{payoutStep?.payout ?? 0}</span>
                        </div>
                      );
                    })}
                    {!showAllStops && focus.steps.length > 5 && (
                      <div className="pl-7 text-[11px] text-slate-300">···</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 90-day performance */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700">90-Day Performance</h4>
                <button onClick={() => setShowPerfDetails((v) => !v)} className="text-[11px] font-medium text-[var(--meesho-purple)] hover:underline">
                  {showPerfDetails ? "Hide details" : "View details"}
                </button>
              </div>
              <div className="flex items-center gap-4">
                <ScoreGauge score={Math.round(focus.perf.overall * 100)} />
                <div className="space-y-1 text-xs flex-1">
                  <div className="flex justify-between"><span className="text-slate-500">Success Rate</span><span className="font-semibold text-slate-800">{Math.round(focus.perf.overall * 100)}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">COD Success</span><span className="font-semibold text-slate-800">{Math.round(focus.perf.codRate * 100)}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Avg Delivery Time</span><span className="font-semibold text-slate-800">{focus.avgDeliveryHrs || "-"} hrs</span></div>
                </div>
              </div>
              {showPerfDetails && (
                <div className="mt-3 space-y-1 text-[11px] border-t border-slate-50 pt-2">
                  {focus.perf.periods.map((p) => (
                    <div key={p.label} className="flex justify-between text-slate-500">
                      <span>{p.label} (weight {Math.round(p.weight * 100)}%)</span>
                      <span className="font-medium text-slate-700">{Math.round(p.successRate * 100)}% · {p.attempted} attempted</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* current location */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>📍</span>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Current Location</div>
                  <div className="text-sm font-semibold text-slate-800">{nameForLocation(focus.rider.currentLocation)} <span className="text-slate-400 font-normal text-xs">({focus.distFromDc} km from DC)</span></div>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Live</span>
            </div>

            {/* rider performance summary */}
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 mb-1.5">📈 Rider Performance</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {focus.perf.overall >= 0.85 ? "Consistent performance across zones." : focus.perf.overall >= 0.7 ? "Steady performance, some zone variation." : "Below expected for comparable routes."}
                <br />
                Top {Math.max(1, 100 - focusPercentile)}% in reliability (90-day, simulated).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}